"""
Debug endpoints for diagnosing checkpointer issues
"""
import os
import sys
import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.responses import ORJSONResponse
from typing import Dict, Any
from datetime import datetime

from why_why_chat_ai.api.auth import get_current_auth
from why_why_chat_ai.api.rate_limiting import limiter
from why_why_chat_ai.api.services.agent_client import AgentClient
from why_why_chat_ai.agent.config import settings as agent_settings


logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/checkpointer-status", dependencies=[Depends(get_current_auth)])
async def get_checkpointer_status(request: Request) -> Dict[str, Any]:
    """
    チェックポインターの詳細な状態を取得
    """
    # 環境変数の確認
    env_vars = {
        "USE_CLOUD_SQL": os.getenv("USE_CLOUD_SQL"),
        "CHECKPOINT_SCHEMA": os.getenv("CHECKPOINT_SCHEMA"),
        "CLOUD_SQL_DATABASE": os.getenv("CLOUD_SQL_DATABASE"),
        "CLOUD_SQL_INSTANCE": os.getenv("CLOUD_SQL_INSTANCE"),
        "CLOUD_SQL_REGION": os.getenv("CLOUD_SQL_REGION"),
        "DATABASE_URL": os.getenv("DATABASE_URL", "").replace(os.getenv("DATABASE_PASSWORD", ""), "***") if os.getenv("DATABASE_URL") else None,
        "GCP_PROJECT_ID": os.getenv("GCP_PROJECT_ID"),
    }

    # 設定の確認
    config_info = {
        "use_cloud_sql": agent_settings.use_cloud_sql,
        "checkpoint_schema": agent_settings.checkpoint_schema,
        "cloud_sql_database": agent_settings.cloud_sql_database,
        "cloud_sql_instance": agent_settings.cloud_sql_instance,
        "cloud_sql_region": agent_settings.cloud_sql_region,
        "gcp_project_id": agent_settings.gcp_project_id,
    }

    # チェックポインターの初期化を試行してログを収集
    initialization_log = []
    checkpointer_info = {}

    try:
        import logging

        # 一時的にログハンドラーを追加
        class LogCapture(logging.Handler):
            def __init__(self):
                super().__init__()
                self.messages = []

            def emit(self, record):
                self.messages.append({
                    "level": record.levelname,
                    "message": record.getMessage(),
                    "time": record.created
                })

        # ルートロガーに一時ハンドラーを追加
        log_capture = LogCapture()
        log_capture.setLevel(logging.DEBUG)
        root_logger = logging.getLogger()
        root_logger.addHandler(log_capture)

        try:
            # チェックポインターを取得
            agent_client: AgentClient = request.app.state.agent_client
            if not agent_client.agent:
                await agent_client.set_up()
            checkpointer = agent_client.agent.checkpointer

            # チェックポインターの情報を取得
            checkpointer_info = {
                "type": type(checkpointer).__name__,
                "module": type(checkpointer).__module__,
                "is_cloud_sql": "Postgres" in type(checkpointer).__name__,
                "schema": getattr(checkpointer, 'schema_name', None) if hasattr(checkpointer, 'schema_name') else None,
            }

            # PostgresSaverの場合、追加情報を取得
            if hasattr(checkpointer, 'engine'):
                try:
                    engine = checkpointer.engine
                    checkpointer_info["engine_info"] = {
                        "dialect": str(engine.dialect),
                        "driver": getattr(engine.dialect, 'driver', None),
                    }
                except Exception as e:
                    checkpointer_info["engine_info_error"] = str(e)

        finally:
            # ハンドラーを削除
            root_logger.removeHandler(log_capture)
            initialization_log = log_capture.messages

    except Exception as e:
        checkpointer_info = {
            "error": str(e),
            "error_type": type(e).__name__
        }

    # Cloud SQL接続テスト（checkpointerのpoolを利用）
    connection_test = {}
    try:
        # AsyncPostgresSaver の場合のみテスト
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        if isinstance(checkpointer, AsyncPostgresSaver):
            pool = getattr(checkpointer, "conn", None)
            if pool is not None:
                try:
                    async with pool.connection() as conn:
                        # current_user, current_database
                        result = await conn.execute("SELECT current_user, current_database()")
                        row = await result.fetchone()
                        connection_test = {
                            "status": "success",
                            "current_user": row["current_user"] if row else None,
                            "current_database": row["current_database"] if row else None,
                        }
                        # スキーマの存在確認
                        result = await conn.execute(f"SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = '{agent_settings.checkpoint_schema}') as exists")
                        row = await result.fetchone()
                        connection_test["schema_exists"] = row["exists"] if row else False
                        # チェックポイントテーブルの存在確認
                        result = await conn.execute(f"SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = '{agent_settings.checkpoint_schema}' AND tablename = 'checkpoints') as exists")
                        row = await result.fetchone()
                        connection_test["checkpoint_table_exists"] = row["exists"] if row else False
                except Exception as e:
                    connection_test = {
                        "status": "failed",
                        "error": str(e),
                        "error_type": type(e).__name__
                    }
            else:
                connection_test = {"status": "skipped", "reason": "No conn in checkpointer"}
        else:
            connection_test = {"status": "skipped", "reason": "Not an AsyncPostgresSaver"}
    except Exception as e:
        connection_test = {
            "status": "failed",
            "error": str(e),
            "error_type": type(e).__name__
        }

    return {
        "environment_variables": env_vars,
        "settings": config_info,
        "checkpointer": checkpointer_info,
        "initialization_log": initialization_log,
        "connection_test": connection_test,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/env", dependencies=[Depends(get_current_auth)])
async def get_environment() -> Dict[str, Any]:
    """
    環境変数とランタイム情報を取得
    """
    from why_why_chat_ai.api.services.agent_client import get_runtime_info

    # センシティブな環境変数はマスク
    sensitive_keys = ["PASSWORD", "KEY", "SECRET", "TOKEN"]

    env_vars = {}
    for key, value in os.environ.items():
        if any(sensitive in key.upper() for sensitive in sensitive_keys):
            env_vars[key] = "***MASKED***"
        else:
            env_vars[key] = value

    return {
        "runtime_info": get_runtime_info(),
        "environment_variables": env_vars,
        "python_path": sys.path,
        "working_directory": os.getcwd(),
    }


@router.get("/checkpointer-test", response_class=ORJSONResponse)
@limiter.exempt
async def test_checkpointer(request: Request) -> Dict[str, Any]:
    """
    チェックポインターのテスト用エンドポイント
    開発環境でのみ使用可能
    """
    import uuid
    from datetime import datetime

    test_result: Dict[str, Any] = {
        "test_name": "checkpointer_write_read",
        "test_time": datetime.now().isoformat(),
        "checkpointer_info": {},
        "write_test": {},
        "read_test": {},
        "errors": []
    }

    # チェックポインターを取得
    agent_client: AgentClient = request.app.state.agent_client
    if not agent_client.agent:
        await agent_client.set_up()
    checkpointer = agent_client.agent.checkpointer
    if not checkpointer:
        test_result["errors"].append("Checkpointer not initialized")
        return test_result

    test_result["checkpointer_info"] = {
        "type": type(checkpointer).__name__,
        "module": type(checkpointer).__module__,
    }

    # Cloud SQL特有の情報
    if hasattr(checkpointer, "_engine"):
        test_result["checkpointer_info"]["cloud_sql"] = True
        test_result["checkpointer_info"]["schema"] = getattr(checkpointer, "_schema_name", "unknown")

        # エンジン情報を取得（可能な場合）
        try:
            engine = checkpointer._engine
            if hasattr(engine, "_instance_connection_name"):
                test_result["checkpointer_info"]["instance"] = engine._instance_connection_name
        except Exception as e:
            test_result["errors"].append(f"Engine info error: {str(e)}")

    # 簡単な書き込みテスト
    try:
        test_thread_id = f"test-{uuid.uuid4().hex[:8]}"
        test_checkpoint = {
            "v": 1,
            "ts": datetime.utcnow().isoformat(),
            "id": f"checkpoint-{uuid.uuid4().hex[:8]}",
            "channel_values": {"test": "value"},
            "channel_versions": {},
            "versions_seen": {},
            "pending_sends": []
        }

        # 書き込み
        config = {"configurable": {"thread_id": test_thread_id}}
        checkpointer.put(config, test_checkpoint, {})

        test_result["write_test"] = {
            "status": "success",
            "thread_id": test_thread_id,
            "checkpoint_ts": test_checkpoint["ts"]
        }

        # 読み込みテスト
        retrieved = checkpointer.get(config)
        if retrieved and retrieved.checkpoint:
            test_result["read_test"] = {
                "status": "success",
                "retrieved_ts": retrieved.checkpoint["ts"],
                "matches": retrieved.checkpoint["ts"] == test_checkpoint["ts"]
            }
        else:
            test_result["read_test"]["status"] = "failed"
            test_result["errors"].append("Could not retrieve checkpoint")

    except Exception as e:
        test_result["write_test"]["status"] = "failed"
        test_result["errors"].append(f"Checkpoint test error: {type(e).__name__}: {str(e)}")
        logger.error("Checkpointer test failed", exc_info=True)

    return test_result
