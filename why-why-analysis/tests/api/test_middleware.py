"""ミドルウェアのテスト"""

import pytest
from unittest.mock import Mock, patch
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from why_why_chat_ai.api.middleware import IPWhitelistMiddleware
from why_why_chat_ai.api.security import security_settings


class TestIPWhitelistMiddleware:
    """IPホワイトリストミドルウェアのテスト"""

    @pytest.fixture
    def middleware(self):
        """ミドルウェアインスタンスを作成"""
        mock_app = Mock()
        middleware = IPWhitelistMiddleware(mock_app)
        return middleware

    @pytest.fixture
    def mock_request(self):
        """モックリクエストオブジェクトを作成"""
        request = Mock(spec=Request)
        request.url = Mock()
        request.url.path = "/v1/threads"
        request.headers = {}
        request.client = Mock()
        request.client.host = "192.168.1.100"
        return request

    @staticmethod
    async def call_next_success(request):
        """成功レスポンスを返すcall_next関数"""
        return Response(content="Success", status_code=200)

    @pytest.mark.asyncio
    async def test_no_whitelist_allows_all(self, middleware, mock_request):
        """ホワイトリストが空の場合、全てのIPが許可されること"""
        with patch.object(security_settings, 'ip_whitelist', []):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 200
        assert response.body == b"Success"

    @pytest.mark.asyncio
    async def test_health_check_bypass(self, middleware, mock_request):
        """ヘルスチェックエンドポイントはホワイトリストをバイパスすること"""
        mock_request.url.path = "/health"
        with patch.object(security_settings, 'ip_whitelist', ['10.0.0.1']):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_whitelisted_ip_allowed(self, middleware, mock_request):
        """ホワイトリストに含まれるIPは許可されること"""
        with patch.object(security_settings, 'ip_whitelist', ['192.168.1.100']):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 200
        assert response.body == b"Success"

    @pytest.mark.asyncio
    async def test_non_whitelisted_ip_blocked(self, middleware, mock_request):
        """ホワイトリストに含まれないIPは拒否されること"""
        with patch.object(security_settings, 'ip_whitelist', ['10.0.0.1']):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 403
        assert isinstance(response, JSONResponse)

    @pytest.mark.asyncio
    async def test_x_forwarded_for_header(self, middleware, mock_request):
        """X-Forwarded-ForヘッダーからクライアントIPを取得すること"""
        mock_request.headers = {"X-Forwarded-For": "203.0.113.195, 70.41.3.18, 150.172.238.178"}
        with patch.object(security_settings, 'ip_whitelist', ['203.0.113.195']):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_x_forwarded_for_not_in_whitelist(self, middleware, mock_request):
        """X-Forwarded-ForのIPがホワイトリストにない場合は拒否されること"""
        mock_request.headers = {"X-Forwarded-For": "203.0.113.195, 70.41.3.18"}
        with patch.object(security_settings, 'ip_whitelist', ['10.0.0.1']):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_no_client_ip_blocked(self, middleware, mock_request):
        """クライアントIPが取得できない場合は拒否されること"""
        mock_request.client = None
        mock_request.headers = {}
        with patch.object(security_settings, 'ip_whitelist', ['10.0.0.1']):
            response = await middleware.dispatch(mock_request, self.call_next_success)
        assert response.status_code == 403
        # レスポンスの内容を確認
        assert isinstance(response, JSONResponse)
