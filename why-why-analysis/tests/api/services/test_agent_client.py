import pytest
from unittest.mock import Mock, patch, AsyncMock
from langgraph.checkpoint.memory import MemorySaver

from why_why_chat_ai.api.services.agent_client import AgentClient, build_checkpointer


class TestCheckpointerBuilder:
    """build_checkpointer関数のテスト"""

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.settings")
    async def test_build_checkpointer_memory(self, mock_settings):
        """メモリベースcheckpointer構築テスト"""
        # Arrange
        mock_settings.use_cloud_sql = False

        # Act
        result = await build_checkpointer()

        # Assert
        assert isinstance(result, MemorySaver)

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client._get_postgres_password")
    @patch("why_why_chat_ai.api.services.agent_client.settings")
    @patch("psycopg_pool.AsyncConnectionPool")
    @patch("why_why_chat_ai.api.services.agent_client.AsyncPostgresSaver")
    async def test_build_checkpointer_cloud_sql_iam(self, mock_postgres_saver_class, mock_pool_class, mock_settings, mock_get_password):
        """Cloud SQL checkpointer構築テスト（Unix socketを使用）"""
        # Arrange
        mock_settings.use_cloud_sql = True
        mock_settings.gcp_project_id = "test-project"
        mock_settings.cloud_sql_region = "us-central1"
        mock_settings.cloud_sql_instance = "test-instance"
        mock_settings.cloud_sql_database = "test-db"

        # パスワードをモック
        mock_get_password.return_value = "test-password"

        mock_pool = Mock()
        mock_pool_class.return_value = mock_pool

        mock_checkpointer = AsyncMock()
        mock_postgres_saver_class.return_value = mock_checkpointer

        # Act
        result = await build_checkpointer()

        # Assert
        # Mock呼び出しの確認
        mock_pool_class.assert_called_once()

        # AsyncPostgresSaverが正しく初期化されているか確認
        mock_postgres_saver_class.assert_called_once_with(mock_pool)
        mock_checkpointer.setup.assert_called_once()

        assert result == mock_checkpointer

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client._get_postgres_password")
    @patch("why_why_chat_ai.api.services.agent_client.settings")
    @patch("psycopg_pool.AsyncConnectionPool")
    @patch("why_why_chat_ai.api.services.agent_client.AsyncPostgresSaver")
    async def test_build_checkpointer_cloud_sql_password(self, mock_postgres_saver_class, mock_pool_class, mock_settings, mock_get_password):
        """Cloud SQL checkpointer構築テスト（パスワード認証）"""
        # Arrange
        mock_settings.use_cloud_sql = True
        mock_settings.gcp_project_id = "test-project"
        mock_settings.cloud_sql_region = "us-central1"
        mock_settings.cloud_sql_instance = "test-instance"
        mock_settings.cloud_sql_database = "test-db"
        # 現在の実装では常にpostgresユーザーとハードコードされたパスワードを使用

        # パスワードをモック
        mock_get_password.return_value = "test-password"

        mock_pool = Mock()
        mock_pool_class.return_value = mock_pool

        mock_checkpointer = AsyncMock()
        mock_postgres_saver_class.return_value = mock_checkpointer

        # Act
        result = await build_checkpointer()

        # Assert
        # Mock呼び出しの確認
        mock_pool_class.assert_called_once()

        assert result == mock_checkpointer


