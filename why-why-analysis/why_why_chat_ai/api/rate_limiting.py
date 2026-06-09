"""レート制限設定モジュール"""

from slowapi import Limiter
from slowapi.util import get_remote_address


def get_limiter():
    """レート制限を動的に作成"""
    from .security import SecuritySettings
    settings = SecuritySettings()
    return Limiter(
        key_func=get_remote_address,
        default_limits=[settings.rate_limit_default]
    )


# レート制限の設定をここで初期化
limiter = get_limiter()
