"""
API用設定モジュール
"""
from functools import lru_cache
import subprocess
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


@lru_cache(maxsize=None)
def get_git_version():
    """
    Git の tag で定義されたバージョンを取得。
    @lru_cache(maxsize=None) デコレータにより関数の結果がキャッシュされ、関数が複数回呼び出されても実際の Git コマンドは1回しか実行されない。
    最新タグから移動している場合は次のようになる:
        `<最新のタグ>-<最新のタグからのコミット数>-g<短いコミットハッシュ>`
    """
    try:
        return subprocess.check_output(['git', 'describe', '--tags', '--always']).strip().decode('ascii')
    except subprocess.CalledProcessError:
        return "unknown"


class AppSettings(BaseSettings):
    """
    アプリケーション全体の設定
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra='ignore'
    )

    # Environment
    environment: str = Field(default="dev", description="実行環境")
    debug: bool = Field(default=False, description="デバッグモード")

    # Logging
    log_level: str = Field(default="INFO", description="ログレベル")

    # API settings
    api_title: str = Field(default="Why-Why Analysis AI Agent API", description="API タイトル")
    api_version: str = Field(default="1.0.0", description="API バージョン")
    api_description: str = Field(default="Why-Why Analysis AI Support System API", description="API 説明")

    # Security
    api_key: Optional[str] = Field(default=None, description="API キー")
    jwt_secret_key: Optional[str] = Field(default=None, description="JWT 秘密鍵")

    # Rate limiting
    rate_limit_per_minute: int = Field(default=60, description="1分あたりのレート制限")

    # Google Cloud Platform settings
    gcp_project_id: str = Field(default="", description="Google Cloud プロジェクトID")
    gcp_location: str = Field(default="us-central1", description="Google Cloud ロケーション")

    # OpenTelemetry settings
    otel_trace_sampling_rate: float = Field(default=0.1, ge=0.0, le=1.0, description="OpenTelemetryトレースサンプリング率")
    otlp_endpoint: Optional[str] = Field(default=None, description="OTLPエンドポイント")
    otlp_auth_token: Optional[str] = Field(default=None, description="OTLP認証トークン")

    # CORS settings
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8501"],
        description="CORS許可オリジン"
    )

    # Database URL for health check
    database_url: Optional[str] = Field(default=None, description="データベースURL（環境変数 DATABASE_URL から取得）")

    # Cloud SQL settings
    use_google_cloud_sql_pg: bool = Field(default=True, env="USE_GOOGLE_CLOUD_SQL_PG", description="Cloud SQL統合版PostgresSaverを使用するか")
    gcp_project: Optional[str] = Field(default=None, env="GCP_PROJECT", description="GCPプロジェクトID (Cloud SQL用)")
    cloud_sql_region: Optional[str] = Field(default="us-central1", env="CLOUD_SQL_REGION", description="Cloud SQLリージョン")
    cloud_sql_instance: Optional[str] = Field(default=None, env="CLOUD_SQL_INSTANCE", description="Cloud SQLインスタンス名")
    cloud_sql_db: Optional[str] = Field(default=None, env="CLOUD_SQL_DB", description="Cloud SQLデータベース名")
    cloud_sql_auth_type: str = Field(default="password", env="CLOUD_SQL_AUTH_TYPE", description="Cloud SQL認証タイプ: 'password' | 'iam' | 'hybrid'")
    cloud_sql_iam_user: Optional[str] = Field(default=None, env="CLOUD_SQL_IAM_USER", description="Cloud SQL IAM認証用ユーザー")
    init_mode: bool = Field(default=False, env="INIT_MODE", description="初期化モードフラグ")

    @property
    def is_production(self) -> bool:
        """本番環境かどうか"""
        return self.environment.lower() in ["production", "prod"]

    @property
    def is_development(self) -> bool:
        """開発環境かどうか"""
        return self.environment.lower() in ["development", "dev"]


# Global settings instance
settings = AppSettings()
