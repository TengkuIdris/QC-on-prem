import logging
from typing import Optional, Type, List, Any
from langgraph.graph.state import CompiledStateGraph, StateGraph
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver


logger = logging.getLogger(__name__)


class AgentBuilder:
    """
    LangGraph のエージェントを構築するビルダーの抽象クラス
    """

    # 具象クラスで定義されるべき状態スキーマ
    State: Type[Any] = None  # type: ignore

    def build(
        self,
        input_schema: Optional[Type[Any]] = None,
        output_schema: Optional[Type[Any]] = None,
        interrupt_before: Optional[List[str]] = None,
        debug: bool = False,
        checkpointer: Optional[BaseCheckpointSaver] = None,
    ) -> CompiledStateGraph:
        """エージェントを構築する

        Parameters
        ----------
        input_schema : Optional[Type[Any]], optional
            エージェントの入力のスキーマ。None の場合、入力スキーマは state と同じになる。
        output_schema : Optional[Type[Any]], optional
            エージェントの出力のスキーマ。None の場合、出力スキーマを指定せず state をそのまま出力する。
        interrupt_before : Optional[List[str]], optional
            エージェントの実行を中断するノードのリスト。None の場合、中断しない。
        debug : bool, optional
            デバッグモード。デフォルトは False
        checkpointer : Optional[BaseCheckpointSaver], optional
            チェックポイントのセーバー。グラフの実行結果をチェックポイントとして保存し、中断・再開できるようにする。
            None の場合、チェックポイントをメモリー上に保存する MemorySaver を使用する。

        Returns
        -------
        CompiledStateGraph
            エージェントのグラフ
        """
        if self.State is None:
            raise NotImplementedError("State must be defined in concrete subclass")

        graph = StateGraph(state_schema=self.State, input=input_schema, output=output_schema)
        self._set_up_graph(graph)
        checkpointer = checkpointer or MemorySaver()
        return graph.compile(checkpointer=checkpointer, interrupt_before=interrupt_before, debug=debug)

    def _set_up_graph(self, graph: StateGraph) -> None:
        """エージェントのグラフをセットアップする"""
        raise NotImplementedError
