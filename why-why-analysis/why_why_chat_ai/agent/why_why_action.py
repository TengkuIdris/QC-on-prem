"""
なぜなぜ分析を実行するためのLLMアクション定義
"""
from typing import List, Optional, Dict, Any, Literal
import uuid
from loguru import logger
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt
from .utils import why_nodes_to_markdown_list
from .action import SingleToolLLMActionBuilder, MultipleSameToolLLMActionBuilder, ResidualLLMActionBuilder
from .models import ProblemInput, WhyNode


class Cause(BaseModel):
    """
    A cause of the problem
    """
    supporting_facts: str = Field(
        ...,
        description='Explain step by step how you reached at the cause, citing specific supporting facts and evidences. '
                    'You should write this in Japanese.')
    name: str = Field(
        ..., description='Name of the cause. Summarize the cause in few words. You should write this in Japanese.')


def convert_causes_to_why_nodes(
    causes: List[Cause], level: int, parent_id: Optional[str] = None, is_root_cause: bool = False
) -> Dict[str, WhyNode]:
    """
    CausesをWhyNodeオブジェクトに変換して保存
    """
    why_nodes = {}
    for cause in causes:
        node_id = str(uuid.uuid4().hex[:8])
        why_nodes[node_id] = WhyNode(
            id=node_id,
            level=level,
            parent_id=parent_id,
            children_ids=[],  # 新規ノードなので子無し
            is_root_cause=is_root_cause,
            root_cause_confidence=None,
            **cause.model_dump()
        )
    return why_nodes


def _format_retrieved_context_for_prompt(chunks: Optional[List[Dict[str, Any]]]) -> str:
    """
    retrieve_context ノードが state.retrieved_context に積んだチャンク辞書列を、
    プロンプト埋め込み用の Markdown 文字列に整形する。

    各チャンクのキーは RAG コントラクト (IMPLEMENTATION_SPEC.md Part A C2) に従う:
      {text, source_type: "case"|"manual", source_id, title, score}
    """
    if not chunks:
        return "（参考情報なし）"
    lines: List[str] = []
    for c in chunks:
        if not isinstance(c, dict):
            continue
        source_type = c.get("source_type") or ""
        label = "過去事例" if source_type == "case" else ("マニュアル" if source_type == "manual" else "参考")
        title = c.get("title") or ""
        text = c.get("text") or ""
        header = f"[{label}] {title}".strip()
        lines.append(f"{header}\n{text}".strip())
    return "\n\n".join(lines) if lines else "（参考情報なし）"


INITIAL_WHY_ANALYSIS_PROMPT_TEMPLATE = """
Suggest the cause of the following problem.

# Problem
{{problem}}

# 参考情報（過去の類似事例・関連マニュアル）
{{retrieved_context}}

これらは参考であり、必ずしも本件に当てはまるとは限りません。
事実に基づき、関連する場合のみ利用してください。

# Chat history:
{{#chat_history}}
[{{type}}]:
{{content}}
{{/chat_history}}
"""


