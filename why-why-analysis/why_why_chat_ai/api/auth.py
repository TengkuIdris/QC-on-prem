"""認証モジュール"""

import time
import base64
from typing import Optional, Dict, Any
from functools import lru_cache
import httpx
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from fastapi import HTTPException, Depends, Request, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials



# 認証スキーマの定義
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticationError(HTTPException):
    """認証エラー"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": detail},
            headers={"WWW-Authenticate": "Bearer"},
        )


@lru_cache(maxsize=1)
def get_jwks() -> Optional[Dict[str, Any]]:
    """JWKS（JSON Web Key Set）を取得（キャッシュ付き）"""
    # 毎回設定を再読み込みして最新の値を取得
    from .security import security_settings
    settings = security_settings

    if not settings.jwks_url:
        return None

    try:
        with httpx.Client() as client:
            response = client.get(settings.jwks_url, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        # JWKS取得に失敗した場合はログに記録（本番環境では適切なロガーを使用）
        print(f"Failed to fetch JWKS: {e}")
        return None


def jwk_to_pem(jwk: Dict[str, Any]) -> str:
    """JWKをPEM形式に変換"""
    if jwk.get("kty") != "RSA":
        raise ValueError("Only RSA keys are supported")
    
    # Base64URL エンコードされた n と e をデコード
    # パディングを適切に追加
    n_b64 = jwk["n"]
    e_b64 = jwk["e"]
    
    # Base64URLデコード時のパディング調整
    n_missing_padding = len(n_b64) % 4
    if n_missing_padding:
        n_b64 += '=' * (4 - n_missing_padding)
    
    e_missing_padding = len(e_b64) % 4
    if e_missing_padding:
        e_b64 += '=' * (4 - e_missing_padding)
    
    n = int.from_bytes(base64.urlsafe_b64decode(n_b64), byteorder="big")
    e = int.from_bytes(base64.urlsafe_b64decode(e_b64), byteorder="big")
    
    # RSA公開鍵を作成
    public_numbers = rsa.RSAPublicNumbers(e, n)
    public_key = public_numbers.public_key()
    
    # PEM形式にエンコード
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return pem.decode("utf-8")


def get_public_key_from_jwks(token: str) -> Optional[str]:
    """JWKSから適切な公開鍵を取得"""
    jwks = get_jwks()
    if not jwks:
        return None

    try:
        # トークンヘッダーからkidを取得
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            return None

        # kidに対応する鍵を検索
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                # JWKをPEM形式に変換
                return jwk_to_pem(key)

        return None
    except Exception as e:
        print(f"Failed to get public key from JWKS: {e}")
        return None


def verify_api_key(api_key: Optional[str] = Depends(api_key_header)) -> str:
    """APIキー認証"""
    if not api_key:
        raise AuthenticationError("API key is missing")

    # 毎回設定を再読み込みして最新の値を取得
    from .security import security_settings
    settings = security_settings

    if not settings.api_keys:
        # APIキーが設定されていない場合は認証をスキップ（開発環境用）
        return api_key

    if api_key not in settings.api_keys:
        raise AuthenticationError("Invalid API key")

    return api_key


def verify_jwt_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict[str, Any]:
    """JWT認証"""
    if not credentials:
        raise AuthenticationError("Authorization header is missing")

    token = credentials.credentials

    # 毎回設定を再読み込みして最新の値を取得
    from .security import security_settings
    settings = security_settings

    try:
        # 公開鍵の取得（優先順位: JWKS -> 環境変数の公開鍵）
        public_key = None
        if settings.jwks_url:
            public_key = get_public_key_from_jwks(token)
        elif settings.jwt_public_key:
            public_key = settings.jwt_public_key

        if not public_key:
            raise AuthenticationError("No public key available for JWT verification")

        # JWTのデコードと検証
        # audienceの準備（単一audience + 複数audiences）
        audiences = []
        if settings.jwt_audience:
            audiences.append(settings.jwt_audience)
        if settings.jwt_audiences:
            audiences.extend(settings.jwt_audiences)
        
        # audienceが設定されていない場合は検証をスキップ
        verify_aud = bool(audiences)
        
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            audience=audiences[0] if len(audiences) == 1 else audiences if audiences else None,
            options={"verify_exp": True, "verify_aud": verify_aud}
        )

        return payload

    except ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except InvalidTokenError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")
    except Exception as e:
        raise AuthenticationError(f"Token verification failed: {str(e)}")


async def get_current_auth(
    request: Request,
    api_key: Optional[str] = Depends(api_key_header),
    jwt_credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """
    統合認証関数：APIキーまたはJWT認証をサポート

    Returns:
        認証情報を含む辞書
        - auth_type: "api_key" または "jwt"
        - user_info: JWT の場合はペイロード、API キーの場合は空の辞書
    """
    # APIキー認証を優先
    if api_key:
        verify_api_key(api_key)
        return {
            "auth_type": "api_key",
            "user_info": {}
        }

    # JWT認証
    if jwt_credentials:
        payload = verify_jwt_token(jwt_credentials)
        return {
            "auth_type": "jwt",
            "user_info": payload
        }

    # どちらの認証情報も提供されていない場合
    raise AuthenticationError("No authentication credentials provided")


# テスト用ヘルパー関数
def create_test_jwt(
    payload: Dict[str, Any],
    private_key: str,
    algorithm: str = "RS256",
    expires_in: int = 3600
) -> str:
    """テスト用のJWTトークンを生成"""
    current_time = int(time.time())

    # 標準的なクレームを追加
    full_payload = {
        "iat": current_time,
        "exp": current_time + expires_in,
        **payload
    }

    return jwt.encode(full_payload, private_key, algorithm=algorithm)
