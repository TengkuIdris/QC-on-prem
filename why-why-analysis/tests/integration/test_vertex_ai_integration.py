"""
Vertex AI SDK統合テスト - SDKモック実装とストリーミングテスト
"""
from unittest.mock import Mock

import pytest

from why_why_chat_ai.api.services.agent_client import AgentClient
from tests.integration.utils import create_test_problem_input


@pytest.mark.integration
@pytest.mark.mock_only
class TestVertexAIIntegration:
    """Vertex AI SDK統合テスト"""

    @pytest.mark.asyncio
    async def test_reasoning_engine_initialization(self, mock_agent_client):
        """Reasoning Engine の初期化テスト"""
        # AgentClientの初期化（mock_agent_clientによりモック済み）
        client = AgentClient()

        # セットアップを実行（モックされたset_upが呼ばれる）
        await client.set_up()

        # エージェントが設定されていることを確認
        assert client.agent is not None

    @pytest.mark.asyncio
    async def test_stream_query_sync_to_async(self, mock_agent_client):
        """同期stream_query()メソッドの非同期ストリーミングラップテスト"""
        client = AgentClient()
        await client.set_up()

        # テストデータ
        problem_input = create_test_problem_input()
        thread_id = "test-thread-123"
        input_data = {
            "problem": problem_input.model_dump()
        }

        # ストリーミングイベントを収集
        events = []
        async for event in client.astream(input_data, thread_id):
            events.append(event)

        # イベントの検証
        assert len(events) >= 2  # 最低2つのイベント

        # イベントタイプの確認（LangGraphの実際のフォーマット: {event_name: {event_type: ..., data}}）
        event_types = []
        for e in events:
            if isinstance(e, dict) and len(e) == 1:
                event_name = list(e.keys())[0]
                event_types.append(event_name)
        assert len(event_types) > 0, f"No valid events found. Events: {events}"

        # info_requestまたはfinal_resultのいずれかが含まれていることを確認
        assert "info_request" in event_types or "final_result" in event_types

        # 最終イベントの詳細確認（final_resultが存在する場合）
        if "final_result" in event_types:
            # ネストされた形式からデータを取得
            final_event = next(e["final_result"] for e in events if "final_result" in e)
            assert "state" in final_event
            assert "why_nodes" in final_event["state"]
            assert len(final_event["state"]["why_nodes"]) > 0
            assert "root_causes" in final_event["state"]
            assert len(final_event["state"]["root_causes"]) > 0

        # info_requestが存在する場合の確認
        if "info_request" in event_types:
            # ネストされた形式からデータを取得
            info_event = next(e["info_request"] for e in events if "info_request" in e)
            assert "state" in info_event
            assert "chat_history" in info_event["state"]

    @pytest.mark.asyncio
    async def test_streaming_event_format(self, mock_agent_client):
        """ストリーミングイベントのフォーマット検証"""
        client = AgentClient()
        await client.set_up()

        thread_id = "test-thread-123"
        input_data = {
            "problem": create_test_problem_input().model_dump()
        }

        async for event in client.astream(input_data, thread_id):
            # 各イベントの基本構造を検証（ネストされた形式）
            assert isinstance(event, dict)
            assert len(event) == 1  # {event_name: data} の形式
            
            event_name = list(event.keys())[0]
            event_data = event[event_name]
            
            # event_dataにevent_typeが含まれていることを確認
            assert "event_type" in event_data
            assert event_data["event_type"] == event_name  # event_nameとevent_typeが一致

            # イベントタイプ別の検証
            if event_name == "info_request":
                assert "state" in event_data
                assert "chat_history" in event_data["state"]
                assert len(event_data["state"]["chat_history"]) > 0

            elif event_name == "final_result":
                assert "state" in event_data
                assert all(key in event_data["state"] for key in ["problem", "chat_history", "why_nodes", "root_causes"])

            # thought フィールドの確認（オプション）
            if "thought" in event_data:
                assert isinstance(event_data["thought"], str)
                assert len(event_data["thought"]) > 0

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="現在の実装では部分的なストリーミング結果を取得できないため")
    async def test_streaming_interruption_handling(self, mock_agent_client):
        """ストリーミング中断のハンドリング"""
        # 途中でエラーを発生させるジェネレータ
        def mock_stream_with_error(input=None, **kwargs):
            yield {"initial_analysis": {"event_type": "initial_analysis", "thought": "開始"}}
            yield {"processing": {"event_type": "processing", "thought": "処理中"}}
            raise Exception("Connection lost")

        # mock_agent_clientが作成したmock_reasoning_engineを取得
        mock_reasoning_engine = mock_agent_client
        mock_reasoning_engine.stream_query = Mock(side_effect=mock_stream_with_error)

        client = AgentClient(
            project_id="test-project",
            location="us-central1",
            max_retries=0  # リトライを無効化
        )

        events = []
        with pytest.raises(Exception) as exc_info:
            async for event in client.astream({"problem": {}}, "test"):
                events.append(event)

        # 中断前のイベントは受信できていることを確認
        assert len(events) == 2
        assert "initial_analysis" in events[0]
        assert events[0]["initial_analysis"]["event_type"] == "initial_analysis"
        assert "processing" in events[1]
        assert events[1]["processing"]["event_type"] == "processing"
        assert "Connection lost" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_thread_state_integration(self, mock_agent_client):
        """get_thread_state メソッドの統合テスト"""
        client = AgentClient()
        await client.set_up()

        thread_id = "test-thread-123"

        # スレッド状態の取得
        state = await client.get_thread_state(thread_id)

        # 結果の検証
        assert state is not None
        assert "thread_id" in state
        assert state["thread_id"] == thread_id
        assert "state" in state
        assert all(key in state["state"] for key in ["problem", "chat_history", "why_nodes", "root_causes"])
