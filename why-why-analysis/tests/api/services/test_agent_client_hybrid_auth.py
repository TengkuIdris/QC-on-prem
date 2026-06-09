"""
ハイブリッド認証のテスト

注: 現在の実装ではUnixソケット接続を使用しているため、
Cloud SQL Connectorに依存するテストは不要になりました。
このファイルのテストは将来的に更新または削除予定です。
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from why_why_chat_ai.api.services.agent_client import AgentClient

# 現在の実装ではUnixソケット接続を使用するため、全テストをスキップ
pytestmark = pytest.mark.skip(reason="Cloud SQL Connector tests are no longer needed with Unix socket connection")


class TestHybridAuthentication:
    """ハイブリッド認証の動作テスト"""

    @pytest.fixture
    def mock_env_vars(self, monkeypatch):
        """環境変数のモック設定"""
        monkeypatch.setenv("CLOUD_SQL_AUTH_TYPE", "hybrid")
        monkeypatch.setenv("CLOUD_SQL_IAM_USER", "test-sa@test-project.iam")
        monkeypatch.setenv("GCP_PROJECT_ID", "test-project")
        monkeypatch.setenv("CLOUD_SQL_REGION", "us-central1")
        monkeypatch.setenv("CLOUD_SQL_INSTANCE", "test-instance")
        monkeypatch.setenv("CLOUD_SQL_DATABASE", "test-db")
        monkeypatch.setenv("USE_CLOUD_SQL", "true")

    @pytest.fixture
    def mock_connector(self):
        """Cloud SQL Connectorのモック（スキップされるが定義は残す）"""
        # 実際には使用されないが、テストの形式を保つため
        connector_instance = MagicMock()
        # 非同期メソッドのモック
        connector_instance.connect_async = AsyncMock()
        connector_instance.close_async = AsyncMock()
        return connector_instance

    @pytest.fixture
    def mock_async_pool(self):
        """AsyncConnectionPoolのモック"""
        with patch("psycopg_pool.AsyncConnectionPool") as mock:
            pool_instance = MagicMock()
            mock.return_value = pool_instance
            yield mock

    @pytest.fixture
    def mock_postgres_saver(self):
        """AsyncPostgresSaverのモック"""
        with patch("why_why_chat_ai.api.services.agent_client.AsyncPostgresSaver") as mock:
            saver_instance = MagicMock()
            saver_instance.setup = AsyncMock()
            mock.return_value = saver_instance
            yield mock

    @pytest.fixture
    def mock_secret_manager(self):
        """Secret Managerのモック"""
        with patch("why_why_chat_ai.api.services.agent_client._get_postgres_password") as mock:
            mock.return_value = "test-password"
            yield mock

    @pytest.mark.asyncio
    async def test_hybrid_auth_initialization_mode(
        self, mock_env_vars, mock_connector, mock_async_pool,
        mock_postgres_saver, mock_secret_manager, monkeypatch
    ):
        """初期化モードでのパスワード認証テスト"""
        # 初期化モードを設定
        monkeypatch.setenv("INIT_MODE", "true")

        # モック設定を適用
        with patch("why_why_chat_ai.api.services.agent_client.settings") as mock_settings:
            mock_settings.use_cloud_sql = True
            mock_settings.gcp_project_id = "test-project"
            mock_settings.cloud_sql_region = "us-central1"
            mock_settings.cloud_sql_instance = "test-instance"
            mock_settings.cloud_sql_database = "test-db"
            mock_settings.cloud_sql_auth_type = "hybrid"
            mock_settings.init_mode = True
            mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

            client = AgentClient()

            # 初期化モードであることを確認
            assert client._is_initialization is True
            assert client._auth_type == "hybrid"

            # チェックポインターをビルド
            await client._build_checkpointer_hybrid()

            # パスワード認証が使用されたことを確認
            mock_secret_manager.assert_called_once()
            mock_async_pool.assert_called_once()

            # 接続文字列にパスワードが含まれることを確認
            call_args = mock_async_pool.call_args[0][0]
            assert "password=test-password" in call_args
            assert "user=postgres" in call_args

            # Cloud SQL Connectorが使用されていないことを確認
            mock_connector.assert_not_called()

    @pytest.mark.asyncio
    async def test_hybrid_auth_application_mode(
        self, mock_env_vars, mock_connector, mock_async_pool,
        mock_postgres_saver, mock_secret_manager, monkeypatch
    ):
        """アプリケーションモードでのIAM認証テスト"""
        # アプリケーションモードを設定（INIT_MODE=false）
        monkeypatch.setenv("INIT_MODE", "false")

        # モック設定を適用
        with patch("why_why_chat_ai.api.services.agent_client.settings") as mock_settings:
            mock_settings.use_cloud_sql = True
            mock_settings.gcp_project_id = "test-project"
            mock_settings.cloud_sql_region = "us-central1"
            mock_settings.cloud_sql_instance = "test-instance"
            mock_settings.cloud_sql_database = "test-db"
            mock_settings.cloud_sql_auth_type = "hybrid"
            mock_settings.init_mode = False
            mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

            # Cloud SQL Connectorの接続モック
            mock_conn = MagicMock()
            mock_conn.host = "127.0.0.1"
            mock_conn.port = 5432
            mock_connector.return_value.connect_async.return_value = mock_conn

            client = AgentClient()

            # アプリケーションモードであることを確認
            assert client._is_initialization is False
            assert client._auth_type == "hybrid"
            assert client._cloud_sql_iam_user == "test-sa@test-project.iam"

            # チェックポインターをビルド
            await client._build_checkpointer_hybrid()

            # IAM認証が使用されたことを確認
            mock_connector.assert_called_once()
            connector_instance = mock_connector.return_value
            connector_instance.connect_async.assert_called_once_with(
                "test-project:us-central1:test-instance",
                "asyncpg",
                user="test-sa@test-project.iam",
                db="test-db",
                enable_iam_auth=True,
            )

            # パスワード認証が使用されていないことを確認
            mock_secret_manager.assert_not_called()

    @pytest.mark.asyncio
    async def test_password_auth_fallback(
        self, mock_env_vars, mock_connector, mock_async_pool,
        mock_postgres_saver, mock_secret_manager, monkeypatch
    ):
        """パスワード認証のフォールバックテスト"""
        # パスワード認証モードを設定
        monkeypatch.setenv("CLOUD_SQL_AUTH_TYPE", "password")

        with patch("why_why_chat_ai.api.services.agent_client.settings") as mock_settings:
            mock_settings.use_cloud_sql = True
            mock_settings.gcp_project_id = "test-project"
            mock_settings.cloud_sql_region = "us-central1"
            mock_settings.cloud_sql_instance = "test-instance"
            mock_settings.cloud_sql_database = "test-db"
            mock_settings.cloud_sql_auth_type = "password"
            mock_settings.init_mode = False
            mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

            client = AgentClient()

            # パスワード認証モードであることを確認
            assert client._auth_type == "password"

            # チェックポインターをビルド
            await client._build_checkpointer_hybrid()

            # パスワード認証が使用されたことを確認
            mock_secret_manager.assert_called_once()

            # Cloud SQL Connectorが使用されていないことを確認
            mock_connector.assert_not_called()

    @pytest.mark.asyncio
    async def test_iam_auth_mode(
        self, mock_env_vars, mock_connector, mock_async_pool,
        mock_postgres_saver, mock_secret_manager, monkeypatch
    ):
        """IAM認証モードのテスト"""
        # IAM認証モードを設定
        monkeypatch.setenv("CLOUD_SQL_AUTH_TYPE", "iam")

        with patch("why_why_chat_ai.api.services.agent_client.settings") as mock_settings:
            mock_settings.use_cloud_sql = True
            mock_settings.gcp_project_id = "test-project"
            mock_settings.cloud_sql_region = "us-central1"
            mock_settings.cloud_sql_instance = "test-instance"
            mock_settings.cloud_sql_database = "test-db"
            mock_settings.cloud_sql_auth_type = "iam"
            mock_settings.init_mode = False
            mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

            # Cloud SQL Connectorの接続モック
            mock_conn = MagicMock()
            mock_conn.host = "127.0.0.1"
            mock_conn.port = 5432
            mock_connector.return_value.connect_async.return_value = mock_conn

            client = AgentClient()

            # IAM認証モードであることを確認
            assert client._auth_type == "iam"

            # チェックポインターをビルド
            await client._build_checkpointer_hybrid()

            # IAM認証が使用されたことを確認
            mock_connector.assert_called_once()

            # パスワード認証が使用されていないことを確認
            mock_secret_manager.assert_not_called()

    @pytest.mark.asyncio
    async def test_connector_cleanup(
        self, mock_env_vars, mock_connector, monkeypatch
    ):
        """Cloud SQL Connectorのクリーンアップテスト"""
        monkeypatch.setenv("CLOUD_SQL_AUTH_TYPE", "iam")

        with patch("why_why_chat_ai.api.services.agent_client.settings") as mock_settings:
            mock_settings.use_cloud_sql = True
            mock_settings.gcp_project_id = "test-project"
            mock_settings.cloud_sql_region = "us-central1"
            mock_settings.cloud_sql_instance = "test-instance"
            mock_settings.cloud_sql_database = "test-db"
            mock_settings.cloud_sql_auth_type = "iam"
            mock_settings.init_mode = False
            mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

            client = AgentClient()

        # モックコネクタを設定
        client._connector = mock_connector.return_value

        # クリーンアップを実行
        await client.cleanup()

        # close_asyncが呼ばれたことを確認
        mock_connector.return_value.close_async.assert_called_once()

        # コネクタがNoneになったことを確認
        assert client._connector is None

    @pytest.mark.asyncio
    async def test_connector_not_available(
        self, mock_env_vars, monkeypatch
    ):
        """Cloud SQL Connectorが利用できない場合のエラーテスト"""
        monkeypatch.setenv("CLOUD_SQL_AUTH_TYPE", "iam")

        # Unixソケット接続を使用するため、Cloud SQL Connectorのテストは不要
        # 現在はこのテストをスキップ
        pytest.skip("Unix socket connection does not require Cloud SQL Connector")

        with patch("why_why_chat_ai.api.services.agent_client.settings") as mock_settings:
                mock_settings.use_cloud_sql = True
                mock_settings.gcp_project_id = "test-project"
                mock_settings.cloud_sql_region = "us-central1"
                mock_settings.cloud_sql_instance = "test-instance"
                mock_settings.cloud_sql_database = "test-db"
                mock_settings.cloud_sql_auth_type = "iam"
                mock_settings.init_mode = False
                mock_settings.cloud_sql_iam_user = "test-sa@test-project.iam"

                client = AgentClient()

                # RuntimeErrorが発生することを確認
                with pytest.raises(RuntimeError, match="Cloud SQL Connector not available"):
                    await client._build_checkpointer_hybrid()
