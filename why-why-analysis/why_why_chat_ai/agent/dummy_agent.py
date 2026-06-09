"""
UIテスト用のダミーエージェント

このモジュールは、なぜなぜ分析AIの動作をシミュレートするダミーエージェントを提供します。
テスト環境で使用することで、実際のAIと同様の応答パターンを再現します。
"""

import uuid
import time
from typing import Dict, Any
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph.state import StateGraph, START, END
from langgraph.types import interrupt
from .agent_builder import AgentBuilder
from .why_why_agent import WhyWhyAgentBuilder
from .models import WhyNode


class DummyWhyWhyAgentBuilder(AgentBuilder):
    """
    テスト用のダミーエージェントビルダー
    
    実際のWhyWhyAgentBuilderと同様のインターフェースを持ち、
    """

    State = WhyWhyAgentBuilder.State
    
    def __init__(self, 
                 simulate_error: bool = False, 
                 response_delay: float = 2.0):
        """
        Args:
            simulate_error: エラーをシミュレートするかどうか
            response_delay: 応答の遅延時間（秒）
        """
        self.simulate_error = simulate_error
        self.response_delay = response_delay
        
        # 事前に定義されたノードと応答
        self._predefined_responses: Dict[str, Dict[str, Any]] = {}

    def _set_up_graph(self, graph: StateGraph) -> None:
        """
        グラフをセットアップする
        
        Args:
            graph: StateGraph
        """
        graph.add_node("initialize", self._initialize)
        graph.add_node("analyze", self._analyze)
        graph.add_node("user_feedback", self._user_feedback)
        graph.add_edge(START, "initialize")
        graph.add_edge("initialize", "user_feedback")
        graph.add_edge("user_feedback", "analyze")
        graph.add_edge("analyze", END)

    def _initialize(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        初期化
        """
        result = {}
        # チャット履歴のサンプルを追加
        chat_messages = [
            AIMessage(
                id=str(uuid.uuid4()),
                content="分析を開始します",
            ),
        ]
        result["chat_history"] = chat_messages
        return result

    def _analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        定義済みの分析結果を返す
        
        Args:
            state: 入力状態
            
        Returns:
            Dict[str, Any]: 更新された状態
        """
        # 入力の問題情報
        problem = state.get("problem")
        
        # 結果の初期化
        result: Dict[str, Any] = {}
        result["why_nodes"] = {}
        result["chat_history"] = state.get("chat_history", [])
        result["root_causes"] = []
        
        # 最初のノードを作成
        level1_node_id = str(uuid.uuid4())
        level1_node = WhyNode(
            id=level1_node_id,
            name=f"なぜ {problem.title} が発生したのか？",
            root_cause_confidence=0.9,
            level=1,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="テスト用事実1"
        )
        result["why_nodes"][level1_node_id] = level1_node
        
        # 2階層目のノード
        level2_node_id = str(uuid.uuid4())
        level2_node = WhyNode(
            id=level2_node_id,
            name="原因Aが発生したため",
            root_cause_confidence=0.85,
            level=2,
            parent_id=level1_node_id,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="テスト用事実3"
        )
        result["why_nodes"][level2_node_id] = level2_node
        
        # 親ノードの子ノード更新
        level1_node.children_ids.append(level2_node_id)
        
        # 3階層目のノード
        level3_node_id = str(uuid.uuid4())
        level3_node = WhyNode(
            id=level3_node_id,
            name="条件Bが揃ったため",
            root_cause_confidence=0.8,
            level=3,
            parent_id=level2_node_id,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="テスト用事実5"
        )
        result["why_nodes"][level3_node_id] = level3_node
        
        # 親ノードの子ノード更新
        level2_node.children_ids.append(level3_node_id)
        
        # 4階層目のノード
        level4_node_id = str(uuid.uuid4())
        level4_node = WhyNode(
            id=level4_node_id,
            name="作業者がプロセスCを省略したため",
            root_cause_confidence=0.75,
            level=4,
            parent_id=level3_node_id,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="テスト用事実7"
        )
        result["why_nodes"][level4_node_id] = level4_node
        
        # 親ノードの子ノード更新
        level3_node.children_ids.append(level4_node_id)
        
        # 5階層目のノード（真因）
        level5_node_id = str(uuid.uuid4())
        level5_node = WhyNode(
            id=level5_node_id,
            name="作業手順書Dが不明確であったため",
            root_cause_confidence=0.95,
            level=5,
            parent_id=level4_node_id,
            children_ids=[],
            is_root_cause=True,
            supporting_facts="テスト用事実9"
        )
        result["why_nodes"][level5_node_id] = level5_node
        
        # 親ノードの子ノード更新
        level4_node.children_ids.append(level5_node_id)
        
        # 真因リストに追加
        result["root_causes"] = [level5_node_id]
        
        time.sleep(self.response_delay)
        return result
        
    def _user_feedback(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        ユーザーからのフィードバックを処理する
        
        Args:
            state: 入力状態
            
        Returns:
            Dict[str, Any]: 更新された状態
        """
        # ユーザーからのフィードバックを求める
        question = "追加情報や修正点はありますか？"
        query = {
            "question": question,
            "why_nodes": state.get("why_nodes", {})
        }
        chat_history = state.get("chat_history", [])
        chat_history.append(AIMessage(id=str(uuid.uuid4()), content=question))
        
        # interruptを使用してユーザー入力を待機
        user_response = interrupt(query)
        
        # ユーザーの回答をチャット履歴に追加
        chat_history.append(HumanMessage(id=str(uuid.uuid4()), content=user_response["response"]))
        thank_message = "ありがとうございます。分析を進めます。"
        chat_history.append(AIMessage(id=str(uuid.uuid4()), content=thank_message))
        
        # 結果
        result = {}
        result["chat_history"] = chat_history
        
        return result
    
