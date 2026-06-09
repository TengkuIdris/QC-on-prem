"""
FastAPI アプリケーションライフサイクル管理
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
import structlog

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI アプリケーションライフサイクル管理

    Parameters
    ----------
    app : FastAPI
        FastAPI アプリケーションインスタンス

    Yields
    ------
    None
        アプリケーション実行中
    """
    # Startup
    logger.info("Starting Why-Why Analysis AI Agent API...")

    try:
        # AgentClientの初期化
        from why_why_chat_ai.api.services.agent_client import AgentClient
        import asyncio

        logger.info("Initializing AgentClient...")
        try:
            # AgentClientのインスタンスを作成
            agent_client = AgentClient()
            
            # タイムアウトを設定して初期化
            logger.info("Setting up AgentClient...")
            await asyncio.wait_for(
                agent_client.set_up(),
                timeout=30.0  # 30秒のタイムアウト
            )
            app.state.agent_client = agent_client
            logger.info("AgentClient initialized successfully")
        except asyncio.TimeoutError:
            logger.error("AgentClient initialization timed out after 30 seconds")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize AgentClient: {type(e).__name__}: {e}", exc_info=True)
            raise

        logger.info("Why-Why Analysis AI Agent API started successfully")

        yield

    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down Why-Why Analysis AI Agent API...")

        try:
            # 終了処理をここに追加可能

            logger.info("Why-Why Analysis AI Agent API shutdown completed")

        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
            # シャットダウン時のエラーは致命的ではないので、ログに記録のみ
