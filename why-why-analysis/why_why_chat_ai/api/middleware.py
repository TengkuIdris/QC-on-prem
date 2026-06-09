"""セキュリティ関連のミドルウェア"""

import ipaddress
from typing import Callable
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp



class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """IPホワイトリストミドルウェア"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 毎回最新の設定を取得（テスト時の設定変更に対応）
        from .security import security_settings
        
        # ホワイトリストが空の場合は全て許可
        if not security_settings.ip_whitelist:
            return await call_next(request)

        # ヘルスチェックエンドポイントは除外
        if request.url.path in ["/health", "/healthz"]:
            return await call_next(request)

        # クライアントIPアドレスの取得
        # Cloud Run/Load Balancer経由の場合は X-Forwarded-For ヘッダーを確認
        client_ip = None

        # X-Forwarded-For ヘッダーから取得（最初のIPがオリジナルクライアント）
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(",")[0].strip()
        else:
            # 直接接続の場合
            if request.client:
                client_ip = request.client.host

        # IPアドレスが取得できない場合は拒否
        if not client_ip:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": {
                        "code": "PERMISSION_DENIED",
                        "message": "Client IP could not be determined"
                    }
                }
            )

        # ホワイトリストチェック（CIDR範囲をサポート）
        is_allowed = False
        try:
            client_ip_obj = ipaddress.ip_address(client_ip)

            for allowed_ip in security_settings.ip_whitelist:
                try:
                    # CIDR表記の場合はネットワークとして扱う
                    if "/" in allowed_ip:
                        network = ipaddress.ip_network(allowed_ip, strict=False)
                        if client_ip_obj in network:
                            is_allowed = True
                            break
                    else:
                        # 単一IPアドレスの場合
                        if str(client_ip_obj) == allowed_ip:
                            is_allowed = True
                            break
                except ValueError:
                    # 無効なIP/CIDR表記は無視
                    continue

        except ValueError:
            # クライアントIPが無効な場合は拒否
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": {
                        "code": "PERMISSION_DENIED",
                        "message": f"Invalid client IP: {client_ip}"
                    }
                }
            )

        if not is_allowed:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": {
                        "code": "PERMISSION_DENIED",
                        "message": f"Access denied from IP: {client_ip}"
                    }
                }
            )

        return await call_next(request)