class InitialWhyAnalysisActionBuilder(MultipleSameToolLLMActionBuilder):
    """
    最初のなぜなぜ分析を実行するアクションのビルダー。

    作成されたアクションの入出力は以下:
    入力: Dict[str, Any]
        - problem: ProblemInput
            問題情報オブジェクト
        - chat_history: List[BaseMessage]
            チャット履歴のリスト
    出力: Dict[str, Any]
        - why_nodes: Dict[str, WhyNode]
            初期分析結果。WhyNodeオブジェクトの辞書（キー: ノードID）
        - thought: str
            思考プロセス
    """

    _instruction = INITIAL_WHY_ANALYSIS_PROMPT_TEMPLATE
    _template_format = "mustache"
    _tool = Cause
    _use_tool_calls = "auto"

    def _format_input(self, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        _input = super()._format_input(input, config)
        _input["retrieved_context"] = _format_retrieved_context_for_prompt(input.get("retrieved_context"))
        return _input

    def _format_output(self, output: List[Cause], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        why_nodes = convert_causes_to_why_nodes(output, level=1)  # 最上位は親なし
        thought = "\n\n".join([f"{why.name}: {why.supporting_facts}" for why in output])
        return {"why_nodes": why_nodes, "thoughts": [thought]}


DEEP_WHY_ANALYSIS_PROMPT_TEMPLATE = """
List the causes by digging deeper into the existing cause.


# Target cause
## Name
{{node.name}}
## Supporting facts
{{node.supporting_facts}}

# Information about the original problem
{{problem}}

# 参考情報（過去の類似事例・関連マニュアル）
{{retrieved_context}}

これらは参考であり、必ずしも本件に当てはまるとは限りません。
事実に基づき、関連する場合のみ利用してください。

# Chat history:
{{#chat_history}}
[{{type}}]:
{{content}}
{{/chat_history}}

## Current results
{{current_results}}


# Constraints
- Output NOTHING, if you cannot identify the cause due to a lack of information or other reasons.
"""
# TODO 親のWhyNodeの情報も追加

class DeepWhyAnalysisActionBuilder(ResidualLLMActionBuilder, MultipleSameToolLLMActionBuilder):
    """
    深堀りのなぜなぜ分析を実行するアクションのビルダー。

    作成されたアクションの入出力は以下:
    入力: Dict[str, Any]
        - problem: ProblemInput
            問題情報オブジェクト
        - why_nodes: Dict[str, WhyNode]
            現在の分析結果のグラフ構造。WhyNodeオブジェクトの辞書（キー: ノードID）
        - chat_history: List[BaseMessage]
            チャット履歴のリスト
        - target_node_id: str
            分析対象ノードのID
    出力: Dict[str, Any]
        - why_nodes: Dict[str, WhyNode]
            分析結果。新規作成または更新されたWhyNodeオブジェクトの辞書。
        - thought: str
            思考プロセス
    """

    _instruction = DEEP_WHY_ANALYSIS_PROMPT_TEMPLATE
    _template_format = "mustache"
    _tool = Cause
    _use_tool_calls: Literal["auto", True, False] = "auto"

    def _format_input(self, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        _input = super()._format_input(input, config)
        why_nodes = input.get("why_nodes", {})
        _input["node"] = why_nodes.get(input.get("target_node_id", ""))
        _input["current_results"] = why_nodes_to_markdown_list(why_nodes)
        _input["retrieved_context"] = _format_retrieved_context_for_prompt(input.get("retrieved_context"))
        return _input

    def _format_output(
        self, output: List[Cause], input: Dict[str, Any], config: Optional[RunnableConfig] = None
    ) -> Dict[str, Any]:  # type: ignore[override]
        """新規 "Why" を子ノードとして追加"""
        target_node_id = input.get("target_node_id", "")
        logger.debug(f"target_node_id: {target_node_id}")
        target_node = input.get("why_nodes", {}).get(target_node_id, None)
        if not target_node:
            logger.debug("target_node not found...")
            return {}

        level = target_node.level + 1
        modified_why_nodes = convert_causes_to_why_nodes(
            output, level=level, parent_id=target_node_id, is_root_cause=(level >= 5))
        thought = "\n\n".join([f"{why.name}: {why.supporting_facts}" for why in output])
        children_ids = [node.id for node in modified_why_nodes.values()]
        target_node.children_ids.extend(children_ids)
        modified_why_nodes[target_node.id] = target_node
        return {"why_nodes": modified_why_nodes, "thoughts": [thought]}


class InformationRequestSchema(BaseModel):
    """
    Information Request for the User
    """
    should_request: bool = Field(..., description="Whether to request additional information from the user. True if you should request, False otherwise.")
    reason: str = Field("", description="Explain step by step the reason why you decided whether to request additional information from the user.")
    question: str = Field("", description="The question you need to ask the user. Be specific and clear in your questions.")


INFORMATION_REQUEST_PROMPT_TEMPLATE = """
If you don't have enough information to proceed with the 5 Whys analysis (なぜなぜ分析), request additional information from the user.

Do not request information from users in the following cases:
- When you can continue the 5 Whys analysis with the information you currently have
- When you can tell from the conversation history that it is unlikely that you will be able to obtain more useful information from the user.


# Current Analysis Context
## Problem
{{problem}}


## Chat History
{{#chat_history}}
[{{type}}]:
{{content}}
{{/chat_history}}


## Current results
{{current_results}}
"""


class InfoRequestActionBuilder(ResidualLLMActionBuilder, SingleToolLLMActionBuilder):
    """
    情報要求を生成するアクションのビルダー。

    作成されたアクションの入出力は以下:
    入力: Dict[str, Any]
        - problem: ProblemInput
            問題情報オブジェクト
        - why_nodes: Dict[str, WhyNode]
            現在の分析結果のグラフ構造。WhyNodeオブジェクトの辞書（キー: ノードID）
        - chat_history: List[BaseMessage]
            チャット履歴のリスト
    出力: Dict[str, Any]
        - thought: str
            情報要求の理由
        - chat_history: List[BaseMessage]
            更新されたチャット履歴（情報要求が実行された場合）
    """

    _instruction = INFORMATION_REQUEST_PROMPT_TEMPLATE
    _template_format = "mustache"
    _tool = InformationRequestSchema

    def _format_input(self, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        _input = super()._format_input(input, config)
        problem = input.get("problem", ProblemInput(title=""))
        # problemが辞書の場合はProblemInputに変換
        if isinstance(problem, dict):
            problem = ProblemInput(**problem)
        _input["problem"] = problem.to_markdown(base_level=3)
        _input["current_results"] = why_nodes_to_markdown_list(input.get("why_nodes", {}))
        return _input

    def _format_output(
        self, output: InformationRequestSchema, input: Dict[str, Any], config: Optional[RunnableConfig] = None
    ) -> Dict[str, Any]:  # type: ignore[override]
        res: Dict[str, Any] = {}
        res["thoughts"] = [output.reason]
        if not output.should_request:
            logger.debug(f'THOUGHT: {output.reason}')
            return res

        query = {
            "question": output.question,
            "why_nodes": input.get("why_nodes", {}),
            "thought": res["thoughts"][-1],
        }
        user_response = interrupt(query)

        # チャット履歴に追加
        res["chat_history"] = list(input["chat_history"]) if "chat_history" in input else []
        ai_message_id = str(uuid.uuid4())
        res["chat_history"].append(AIMessage(content=output.question, id=ai_message_id))
        human_message_id = str(uuid.uuid4())
        res["chat_history"].append(HumanMessage(content=user_response["response"], id=human_message_id))
        return res


class RootCauseSchema(BaseModel):
    """
    Judgment result as to whether the target cause is the root cause or not
    """
    thought: str = Field(
        ...,
        description="What you thought about during the process of making your judgement. "
                    "Explain your thought process step by step. You should write this in Japanese.")
    recurrence_prevention_measures: str = Field(
        ...,
        description="Recurrence prevention measures of the problem. If this is the root cause of the problem, "
                    "you should be able to propose effective measures to prevent a recurrence. Make a proposal. "
                    "You should write this in Japanese.")
    root_cause_confidence: float = Field(
        ...,
        description='Whether this cause is the root cause of the problem or not. '
                    '1.00 if you are sure that this cause is a root cause, and 0.00 if you have no confidence at all. '
                    'Evaluate to the second decimal place.')


ROOT_CAUSE_ANALYSIS_PROMPT_TEMPLATE = """
Judge whether the following causes obtained from the process of “5 whys analysis (なぜなぜ分析)” are the root causes.
In making your judgment, consider the following points:
**Fundamental cause:** The purpose of “5 whys analysis (なぜなぜ分析)” is to delve deeply into the events that led to the occurrence of an error and to clarify the fundamental cause, such as a flaw in the way work is carried out or in the management system. Therefore, it is important to determine whether the cause identified is an essential factor that exists at a deeper level of the problem, rather than being superficial.
**Deriving measures that lead to recurrence prevention:** One of the purposes of the “5 whys analysis (なぜなぜ分析)” is to lead to recurrence prevention and prevention of the occurrence of problems. Whether or not it is possible to effectively prevent the occurrence of similar problems by taking measures against the identified causes is an important indicator of whether or not the cause is the true cause.
**Scope of impact and effectiveness of countermeasures:** The true cause may not be a single event, but may affect multiple problems or potential risks. In addition, countermeasures for the cause should be effective over a wide range and lead to a fundamental solution.
**Depth of digging in the process of repeatedly asking “why”:** In order to reach the true cause, it is important to ask yourself “why” to the necessary depth. Rather than reaching a quick conclusion, it is important to keep asking “why” until you have exhausted all possibilities and have determined that you cannot get to the root cause by digging any deeper.
**Verification based on phenomena, objects and reality:** In “5 whys analysis (なぜなぜ分析)”, it is important to fully understand the site and the reality based on the facts that led to the error, and to delve into the cause in a logical manner. Whether or not the identified cause is consistent with these objective facts is also a point that should be considered when determining the root cause.


# Target cause
## Name
{{node.name}}
## Supporting facts
{{node.supporting_facts}}


# Information about the original problem
{{problem}}


# Chat history:
{{#chat_history}}
[{{type}}]:
{{content}}
{{/chat_history}}


## Current results
{{current_results}}
"""

class RootCauseAnalysisActionBuilder(ResidualLLMActionBuilder, SingleToolLLMActionBuilder):
    """
    真因かどうかを判定するアクションのビルダー。

    作成されたアクションの入出力は以下:
    入力: Dict[str, Any]
        - problem: ProblemInput
            問題情報オブジェクト
        - why_nodes: Dict[str, WhyNode]
            現在のWhyNodeオブジェクトの辞書（キー: ノードID）
        - chat_history: List[BaseMessage]
            チャット履歴のリスト
        - target_node_id: str
            真因分析対象ノードのID
    出力: Dict[str, Any]
        - why_nodes: Dict[str, WhyNode]
            真因判定結果。対象ノードの ID がキーで、真因判定結果が更新されたWhyNodeオブジェクトが値となる辞書。
            ※ 確信度が0の場合は値が None となり、ノードが削除されたことを表す。
    """

    _instruction = ROOT_CAUSE_ANALYSIS_PROMPT_TEMPLATE
    _template_format = "mustache"
    _tool = RootCauseSchema
    _confidence_threshold = 0.9

    def with_confidence_threshold(self, threshold: float) -> "RootCauseAnalysisActionBuilder":
        """
        真因判定の確信度閾値を設定する

        Args:
            threshold: 設定する確信度閾値（0.0～1.0）

        Returns:
            RootCauseAnalysisActionBuilder: 自身のインスタンス（メソッドチェーン用）
        """
        self._confidence_threshold = threshold
        return self

    def _format_input(self, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        _input = super()._format_input(input, config)
        why_nodes = input.get("why_nodes", {})
        _input["node"] = why_nodes.get(input.get("target_node_id", ""))
        _input["current_results"] = why_nodes_to_markdown_list(why_nodes)
        return _input

    def _format_output(
        self, output: RootCauseSchema, input: Dict[str, Any], config: Optional[RunnableConfig] = None
    ) -> Dict[str, Any]:  # type: ignore[override]
        target_node_id = input.get("target_node_id", "")
        target_node = input.get("why_nodes", {}).get(target_node_id, None)
        target_node.root_cause_judgement = output.thought
        target_node.root_cause_confidence = output.root_cause_confidence
        target_node.recurrence_prevention_measures = output.recurrence_prevention_measures
        # 確信度が閾値以上であれば、真因と判定
        if target_node.root_cause_confidence >= self._confidence_threshold:
            target_node.is_root_cause = True
        # 確信度が0であれば、ノードを削除
        if target_node.root_cause_confidence == 0:
            target_node = None
        return {"why_nodes": {target_node_id: target_node}, "thoughts": [output.thought]}
