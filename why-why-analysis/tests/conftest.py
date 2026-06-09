"""
pytest設定ファイル

実際のVertex AIを必要とするテストをスキップするための設定
"""
import os
import pytest
from pathlib import Path


def pytest_collection_modifyitems(config, items):
    """
    テスト収集後に実行され、マーカーに基づいてテストをスキップする
    """
    # Vertex AIの実際の認証が必要なテストをスキップ
    use_real_vertex_ai = os.getenv("USE_REAL_VERTEX_AI")
    print(f"DEBUG: USE_REAL_VERTEX_AI = {use_real_vertex_ai}")
    if use_real_vertex_ai != "true":
        skip_vertex_ai = pytest.mark.skip(reason="実際のVertex AI APIが必要 (USE_REAL_VERTEX_AI=true で有効化)")
        for item in items:
            if "requires_vertex_ai" in item.keywords:
                item.add_marker(skip_vertex_ai)


def pytest_configure(config):
    """
    pytest起動時の設定
    conftest.pyの他の関数より先に実行される
    """
    # TEST_ENV_FILEが設定されている場合、そのファイルから環境変数を読み込む
    test_env_file = os.getenv("TEST_ENV_FILE")
    if test_env_file and Path(test_env_file).exists():
        # .env.testファイルから環境変数を読み込む
        with open(test_env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # 環境変数を設定（統合テストでは.env.testの値を使用）
                    os.environ[key] = value.strip()

        # 統合テスト環境では最小限の設定のみ
        test_env = {
            "ENVIRONMENT": "test",
            "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),  # 統合テストではINFOレベル
            "OTEL_SDK_DISABLED": "true",  # OpenTelemetryを無効化
            "SECURITY_API_KEYS": '["test-api-key-123", "test-api-key-12345", "valid-api-key"]',
            "SECURITY_IP_WHITELIST": "[]",  # IPホワイトリストを無効化
            "SECURITY_RATE_LIMIT_DEFAULT": "100/hour",
            "RATE_LIMIT_PER_MINUTE": "1000",
            # GCP_PROJECT_IDは.env.testファイルから読み込まれた値を保持
        }
    else:
        # 通常のユニットテスト用の環境変数を設定（.envファイルの値を上書き）
        test_env = {
            "ENVIRONMENT": "test",
            "LOG_LEVEL": "WARNING",  # テスト中は警告以上のみ表示
            "DATABASE_URL": "",  # 空文字列でデータベース接続をスキップ
            "OTEL_SDK_DISABLED": "true",  # OpenTelemetryを無効化
            "SECURITY_API_KEYS": '["test-api-key-123", "test-api-key-12345", "valid-api-key"]',
            "SECURITY_IP_WHITELIST": "[]",  # IPホワイトリストを無効化
            "SECURITY_RATE_LIMIT_DEFAULT": "100/hour",
            "RATE_LIMIT_PER_MINUTE": "1000",
            # Cloud SQLを無効化（ユニットテストのみ）
            "USE_CLOUD_SQL": "false",
            "GCP_PROJECT_ID": "",
            "CLOUD_SQL_INSTANCE": "",
        }

    # 環境変数を設定（既存の値がない場合のみ）
    for key, value in test_env.items():
        if key not in os.environ or os.environ[key] == "":
            os.environ[key] = value
