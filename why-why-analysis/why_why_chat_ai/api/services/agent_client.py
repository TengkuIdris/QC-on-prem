"""
Vertex AI Agent Engine への非同期クライアント実装。
FastAPI層から呼び出される、LangGraphストリーミング実行のためのクライアント。
"""

from typing import Any, Dict, AsyncIterator, Optional
import types
import os
from opentelemetry.trace import get_tracer_provider, set_tracer_provider
from opentelemetry.sdk.trace import TracerProvider, SpanProcessor, SynchronousMultiSpanProcessor
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from openinference.instrumentation.langchain import LangChainInstrumentor
import google.auth
from google.cloud.trace_v2 import TraceServiceClient
from google.cloud import secretmanager
import structlog
from langgraph.types import Command, StateSnapshot
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langchain_core.messages import HumanMessage

from why_why_chat_ai.agent.config import settings
from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder
from why_why_chat_ai.agent.utils import create_config, CONFIGURABLE, THREAD_ID

logger = structlog.get_logger(__name__)

# Cloud SQL Connector is not needed when using Unix socket connection in Cloud Run


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
    name = f"projects/{settings.gcp_project_id}/secrets/{secret_name}/versions/latest"

    try:
        logger.info(f"Retrieving postgres password from Secret Manager: {secret_name}")
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.error(f"Failed to retrieve password from Secret Manager: {e}")
        raise


def _import_opentelemetry_or_warn() -> Optional[types.ModuleType]:
    """Tries to import the opentelemetry module."""
    try:
        import opentelemetry  # noqa:F401

        return opentelemetry
    except ImportError:
        logger.warning(
            "opentelemetry-sdk is not installed. Please call "
            "'pip install google-cloud-aiplatform[reasoningengine]'."
        )
    return None


def is_noop_or_proxy_tracer_provider(tracer_provider) -> bool:
    """Returns True if the tracer_provider is Proxy or NoOp."""
    opentelemetry = _import_opentelemetry_or_warn()
    ProxyTracerProvider = opentelemetry.trace.ProxyTracerProvider
    NoOpTracerProvider = opentelemetry.trace.NoOpTracerProvider
    return isinstance(tracer_provider, (NoOpTracerProvider, ProxyTracerProvider))


def _override_active_span_processor(
    tracer_provider: TracerProvider,
    active_span_processor: SynchronousMultiSpanProcessor,
):
    """Overrides the active span processor.

    When working with multiple LangchainAgents in the same environment,
    it's crucial to manage trace exports carefully.
    Each agent needs its own span processor tied to a unique project ID.
    While we add a new span processor for each agent, this can lead to
    unexpected behavior.
    For instance, with two agents linked to different projects, traces from the
    second agent might be sent to both projects.
    To prevent this and guarantee traces go to the correct project, we overwrite
    the active span processor whenever a new LangchainAgent is created.

    Args:
        tracer_provider (TracerProvider):
            The tracer provider to use for the project.
        active_span_processor (SynchronousMultiSpanProcessor):
            The active span processor overrides the tracer provider's
            active span processor.
    """
    if tracer_provider._active_span_processor:
        tracer_provider._active_span_processor.shutdown()
    tracer_provider._active_span_processor = active_span_processor


def _get_metadata(path: str, timeout: float = 0.2) -> str | None:
    import requests

    METADATA_URL = "http://metadata.google.internal/computeMetadata/v1/"
    HEADERS = {"Metadata-Flavor": "Google"}

    try:
        r = requests.get(METADATA_URL + path, headers=HEADERS, timeout=timeout)
        return r.text if r.status_code == 200 else None
    except Exception:
        return None


def get_runtime_info() -> Dict[str, str]:
    # メタデータが返れば GCP (Agent Engine か他の Cloud Run 等)
    res = {
        "service_account": _get_metadata("instance/service-accounts/default/email"),
        "project": _get_metadata("project/project-id"),
        "region": os.getenv("GOOGLE_CLOUD_REGION") or _get_metadata("instance/region"),
    }
    if res["service_account"]:
        if res["service_account"].find("aiplatform") != -1:
            res["runtime"] = "agent_engine"
        else:
            res["runtime"] = "cloud_run_or_gce"
    else:
        res["runtime"] = "local"
    return res


