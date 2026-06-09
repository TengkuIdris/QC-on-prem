"""セキュリティ機能のデモンストレーションテスト"""

import pytest
import os
from httpx import AsyncClient
from unittest.mock import patch

from why_why_chat_ai.api.app import create_app
from why_why_chat_ai.api.security import security_settings


@pytest.mark.skipif(
    os.getenv("RUN_SECURITY_DEMO") != "true",
    reason="セキュリティデモは RUN_SECURITY_DEMO=true で実行"
)
class TestSecurityDemo:
    """セキュリティ機能の動作確認用デモテスト"""

    @pytest.fixture
    async def client(self):
        """テスト用の非同期HTTPクライアントを作成"""
        app = create_app()
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client

    @pytest.mark.asyncio
    async def test_security_features_demo(self, client):
        """セキュリティ機能の総合デモ"""

        print("\n=== セキュリティ機能デモ ===\n")

        # 1. 認証なしでのアクセス（拒否される）
        print("1. 認証なしでのアクセス:")
        response = await client.get("/v1/threads/test-id")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}\n")
        assert response.status_code == 401

        # 2. 無効なAPIキーでのアクセス（拒否される）
        print("2. 無効なAPIキーでのアクセス:")
        with patch.object(security_settings, 'api_keys', ['valid-key-123']):
            response = await client.get(
                "/v1/threads/test-id",
                headers={"X-API-Key": "invalid-key"}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}\n")
            assert response.status_code == 401

        # 3. 有効なAPIキーでのアクセス（許可される）
        print("3. 有効なAPIキーでのアクセス:")
        with patch.object(security_settings, 'api_keys', ['valid-key-123']):
            response = await client.get(
                "/v1/threads/test-id",
                headers={"X-API-Key": "valid-key-123"}
            )
            print(f"   Status: {response.status_code}")
            # エージェントクライアントのエラーで500になる可能性
            assert response.status_code in [200, 404, 500]

        # 4. IPホワイトリストのデモ
        print("4. IPホワイトリスト機能:")
        with patch.object(security_settings, 'ip_whitelist', ['192.168.1.1']), \
             patch.object(security_settings, 'api_keys', []):

            # 許可されていないIPからのアクセス
            response = await client.get(
                "/v1/threads/test-id",
                headers={
                    "X-API-Key": "any-key",
                    "X-Forwarded-For": "10.0.0.1"
                }
            )
            print(f"   未許可IP (10.0.0.1) - Status: {response.status_code}")
            assert response.status_code == 403

            # 許可されたIPからのアクセス
            response = await client.get(
                "/v1/threads/test-id",
                headers={
                    "X-API-Key": "any-key",
                    "X-Forwarded-For": "192.168.1.1"
                }
            )
            print(f"   許可IP (192.168.1.1) - Status: {response.status_code}")
            assert response.status_code != 403

        # 5. レート制限のデモ
        print("\n5. レート制限機能:")
        print("   ※ レート制限はエンドポイントごとに設定されています")
        print("   - POST /v1/threads: 10/minute")
        print("   - POST /v1/threads/{id}/stream: 30/minute")
        print("   - GET /v1/threads/{id}: 60/minute")

        # 6. ヘルスチェックは認証不要
        print("\n6. ヘルスチェックエンドポイント（認証不要）:")
        response = await client.get("/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")

        print("\n=== デモ完了 ===")


if __name__ == "__main__":
    # 直接実行する場合
    import asyncio

    async def run_demo():
        app = create_app()
        async with AsyncClient(app=app, base_url="http://test") as client:
            demo = TestSecurityDemo()
            await demo.test_security_features_demo(client)

    print("セキュリティ機能のデモを実行します...")
    asyncio.run(run_demo())
