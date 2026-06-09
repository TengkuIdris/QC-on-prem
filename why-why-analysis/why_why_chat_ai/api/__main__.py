#!/usr/bin/env python3
"""
Cloud Run用のAPI起動スクリプト
"""
import os
import sys
import structlog

# structlogのロガーを取得（telemetry.setup_logging()は後で呼ばれる）
logger = structlog.get_logger(__name__)

def main():
    # PORT環境変数の確認
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"PORT environment variable: {port}")

    # DATABASE_URL環境変数の確認
    database_url = os.environ.get('DATABASE_URL', '')
    logger.info(f"DATABASE_URL is {'set' if database_url else 'not set'}")

    try:
        # uvicornのインポート
        import uvicorn
        logger.info("uvicorn imported successfully")

        # アプリケーションのインポート（エラーハンドリング付き）
        import_error_msg = None
        try:
            from why_why_chat_ai.api.app import app
            logger.info("FastAPI app imported successfully")
        except Exception as import_error:
            import_error_msg = str(import_error)
            logger.error(f"Failed to import FastAPI app: {import_error}")
            # 最小限のアプリで起動を試みる
            from fastapi import FastAPI
            app = FastAPI()

            @app.get("/health")
            async def health():
                return {"status": "unhealthy", "error": import_error_msg}

            logger.warning("Starting with minimal app due to import error")

        # uvicornでアプリケーションを起動
        logger.info(f"Starting uvicorn on 0.0.0.0:{port}")

        # telemetryモジュールからlog_config関数をインポート
        try:
            from why_why_chat_ai.api.telemetry import generate_uvicorn_log_config
            log_config = generate_uvicorn_log_config()
        except ImportError:
            log_config = None
            logger.warning("Failed to import generate_uvicorn_log_config, using default logging")

        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            log_level="info",
            access_log=True,
            log_config=log_config
        )

    except ImportError as e:
        logger.error(f"Import error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