async def build_checkpointer(**kwargs):
    """
    チェックポイント管理用のcheckpointerを構築する

    Cloud SQL for PostgreSQL専用のlangchain_google_cloud_sql_pgライブラリを使用
    Google公式の推奨実装でVertex AI Agent Engine環境での互換性を確保

    Returns
    -------
    Union[MemorySaver, AsyncPostgresSaver]
        会話履歴とエージェント状態を永続化するためのcheckpointer
    """

    # 設定値をログ出力
    logger.info(f"build_checkpointer called - use_cloud_sql: {settings.use_cloud_sql}, gcp_project_id: {settings.gcp_project_id}, cloud_sql_instance: {settings.cloud_sql_instance}")

    # 環境変数をダブルチェック
    import os
    logger.info(f"Environment check - USE_CLOUD_SQL: {os.getenv('USE_CLOUD_SQL')}, GCP_PROJECT_ID: {os.getenv('GCP_PROJECT_ID')}, CLOUD_SQL_INSTANCE: {os.getenv('CLOUD_SQL_INSTANCE')}")

    # 環境変数による切り替え
    if settings.use_cloud_sql:
        # 実行環境の情報をログ出力
        runtime_info = get_runtime_info()
        logger.info(f"RUNTIME: {runtime_info['runtime']}, SA: {runtime_info['service_account']}")
        logger.info(f"Cloud SQL Settings - Project: {settings.gcp_project_id}, Instance: {settings.cloud_sql_instance}, Database: {settings.cloud_sql_database}, Use Cloud SQL: {settings.use_cloud_sql}")

        try:
            # Cloud SQL Unix socketパスを構築
            socket_path = f"/cloudsql/{settings.gcp_project_id}:{settings.cloud_sql_region}:{settings.cloud_sql_instance}"

            # 一時的にpostgresユーザーを使用（IAMユーザーが作成されるまで）
            # TODO: IAMユーザー作成後は元に戻す
            db_user = "postgres"
            db_password = _get_postgres_password()  # Secret Managerまたは環境変数から取得

            # psycopg用の接続文字列を構築（標準PostgreSQL形式）
            # whywhyスキーマをデフォルトスキーマとして指定
            database_url = f"host={socket_path} dbname={settings.cloud_sql_database} user={db_user} password={db_password} sslmode=disable options='-c search_path=whywhy'"

            logger.info(f"Creating psycopg connection with Unix socket: {socket_path}")
            logger.info(f"Database: {settings.cloud_sql_database}, User: {db_user} (temporary postgres user), Schema: whywhy")

            # チェックポイントテーブル初期化（専用スキーマ）
            # Advisory Lockとリトライロジックでレースコンディションを防ぐ

            # PostgresCheckpointer作成（langgraph-checkpoint-postgres）
            # psycopg接続を直接作成
            from psycopg_pool import AsyncConnectionPool
            from psycopg.rows import dict_row

            # 非同期接続プールを作成（一時的にパスワード認証を使用）
            pool = AsyncConnectionPool(
                database_url,
                max_size=20,
                kwargs={
                    "autocommit": True,
                    "row_factory": dict_row
                }
            )
            checkpointer = AsyncPostgresSaver(pool)

            # テーブルの自動作成（setup()メソッドが存在する場合）
            if hasattr(checkpointer, 'setup'):
                try:
                    await checkpointer.setup()
                    logger.info("✓ Checkpoint tables created/verified")
                except Exception as e:
                    error_msg = str(e).lower()
                    if "already exists" in error_msg or "duplicate" in error_msg:
                        logger.info("Checkpoint tables already exist")
                    else:
                        logger.warning(f"Checkpoint table setup warning: {e}")

            logger.info(f"✅ Cloud SQL checkpointer 初期化成功 : {checkpointer}")
            return checkpointer

        except Exception as e:
            # 特定のエラーはより詳細にログ
            error_msg = str(e).lower()
            if "connection" in error_msg or "timeout" in error_msg:
                logger.error(f"❌ Cloud SQL connection failed: {type(e).__name__}: {e}")
            elif "permission" in error_msg or "denied" in error_msg:
                logger.error(f"❌ Cloud SQL permission denied: {type(e).__name__}: {e}")
            else:
                logger.error(f"❌ Cloud SQL checkpointer initialization failed: {type(e).__name__}: {e}")
            logger.warning("Falling back to memory-based checkpointer")
    else:
        # On-prem branch: use standard TCP Postgres (whatever DATABASE_URL points
        # at) via langgraph-checkpoint-postgres' AsyncPostgresSaver. Falls back
        # to MemorySaver only if no DATABASE_URL is configured.
        database_url = settings.database_url or os.getenv("DATABASE_URL")
        if database_url:
            try:
                from psycopg_pool import AsyncConnectionPool
                from psycopg.rows import dict_row
                from urllib.parse import quote

                schema = os.getenv("CHECKPOINT_SCHEMA", "whywhy")

                # AsyncPostgresSaver writes the checkpoint tables under the
                # current search_path. We pass `options=-c search_path=<schema>`
                # so all writes/reads land in the dedicated schema instead of
                # public. The DSN may already include query params — append
                # safely.
                sep = "&" if "?" in database_url else "?"
                conninfo = f"{database_url}{sep}options={quote(f'-c search_path={schema}')}"

                logger.info(
                    f"Initialising Postgres (TCP) checkpointer, schema={schema}"
                )

                pool = AsyncConnectionPool(
                    conninfo,
                    max_size=settings.database_max_connections,
                    kwargs={"autocommit": True, "row_factory": dict_row},
                )
                checkpointer = AsyncPostgresSaver(pool)

                if hasattr(checkpointer, "setup"):
                    try:
                        await checkpointer.setup()
                        logger.info("✓ Checkpoint tables created/verified")
                    except Exception as e:
                        error_msg = str(e).lower()
                        if "already exists" in error_msg or "duplicate" in error_msg:
                            logger.info("Checkpoint tables already exist")
                        else:
                            logger.warning(f"Checkpoint table setup warning: {e}")

                logger.info("✅ Postgres (TCP) checkpointer initialised")
                return checkpointer
            except Exception as e:
                logger.error(
                    f"❌ Postgres checkpointer init failed: {type(e).__name__}: {e}"
                )
                logger.warning("Falling back to memory-based checkpointer")
        else:
            logger.info(
                "DATABASE_URL not set; using memory-based checkpointer"
            )

    # デフォルト: メモリベースのcheckpointer
    logger.info("Returning InMemorySaver")
    return MemorySaver()