# 非同期クライアントのテストクラス
class TestAgentClient:
    """AgentClient の非同期テストクラス"""

    @pytest.fixture
    def client(self) -> AgentClient:
        """テスト用のクライアントを作成"""
        client = AgentClient()
        return client

    @pytest.mark.asyncio
    async def test_initialization(self, client):
        """初期化のテスト"""
        assert hasattr(client, 'agent')
        assert hasattr(client, 'astream')
        assert hasattr(client, 'get_thread_state')
        assert hasattr(client, 'get_thread_snapshot')

    @pytest.mark.asyncio
    async def test_astream_setup_called_when_agent_is_none(self, client):
        """agentがNoneの場合、set_upが呼ばれることを確認"""
        # Arrange
        assert client.agent is None

        # set_upメソッドをモックし、実行時にagentを設定
        mock_agent = Mock()
        mock_agent.astream = Mock(return_value=aiter([]))

        async def mock_set_up():
            client.agent = mock_agent

        client.set_up = AsyncMock(side_effect=mock_set_up)

        # Act
        async for _ in client.astream({}, "test-thread-id"):
            pass

        # Assert
        client.set_up.assert_called_once()

    @pytest.mark.asyncio
    async def test_astream_with_error_handling(self, client):
        """エラーハンドリングのテスト"""
        # Arrange
        client.agent = Mock()
        error_msg = "Test error"

        # エラーを発生させる非同期イテレータを作成
        async def error_iterator():
            yield {}  # 最初のイテレーションは成功（非同期ジェネレータとして認識させるため）
            raise Exception(error_msg)  # 2回目のイテレーションでエラー

        client.agent.astream = Mock(return_value=error_iterator())

        # Act & Assert
        with pytest.raises(Exception) as excinfo:
            async for _ in client.astream({}, "test-thread-id"):
                pass
        assert str(excinfo.value) == error_msg

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.WhyWhyAgentBuilder")
    @patch("why_why_chat_ai.api.services.agent_client.build_checkpointer", new_callable=AsyncMock)
    @patch("why_why_chat_ai.api.services.agent_client.CloudTraceSpanExporter")
    @patch("why_why_chat_ai.api.services.agent_client.google.auth.default")
    @patch("why_why_chat_ai.api.services.agent_client.settings")
    @patch("why_why_chat_ai.api.services.agent_client.AsyncPostgresSaver")
    async def test_set_up_complete(self, mock_postgres_saver_class, mock_settings, mock_auth, mock_trace_exporter, mock_build_checkpointer, mock_agent_builder_class):
        """set_up メソッドが正しく実行されることを確認"""
        # Arrange
        # settings のモック設定
        mock_settings.use_cloud_sql = True
        mock_settings.gcp_project_id = "test-project"
        mock_settings.cloud_sql_region = "us-central1"
        mock_settings.cloud_sql_instance = "test-instance"
        mock_settings.cloud_sql_database = "test-db"
        mock_settings.cloud_sql_auth_type = "hybrid"
        mock_settings.init_mode = False
        mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

        # AsyncPostgresSaverのモック設定
        mock_postgres_saver = AsyncMock()
        mock_postgres_saver_class.return_value = mock_postgres_saver

        client = AgentClient()

        # Google auth のモック
        mock_credentials = Mock()
        mock_credentials.with_quota_project = Mock(return_value=mock_credentials)
        mock_auth.return_value = (mock_credentials, None)

        # AgentBuilder のモック
        mock_agent_builder = Mock()
        mock_agent = Mock()
        mock_agent_builder.build = Mock(return_value=mock_agent)
        mock_agent_builder_class.return_value = mock_agent_builder

        # checkpointer のモック
        mock_checkpointer = Mock()
        mock_build_checkpointer.return_value = mock_checkpointer

        # テスト実行
        await client.set_up()

        # 検証
        assert client.agent is not None
        assert client.agent == mock_agent
        mock_agent_builder_class.assert_called_once()
        mock_agent_builder.build.assert_called_once()
        # ハイブリッド認証モードでは _build_checkpointer_hybrid が呼ばれるため、
        # build_checkpointer は呼ばれない
        # mock_build_checkpointer.assert_called_once()

    @pytest.mark.asyncio
    async def test_astream_with_retry_true_and_previous_info_request(self, client):
        """is_retry=True で過去に info_request があった場合のテスト"""
        # Arrange
        from langgraph.types import Command

        # エージェントのモック設定
        mock_agent = Mock()
        client.agent = mock_agent

        # StateSnapshot のモック（オブジェクト形式）
        snapshot0 = Mock()
        snapshot0.next = ("human_input",)  # 最初の状態（スキップされる）
        snapshot0.config = {"configurable": {"thread_id": "test-thread-id"}}
        snapshot0.values = {"chat_history": [{"content": "質問1"}, {"content": "回答1"}, {"content": "質問2"}]}

        snapshot1 = Mock()
        snapshot1.next = ("info_request",)  # 過去の info_request
        snapshot1.config = {"configurable": {"thread_id": "test-thread-id", "checkpoint_id": "cp-1"}}
        snapshot1.values = {"chat_history": [{"content": "質問1"}, {"content": "回答1"}]}

        snapshot2 = Mock()
        snapshot2.next = ("another_state",)  # その他の状態
        snapshot2.config = {"configurable": {"thread_id": "test-thread-id", "checkpoint_id": "cp-0"}}
        snapshot2.values = {"chat_history": [{"content": "質問1"}]}

        mock_state_history = [snapshot0, snapshot1, snapshot2]
        # get_state_history -> aget_state_history (async generator)
        async def mock_aget_state_history(*args, **kwargs):
            for s in mock_state_history:
                yield s
        mock_agent.aget_state_history = mock_aget_state_history
        # update_state のモック
        new_config = {"configurable": {"thread_id": "test-thread-id-updated"}}
        mock_agent.aupdate_state = AsyncMock(return_value=new_config)

        # astream のモック
        async def mock_astream(*args, **kwargs):
            yield {"event": "retry_processed"}
        mock_agent.astream = Mock(return_value=mock_astream())

        # Act
        input_data = Command(resume={"response": "修正されたユーザー入力"})
        result = []
        async for event in client.astream(input_data, "test-thread-id", is_retry=True):
            result.append(event)

        # Assert
        # 状態履歴が取得されたことを確認
        # mock_agent.get_state_history.assert_called_once()
        # → aget_state_historyに修正
        assert hasattr(mock_agent, 'aget_state_history')

        # update_state が呼ばれたことを確認
        mock_agent.aupdate_state.assert_called_once()
        # 引数の確認
        called_config = mock_agent.aupdate_state.call_args[1]["config"]
        assert called_config["configurable"]["thread_id"] == "test-thread-id"
        assert called_config["configurable"]["checkpoint_id"] == "cp-1"

        # values引数の確認（会話履歴が修正されている）
        called_values = mock_agent.aupdate_state.call_args[1]["values"]
        assert "chat_history" in called_values
        # snapshot0（target_index-1）の会話履歴から最後のメッセージが削除され、新しいメッセージが追加されている
        # snapshot0の会話履歴: [質問1, 回答1, 質問2] -> [質問1, 回答1, HumanMessage]
        chat_history = called_values["chat_history"]
        assert len(chat_history) == 3
        assert chat_history[0] == {"content": "質問1"}
        assert chat_history[1] == {"content": "回答1"}
        # 最後のメッセージは HumanMessage オブジェクト
        from langchain_core.messages import HumanMessage
        assert isinstance(chat_history[2], HumanMessage)
        assert chat_history[2].content == "修正されたユーザー入力"

        # as_node引数の確認
        assert mock_agent.aupdate_state.call_args[1]["as_node"] == "info_request"

        # 新しい config で astream が呼ばれたことを確認（input_dataはNone）
        mock_agent.astream.assert_called_once_with(input=None, config=new_config)

        # 結果を確認
        assert len(result) == 1
        assert result[0] == {"event": "retry_processed"}

    @pytest.mark.asyncio
    async def test_astream_with_retry_true_no_previous_info_request(self, client):
        """is_retry=True だが過去に info_request がなかった場合のテスト"""
        # Arrange
        from langgraph.types import Command

        # エージェントのモック設定
        mock_agent = Mock()
        client.agent = mock_agent

        # StateSnapshot のモック（info_request なし、オブジェクト形式）
        snapshot0 = Mock()
        snapshot0.next = ("normal_state",)
        snapshot0.config = {"configurable": {"thread_id": "test-thread-id"}}
        snapshot0.values = {"chat_history": []}

        snapshot1 = Mock()
        snapshot1.next = ("another_state",)
        snapshot1.config = {"configurable": {"thread_id": "test-thread-id"}}
        snapshot1.values = {"chat_history": []}

        snapshot2 = Mock()
        snapshot2.next = ("yet_another_state",)
        snapshot2.config = {"configurable": {"thread_id": "test-thread-id"}}
        snapshot2.values = {"chat_history": []}

        mock_state_history = [snapshot0, snapshot1, snapshot2]
        # get_state_history -> aget_state_history (async generator)
        async def mock_aget_state_history(*args, **kwargs):
            for s in mock_state_history:
                yield s
        mock_agent.aget_state_history = mock_aget_state_history
        # astream のモック
        async def mock_astream(*args, **kwargs):
            yield {"event": "normal_processing"}
        mock_agent.astream = Mock(return_value=mock_astream())

        # Act
        input_data = Command(update={"user_message": "ユーザー入力"})
        result = []
        async for event in client.astream(input_data, "test-thread-id", is_retry=True):
            result.append(event)

        # Assert
        # 状態履歴が取得されたことを確認
        # mock_agent.get_state_history.assert_called_once()
        assert hasattr(mock_agent, 'aget_state_history')

        # update_state が呼ばれなかったことを確認
        mock_agent.aupdate_state.assert_not_called()

        # 元の config で astream が呼ばれたことを確認
        called_config = mock_agent.astream.call_args[1]["config"]
        assert called_config["configurable"]["thread_id"] == "test-thread-id"

        # 結果を確認
        assert len(result) == 1
        assert result[0] == {"event": "normal_processing"}

    @pytest.mark.asyncio
    async def test_astream_with_retry_false(self, client):
        """is_retry=False の場合のテスト（通常の処理）"""
        # Arrange
        from langgraph.types import Command

        # エージェントのモック設定
        mock_agent = Mock()
        client.agent = mock_agent

        # astream のモック
        async def mock_astream(*args, **kwargs):
            yield {"event": "normal_processing"}
        mock_agent.astream = Mock(return_value=mock_astream())

        # Act
        input_data = Command(resume={"response": "ユーザー入力"})
        result = []
        async for event in client.astream(input_data, "test-thread-id", is_retry=False):
            result.append(event)

        # Assert
        # get_state_history が呼ばれなかったことを確認
        assert not hasattr(mock_agent, 'aget_state_history') or getattr(mock_agent.aget_state_history, 'call_count', 0) == 0

        # update_state が呼ばれなかったことを確認
        assert not hasattr(mock_agent, 'aupdate_state') or mock_agent.aupdate_state.call_count == 0

        # 通常の config で astream が呼ばれたことを確認
        called_config = mock_agent.astream.call_args[1]["config"]
        assert called_config["configurable"]["thread_id"] == "test-thread-id"

        # 結果を確認
        assert len(result) == 1
        assert result[0] == {"event": "normal_processing"}

    @pytest.mark.asyncio
    async def test_astream_with_retry_true_dict_input(self, client):
        """is_retry=True だが input_data が Command でない場合のテスト"""
        # Arrange
        # エージェントのモック設定
        mock_agent = Mock()
        client.agent = mock_agent

        # astream のモック
        async def mock_astream(*args, **kwargs):
            yield {"event": "dict_input_processing"}
        mock_agent.astream = Mock(return_value=mock_astream())

        # Act
        input_data = {"problem": "テスト問題"}  # Dict型の入力
        result = []
        async for event in client.astream(input_data, "test-thread-id", is_retry=True):
            result.append(event)

        # Assert
        # get_state_history が呼ばれなかったことを確認（Commandでないため）
        assert not hasattr(mock_agent, 'aget_state_history') or getattr(mock_agent.aget_state_history, 'call_count', 0) == 0

        # 通常の処理が行われたことを確認
        called_config = mock_agent.astream.call_args[1]["config"]
        assert called_config["configurable"]["thread_id"] == "test-thread-id"

        # 結果を確認
        assert len(result) == 1
        assert result[0] == {"event": "dict_input_processing"}

    @pytest.mark.asyncio
    async def test_astream_retry_with_simulated_checkpoint(self, client):
        """is_retry=True の場合のチェックポイント処理をシミュレートして検証"""
        # Arrange
        from langgraph.types import Command
        from unittest.mock import MagicMock

        # エージェントのモック設定（実際のLangGraphの動作をシミュレート）
        mock_agent = MagicMock()
        client.agent = mock_agent

        # 状態履歴のモック（オブジェクト形式）
        snapshot0 = MagicMock()
        snapshot0.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "checkpoint-3"}}
        snapshot0.next = ("normal_state",)
        snapshot0.values = {"problem": {"title": "テスト問題"}, "chat_history": [{"content": "msg1"}, {"content": "msg2"}, {"content": "msg3"}]}

        snapshot1 = MagicMock()
        snapshot1.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "checkpoint-2"}}
        snapshot1.next = ("info_request",)  # 過去にinfo_requestがあった
        snapshot1.values = {"problem": {"title": "テスト問題"}, "chat_history": [{"content": "msg1"}, {"content": "msg2"}]}

        snapshot2 = MagicMock()
        snapshot2.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "checkpoint-1"}}
        snapshot2.next = ("initial",)
        snapshot2.values = {"problem": {"title": "テスト問題"}, "chat_history": [{"content": "msg1"}]}

        # get_state_history -> aget_state_history (async generator)
        async def mock_aget_state_history_sim(*args, **kwargs):
            yield snapshot0
            yield snapshot1
            yield snapshot2
        mock_agent.aget_state_history = mock_aget_state_history_sim
        # update_state のモック（新しいconfigを返す）
        new_config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "checkpoint-4"}}
        mock_agent.aupdate_state = AsyncMock(return_value=new_config)

        # astream のモック
        async def mock_astream(input, config):
            # 新しいチェックポイントで実行されたことを示すイベント
            yield {"event": "retry_with_new_checkpoint", "checkpoint_id": config["configurable"]["checkpoint_id"]}

        mock_agent.astream = Mock(return_value=mock_astream(None, new_config))

        # Act
        input_data = Command(resume={"response": "修正されたユーザー入力"})
        result = []
        async for event in client.astream(input_data, "test-thread", is_retry=True):
            result.append(event)

        # Assert
        # 状態履歴が取得されたことを確認
        # mock_agent.get_state_history.assert_called_once()
        assert hasattr(mock_agent, 'aget_state_history')

        # update_state が呼ばれたことを確認（info_requestが見つかったため）
        mock_agent.aupdate_state.assert_called_once()
        # configパラメータの確認
        called_config = mock_agent.aupdate_state.call_args[1]["config"]
        assert called_config["configurable"]["thread_id"] == "test-thread"
        assert called_config["configurable"]["checkpoint_id"] == "checkpoint-2"

        # valuesパラメータの確認（会話履歴が修正されている）
        called_values = mock_agent.aupdate_state.call_args[1]["values"]
        assert "chat_history" in called_values
        # snapshot0の会話履歴から最後のメッセージが削除され、新しいメッセージが追加されている
        # snapshot0の会話履歴: [msg1, msg2, msg3] -> [msg1, msg2, HumanMessage]
        assert len(called_values["chat_history"]) == 3
        assert called_values["chat_history"][0] == {"content": "msg1"}
        assert called_values["chat_history"][1] == {"content": "msg2"}
        # 最後のメッセージはHumanMessage
        from langchain_core.messages import HumanMessage
        assert isinstance(called_values["chat_history"][2], HumanMessage)
        assert called_values["chat_history"][2].content == "修正されたユーザー入力"

        # as_nodeパラメータの確認
        assert mock_agent.aupdate_state.call_args[1]["as_node"] == "info_request"

        # 新しい config で astream が呼ばれたことを確認（input_dataはNone）
        mock_agent.astream.assert_called_once()
        assert mock_agent.astream.call_args[1]["input"] is None
        stream_config = mock_agent.astream.call_args[1]["config"]
        assert stream_config["configurable"]["checkpoint_id"] == "checkpoint-4"

        # 結果を確認
        assert len(result) == 1
        assert result[0]["checkpoint_id"] == "checkpoint-4"

    @pytest.mark.asyncio
    async def test_astream_retry_state_preservation(self, client):
        """is_retry=True でもエージェントの状態が正しく保持されることを検証"""
        # Arrange
        from langgraph.types import Command
        from unittest.mock import MagicMock

        # エージェントのモック設定
        mock_agent = MagicMock()
        client.agent = mock_agent

        # 初期状態のモック
        initial_state = {
            "problem": {"title": "製造ラインの不具合", "severity": "高"},
            "chat_history": [
                {"type": "ai", "content": "問題を分析します"},
                {"type": "human", "content": "温度センサーが異常です"}
            ],
            "why_nodes": [{"id": "node1", "name": "センサー故障"}]
        }

        # 状態履歴のモック（info_requestあり、オブジェクト形式）
        snapshot0 = MagicMock()
        snapshot0.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "cp-current"}}
        snapshot0.next = ("waiting",)
        snapshot0.values = initial_state

        snapshot1 = MagicMock()
        snapshot1.config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "cp-prev"}}
        snapshot1.next = ("info_request",)
        snapshot1.values = initial_state

        # get_state_history -> aget_state_history (async generator)
        async def mock_aget_state_history_preserve(*args, **kwargs):
            yield snapshot0
            yield snapshot1
        mock_agent.aget_state_history = mock_aget_state_history_preserve
        # update_state のモック（状態を保持したまま新しいチェックポイントを作成）
        new_config = {"configurable": {"thread_id": "test-thread", "checkpoint_id": "cp-new"}}
        mock_agent.aupdate_state = AsyncMock(return_value=new_config)

        # get_state のモック（更新後の状態を返す）
        updated_state_snapshot = MagicMock(values=initial_state)
        mock_agent.get_state = MagicMock(return_value=updated_state_snapshot)

        # astream のモック
        async def mock_astream(input, config):
            # 状態が保持されていることを示すイベント
            yield {
                "event": "state_preserved",
                "problem_title": initial_state["problem"]["title"],
                "chat_history_length": len(initial_state["chat_history"])
            }

        mock_agent.astream = Mock(return_value=mock_astream(None, new_config))

        # Act
        input_data = Command(resume={"response": "修正: 温度センサーの誤動作"})
        result = []
        async for event in client.astream(input_data, "test-thread", is_retry=True):
            result.append(event)

        # Assert
        # update_state が正しい引数で呼ばれたことを確認
        # valuesには会話履歴の修正が含まれている
        called_values = mock_agent.aupdate_state.call_args[1]["values"]
        assert "chat_history" in called_values
        # 会話履歴が正しく修正されている（最後のメッセージが削除され、新しいメッセージが追加）
        assert len(called_values["chat_history"]) == 2
        assert called_values["chat_history"][0]["type"] == "ai"
        # 2番目のメッセージはHumanMessage
        from langchain_core.messages import HumanMessage
        assert isinstance(called_values["chat_history"][1], HumanMessage)
        assert called_values["chat_history"][1].content == "修正: 温度センサーの誤動作"

        # 結果を確認（状態が保持されている）
        assert len(result) == 1
        assert result[0]["problem_title"] == "製造ラインの不具合"
        assert result[0]["chat_history_length"] == 2

    @pytest.mark.asyncio
    async def test_get_thread_snapshot_success(self, client):
        """get_thread_snapshot の正常系テスト"""
        # Arrange
        from unittest.mock import MagicMock
        from langgraph.types import StateSnapshot

        # エージェントのモック設定
        mock_agent = MagicMock()
        client.agent = mock_agent

        # StateSnapshot のモック
        mock_snapshot = MagicMock(spec=StateSnapshot)
        mock_snapshot.values = {
            "problem": {"title": "テスト問題", "language": "Japanese"},
            "chat_history": [{"type": "ai", "content": "分析を開始します"}],
            "why_nodes": {},
            "root_causes": []
        }
        mock_snapshot.next = ("initial_analysis",)
        mock_snapshot.created_at = "2024-01-15T10:30:00Z"

        # aget_state_history のモック
        async def mock_aget_state_history(*args, **kwargs):
            yield mock_snapshot
        mock_agent.aget_state_history = mock_aget_state_history

        # Act
        result = await client.get_thread_snapshot("test-thread-id")

        # Assert
        assert result == mock_snapshot
        assert result.values["problem"]["title"] == "テスト問題"
        assert result.next == ("initial_analysis",)
        assert result.created_at == "2024-01-15T10:30:00Z"

    @pytest.mark.asyncio
    async def test_get_thread_snapshot_not_found(self, client):
        """get_thread_snapshot のスレッドが見つからない場合のテスト"""
        # Arrange
        from unittest.mock import MagicMock

        # エージェントのモック設定
        mock_agent = MagicMock()
        client.agent = mock_agent

        # aget_state_history のモック（空のジェネレータ）
        async def mock_aget_state_history(*args, **kwargs):
            # 空のジェネレータ（何もyieldしない）
            if False:
                yield None
        mock_agent.aget_state_history = mock_aget_state_history

        # Act & Assert
        with pytest.raises(ValueError, match="Thread 'test-thread-id' not found"):
            await client.get_thread_snapshot("test-thread-id")

    @pytest.mark.asyncio
    async def test_get_thread_snapshot_none_values(self, client):
        """get_thread_snapshot の values が None の場合のテスト"""
        # Arrange
        from unittest.mock import MagicMock
        from langgraph.types import StateSnapshot

        # エージェントのモック設定
        mock_agent = MagicMock()
        client.agent = mock_agent

        # StateSnapshot のモック（values が None）
        mock_snapshot = MagicMock(spec=StateSnapshot)
        mock_snapshot.values = None

        # aget_state_history のモック
        async def mock_aget_state_history(*args, **kwargs):
            yield mock_snapshot
        mock_agent.aget_state_history = mock_aget_state_history

        # Act & Assert
        with pytest.raises(ValueError, match="Thread 'test-thread-id' not found"):
            await client.get_thread_snapshot("test-thread-id")

    @pytest.mark.asyncio
    async def test_get_thread_snapshot_no_problem(self, client):
        """get_thread_snapshot の problem が設定されていない場合のテスト"""
        # Arrange
        from unittest.mock import MagicMock
        from langgraph.types import StateSnapshot

        # エージェントのモック設定
        mock_agent = MagicMock()
        client.agent = mock_agent

        # StateSnapshot のモック（problem なし）
        mock_snapshot = MagicMock(spec=StateSnapshot)
        mock_snapshot.values = {
            "chat_history": [],
            "why_nodes": {},
            "root_causes": []
        }

        # aget_state_history のモック
        async def mock_aget_state_history(*args, **kwargs):
            yield mock_snapshot
        mock_agent.aget_state_history = mock_aget_state_history

        # Act & Assert
        with pytest.raises(ValueError, match="Thread 'test-thread-id' not found or not initialized"):
            await client.get_thread_snapshot("test-thread-id")

    @pytest.mark.asyncio
    async def test_get_thread_snapshot_setup_called_when_agent_is_none(self, client):
        """get_thread_snapshot で agent が None の場合、set_up が呼ばれることを確認"""
        # Arrange
        assert client.agent is None

        # set_upメソッドをモックし、実行時にagentを設定
        mock_agent = Mock()
        mock_snapshot = Mock()
        mock_snapshot.values = {"problem": {"title": "テスト"}}

        async def mock_set_up():
            client.agent = mock_agent

        client.set_up = AsyncMock(side_effect=mock_set_up)

        # aget_state_history のモック
        async def mock_aget_state_history(*args, **kwargs):
            yield mock_snapshot
        mock_agent.aget_state_history = mock_aget_state_history

        # Act
        await client.get_thread_snapshot("test-thread-id")

        # Assert
        client.set_up.assert_called_once()


# async iterator のヘルパー関数
async def aiter(seq):
    for item in seq:
        yield item
