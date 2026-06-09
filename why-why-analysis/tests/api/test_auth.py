"""認証機能のテスト"""

import pytest
from unittest.mock import patch, MagicMock
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

from fastapi.security import HTTPAuthorizationCredentials

from why_why_chat_ai.api.auth import (
    verify_api_key,
    verify_jwt_token,
    get_current_auth,
    create_test_jwt,
    AuthenticationError
)
from why_why_chat_ai.api.security import security_settings


class TestAPIKeyAuthentication:
    """APIキー認証のテスト"""

    def test_valid_api_key(self):
        """有効なAPIキーでの認証が成功すること"""
        with patch.object(security_settings, 'api_keys', ['test-api-key-123']):
            result = verify_api_key('test-api-key-123')
            assert result == 'test-api-key-123'

    def test_invalid_api_key(self):
        """無効なAPIキーで認証エラーが発生すること"""
        with patch.object(security_settings, 'api_keys', ['test-api-key-123']):
            with pytest.raises(AuthenticationError) as exc_info:
                verify_api_key('invalid-key')
            assert exc_info.value.status_code == 401
            assert "Invalid API key" in str(exc_info.value.detail)

    def test_missing_api_key(self):
        """APIキーが提供されていない場合にエラーが発生すること"""
        with patch.object(security_settings, 'api_keys', ['test-api-key-123']):
            with pytest.raises(AuthenticationError) as exc_info:
                verify_api_key(None)
            assert exc_info.value.status_code == 401
            assert "API key is missing" in str(exc_info.value.detail)

    def test_no_api_keys_configured(self):
        """APIキーが設定されていない場合は認証をスキップすること（開発環境用）"""
        with patch.object(security_settings, 'api_keys', []):
            result = verify_api_key('any-key')
            assert result == 'any-key'


class TestJWTAuthentication:
    """JWT認証のテスト"""

    @pytest.fixture(scope="class")
    def rsa_keys(self):
        """テスト用のRSAキーペアを生成"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        public_key = private_key.public_key()

        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')

        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

        return private_pem, public_pem

    def test_valid_jwt_token(self, rsa_keys):
        """有効なJWTトークンでの認証が成功すること"""
        private_key, public_key = rsa_keys

        # テスト用トークンを生成
        payload = {
            "sub": "test-user",
            "iss": "test-issuer",
            "aud": "test-audience"
        }
        token = create_test_jwt(payload, private_key, algorithm="RS256")

        # 認証情報を作成
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )

        with patch.object(security_settings, 'jwt_public_key', public_key), \
             patch.object(security_settings, 'jwt_algorithm', 'RS256'), \
             patch.object(security_settings, 'jwt_issuer', 'test-issuer'), \
             patch.object(security_settings, 'jwt_audience', 'test-audience'):

            result = verify_jwt_token(credentials)
            assert result["sub"] == "test-user"
            assert result["iss"] == "test-issuer"
            assert result["aud"] == "test-audience"

    def test_expired_jwt_token(self, rsa_keys):
        """期限切れのJWTトークンでエラーが発生すること"""
        private_key, public_key = rsa_keys

        # 期限切れトークンを生成（-1秒で即座に期限切れ）
        payload = {"sub": "test-user"}
        token = create_test_jwt(payload, private_key, expires_in=-1)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )

        with patch.object(security_settings, 'jwt_public_key', public_key), \
             patch.object(security_settings, 'jwt_algorithm', 'RS256'):

            with pytest.raises(AuthenticationError) as exc_info:
                verify_jwt_token(credentials)
            assert "Token has expired" in str(exc_info.value.detail)

    def test_invalid_signature(self, rsa_keys):
        """無効な署名のJWTトークンでエラーが発生すること"""
        private_key1, public_key1 = rsa_keys

        # 別の秘密鍵で別のキーペアを生成
        another_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        another_private_pem = another_private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')

        # 異なる秘密鍵で署名したトークン
        payload = {"sub": "test-user"}
        token = create_test_jwt(payload, another_private_pem)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )

        with patch.object(security_settings, 'jwt_public_key', public_key1), \
             patch.object(security_settings, 'jwt_algorithm', 'RS256'):

            with pytest.raises(AuthenticationError) as exc_info:
                verify_jwt_token(credentials)
            assert "Invalid token" in str(exc_info.value.detail)

    def test_missing_jwt_credentials(self):
        """JWT認証情報が提供されていない場合にエラーが発生すること"""
        with pytest.raises(AuthenticationError) as exc_info:
            verify_jwt_token(None)
        assert "Authorization header is missing" in str(exc_info.value.detail)

    def test_no_public_key_configured(self):
        """公開鍵が設定されていない場合にエラーが発生すること"""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="dummy-token"
        )

        with patch.object(security_settings, 'jwt_public_key', None), \
             patch.object(security_settings, 'jwks_url', None):

            with pytest.raises(AuthenticationError) as exc_info:
                verify_jwt_token(credentials)
            assert "No public key available" in str(exc_info.value.detail)


@pytest.fixture
def rsa_keys():
    """テスト用のRSAキーペアを生成（グローバルフィクスチャー）"""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return private_pem, public_pem


class TestIntegratedAuthentication:
    """統合認証関数のテスト"""

    @pytest.mark.asyncio
    async def test_api_key_authentication(self):
        """APIキー認証が優先されること"""
        with patch.object(security_settings, 'api_keys', ['test-api-key']):
            mock_request = MagicMock()
            result = await get_current_auth(
                request=mock_request,
                api_key='test-api-key',
                jwt_credentials=None
            )
            assert result["auth_type"] == "api_key"
            assert result["user_info"] == {}

    @pytest.mark.asyncio
    async def test_jwt_authentication(self, rsa_keys):
        """JWT認証が機能すること"""
        private_key, public_key = rsa_keys

        # .env.testの設定値と一致するようにissuerとaudienceを含める
        payload = {
            "sub": "test-user",
            "iss": "test-issuer",
            "aud": "test-audience"
        }
        token = create_test_jwt(payload, private_key)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )

        with patch.object(security_settings, 'jwt_public_key', public_key), \
             patch.object(security_settings, 'jwt_algorithm', 'RS256'), \
             patch.object(security_settings, 'jwt_issuer', 'test-issuer'), \
             patch.object(security_settings, 'jwt_audience', 'test-audience'):

            mock_request = MagicMock()
            result = await get_current_auth(
                request=mock_request,
                api_key=None,
                jwt_credentials=credentials
            )
            assert result["auth_type"] == "jwt"
            assert result["user_info"]["sub"] == "test-user"

    @pytest.mark.asyncio
    async def test_no_credentials_provided(self):
        """認証情報が提供されていない場合にエラーが発生すること"""
        mock_request = MagicMock()

        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_auth(
                request=mock_request,
                api_key=None,
                jwt_credentials=None
            )
        assert "No authentication credentials provided" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_api_key_priority_over_jwt(self, rsa_keys):
        """APIキーとJWT両方が提供された場合、APIキーが優先されること"""
        private_key, public_key = rsa_keys

        # JWT作成
        payload = {"sub": "test-user"}
        token = create_test_jwt(payload, private_key)
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )

        with patch.object(security_settings, 'api_keys', ['test-api-key']), \
             patch.object(security_settings, 'jwt_public_key', public_key):

            mock_request = MagicMock()
            result = await get_current_auth(
                request=mock_request,
                api_key='test-api-key',
                jwt_credentials=credentials
            )
            # APIキーが優先される
            assert result["auth_type"] == "api_key"
            assert result["user_info"] == {}
