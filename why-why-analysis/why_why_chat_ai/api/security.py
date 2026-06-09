"""セキュリティ設定モジュール"""

from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings


class SecuritySettings(BaseSettings):
    """セキュリティ関連の設定"""

    # API キー設定
    api_keys: List[str] = Field(
        default_factory=list,
        description="有効なAPIキーのリスト"
    )

    # JWT 設定
    jwt_algorithm: str = Field(
        default="RS256",
        description="JWT署名アルゴリズム"
    )
    jwt_issuer: Optional[str] = Field(
        default=None,
        description="JWT発行者（検証時にチェック）"
    )
    jwt_audience: Optional[str] = Field(
        default=None,
        description="JWT対象者（検証時にチェック）"
    )
    jwt_audiences: List[str] = Field(
        default_factory=list,
        description="JWT対象者のリスト（複数のaudienceを受け入れる場合）"
    )
    jwks_url: Optional[str] = Field(
        default=None,
        description="JWKS（JSON Web Key Set）エンドポイントURL"
    )
    jwt_public_key: Optional[str] = Field(
        default=None,
        description="JWT検証用の公開鍵（PEM形式）"
    )

    # IP ホワイトリスト設定
    ip_whitelist: List[str] = Field(
        default_factory=list,
        description="許可するIPアドレスのリスト（空の場合は全て許可）"
    )

    # レート制限設定
    rate_limit_default: str = Field(
        default="100/hour",
        description="デフォルトのレート制限"
    )
    rate_limit_per_endpoint: dict[str, str] = Field(
        default_factory=dict,
        description="エンドポイント別のレート制限"
    )

    model_config = {
        "env_prefix": "SECURITY_",
        "env_nested_delimiter": "__",
    }

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # 環境変数からリストを読み込むためのカスタムソース
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )


# グローバルインスタンス
security_settings = SecuritySettings()
