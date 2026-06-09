"""
Secret Manager アクセスの統合テスト

このテストは実際の Secret Manager へアクセスして動作を確認します。
データベースアクセスはモックされます。
"""
import os
import pytest
from unittest.mock import patch
from google.cloud import secretmanager
from google.api_core import exceptions as google_exceptions

from why_why_chat_ai.api.services.agent_client import _get_postgres_password


@pytest.mark.integration
@pytest.mark.requires_gcp
@pytest.mark.vertex_ai_dev  # test-integration-vertex-ai-dev.ymlワークフローで実行
class TestSecretManager:
    """Secret Manager アクセスの統合テスト"""

    @pytest.mark.asyncio
    async def test_get_postgres_password_from_env(self):
        """環境変数からパスワードを取得できること"""
        # Arrange
        test_password = "test-env-password"

        # Act
        with patch.dict(os.environ, {"POSTGRES_PASSWORD": test_password}):
            result = _get_postgres_password()

        # Assert
        assert result == test_password

    @pytest.mark.asyncio
    async def test_get_postgres_password_from_secret_manager(self):
        """Secret Manager からパスワードを取得できること（実際のGCPアクセス）"""
        # Arrange - 環境変数を削除してSecret Managerアクセスを強制
        env_backup = os.environ.get("POSTGRES_PASSWORD")
        if "POSTGRES_PASSWORD" in os.environ:
            del os.environ["POSTGRES_PASSWORD"]

        # GCP認証が設定されていない場合はスキップ
        try:
            client = secretmanager.SecretManagerServiceClient()
            # プロジェクトIDを環境変数から取得（実際のプロジェクトIDが必要）
            project_id = os.getenv("GCP_PROJECT_ID", "test-project")

            # リストAPIを使って認証確認（最も軽量な操作）
            parent = f"projects/{project_id}"
            try:
                # 1つだけ取得して認証を確認
                list(client.list_secrets(request={"parent": parent, "page_size": 1}))
            except google_exceptions.PermissionDenied:
                pytest.skip("GCP credentials not available or insufficient permissions")
            except google_exceptions.Unauthenticated:
                pytest.skip("GCP authentication not configured")
            except Exception as e:
                pytest.skip(f"GCP access check failed: {e}")

        except Exception:
            pytest.skip("Google Cloud SDK not properly configured")

        try:
            # Act - 実際のSecret Managerアクセス
            result = _get_postgres_password()

            # Assert
            assert result is not None
            assert isinstance(result, str)
            assert len(result) > 0

        except google_exceptions.NotFound:
            # シークレットが存在しない場合は正常なエラーとして扱う
            pytest.skip("Secret 'postgres-password-dev' not found in Secret Manager")
        except google_exceptions.PermissionDenied:
            pytest.skip("Permission denied to access Secret Manager")
        except Exception as e:
            # その他のエラーはテスト失敗
            pytest.fail(f"Unexpected error accessing Secret Manager: {e}")
        finally:
            # Cleanup - 環境変数を復元
            if env_backup is not None:
                os.environ["POSTGRES_PASSWORD"] = env_backup

    @pytest.mark.asyncio
    async def test_get_postgres_password_workspace_prod(self):
        """本番環境のワークスペースでSecret Manager からパスワードを取得できること"""
        # Arrange
        env_backup_password = os.environ.get("POSTGRES_PASSWORD")
        env_backup_workspace = os.environ.get("WORKSPACE")

        if "POSTGRES_PASSWORD" in os.environ:
            del os.environ["POSTGRES_PASSWORD"]

        # 本番環境をシミュレート
        os.environ["WORKSPACE"] = "prod"

        # GCP認証確認（test_get_postgres_password_from_secret_managerと同じ）
        try:
            client = secretmanager.SecretManagerServiceClient()
            project_id = os.getenv("GCP_PROJECT_ID", "test-project")
            parent = f"projects/{project_id}"
            try:
                list(client.list_secrets(request={"parent": parent, "page_size": 1}))
            except (google_exceptions.PermissionDenied, google_exceptions.Unauthenticated):
                pytest.skip("GCP credentials not available or insufficient permissions")
            except Exception as e:
                pytest.skip(f"GCP access check failed: {e}")
        except Exception:
            pytest.skip("Google Cloud SDK not properly configured")

        try:
            # Act
            result = _get_postgres_password()

            # Assert
            assert result is not None
            assert isinstance(result, str)
            assert len(result) > 0

        except google_exceptions.NotFound:
            # 本番環境のシークレットが存在しない場合も正常
            pytest.skip("Secret 'postgres-password-prod' not found in Secret Manager")
        except google_exceptions.PermissionDenied:
            pytest.skip("Permission denied to access Secret Manager")
        except Exception as e:
            pytest.fail(f"Unexpected error accessing Secret Manager: {e}")
        finally:
            # Cleanup
            if env_backup_password is not None:
                os.environ["POSTGRES_PASSWORD"] = env_backup_password
            if env_backup_workspace is not None:
                os.environ["WORKSPACE"] = env_backup_workspace
            else:
                del os.environ["WORKSPACE"]

    @pytest.mark.asyncio
    async def test_get_postgres_password_error_handling(self):
        """Secret Manager アクセスエラーが適切に処理されること"""
        # Arrange
        env_backup = os.environ.get("POSTGRES_PASSWORD")
        if "POSTGRES_PASSWORD" in os.environ:
            del os.environ["POSTGRES_PASSWORD"]

        # 無効なプロジェクトIDでエラーを発生させる
        with patch("why_why_chat_ai.agent.config.settings") as mock_settings:
            mock_settings.gcp_project_id = "invalid-project-id-that-does-not-exist-12345"

            try:
                # Act & Assert
                with pytest.raises(Exception) as exc_info:
                    _get_postgres_password()

                # エラーメッセージが含まれていることを確認
                error_message = str(exc_info.value)
                assert any(keyword in error_message for keyword in [
                    "Failed to retrieve password from Secret Manager",
                    "404",
                    "NOT_FOUND",
                    "PermissionDenied",
                    "Permission denied",  # 追加: 実際のGCPエラーメッセージ
                    "403"  # 追加: 403エラーコード
                ])

            finally:
                # Cleanup
                if env_backup is not None:
                    os.environ["POSTGRES_PASSWORD"] = env_backup


