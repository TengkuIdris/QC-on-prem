import pytest
from typing import Dict, Optional, TypedDict, List
from langgraph.graph.state import StateGraph, CompiledStateGraph
from langgraph.checkpoint.memory import MemorySaver

from why_why_chat_ai.agent.agent_builder import AgentBuilder
from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder
from why_why_chat_ai.agent.models import ProblemInput
from langchain_core.messages import BaseMessage


class MockAgentState(TypedDict):
    value: str
    another_value: Optional[str]

class MockInputSchema(TypedDict):
    value: str

class MockOutputSchema(TypedDict):
    value: str


class TestAgentBuilder(AgentBuilder):
    State = MockAgentState

    def _set_up_graph(self, graph: StateGraph) -> None:
        def test_node(state: Dict, config: Optional[Dict] = None) -> Dict:
            return {
                "value": "test"
            }

        graph.add_node("test", test_node)
        graph.set_entry_point("test")
        graph.set_finish_point("test")


def test_build_with_default_params():
    """デフォルトパラメータでのビルドをテスト"""
    builder = TestAgentBuilder()
    graph = builder.build()

    # グラフを実行して結果を確認
    config = {
        "configurable": {"thread_id": "test_thread"}
    }
    result = graph.invoke({"value": "initial"}, config=config)
    assert isinstance(result, dict)
    assert result["value"] == "test"


def test_build_with_input_schema():
    """入力スキーマを指定してビルド"""
    builder = TestAgentBuilder()
    graph = builder.build(input_schema=MockInputSchema)

    config = {
        "configurable": {"thread_id": "test_thread"}
    }
    # 正しい入力スキーマでの実行
    result = graph.invoke({"value": "input"}, config=config)
    assert result["value"] == "test"

    # 不正な入力での実行
    with pytest.raises(Exception):
        graph.invoke({"invalid": "input"}, config=config)


def test_build_with_output_schema():
    """出力スキーマを指定してビルド"""
    builder = TestAgentBuilder()
    graph = builder.build(output_schema=MockOutputSchema)

    config = {
        "configurable": {"thread_id": "test_thread"}
    }
    result = graph.invoke({"value": "initial"}, config=config)
    assert result.keys() == MockOutputSchema.__annotations__.keys()
    assert result["value"] == "test"


def test_build_with_debug():
    """デバッグモードでビルド"""
    builder = TestAgentBuilder()
    graph = builder.build(debug=True)

    config = {
        "configurable": {"thread_id": "test_thread"}
    }
    result = graph.invoke({"value": "initial"}, config=config)
    assert result["value"] == "test"


def test_build_with_interrupt():
    """中断ポイントを指定してビルド"""
    builder = TestAgentBuilder()
    graph = builder.build(interrupt_before=["test"])

    # 中断ポイントで実行が停止することを確認
    with pytest.raises(Exception):
        graph.invoke({"value": "initial"})


class TestWhyWhyAgentBuilder:
    """WhyWhyAgentBuilderのテスト"""

    def test_builder_initialization(self):
        """WhyWhyAgentBuilderの初期化をテスト"""
        builder = WhyWhyAgentBuilder()
        assert builder._num_parallel == 3
        assert builder._max_level == 5
        assert builder._initial_analysis is not None
        assert builder._deep_analysis is not None
        assert builder._info_request is not None
        assert builder._root_cause_analysis is not None

    def test_builder_custom_parameters(self):
        """カスタムパラメータでの初期化をテスト"""
        custom_profile = "Custom profile"
        builder = WhyWhyAgentBuilder(
            profile=custom_profile,
            num_parallel=5,
            max_level=7
        )
        assert builder._num_parallel == 5
        assert builder._max_level == 7

    def test_build_with_default_checkpointer(self):
        """デフォルトのチェックポインター（MemorySaver）でのビルドをテスト"""
        builder = WhyWhyAgentBuilder()
        # checkpointerを指定しない場合、MemorySaverが使われる
        graph = builder.build()

        assert graph is not None
        assert isinstance(graph, CompiledStateGraph)


    def test_build_with_custom_checkpointer(self):
        """カスタムチェックポインターでのビルドをテスト"""
        custom_checkpointer = MemorySaver()
        builder = WhyWhyAgentBuilder()
        graph = builder.build(checkpointer=custom_checkpointer)

        assert graph is not None

    def test_state_schema(self):
        """Stateスキーマの定義をテスト"""
        from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder

        state_annotations = WhyWhyAgentBuilder.State.__annotations__
        assert 'problem' in state_annotations
        assert 'why_nodes' in state_annotations
        assert 'chat_history' in state_annotations
        assert 'root_causes' in state_annotations

        # 型チェック
        assert state_annotations['problem'] == ProblemInput
        assert state_annotations['chat_history'] == Optional[List[BaseMessage]]
        # root_causesの型チェックはwhy_why_actionから適切にインポートする必要があるため省略






