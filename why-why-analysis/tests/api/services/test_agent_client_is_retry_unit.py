"""AgentClient の is_retry パラメータのユニットテスト"""
import pytest
from unittest.mock import Mock, AsyncMock
from langgraph.types import Command
from langchain_core.messages import HumanMessage

from why_why_chat_ai.api.services.agent_client import AgentClient


class TestAgentClientIsRetry:
    """AgentClient.astream の is_retry パラメータに関するテスト"""

    @pytest.fixture
    def mock_agent(self):
        """モックエージェントを作成"""
        agent = Mock()

        # 状態履歴をモック
        snapshot1 = Mock()
        snapshot1.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "cp1"}}
        snapshot1.next = ("info_request",)
        snapshot1.values = {"chat_history": [
            {"type": "ai", "content": "質問: なぜギアの位置ずれが発生したのですか？"}
        ]}

        snapshot2 = Mock()
        snapshot2.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "cp2"}}
        snapshot2.next = ("human_input",)
        snapshot2.values = {"chat_history": [
            {"type": "ai", "content": "質問: なぜギアの位置ずれが発生したのですか？"},
            {"type": "human", "content": "最初の回答"}
        ]}

        # get_state_history -> aget_state_history (async generator)
        async def mock_aget_state_history(*args, **kwargs):
            yield snapshot2
            yield snapshot1
        agent.aget_state_history = mock_aget_state_history

        # update_state をモック
        updated_config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "cp1-updated"}}
        agent.aupdate_state = AsyncMock(return_value=updated_config)

        # astream をモック（非同期ジェネレータ）
        async def mock_astream(input=None, config=None):
            yield {"event": "test"}

        agent.astream = mock_astream

        return agent

    @pytest.fixture
    def client(self, mock_agent):
        """テスト用のクライアントを作成"""
        client = AgentClient()
        client.agent = mock_agent
        return client

    @pytest.mark.asyncio
    async def test_is_retry_false_normal_flow(self, client):
        """is_retry=False の通常フロー"""
        # Arrange
        input_data = Command(update={"user_message": "テスト回答"})
        thread_id = "test-thread"

        # Act
        events = []
        async for event in client.astream(input_data, thread_id, is_retry=False):
            events.append(event)

        # Assert
        assert len(events) > 0
        # update_state が呼ばれていないことを確認
        client.agent.update_state.assert_not_called()

    @pytest.mark.asyncio
    async def test_is_retry_true_updates_state(self, client):
        """is_retry=True で過去の状態に戻ることを確認"""
        # Arrange
        input_data = Command(resume={"response": "修正された回答"})
        thread_id = "test-thread"

        # Act
        events = []
        async for event in client.astream(input_data, thread_id, is_retry=True):
            events.append(event)

        # Assert
        assert len(events) > 0

        # update_state が呼ばれたことを確認
        client.agent.aupdate_state.assert_called_once()

        # update_state の引数を検証
        call_args = client.agent.aupdate_state.call_args
        assert call_args.kwargs["as_node"] == "info_request"

        # chat_history が更新されていることを確認
        updated_values = call_args.kwargs["values"]
        assert "chat_history" in updated_values
        chat_history = updated_values["chat_history"]

        # 新しい回答がchat_historyに含まれていることを確認
        assert len(chat_history) >= 2
        # 最後のメッセージがHumanMessageで、正しい内容を持っていることを確認
        assert isinstance(chat_history[-1], HumanMessage)
        assert chat_history[-1].content == "修正された回答"

    @pytest.mark.asyncio
    async def test_is_retry_true_no_previous_info_request(self, client):
        """is_retry=True だが過去に info_request がない場合"""
        # Arrange
        # 履歴に info_request がないようにモック
        snapshot = Mock()
        snapshot.config = {"configurable": {"thread_id": "test-thread"}}
        snapshot.next = ("other_node",)
        snapshot.values = {"chat_history": []}
        async def mock_aget_state_history_empty(*args, **kwargs):
            yield snapshot
        client.agent.aget_state_history = mock_aget_state_history_empty

        input_data = Command(update={"user_message": "修正された回答"})
        thread_id = "test-thread"

        # Act
        events = []
        async for event in client.astream(input_data, thread_id, is_retry=True):
            events.append(event)

        # Assert
        assert len(events) > 0
        # update_state が呼ばれていないことを確認（info_request が見つからなかったため）
        client.agent.update_state.assert_not_called()

    @pytest.mark.asyncio
    async def test_is_retry_true_handles_empty_history(self, client):
        """is_retry=True で履歴が空の場合のエラーハンドリング"""
        # Arrange
        # 履歴が空の場合のエラーハンドリング
        async def mock_aget_state_history_empty2(*args, **kwargs):
            if False:
                yield  # 空のasync generator
        client.agent.aget_state_history = mock_aget_state_history_empty2

        input_data = Command(update={"user_message": "修正された回答"})
        thread_id = "test-thread"

        # Act
        events = []
        async for event in client.astream(input_data, thread_id, is_retry=True):
            events.append(event)

        # Assert
        assert len(events) > 0
        # update_state が呼ばれていないことを確認
        client.agent.update_state.assert_not_called()