class AgentClient:
    """
    LangGraph のエージェントを呼び出すクライアント。
    現状、agent/engine.py の LanggraphAgent の非常に薄いラッパー。
    今後、thread.py からロジックを移行するか、このクライアント自体を削除する。
    """

    def __init__(self):
        self.agent = None
        self._auth_type = settings.cloud_sql_auth_type
        self._is_initialization = settings.init_mode
        self._cloud_sql_iam_user = settings.cloud_sql_iam_user

        # デバッグログ：環境変数の状態を出力
        logger.info(
            "AgentClient initialized with settings",
            use_cloud_sql=settings.use_cloud_sql,
            auth_type=self._auth_type,
            cloud_sql_iam_user=self._cloud_sql_iam_user,
            cloud_sql_database=settings.cloud_sql_database,
            cloud_sql_instance=settings.cloud_sql_instance
        )

    async def _connect_with_iam(self) -> Any:
        """IAM認証でデータベースに接続（AsyncPostgresSaver用）"""
        # Cloud Run環境では、Cloud SQL Proxyが自動的にUnixソケットを提供
        instance_connection_string = f"{settings.gcp_project_id}:{settings.cloud_sql_region}:{settings.cloud_sql_instance}"
        unix_socket_path = f"/cloudsql/{instance_connection_string}"

        # AsyncPostgresSaver用の接続を作成
        from psycopg_pool import AsyncConnectionPool
        from psycopg.rows import dict_row

        # IAM認証用のアクセストークンを取得
        from google.auth.transport import requests
        from google.auth import default
        import asyncio

        # 認証情報を取得
        credentials, _ = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])

        # トークンをリフレッシュ（同期的に実行）
        def refresh_token():
            auth_req = requests.Request()
            credentials.refresh(auth_req)
            return credentials.token

        # 同期関数を非同期で実行
        access_token = await asyncio.get_event_loop().run_in_executor(None, refresh_token)

        logger.info("Obtained access token for IAM authentication")

        # cloud_sql_iam_userが未設定の場合のエラーチェック
        if not self._cloud_sql_iam_user:
            raise ValueError(
                "CLOUD_SQL_IAM_USER environment variable is not set. "
                "Please set it to the IAM user format: 'service-account-name@project-id.iam'"
            )

        # psycopgのDSN形式で接続
        # IAM認証を使用する場合、アクセストークンをパスワードとして使用
        # whywhyスキーマをデフォルトスキーマとして指定
        dsn = f"host={unix_socket_path} dbname={settings.cloud_sql_database} user={self._cloud_sql_iam_user} password={access_token} options='-c search_path=whywhy'"

        logger.info(f"Connecting to Cloud SQL via Unix socket: {unix_socket_path}")
        logger.debug(f"Database: {settings.cloud_sql_database}, User: {self._cloud_sql_iam_user}, Schema: whywhy")

        # 非同期接続プールを作成
        pool = AsyncConnectionPool(
            dsn,
            max_size=20,
            kwargs={
                "autocommit": True,
                "row_factory": dict_row
            }
        )

        return pool

    async def _connect_with_password(self) -> Any:
        """パスワード認証でデータベースに接続（AsyncPostgresSaver用）"""
        socket_path = f"/cloudsql/{settings.gcp_project_id}:{settings.cloud_sql_region}:{settings.cloud_sql_instance}"
        db_password = _get_postgres_password()

        # psycopg用の接続文字列を構築
        # whywhyスキーマをデフォルトスキーマとして指定
        database_url = f"host={socket_path} dbname={settings.cloud_sql_database} user=postgres password={db_password} sslmode=disable options='-c search_path=whywhy'"

        from psycopg_pool import AsyncConnectionPool
        from psycopg.rows import dict_row

        # 非同期接続プールを作成
        pool = AsyncConnectionPool(
            database_url,
            max_size=20,
            kwargs={
                "autocommit": True,
                "row_factory": dict_row
            }
        )

        return pool

    async def _get_database_connection(self) -> Any:
        """認証方式に応じてデータベース接続を取得"""
        if self._auth_type == "iam":
            return await self._connect_with_iam()
        elif self._auth_type == "hybrid":
            if self._is_initialization:
                logger.info("Using password authentication for initialization")
                return await self._connect_with_password()
            else:
                logger.info("Using IAM authentication for application")
                return await self._connect_with_iam()
        else:  # password
            return await self._connect_with_password()

    async def _build_checkpointer_hybrid(self) -> AsyncPostgresSaver:
        """ハイブリッド認証対応のcheckpointerを構築"""
        logger.info(f"Building checkpointer with auth_type={self._auth_type}, is_initialization={self._is_initialization}")

        try:
            # 認証方式に応じた接続を取得
            pool = await self._get_database_connection()
            checkpointer = AsyncPostgresSaver(pool)

            # テーブルの自動作成
            if self._is_initialization and hasattr(checkpointer, 'setup'):
                try:
                    await checkpointer.setup()
                    logger.info("✓ Checkpoint tables created/verified")
                except Exception as e:
                    error_msg = str(e).lower()
                    if "already exists" in error_msg or "duplicate" in error_msg:
                        logger.info("Checkpoint tables already exist")
                    else:
                        logger.warning(f"Checkpoint table setup warning: {e}")

            logger.info("✅ Hybrid auth checkpointer initialized successfully")
            return checkpointer

        except Exception as e:
            logger.error(f"❌ Failed to initialize checkpointer with {self._auth_type} auth: {e}")
            raise

    async def set_up(self):
        """
        エージェントとトレースなどの設定をセットアップする
        """
        # trace
        credentials, _ = google.auth.default()
        span_exporter = CloudTraceSpanExporter(
            project_id=settings.gcp_project_id,
            client=TraceServiceClient(credentials=credentials.with_quota_project(settings.gcp_project_id)),
        )
        span_processor: SpanProcessor = SimpleSpanProcessor(span_exporter=span_exporter)
        tracer_provider: TracerProvider = get_tracer_provider()
        # Get the appropriate tracer provider
        if is_noop_or_proxy_tracer_provider(tracer_provider):
            tracer_provider = TracerProvider()
            set_tracer_provider(tracer_provider)
        # Avoids OpenTelemetry client already exists error.
        _override_active_span_processor(tracer_provider, SynchronousMultiSpanProcessor())
        tracer_provider.add_span_processor(span_processor)
        # Keep the instrumentation up-to-date.
        self._instrumentor = LangChainInstrumentor()
        if self._instrumentor.is_instrumented_by_opentelemetry:
            self._instrumentor.uninstrument()
        self._instrumentor.instrument()

        # agent
        checkpointer = await self._build_checkpointer_hybrid()

        self.agent_builder = WhyWhyAgentBuilder()
        self.agent = self.agent_builder.build(checkpointer=checkpointer)

    async def astream(
        self,
        input_data: Dict[str, Any] | Command,
        thread_id: str,
        is_retry: bool = False
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        エージェントに非同期でストリーミングクエリを送信し、結果をストリーミングで取得します。

        Parameters
        ----------
        input_data : Dict[str, Any] | Command
            エージェントへの入力データ
        thread_id : str
            対象のスレッドID
        is_retry : bool
            前回のユーザー入力をやり直すかどうか

        Yields
        ------
        Dict[str, Any]
            エージェントからの中間・最終結果
        """
        if not self.agent:
            await self.set_up()

        config = create_config(thread_id=thread_id)

        if is_retry and isinstance(input_data, Command):
            history = [h async for h in self.agent.aget_state_history(config=config)]
            logger.debug(f"is_retry=True: Total history entries: {len(history)}")

            found_previous_info_request = False
            target_index = None

            for i, snapshot in enumerate(history):
                logger.debug(f"History entry {i}: config={snapshot.config}, next={snapshot.next}")
                if i == 0:
                    # 直前の info_request は無視。それは通常の入力として処理されるため
                    continue
                if isinstance(snapshot.next, tuple) and 'info_request' in snapshot.next:
                    found_previous_info_request = True
                    target_index = i
                    logger.debug(f"Found previous info_request at index {i}")
                    break

            if found_previous_info_request and target_index is not None and target_index > 0:
                # 会話履歴を修正
                # 次の状態から chat_history を取得 (∵ interrupt したノードの出力が snapshot に含まれず、次の snapshot から含まれる謎仕様)
                next_snapshot = history[target_index - 1]
                new_chat_history = list(next_snapshot.values["chat_history"])
                # 最後のメッセージ（ユーザー入力）を削除
                if new_chat_history:
                    new_chat_history.pop()
                # 新しいユーザーの回答を追加
                # Command の resume フィールドから response を取得
                user_message = input_data.resume.get("response", None) if hasattr(input_data, 'resume') else None
                if user_message:
                    new_chat_history.append(HumanMessage(content=user_message))
                    logger.debug(f"Appending new user message to chat history: {user_message}")

                # 状態を更新（target_index の状態に戻す）
                config = await self.agent.aupdate_state(
                    config=history[target_index].config,
                    values={"chat_history": new_chat_history},
                    as_node="info_request")
                logger.debug(f"Updated state at checkpoint: {history[target_index].config}")
                input_data = None
            else:
                logger.warning("is_retry=True but no previous info_request found in history")
        async for event in self.agent.astream(input=input_data, config=config):
            yield event

    async def get_thread_state(self, thread_id: str) -> Dict[str, Any]:
        """
        最新ステートを取得します。

        Parameters
        ----------
        thread_id : str
            対象のスレッドID

        Returns
        -------
        Dict[str, Any]
            スレッドの最新状態

        Raises
        ------
        ValueError
            スレッドが見つからない場合
        """
        if not self.agent:
            await self.set_up()
        snapshot = await self.get_thread_snapshot(thread_id)
        values = snapshot._asdict()["values"]

        # problemが設定されていない場合も、スレッドが初期化されていないと判断
        if not values.get("problem"):
            raise ValueError(f"Thread '{thread_id}' not found or not initialized")

        return values

    async def get_thread_snapshot(self, thread_id: str) -> StateSnapshot:
        """
        最新のStateSnapshotを取得します。

        Parameters
        ----------
        thread_id : str
            対象のスレッドID

        Returns
        -------
        StateSnapshot
            スレッドの最新のStateSnapshot

        Raises
        ------
        ValueError
            スレッドが見つからない場合
        """
        if not self.agent:
            await self.set_up()
        snapshot = None
        async for h in self.agent.aget_state_history(config={CONFIGURABLE: {THREAD_ID: thread_id}}):
            # 最初のスナップショットが最新
            snapshot = h
            break
        # スレッドが存在しない場合、空の状態が返される
        if snapshot is None or snapshot.values is None:
            raise ValueError(f"Thread '{thread_id}' not found")

        # problemが設定されていない場合も、スレッドが初期化されていないと判断
        if not snapshot.values.get("problem"):
            raise ValueError(f"Thread '{thread_id}' not found or not initialized")

        return snapshot

    async def cleanup(self):
        """リソースのクリーンアップ"""
        # Cloud SQL Connector cleanup not needed when using Unix socket
        pass
