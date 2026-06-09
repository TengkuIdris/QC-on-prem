"""
なぜなぜ分析を実行するエージェント定義
"""
import os
from typing import TypedDict, Optional, Dict, List, Annotated, Any, Union
import operator
import uuid
import logging
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph
from langgraph.constants import START, END
from langgraph.types import Send, RunnableConfig
from .agent_builder import AgentBuilder
from .utils import extract_config_values, THREAD_ID, CHECKPOINT_ID
from .why_why_action import (
    InitialWhyAnalysisActionBuilder,
    DeepWhyAnalysisActionBuilder,
    InfoRequestActionBuilder,
    RootCauseAnalysisActionBuilder,
    RootCauseSchema
)
from .models import ProblemInput, WhyNode


logger = logging.getLogger(__name__)


# LLMプロフィール（システムプロンプト）の定義
PROFILE = """
You are an expert in "Why-Why Analysis" to assist in problem solving in the manufacturing and quality control fields.
You will perform the analysis process of digging deeper into the "why" step-by-step to identify the root cause (true cause) of the problem/phenomenon provided by the user.

# Basic Principles
1. always base the analysis on objective data and facts
2. repeat the "why" exploration in up to five stages
3. consider multiple possibilities at each stage
4. always evaluate and clearly state the level of certainty
5. proactively ask questions to supplement missing information

# Process
1. problem clarification: accurately understand the phenomenon and identify the scope of impact
2. initial cause enumeration: Provide multiple first-step "whys" for the phenomenon 3. step-by-step deep dive
3. step-by-step deep dive: ask more "whys" for each cause and analyze them in a hierarchical manner 4. information gathering: information gathering is a necessary part of the analysis process
4. information gathering: generate questions if necessary information is missing during the analysis process
5. true cause identification: Finally, present candidate true causes with confidence
Propose countermeasures: Propose countermeasures to the identified true causes

# Analysis Method
- 4M (Man: Man, Machine: Machine, Material: Material, Method: Method) or
- 5M1E (4M + Measurement: measurement, Environment: environment)

# Communication
- Conversations with users should be conducted in Japanese.
- Be specific and clear in your questions
- Explain terminology as appropriate
- Always clearly state the progress of the analysis
- Provide expertise while respecting the user's knowledge
"""


