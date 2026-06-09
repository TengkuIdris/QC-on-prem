"""
エージェント設定モジュールのテスト
"""
from unittest.mock import patch
from why_why_chat_ai.agent.config import AgentSettings


class TestAgentSettings:
    """AgentSettingsクラスのテスト"""

    def test_default_values(self):
        """デフォルト値のテスト"""
        settings = AgentSettings()

        # デフォルト値をテスト（.env.testに依存しない）
        assert settings.environment in ["development", "test", "production"]
        assert settings.database_url is None or isinstance(settings.database_url, str)
        assert settings.database_min_connections >= 1  # デフォルト値または環境変数の値
        assert settings.database_max_connections >= 10  # デフォルト値または環境変数の値
        assert settings.database_connect_timeout >= 30  # デフォルト値(30)または環境変数の値
        assert settings.database_pool_timeout >= 30  # デフォルト値(30)または環境変数の値

    @patch.dict(
        "os.environ",
        {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@host:5432/db",
            "DATABASE_MIN_CONNECTIONS": "2",
            "DATABASE_MAX_CONNECTIONS": "20",
            "DATABASE_CONNECT_TIMEOUT": "60",
            "DATABASE_POOL_TIMEOUT": "120",
            "GCP_PROJECT_ID": "prod-project",
        },
    )
    def test_environment_variables(self):
        """環境変数からの設定読み込みテスト"""
        settings = AgentSettings()

        assert settings.environment == "production"
        assert settings.database_url == "postgresql://user:pass@host:5432/db"
        assert settings.database_min_connections == 2
        assert settings.database_max_connections == 20
        assert settings.database_connect_timeout == 60
        assert settings.database_pool_timeout == 120
        assert settings.gcp_project_id == "prod-project"
