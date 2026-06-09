"""API router tests shared fixtures"""
import pytest
from starlette.testclient import TestClient
from why_why_chat_ai.api.app import create_app


@pytest.fixture(autouse=True)
def setup_test_env():
    """テスト環境のセットアップ"""
    # 環境変数はテスト実行時に必要に応じて設定する
    yield


@pytest.fixture
def app():
    """FastAPI アプリケーションのテスト用フィクスチャ"""
    from unittest.mock import AsyncMock, Mock, MagicMock
    from langgraph.types import StateSnapshot
    app = create_app()

    # StateSnapshot のモックを作成
    mock_snapshot = MagicMock(spec=StateSnapshot)
    mock_snapshot.values = {
        "problem": {"title": "テスト問題", "language": "Japanese"},
        "chat_history": [],
        "why_nodes": {},
        "root_causes": []
    }
    mock_snapshot.next = ("initial_analysis",)
    mock_snapshot.created_at = "2024-01-15T10:30:00Z"

    # AgentClientのモックを作成
    mock_agent_client = Mock()

    # astreamは非同期イテレータを直接返す必要がある
    mock_agent_client.astream = Mock(return_value=aiter([]))

    # get_thread_stateのモック
    mock_agent_client.get_thread_state = AsyncMock(return_value={"problem": {}, "chat_history": [], "why_nodes": [], "root_causes": []})

    # get_thread_snapshotのモック（実際のコードではagent.aget_state_historyを使用）
    mock_agent_client.get_thread_snapshot = AsyncMock(return_value=mock_snapshot)

    # agentのモック（get_thread_snapshot内で使用される）
    mock_agent = Mock()
    async def mock_aget_state_history(*args, **kwargs):
        yield mock_snapshot
    mock_agent.aget_state_history = mock_aget_state_history
    mock_agent_client.agent = mock_agent

    # app.stateに設定
    app.state.agent_client = mock_agent_client

    return app


# async iterator のヘルパー関数
async def aiter(seq):
    for item in seq:
        yield item


@pytest.fixture
def client(app):
    """TestClient のフィクスチャ（認証付き）"""
    client = TestClient(app)
    # デフォルトで認証ヘッダーを設定
    # X-Forwarded-Forヘッダーも追加（TestClientのIPアドレス問題を回避）
    client.headers = {
        "X-API-Key": "test-api-key-123",  # APIテスト用のキー
        "X-Forwarded-For": "127.0.0.1"  # ローカルホストIPを設定
    }
    return client


@pytest.fixture
def client_no_auth(app):
    """認証なしのTestClient"""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """認証ヘッダーのフィクスチャ"""
    return {"X-API-Key": "test-api-key-123"}