class WhyWhyAgentBuilder(AgentBuilder):
    """
    なぜなぜ分析エージェントを構築するビルダークラス
    """

    class State(TypedDict):
        """
        なぜなぜ分析エージェントの状態
        """
        problem: ProblemInput
        why_nodes: Annotated[Dict[str, WhyNode], operator.or_]  # ノードの出力と OR を取る
        chat_history: Optional[List[BaseMessage]]
        root_causes: Optional[List[RootCauseSchema]]
        thoughts: Annotated[List[str], operator.add]
        retrieved_context: Optional[List[dict]]  # RAG: 参考事例・マニュアルのチャンク群 (RetrievedChunk を dict 化したもの)

    def __init__(self, profile: str = PROFILE, num_parallel: int = 3, max_level: int = 5):
        # LLMアクションの構築
        self._num_parallel = num_parallel
        self._max_level = max_level
        self._initial_analysis = InitialWhyAnalysisActionBuilder().with_profile(profile).build()
        self._deep_analysis = DeepWhyAnalysisActionBuilder().with_profile(profile).build()
        self._info_request = InfoRequestActionBuilder().with_profile(profile).build()
        self._root_cause_analysis = RootCauseAnalysisActionBuilder().with_profile(profile).build()


    def _set_up_graph(self, graph: StateGraph) -> None:
        """エージェントのグラフをセットアップする"""
        # ノードの追加
        graph.add_node("set_initial_cause", self.set_initial_cause)
        graph.add_node("retrieve_context", self.retrieve_context)
        graph.add_node("joint", lambda x: x)  # do nothing
        graph.add_node("info_request", self._info_request)
        graph.add_node("initial_analysis", self._initial_analysis)
        graph.add_node("map_deep_analysis", lambda x: x)  # do nothing
        graph.add_node("deep_analysis", self._deep_analysis)
        graph.add_node("map_root_cause_analysis", lambda x: x)  # do nothing
        graph.add_node("root_cause_analysis", self._root_cause_analysis)

        # エッジの定義
        # set_initial_cause -> retrieve_context -> joint で
        # 1回だけ RAG を実行し、以降の why_why ループでは参照のみ行う。
        graph.add_edge(START, "set_initial_cause")
        graph.add_edge("set_initial_cause", "retrieve_context")
        graph.add_edge("retrieve_context", "joint")
        graph.add_conditional_edges("joint", self.should_continue, {"continue": "info_request", END: END})
        graph.add_conditional_edges("info_request", self.next_action, {
            "initial_analysis": "initial_analysis", "deep_analysis": "map_deep_analysis"})
        graph.add_conditional_edges("initial_analysis", self.map_root_cause_analysis, ["root_cause_analysis"])
        graph.add_conditional_edges("map_deep_analysis", self.map_deep_analysis, ["deep_analysis"])
        graph.add_edge("deep_analysis", "map_root_cause_analysis")
        graph.add_conditional_edges("map_root_cause_analysis", self.map_root_cause_analysis, ["root_cause_analysis"])
        graph.add_edge("root_cause_analysis", "joint")

    def should_continue(self, state: State) -> str:
        """終了判定"""
        why_nodes = {i: n for i, n in state.get("why_nodes", {}).items() if n}  # None を除外
        # 解析が始まっていない
        if len(why_nodes) == 0:
            return "continue"
        # root_cause_confidence が 0.9 以上のノードが存在する場合、分析を終了する
        max_confidence = max(node.root_cause_confidence for node in why_nodes.values())
        if max_confidence >= 0.9:
            return END
        # _max_level 以下の葉ノードが存在しない場合、分析を終了する
        valid_nodes = [n for n in self._get_leaf_nodes(why_nodes) if n.level <= self._max_level]
        if len(valid_nodes) == 0:
            return END
        # 上記以外
        return "continue"

    def next_action(self, state: State) -> str:
        """次のアクションを決定する"""
        # 初期状態
        why_nodes = {i: n for i, n in state.get("why_nodes", {}).items() if n}  # None を除外
        if len(why_nodes) == 0:
            return "initial_analysis"
        # 上記以外
        return "deep_analysis"

    @staticmethod
    def _get_leaf_nodes(why_nodes: Dict[str, WhyNode]) -> List[WhyNode]:
        return [node for node in why_nodes.values() if isinstance(node, WhyNode) and not node.children_ids]

    def map_deep_analysis(self, state: State) -> List[Send]:
        """ノードを選定し DeepAnalysisAction を適用する
        レベル _max_level 以下の葉ノードの内、root_cause_confidence が大きいものから順に _num_parallel 個選択する。
        """
        leaf_nodes = self._get_leaf_nodes(state.get("why_nodes", {}))
        sorted_leaf_nodes = sorted(leaf_nodes, key=lambda node: node.root_cause_confidence, reverse=True)
        target_nodes = [n for n in sorted_leaf_nodes if n.level <= self._max_level][:self._num_parallel]
        return [Send("deep_analysis", {"target_node_id": n.id, **state}) for n in target_nodes]

    def map_root_cause_analysis(self, state: State) -> List[Send]:
        """RootCauseAnalysisActionを適用していないノードに適用する"""
        non_judged_nodes = [n for n in state.get("why_nodes", {}).values() if isinstance(n, WhyNode) and not n.root_cause_confidence]
        return [Send("root_cause_analysis", {"target_node_id": n.id, **state}) for n in non_judged_nodes]

    def set_initial_cause(self, state: State, config: Optional[RunnableConfig] = None) -> Dict[str, Dict[str, WhyNode]]:
        """直接原因が設定されている場合、それを１つ目の WhyNode として設定する"""
        # RunnableConfigから設定値を取得
        config_values = extract_config_values(config)
        thread_id = config_values.get(THREAD_ID, "unknown")

        logger.info(f"Setting initial cause for thread: {thread_id}")

        # problemを取得し、辞書の場合はProblemInputオブジェクトに変換
        problem_data: Union[Dict[str, Any], ProblemInput] = state.get("problem", {})
        if isinstance(problem_data, dict):
            # 辞書の場合はProblemInputオブジェクトに変換
            problem = ProblemInput(**problem_data)
        else:
            # 既にProblemInputオブジェクトの場合はそのまま使用
            problem = problem_data if problem_data else ProblemInput(title="")

        res = {}
        if problem.direct_cause:
            node_id = str(uuid.uuid4().hex[:8])
            res[node_id] = WhyNode(
                name=problem.direct_cause,
                supporting_facts=str(problem.verification),
                root_cause_confidence=0.5,
                id=node_id,
                level=1,
                parent_id=None,
                children_ids=[],
                is_root_cause=False,
            )
            logger.info(f"Created initial cause node: {node_id} for thread: {thread_id}")
        else:
            logger.info(f"No direct cause provided for thread: {thread_id}")

        return {"why_nodes": res, "problem": problem.model_dump(mode='json')}

    def retrieve_context(self, state: State, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """
        外部 RAG サービス (`POST {RAG_SERVICE_URL}/retrieve`) を呼び、
        参考事例・マニュアルのチャンクを state.retrieved_context に格納する。

        - 仕様: IMPLEMENTATION_SPEC.md Part A C2 (request: {query}, response: {chunks: [...]})
        - 失敗時はログを出して空配列を返す (非致命的)。RAG が落ちていても本筋の解析は継続する。
        - RAG_ENABLED=false の場合は即座に空配列を返す (B/E ともに動作確認用)。
        """
        if os.getenv("RAG_ENABLED", "false").lower() != "true":
            return {"retrieved_context": []}

        rag_url = os.getenv("RAG_SERVICE_URL")
        if not rag_url:
            logger.warning("RAG_ENABLED=true but RAG_SERVICE_URL is not set; skipping retrieval")
            return {"retrieved_context": []}

        # クエリ: ProblemInput の Markdown 化したものをそのまま渡す
        problem_data: Union[Dict[str, Any], ProblemInput] = state.get("problem", {})
        if isinstance(problem_data, dict):
            problem = ProblemInput(**problem_data) if problem_data else None
        else:
            problem = problem_data
        query = problem.to_markdown(base_level=2) if problem else ""
        if not query.strip():
            return {"retrieved_context": []}

        try:
            import httpx
            timeout = float(os.getenv("RAG_TIMEOUT", "30"))
            top_k_cases = int(os.getenv("RAG_TOP_K_CASES", "3"))
            top_k_manuals = int(os.getenv("RAG_TOP_K_MANUALS", "2"))
            resp = httpx.post(
                f"{rag_url.rstrip('/')}/retrieve",
                json={
                    "query": query,
                    "top_k_cases": top_k_cases,
                    "top_k_manuals": top_k_manuals,
                },
                timeout=timeout,
            )
            resp.raise_for_status()
            body = resp.json()
            chunks = body.get("chunks", []) if isinstance(body, dict) else []
            if not isinstance(chunks, list):
                logger.warning(f"RAG service returned non-list 'chunks' field; got {type(chunks).__name__}")
                chunks = []
        except Exception as e:
            logger.warning(f"RAG call failed, continuing without context: {e}")
            return {"retrieved_context": []}

        logger.info(f"RAG retrieved {len(chunks)} chunks")
        return {
            "retrieved_context": chunks,
            "thoughts": ["関連する過去事例を検索しました"],
        }

    def get_config_info(self, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """RunnableConfigから設定情報を取得する

        Parameters
        ----------
        config : Optional[RunnableConfig], optional
            設定オブジェクト

        Returns
        -------
        Dict[str, Any]
            設定情報の辞書
        """
        config_values = extract_config_values(config)
        return {
            "thread_id": config_values.get(THREAD_ID),
            "checkpoint_id": config_values.get(CHECKPOINT_ID),
            "all_configurables": config_values
        }

    def create_enhanced_send(self, node: str, state: State, config: Optional[RunnableConfig] = None) -> Send:
        """設定情報を含む拡張されたSendオブジェクトを作成する

        Parameters
        ----------
        node : str
            送信先ノード名
        state : State
            現在の状態
        config : Optional[RunnableConfig], optional
            設定オブジェクト

        Returns
        -------
        Send
            設定情報を含むSendオブジェクト
        """
        enhanced_state = dict(state)
        if config:
            enhanced_state["_config_info"] = self.get_config_info(config)
        return Send(node, enhanced_state)