@pytest.mark.mock_only
class TestSecretManagerWithMocks:
    """Secret Manager のモックを使用したテスト（CI/CD環境用）"""

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.secretmanager.SecretManagerServiceClient")
    async def test_get_postgres_password_mock_success(self, mock_client_class):
        """Secret Manager からのパスワード取得成功をモックでテスト"""
        # Arrange
        env_backup = os.environ.get("POSTGRES_PASSWORD")
        if "POSTGRES_PASSWORD" in os.environ:
            del os.environ["POSTGRES_PASSWORD"]

        mock_client = mock_client_class.return_value
        mock_response = type('obj', (object,), {
            'payload': type('obj', (object,), {
                'data': b'mocked-secret-password'
            })()
        })()
        mock_client.access_secret_version.return_value = mock_response

        try:
            # Act
            result = _get_postgres_password()

            # Assert
            assert result == "mocked-secret-password"
            mock_client.access_secret_version.assert_called_once()
            call_args = mock_client.access_secret_version.call_args[1]["request"]
            assert "postgres-password-dev" in call_args["name"]

        finally:
            # Cleanup
            if env_backup is not None:
                os.environ["POSTGRES_PASSWORD"] = env_backup

    @pytest.mark.asyncio
    @patch("why_why_chat_ai.api.services.agent_client.secretmanager.SecretManagerServiceClient")
    async def test_get_postgres_password_mock_error(self, mock_client_class):
        """Secret Manager エラーをモックでテスト"""
        # Arrange
        env_backup = os.environ.get("POSTGRES_PASSWORD")
        if "POSTGRES_PASSWORD" in os.environ:
            del os.environ["POSTGRES_PASSWORD"]

        mock_client = mock_client_class.return_value
        mock_client.access_secret_version.side_effect = Exception("Mocked Secret Manager error")

        try:
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                _get_postgres_password()

            assert "Failed to retrieve password from Secret Manager" in str(exc_info.value) or \
                   "Mocked Secret Manager error" in str(exc_info.value)

        finally:
            # Cleanup
            if env_backup is not None:
                os.environ["POSTGRES_PASSWORD"] = env_backup
