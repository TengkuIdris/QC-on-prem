"""
FastAPI ライフサイクル管理のテスト
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import FastAPI

from why_why_chat_ai.api.lifespan import app_lifespan


class TestAppLifespan:
    """アプリケーションライフサイクルのテスト"""

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.AgentClient")
    async def test_lifespan_success(self, mock_agent_client_class):
        """正常なライフサイクルのテスト"""
        app = FastAPI()

        # AgentClientのモック設定
        mock_agent_client = AsyncMock()
        mock_agent_client_class.return_value = mock_agent_client

        async with app_lifespan(app):
            # アプリケーション実行中の処理をここでテスト可能
            pass

        # AgentClientが初期化され、set_upが呼ばれたことを確認
        mock_agent_client_class.assert_called_once()
        mock_agent_client.set_up.assert_called_once()

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.AgentClient")
    async def test_lifespan_startup_failure(self, mock_agent_client_class):
        """スタートアップ失敗のテスト"""
        app = FastAPI()

        # AgentClientのモック設定（set_upでエラーを発生）
        mock_agent_client = AsyncMock()
        mock_agent_client.set_up.side_effect = Exception("Startup error")
        mock_agent_client_class.return_value = mock_agent_client

        # エラーが発生することを期待
        with pytest.raises(Exception, match="Startup error"):
            async with app_lifespan(app):
                pass

        # AgentClientが初期化され、set_upが呼ばれたことを確認
        mock_agent_client_class.assert_called_once()
        mock_agent_client.set_up.assert_called_once()

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.AgentClient")
    async def test_lifespan_shutdown_error(self, mock_agent_client_class):
        """シャットダウンエラーのテスト"""
        app = FastAPI()

        # AgentClientのモック設定
        mock_agent_client = AsyncMock()
        mock_agent_client_class.return_value = mock_agent_client

        async with app_lifespan(app):
            pass

        # AgentClientが初期化され、set_upが呼ばれたことを確認
        mock_agent_client_class.assert_called_once()
        mock_agent_client.set_up.assert_called_once()
