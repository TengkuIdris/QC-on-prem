"""Google Cloud Identity Token検証のテスト"""

import time
import base64
from unittest.mock import patch
import pytest
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

from why_why_chat_ai.api.auth import (
    jwk_to_pem,
    get_public_key_from_jwks,
    verify_jwt_token
)
from fastapi.security import HTTPAuthorizationCredentials


class TestGoogleIdentityToken:
    """Google Cloud Identity Tokenの検証テスト"""

    @pytest.fixture
    def google_rsa_keys(self):
        """Google形式のRSAキーペアを生成"""
        # RSAキーペアを生成
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        public_key = private_key.public_key()

        # 公開鍵からn, eを取得
        public_numbers = public_key.public_numbers()

        # nとeをBase64URLエンコード（パディングなし）
        n_bytes = public_numbers.n.to_bytes((public_numbers.n.bit_length() + 7) // 8, byteorder='big')
        e_bytes = public_numbers.e.to_bytes((public_numbers.e.bit_length() + 7) // 8, byteorder='big')

        n_b64 = base64.urlsafe_b64encode(n_bytes).decode('ascii').rstrip('=')
        e_b64 = base64.urlsafe_b64encode(e_bytes).decode('ascii').rstrip('=')

        # JWK形式
        jwk = {
            "kty": "RSA",
            "use": "sig",
            "kid": "test-key-id-123",
            "n": n_b64,
            "e": e_b64,
            "alg": "RS256"
        }

        # 秘密鍵をPEM形式に
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')

        return private_pem, jwk

    def test_jwk_to_pem_conversion(self, google_rsa_keys):
        """JWKからPEMへの変換が正しく動作すること"""
        _, jwk = google_rsa_keys

        # JWKをPEMに変換
        pem = jwk_to_pem(jwk)

        # PEMが正しい形式であることを確認
        assert pem.startswith("-----BEGIN PUBLIC KEY-----")
        assert pem.endswith("-----END PUBLIC KEY-----\n")

        # PEMから公開鍵をロードできることを確認
        from cryptography.hazmat.primitives import serialization
        public_key = serialization.load_pem_public_key(
            pem.encode('utf-8'),
            backend=default_backend()
        )
        assert public_key is not None

    def test_google_identity_token_verification(self, google_rsa_keys):
        """Google Identity Token形式のJWT検証が成功すること"""
        private_key, jwk = google_rsa_keys

        # Google Identity Token形式のペイロード
        current_time = int(time.time())
        payload = {
            "iss": "https://accounts.google.com",
            "sub": "1234567890",
            "aud": "test-client-id.apps.googleusercontent.com",
            "exp": current_time + 3600,
            "iat": current_time,
            "email": "test@example.com",
            "email_verified": True
        }

        # トークンを生成（kidをヘッダーに含める）
        token = jwt.encode(
            payload,
            private_key,
            algorithm="RS256",
            headers={"kid": jwk["kid"]}
        )

        # JWKSモック
        mock_jwks = {
            "keys": [jwk]
        }

        # 認証情報
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )

        # get_jwksをモック
        with patch('why_why_chat_ai.api.auth.get_jwks', return_value=mock_jwks):
            # セキュリティ設定をモック
            from why_why_chat_ai.api.security import security_settings
            with patch.object(security_settings, 'jwks_url', 'https://www.googleapis.com/oauth2/v3/certs'), \
                 patch.object(security_settings, 'jwt_algorithm', 'RS256'), \
                 patch.object(security_settings, 'jwt_issuer', 'https://accounts.google.com'), \
                 patch.object(security_settings, 'jwt_audience', 'test-client-id.apps.googleusercontent.com'):

                # JWT検証を実行
                result = verify_jwt_token(credentials)

                # 検証結果を確認
                assert result["sub"] == "1234567890"
                assert result["email"] == "test@example.com"
                assert result["iss"] == "https://accounts.google.com"

    def test_jwk_without_padding(self, google_rsa_keys):
        """パディングなしのBase64URLエンコードされたJWKが正しく処理されること"""
        _, jwk = google_rsa_keys

        # n と e がパディングなしであることを確認
        assert not jwk["n"].endswith("=")
        assert not jwk["e"].endswith("=")

        # 変換が成功することを確認
        pem = jwk_to_pem(jwk)
        assert pem is not None

    def test_get_public_key_from_jwks_with_multiple_keys(self, google_rsa_keys):
        """複数のキーを含むJWKSから正しいキーが選択されること"""
        private_key, jwk = google_rsa_keys

        # 別のダミーキーを追加
        mock_jwks = {
            "keys": [
                {
                    "kty": "RSA",
                    "kid": "dummy-key-1",
                    "n": "dummy",
                    "e": "AQAB"
                },
                jwk,  # 正しいキー
                {
                    "kty": "RSA",
                    "kid": "dummy-key-2",
                    "n": "dummy2",
                    "e": "AQAB"
                }
            ]
        }

        # トークンを生成
        token = jwt.encode(
            {"sub": "test"},
            private_key,
            algorithm="RS256",
            headers={"kid": jwk["kid"]}
        )

        # get_jwksをモック
        with patch('why_why_chat_ai.api.auth.get_jwks', return_value=mock_jwks):
            # 正しいキーが選択されることを確認
            public_key_pem = get_public_key_from_jwks(token)
            assert public_key_pem is not None

            # 取得した公開鍵でトークンを検証できることを確認
            decoded = jwt.decode(
                token,
                public_key_pem,
                algorithms=["RS256"]
            )
            assert decoded["sub"] == "test"

    def test_invalid_jwk_format(self):
        """無効なJWK形式でエラーが発生すること"""
        # ktyがRSAでないJWK
        invalid_jwk = {
            "kty": "EC",  # RSAではない
            "kid": "test-key",
            "crv": "P-256",
            "x": "dummy",
            "y": "dummy"
        }

        with pytest.raises(ValueError, match="Only RSA keys are supported"):
            jwk_to_pem(invalid_jwk)

    def test_malformed_base64_in_jwk(self):
        """不正なBase64エンコーディングのJWKでエラーが発生すること"""
        malformed_jwk = {
            "kty": "RSA",
            "kid": "test-key",
            "n": "invalid!base64@data#",  # 不正なBase64
            "e": "AQAB"
        }

        with pytest.raises(Exception):  # Base64デコードエラー
            jwk_to_pem(malformed_jwk)
