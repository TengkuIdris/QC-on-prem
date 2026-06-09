"""
API設定モジュールのテスト
"""
from unittest.mock import patch
from why_why_chat_ai.api.config import AppSettings


class TestAppSettings:
    """AppSettingsクラスのテスト"""

    def test_default_values(self):
        """デフォルト値のテスト"""
        settings = AppSettings()

        # デフォルト値をテスト（.env.testに依存しない）
        assert settings.environment in ["development", "test", "production"]
        assert settings.debug is False
        assert settings.log_level in ["DEBUG", "INFO", "WARNING", "ERROR"]
        assert settings.api_title == "Why-Why Analysis AI Agent API"
        # APIバージョンはgitのコミットハッシュまたはタグになる
        assert isinstance(settings.api_version, str)
        assert len(settings.api_version) > 0
        # API_KEYとJWT_SECRET_KEYは環境によって設定される可能性があるため、型のみチェック
        assert settings.api_key is None or isinstance(settings.api_key, str)
        assert settings.jwt_secret_key is None or isinstance(settings.jwt_secret_key, str)
        # Removed database test as AppSettings no longer has database field

    def test_is_production(self):
        """本番環境判定のテスト"""
        # 本番環境
        settings = AppSettings(environment="production")
        assert settings.is_production is True
        assert settings.is_development is False

        # 本番環境（大文字小文字混在）
        settings = AppSettings(environment="PRODUCTION")
        assert settings.is_production is True

        # 開発環境
        settings = AppSettings(environment="development")
        assert settings.is_production is False
        assert settings.is_development is True

    @patch.dict("os.environ", {
        "ENVIRONMENT": "production",
        "DEBUG": "true",
        "LOG_LEVEL": "DEBUG",
        "API_KEY": "test_api_key",
        "JWT_SECRET_KEY": "test_jwt_secret"
    })
    def test_environment_variables(self):
        """環境変数からの設定読み込みテスト"""
        settings = AppSettings()

        assert settings.environment == "production"
        assert settings.debug is True
        assert settings.log_level == "DEBUG"
        assert settings.api_key == "test_api_key"
        assert settings.jwt_secret_key == "test_jwt_secret"
