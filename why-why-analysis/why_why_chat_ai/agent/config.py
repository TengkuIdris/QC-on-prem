"""
エージェント用設定モジュール（主にデータベース関連）
"""
import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    """
    エージェント関連の設定
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra='ignore'
    )

    @property
    def google_cloud_project(self) -> Optional[str]:
        """GCP_PROJECT_ID または GOOGLE_CLOUD_PROJECT から取得"""
        return self.gcp_project_id or os.getenv("GOOGLE_CLOUD_PROJECT")

    # Environment
    environment: str = Field(default="development", description="実行環境")

    # Database
    database_url: Optional[str] = Field(
        default=None, description="データベースURL（環境変数 DATABASE_URL から取得）"
    )
    database_min_connections: int = Field(
        default=1,
        description="接続プールの最小接続数 (環境変数 DATABASE_MIN_CONNECTIONS から取得)",
        alias="DATABASE_MIN_CONNECTIONS",
    )
    database_max_connections: int = Field(
        default=10,
        description="接続プールの最大接続数 (環境変数 DATABASE_MAX_CONNECTIONS から取得)",
        alias="DATABASE_MAX_CONNECTIONS",
    )
    database_connect_timeout: int = Field(
        default=30,
        description="接続タイムアウト（秒）(環境変数 DATABASE_CONNECT_TIMEOUT から取得)",
        alias="DATABASE_CONNECT_TIMEOUT",
    )
    database_pool_timeout: int = Field(
        default=30,
        description="プール接続取得タイムアウト（秒）(環境変数 DATABASE_POOL_TIMEOUT から取得)",
        alias="DATABASE_POOL_TIMEOUT",
    )

    # Google Cloud
    # TODO google_cloud_project と統合
    gcp_project_id: Optional[str] = Field(
        default=None,
        description="Google Cloud Project ID",
        alias="GCP_PROJECT_ID"
    )
    cloud_sql_region: Optional[str] = Field(
        default="asia-northeast1",
        description="Cloud SQL Region",
        alias="CLOUD_SQL_REGION"
    )
    cloud_sql_instance: Optional[str] = Field(
        default=None,
        description="Cloud SQL Instance",
        alias="CLOUD_SQL_INSTANCE"
    )
    cloud_sql_database: Optional[str] = Field(
        default=None,
        description="Cloud SQL Database",
        alias="CLOUD_SQL_DATABASE"
    )
    cloud_sql_user: Optional[str] = Field(
        default=None,
        description="Cloud SQL User",
        alias="CLOUD_SQL_USER"
    )
    cloud_sql_use_iam_auth: bool = Field(
        default=True,
        description="Cloud SQL でIAM認証を使用するかどうか",
        alias="CLOUD_SQL_USE_IAM_AUTH"
    )
    cloud_sql_auth_type: str = Field(
        default="hybrid",
        description="Cloud SQL 認証タイプ: 'password' | 'iam' | 'hybrid'",
        alias="CLOUD_SQL_AUTH_TYPE"
    )
    cloud_sql_iam_user: Optional[str] = Field(
        default=None,
        description="Cloud SQL IAM 認証用ユーザー (例: service-account@project.iam)",
        alias="CLOUD_SQL_IAM_USER"
    )
    init_mode: bool = Field(
        default=False,
        description="初期化モードフラグ（データベース初期化時のみtrue）",
        alias="INIT_MODE"
    )
    use_cloud_sql: bool = Field(
        default=False,
        description="Cloud SQL を使用するかどうか",
        alias="USE_CLOUD_SQL"
    )

    vertexai_staging_bucket: Optional[str] = Field(
        default=None, description="Vertex AI Staging Bucket"
    )

    # Checkpointer
    checkpoint_schema: str = Field(
        default="whywhy",
        description="チェックポイントを格納するPostgreSQLのスキーマ名",
        alias="CHECKPOINT_SCHEMA",
    )

    # LLM Provider (Vertex / Local OpenAI-compatible)
    llm_provider: str = Field(
        default="vertex",
        description="LLM プロバイダ。'vertex' (既定) | 'local'",
        alias="LLM_PROVIDER",
    )
    llm_base_url: Optional[str] = Field(
        default=None,
        description="LLM_PROVIDER=local のときに使う OpenAI 互換エンドポイント URL (例: http://llm:8000/v1)",
        alias="LLM_BASE_URL",
    )
    llm_model: Optional[str] = Field(
        default=None,
        description="LLM_PROVIDER=local のときに使うモデル名 (例: qwen2.5-32b-instruct)",
        alias="LLM_MODEL",
    )
    llm_api_key: Optional[str] = Field(
        default=None,
        description="LLM サービスが認証を要求する場合の API キー。要らない場合は未設定で可",
        alias="LLM_API_KEY",
    )
    llm_timeout: int = Field(
        default=120,
        description="LLM 呼び出しタイムアウト秒",
        alias="LLM_TIMEOUT",
    )

    # RAG (external service over HTTP — see implementation spec Part A C2)
    rag_enabled: bool = Field(
        default=False,
        description="RAG (参考事例検索) を有効化するかどうか",
        alias="RAG_ENABLED",
    )
    rag_service_url: Optional[str] = Field(
        default=None,
        description="RAG サービスのベース URL (例: http://rag:8000)",
        alias="RAG_SERVICE_URL",
    )
    rag_timeout: int = Field(
        default=30,
        description="RAG 呼び出しタイムアウト秒",
        alias="RAG_TIMEOUT",
    )


# Global settings instance
settings = AgentSettings()
