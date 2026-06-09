"""
データベース統合後のAgentBuilderのテスト
"""
from langgraph.checkpoint.memory import MemorySaver

from why_why_chat_ai.agent.agent_builder import AgentBuilder


class ConcreteAgentBuilder(AgentBuilder):
    """テスト用のAgentBuilder具象クラス"""

    class State:
        """テスト用の状態クラス"""
        test_field: str = "test"

    def _set_up_graph(self, graph):
        """テスト用のグラフセットアップ"""
        graph.add_node("test_node", lambda x: x)
        graph.set_entry_point("test_node")


class TestAgentBuilderDatabaseIntegration:
    """AgentBuilderのデータベース統合テスト"""

    def setup_method(self):
        """テストセットアップ"""
        self.builder = ConcreteAgentBuilder()



    def test_build_with_explicit_checkpointer(self):
        """明示的なチェックポインターでのビルドテスト"""
        explicit_checkpointer = MemorySaver()

        # Build agent with explicit checkpointer
        agent = self.builder.build(checkpointer=explicit_checkpointer)

        # エージェントが正常に構築されることを確認
        assert agent is not None
        assert hasattr(agent, 'invoke')

        # 明示的に渡されたチェックポインターが使用される
        # （内部的にget_database_managerは呼ばれない）

    def test_build_with_all_parameters(self):
        """すべてのパラメータを指定したビルドテスト"""
        # Build agent with all parameters
        agent = self.builder.build(
            input_schema=dict,
            output_schema=dict,
            interrupt_before=["test_node"],
            debug=True
        )

        # エージェントが正常に構築されることを確認
        assert agent is not None
        assert hasattr(agent, 'invoke')
