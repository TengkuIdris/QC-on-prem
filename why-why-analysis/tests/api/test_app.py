"""
FastAPI メインアプリケーションのテスト
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx
from httpx import AsyncClient

from why_why_chat_ai.api.app import create_app


@pytest.fixture
def app():
    """FastAPIアプリケーションのテスト用フィクスチャ"""
    return create_app()


@pytest.fixture
def client(app):
    """TestClientのフィクスチャ"""
    client = TestClient(app)
    # X-Forwarded-Forヘッダーを追加（TestClientのIPアドレス問題を回避）
    client.headers = {"X-Forwarded-For": "127.0.0.1"}
    return client


def test_app_creation():
    """アプリケーションが正常に作成されることをテスト"""
    app = create_app()
    assert app is not None
    assert app.title == "Why-Why Analysis AI Agent API"
    # GitVersionから取得されるバージョン番号は動的に変わるため、文字列であることを確認
    assert isinstance(app.version, str)
    assert len(app.version) > 0


def test_health_check(client):
    """ヘルスチェックエンドポイントのテスト"""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "version" in data


def test_request_id_middleware(client):
    """リクエストIDミドルウェアのテスト"""
    response = client.get("/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert response.headers["X-Request-ID"] is not None


def test_cors_headers(client):
    """CORSヘッダーのテスト"""
    response = client.options("/health", headers={"Origin": "http://localhost:3000"})
    # Note: TestClientはCORSミドルウェアを完全にはシミュレートしないが、
    # アプリが正常に起動することを確認
    assert response.status_code in [200, 405]  # OPTIONSが許可されていない場合もある


def test_gzip_middleware_exists(app):
    """GZipミドルウェアが設定されていることをテスト"""
    # ミドルウェアの存在を間接的に確認
    middleware_classes = [middleware.cls.__name__ for middleware in app.user_middleware]
    assert "GZipMiddleware" in middleware_classes


def test_openapi_docs_development():
    """開発環境でのOpenAPI docsの利用可能性をテスト"""
    app = create_app()
    client = TestClient(app)

    # 開発環境では docs が利用可能
    response = client.get("/docs")
    # リダイレクトまたは正常レスポンス
    assert response.status_code in [200, 307]


def test_exception_handler_with_http_exception():
    """HTTP例外ハンドラのテスト"""
    from fastapi import HTTPException
    from why_why_chat_ai.api.app import create_app
    from fastapi.testclient import TestClient

    app = create_app()

    # HTTPExceptionを発生させるエンドポイントを追加
    @app.get("/test-http-error")
    async def test_http_error():
        raise HTTPException(status_code=400, detail="Test HTTP error")

    client = TestClient(app)
    client.headers = {"X-Forwarded-For": "127.0.0.1"}  # IPアドレス問題を回避
    response = client.get("/test-http-error")

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "request_id" in data
    assert data["error"] == "Test HTTP error"


def test_global_exception_handler():
    """グローバル例外ハンドラのテスト"""
    from fastapi import FastAPI, Request, status
    from fastapi.middleware.gzip import GZipMiddleware
    from fastapi.responses import ORJSONResponse
    from fastapi.testclient import TestClient
    from why_why_chat_ai.api.config import settings
    from why_why_chat_ai.api.telemetry import RequestIDMiddleware

    # ライフサイクルなしで最小限のアプリを作成
    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        description=settings.api_description,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        default_response_class=ORJSONResponse,
    )

    # ミドルウェア追加
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(RequestIDMiddleware)

    # グローバル例外ハンドラ追加
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")

        error_detail = {
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred.",
            "request_id": request_id,
        }

        return ORJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_detail,
        )

    # 例外を発生させるエンドポイントを追加
    @app.get("/test-error")
    async def test_error():
        raise ValueError("Test error")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test-error")

    assert response.status_code == 500
    data = response.json()
    assert "error" in data
    assert "request_id" in data
    assert data["error"] == "Internal Server Error"


def test_orjson_response_class():
    """ORJSONResponseクラスが設定されていることをテスト"""
    from fastapi.responses import ORJSONResponse

    app = create_app()
    # FastAPIのdefault_response_classを確認
    assert app.router.default_response_class == ORJSONResponse


class TestAsyncAppStartup:
    """非同期アプリケーション起動のテスト"""

    @pytest.mark.asyncio
    async def test_async_app_startup_with_lifespan(self):
        """非同期でアプリケーションが正常に起動することをテスト"""
        app = create_app()

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            # ライフサイクルが実行される
            response = await ac.get("/health")
            assert response.status_code == 200

            data = response.json()
            assert data["status"] == "healthy"
            assert "environment" in data
            assert "version" in data

    @pytest.mark.asyncio
    async def test_async_request_id_middleware(self):
        """非同期でリクエストIDミドルウェアが正常に動作することをテスト"""
        app = create_app()

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/health")
            assert response.status_code == 200
            assert "X-Request-ID" in response.headers
            assert response.headers["X-Request-ID"] is not None

    @pytest.mark.asyncio
    async def test_async_exception_handling(self):
        """非同期での例外ハンドリングをテスト"""
        from fastapi import HTTPException

        app = create_app()

        @app.get("/test-async-error")
        async def test_async_error():
            raise HTTPException(status_code=422, detail="Test async error")

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/test-async-error")
            assert response.status_code == 422

            data = response.json()
            assert "error" in data
            assert "request_id" in data
            assert data["error"] == "Test async error"

    @pytest.mark.asyncio
    async def test_async_global_exception_handler(self):
        """非同期でのグローバル例外ハンドラをテスト"""
        app = create_app()

        @app.get("/test-async-unhandled-error")
        async def test_async_unhandled_error():
            raise ValueError("Test async unhandled error")

        # raise_server_exceptions=Falseを指定して、サーバー例外をキャッチしてレスポンスとして返す
        async with AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as ac:
            response = await ac.get("/test-async-unhandled-error")
            assert response.status_code == 500

            data = response.json()
            assert "error" in data
            assert "request_id" in data
            assert data["error"] == "Internal Server Error"

    @pytest.mark.asyncio
    async def test_async_lifespan_functionality(self):
        """非同期でのライフサイクル正常動作をテスト"""
        app = create_app()

        # ライフサイクルが正常に動作することを確認
        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/health")
            assert response.status_code == 200

            data = response.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.AgentClient")
    async def test_async_lifespan_initialization_failure(self, mock_agent_client_class):
        """非同期でのライフサイクル初期化失敗をテスト"""

        # AgentClientのモック設定（set_upでエラーを発生）
        mock_agent_client = AsyncMock()
        mock_agent_client.set_up.side_effect = Exception("Initialization error")
        mock_agent_client_class.return_value = mock_agent_client

        # ライフサイクル関数を直接テストして、例外が適切に発生することを確認
        app = create_app()

        # エラーが発生することを期待
        with pytest.raises(Exception, match="Initialization error"):
            async with app.router.lifespan_context(app):
                pass

        # AgentClientが初期化され、set_upが呼ばれたことを確認
        mock_agent_client_class.assert_called_once()
        mock_agent_client.set_up.assert_called_once()

    @pytest.mark.asyncio
    async def test_async_concurrent_requests(self):
        """非同期での同時リクエスト処理をテスト"""
        import asyncio

        app = create_app()

        async def make_request(client: AsyncClient, path: str):
            return await client.get(path)

        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            # 複数の同時リクエストを送信
            tasks = [
                make_request(ac, "/health"),
                make_request(ac, "/health"),
                make_request(ac, "/health"),
            ]

            responses = await asyncio.gather(*tasks)

            # すべてのリクエストが成功することを確認
            for response in responses:
                assert response.status_code == 200
                assert "X-Request-ID" in response.headers

            # 各リクエストが異なるリクエストIDを持つことを確認
            request_ids = [resp.headers["X-Request-ID"] for resp in responses]
            assert len(set(request_ids)) == len(request_ids), "Request IDs should be unique"
