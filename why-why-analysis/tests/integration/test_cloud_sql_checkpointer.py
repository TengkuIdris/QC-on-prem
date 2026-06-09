"""
Cloud SQL チェックポインターの統合テスト

このテストは実際のCloud SQL環境で実行されることを想定しています。
ローカルでは USE_CLOUD_SQL=false の場合はスキップされます。
"""
import os
import pytest
from unittest.mock import patch
from datetime import datetime, timezone
import uuid
from langgraph.checkpoint.memory import MemorySaver


@pytest.mark.integration
class TestCloudSQLCheckpointer:
    """Cloud SQL チェックポインターの統合テスト"""

    @pytest.mark.mock_only
    @pytest.mark.asyncio
    async def test_build_checkpointer_with_memory_saver(self):
        """メモリベースのチェックポインターが作成されること"""
        # Arrange
        from why_why_chat_ai.agent import config
        with patch.object(config.settings, 'use_cloud_sql', False):
            from why_why_chat_ai.api.services.agent_client import build_checkpointer

            # Act
            checkpointer = await build_checkpointer()

            # Assert
            assert isinstance(checkpointer, MemorySaver)
            # LangGraphの実装でMemorySaverは実際にはInMemorySaverクラスのインスタンス
            assert type(checkpointer).__name__ in ["MemorySaver", "InMemorySaver"]

    @pytest.mark.skipif(
        os.getenv("USE_CLOUD_SQL", "false").lower() != "true",
        reason="Cloud SQL not configured for testing"
    )
    @pytest.mark.requires_db
    @pytest.mark.requires_gcp
    @pytest.mark.asyncio
    async def test_build_checkpointer_with_cloud_sql(self):
        """Cloud SQLチェックポインターが作成されること"""
        # 実際のCloud SQL環境でのみ実行
        from why_why_chat_ai.api.services.agent_client import build_checkpointer

        checkpointer = await build_checkpointer()

        # PostgresSaverであることを確認
        assert "PostgresSaver" in type(checkpointer).__name__
        assert hasattr(checkpointer, "_engine")
        assert hasattr(checkpointer, "_schema_name")

    @patch("why_why_chat_ai.agent.config.settings")
    @pytest.mark.mock_only
    @pytest.mark.asyncio
    async def test_checkpointer_initialization_error_handling(self, mock_settings):
        """チェックポインター初期化エラーのハンドリング"""
        # Arrange
        mock_settings.use_cloud_sql = True
        mock_settings.gcp_project_id = "test-project"
        mock_settings.cloud_sql_region = "test-region"
        mock_settings.cloud_sql_instance = "test-instance"
        mock_settings.cloud_sql_database = "test-db"
        mock_settings.checkpoint_schema = "test-schema"

        # psycopg_poolの接続を失敗させる
        with patch("psycopg_pool.AsyncConnectionPool") as mock_pool:
            mock_pool.side_effect = Exception("Connection failed")

            from why_why_chat_ai.api.services.agent_client import build_checkpointer

            # Act
            checkpointer = await build_checkpointer()

            # Assert - エラー時はMemorySaverにフォールバック
            assert isinstance(checkpointer, MemorySaver)

    @pytest.mark.mock_only
    @pytest.mark.asyncio
    async def test_checkpointer_basic_operations(self):
        """チェックポインターの基本操作テスト"""
        from why_why_chat_ai.agent import config
        from why_why_chat_ai.api.services.agent_client import build_checkpointer
        from langgraph.checkpoint.base import BaseCheckpointSaver

        # USE_CLOUD_SQL=falseに設定してMemorySaverを使用
        with patch.object(config.settings, 'use_cloud_sql', False):
            # チェックポインターを作成
            checkpointer = await build_checkpointer()

            # チェックポインターが正しく実装されていることを確認
            assert isinstance(checkpointer, BaseCheckpointSaver)

            # テスト用のチェックポイントデータ
            thread_id = f"test-{uuid.uuid4().hex[:8]}"
            config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}

            # LangGraphのチェックポイントは辞書形式
            checkpoint = {
                "v": 1,
                "ts": datetime.now(timezone.utc).isoformat(),
                "id": f"checkpoint-{uuid.uuid4().hex[:8]}",
                "channel_values": {"messages": ["Hello", "World"]},
                "channel_versions": {"messages": 1},
                "versions_seen": {},
                "pending_sends": []
            }

            # 書き込み
            checkpointer.put(config, checkpoint, {}, {"messages": 1})

            # 読み込み
            retrieved = checkpointer.get(config)

            # 検証
            assert retrieved is not None
            # retrievedがCheckpointオブジェクトか辞書かを確認
            if hasattr(retrieved, 'checkpoint'):
                # Checkpointオブジェクトの場合
                assert retrieved.checkpoint["ts"] == checkpoint["ts"]
                assert retrieved.checkpoint["channel_values"] == checkpoint["channel_values"]
            else:
                # 辞書の場合
                assert retrieved["ts"] == checkpoint["ts"]
                assert retrieved["channel_values"] == checkpoint["channel_values"]

    @pytest.mark.asyncio
    @pytest.mark.mock_only
    async def test_health_endpoint_with_checkpointer(self):
        """ヘルスエンドポイントが基本情報を返すこと"""
        from httpx import AsyncClient, ASGITransport
        from why_why_chat_ai.api.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # 基本的なフィールドの存在を確認
        assert "status" in data
        assert "environment" in data
        assert "version" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        os.getenv("ENVIRONMENT", "development") == "production",
        reason="Test endpoint not available in production"
    )
    @pytest.mark.mock_only
    @pytest.mark.skip(reason="Requires full app initialization with proper mocking")
    async def test_checkpointer_test_endpoint(self):
        """チェックポインターテストエンドポイントの動作確認"""
        from httpx import AsyncClient, ASGITransport
        from why_why_chat_ai.api.app import app
        from unittest.mock import Mock, AsyncMock
        from why_why_chat_ai.api.services.agent_client import AgentClient

        # AgentClientのモックを作成
        mock_agent_client = Mock(spec=AgentClient)
        mock_agent = Mock()
        mock_checkpointer = Mock()
        mock_checkpointer.__class__.__name__ = "MemorySaver"
        mock_checkpointer.__class__.__module__ = "langgraph.checkpoint.memory"

        # チェックポイントの書き込み・読み込みをモック
        # Checkpointは辞書形式で作成
        test_checkpoint = {
            "v": 1,
            "ts": "2024-01-01T00:00:00",
            "id": "test-checkpoint-id",
            "channel_values": {"test": "value"},
            "channel_versions": {},
            "versions_seen": {},
            "pending_sends": []
        }

        mock_checkpointer.put = Mock()
        mock_checkpointer.get = Mock(return_value=Mock(checkpoint=test_checkpoint))

        mock_agent.checkpointer = mock_checkpointer
        mock_agent_client.agent = mock_agent
        mock_agent_client.set_up = AsyncMock()

        # アプリケーションのstateにモックを設定
        app.state.agent_client = mock_agent_client

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/debug/checkpointer-test")

        # 開発環境では200が返る
        if os.getenv("ENVIRONMENT", "development") == "development":
            assert response.status_code == 200
            data = response.json()

            assert "checkpointer_info" in data
            assert "write_test" in data
            assert "read_test" in data
            assert "errors" in data

            # チェックポインター情報の確認
            assert data["checkpointer_info"]["type"] == "MemorySaver"
            assert data["checkpointer_info"]["module"] == "langgraph.checkpoint.memory"

            # 書き込みテストが成功していること
            assert data["write_test"]["status"] == "success"
            assert "thread_id" in data["write_test"]
            assert "checkpoint_ts" in data["write_test"]

            # 読み込みテストも成功していること
            assert data["read_test"]["status"] == "success"
            assert data["read_test"]["matches"] is True
