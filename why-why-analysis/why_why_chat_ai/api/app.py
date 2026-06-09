"""
FastAPI メインアプリケーション
"""
import os
from typing import Any, Dict

import structlog
from google.cloud import secretmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from why_why_chat_ai.api.config import settings
from why_why_chat_ai.api.routers import threads, debug
from why_why_chat_ai.api.lifespan import app_lifespan
from why_why_chat_ai.api.middleware import IPWhitelistMiddleware
from why_why_chat_ai.api.rate_limiting import limiter
from why_why_chat_ai.api.telemetry import (
    RequestIDMiddleware,
    setup_logging,
    setup_opentelemetry,
    request_hook,
    response_hook,
)

# Cloud SQL Connector for IAM authentication (optional)
try:
    from google.cloud.sql.connector import Connector
except ImportError:
    Connector = None

# ロギングの初期化（モジュールレベルで実行）
setup_logging()

logger = structlog.get_logger(__name__)


def _get_postgres_password() -> str:
    """postgresユーザーのパスワードを取得"""
    # 環境変数から取得を試みる（開発環境用）
    if password := os.getenv("POSTGRES_PASSWORD"):
        logger.info("Using postgres password from environment variable")
        return password

    # Secret Managerから取得
    client = secretmanager.SecretManagerServiceClient()
    # workspaceは環境名（dev/prod）として使用
    workspace = os.getenv("WORKSPACE", "dev")
    secret_name = f"postgres-password-{workspace}"
    name = f"projects/{settings.gcp_project}/secrets/{secret_name}/versions/latest"

    try:
        logger.info(f"Retrieving postgres password from Secret Manager: {secret_name}")
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.error(f"Failed to retrieve password from Secret Manager: {e}")
        raise



def create_app() -> FastAPI:
    """
    FastAPIアプリケーションインスタンスを作成
    """
    # OpenTelemetryの初期化（アプリケーション作成時に実行）
    setup_opentelemetry()

    # FastAPIインスタンス生成
    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        description=settings.api_description,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        default_response_class=ORJSONResponse,
        lifespan=app_lifespan,
    )

    # レート制限をappの状態に保存
    app.state.limiter = limiter

    # レート制限ミドルウェア追加（最初に追加）
    app.add_middleware(SlowAPIMiddleware)

    # IPホワイトリストミドルウェア追加
    app.add_middleware(IPWhitelistMiddleware)

    # リクエストIDミドルウェア追加
    app.add_middleware(RequestIDMiddleware)

    # GZip圧縮設定
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # CORS設定
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins if settings.is_development else [],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

    # ルーター追加
    app.include_router(threads.router)

    # デバッグルーター追加（開発環境のみ）
    if settings.is_development:
        app.include_router(debug.router)

    # カスタムレート制限エラーハンドラー
    @app.exception_handler(RateLimitExceeded)
    async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")

        logger.warning(
            "Rate limit exceeded",
            request_id=request_id,
            limit=str(exc.detail),
        )

        return ORJSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": {
                    "code": "RATE_LIMIT",
                    "message": f"Rate limit exceeded: {exc.detail}"
                },
                "request_id": request_id,
            },
        )

    # FastAPIアプリケーションの自動計装（request/response フック付き）
    # OTEL_SDK_DISABLEDがtrueの場合はスキップ
    if os.getenv("OTEL_SDK_DISABLED", "").lower() != "true":
        FastAPIInstrumentor.instrument_app(
            app,
            server_request_hook=request_hook,
            client_response_hook=response_hook,
        )

    # グローバル例外ハンドラ
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
        """
        グローバル例外ハンドラ
        """
        request_id = getattr(request.state, "request_id", "unknown")

        # OpenTelemetryのトレースに例外を記録
        span = trace.get_current_span()
        if span.is_recording():
            span.record_exception(exc)
            span.set_status(trace.StatusCode.ERROR, str(exc))

        logger.error(
            "Unhandled exception occurred",
            request_id=request_id,
            error=str(exc),
            exc_info=True,
        )

        if settings.is_development:
            # 開発環境では詳細なエラー情報を返す
            error_detail = {
                "error": "Internal Server Error",
                "detail": str(exc),
                "request_id": request_id,
                "type": exc.__class__.__name__,
            }
        else:
            # 本番環境では一般的なエラーメッセージのみ
            error_detail = {
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred.",
                "request_id": request_id,
            }

        return ORJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_detail,
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> ORJSONResponse:
        """
        HTTP例外ハンドラ
        """
        request_id = getattr(request.state, "request_id", "unknown")

        logger.warning(
            "HTTP exception occurred",
            request_id=request_id,
            status_code=exc.status_code,
            detail=exc.detail,
        )

        # HTTPException.detailが辞書の場合とそうでない場合を処理
        if isinstance(exc.detail, dict):
            # 既に構造化されたエラーレスポンス（例：AuthenticationError）
            response_content = {
                **exc.detail,
                "request_id": request_id,
            }
        else:
            # 文字列のdetailの場合
            response_content = {
                "error": exc.detail,
                "request_id": request_id,
            }

        return ORJSONResponse(
            status_code=exc.status_code,
            content=response_content,
        )

    # ヘルスチェックエンドポイント（認証・レート制限なし）
    @app.get("/health", response_class=ORJSONResponse)
    @limiter.exempt
    async def health_check(request: Request) -> Dict[str, Any]:
        """
        ヘルスチェックエンドポイント
        アプリケーションの基本状態を確認
        """
        from datetime import datetime

        return {
            "status": "healthy",
            "environment": settings.environment,
            "version": settings.api_version,
            "timestamp": datetime.now().isoformat()
        }

    return app


# アプリケーションインスタンス
app = create_app()
