"""
統合テスト用の共通フィクスチャ
"""
import os
import uuid
from typing import AsyncGenerator
from unittest.mock import Mock

import pytest
import pytest_asyncio
from httpx import AsyncClient

from why_why_chat_ai.api.app import create_app
from tests.integration.utils import create_mock_reasoning_engine


# async iterator のヘルパー関数
async def aiter(seq):
    for item in seq:
        yield item


@pytest.fixture(scope="session")
def test_api_key() -> str:
    """テスト用APIキー"""
    return "test-api-key-12345"


@pytest.fixture(scope="session")
def test_jwt_secret() -> str:
    """テスト用JWT秘密鍵"""
    return "test-jwt-secret-key"


@pytest.fixture
def mock_env_vars(test_api_key: str, test_jwt_secret: str, monkeypatch):
    """テスト用の環境変数を設定"""
    # データベース（テスト時は無効化）
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("ENVIRONMENT", "test")

    # GCPプロジェクトID（Secret Managerテスト用）
    # 環境変数が設定されていればそれを使用、なければデフォルト値
    if not os.getenv("GCP_PROJECT_ID"):
        monkeypatch.setenv("GCP_PROJECT_ID", "test-project")

    # ログレベル
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")

    # セキュリティ設定（重要: APIキー認証テストのため）
    monkeypatch.setenv("SECURITY_API_KEYS", '["test-api-key-123", "test-api-key-12345", "valid-api-key"]')
    monkeypatch.setenv("SECURITY_IP_WHITELIST", "[]")
    monkeypatch.setenv("SECURITY_RATE_LIMIT_DEFAULT", "100/hour")

    # JWT設定（JWT認証テストのため - デフォルトでは無効）
    monkeypatch.setenv("SECURITY_JWT_ALGORITHM", "RS256")
    monkeypatch.setenv("SECURITY_JWT_ISSUER", "")
    monkeypatch.setenv("SECURITY_JWT_AUDIENCE", "")
    monkeypatch.setenv("SECURITY_JWT_PUBLIC_KEY", "")


@pytest_asyncio.fixture
async def api_client(mock_env_vars, test_api_key: str) -> AsyncGenerator[AsyncClient, None]:
    """
    認証設定済みのAPIクライアント

    Yields
    ------
    AsyncClient
        テスト用のHTTPクライアント
    """
    from httpx import ASGITransport
    from unittest.mock import AsyncMock, MagicMock
    from langgraph.types import StateSnapshot

    app = create_app()

    # テスト用のモックagent_clientを設定
    mock_agent_client = AsyncMock()
    mock_agent_client.astream = Mock(return_value=aiter([]))
    mock_agent_client.get_thread_state = AsyncMock(return_value={"problem": {}, "chat_history": [], "why_nodes": [], "root_causes": []})

    # get_thread_snapshotのモック
    mock_snapshot = MagicMock(spec=StateSnapshot)
    mock_snapshot.values = {
        "problem": {"title": "テスト問題", "language": "Japanese"},
        "chat_history": [],
        "why_nodes": {},
        "root_causes": []
    }
    mock_snapshot.next = ("initial_analysis",)
    mock_snapshot.created_at = "2024-01-15T10:30:00Z"
    mock_agent_client.get_thread_snapshot = AsyncMock(return_value=mock_snapshot)

    # agentのモック（get_thread_snapshot内で使用される）
    mock_agent = Mock()
    async def mock_aget_state_history(*args, **kwargs):
        yield mock_snapshot
    mock_agent.aget_state_history = mock_aget_state_history
    mock_agent_client.agent = mock_agent

    app.state.agent_client = mock_agent_client

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={
            "X-API-Key": test_api_key,
            "X-Forwarded-For": "127.0.0.1"  # IPホワイトリストミドルウェア用
        }
    ) as client:
        yield client


@pytest.fixture
def mock_reasoning_engine(monkeypatch) -> Mock:
    """
    Vertex AI Reasoning Engine のモック

    Returns
    -------
    Mock
        モックされたReasoning Engine
    """
    mock_engine = create_mock_reasoning_engine()

    # vertexai モジュールのモック
    monkeypatch.setattr("vertexai.init", Mock())

    # reasoning_engines モジュールのモック
    mock_reasoning_engines = Mock()
    mock_reasoning_engines.ReasoningEngine.return_value = mock_engine

    monkeypatch.setattr(
        "vertexai.preview.reasoning_engines.ReasoningEngine",
        mock_reasoning_engines.ReasoningEngine
    )

    # AgentClient内でのimportもモック（実際にはagent_clientではreasoning_enginesをインポートしていないのでスキップ）

    return mock_engine


@pytest.fixture
def mock_agent_client(mock_reasoning_engine, monkeypatch) -> Mock:
    """
    AgentClient のモック（非同期メソッド対応）

    Returns
    -------
    Mock
        モックされたAgentClient
    """
    from why_why_chat_ai.api.services.agent_client import AgentClient

    # 作成されたスレッドIDを記録するセット
    created_thread_ids = set()
    # スレッドの状態を記録する辞書
    thread_states = {}
    # スレッドのチャット履歴を記録する辞書
    thread_chat_histories = {}
    # スレッドの問題情報を記録する辞書
    thread_problems = {}

    # AgentClientのインスタンスメソッドをモック

    async def mock_astream(self, input_data, thread_id):
        # input_dataがCommandオブジェクトの場合は、その内容を使用
        if hasattr(input_data, '__class__') and input_data.__class__.__name__ == 'Command':
            # Commandオブジェクトの場合、resumeなどの属性を持つ可能性がある
            if hasattr(input_data, 'resume'):
                input_data = input_data.resume
            else:
                input_data = None
        # thread_idを記録
        if thread_id:
            created_thread_ids.add(thread_id)
            thread_states[thread_id] = "running"
            # 初期化時にチャット履歴リストを作成
            if thread_id not in thread_chat_histories:
                thread_chat_histories[thread_id] = []
            # 問題情報を保存（JSON serializable形式で保存）
            if input_data and isinstance(input_data, dict) and "problem" in input_data:
                problem_data = input_data["problem"]
                if hasattr(problem_data, 'model_dump'):
                    thread_problems[thread_id] = problem_data.model_dump(mode='json')
                else:
                    thread_problems[thread_id] = problem_data

        # Commandオブジェクトの処理
        if hasattr(input_data, '__class__') and input_data.__class__.__name__ == 'Command':
            if hasattr(input_data, 'resume') and input_data.resume and 'response' in input_data.resume:
                # Commandオブジェクトからユーザーメッセージを抽出
                user_message = input_data.resume['response']
                if thread_id:
                    thread_chat_histories[thread_id].append({
                        "type": "human",
                        "content": user_message
                    })
                input_data = {"user_message": user_message}
            else:
                input_data = None
        # ユーザーメッセージがある場合は履歴に追加（通常の辞書形式の場合）
        elif thread_id and input_data and isinstance(input_data, dict) and input_data.get("user_message"):
            thread_chat_histories[thread_id].append({
                "type": "human",
                "content": input_data["user_message"]
            })

        # 保存された問題情報を含めてstream_queryに渡す
        if input_data is None:
            enriched_input_data = {}
        else:
            enriched_input_data = input_data.copy() if hasattr(input_data, 'copy') else dict(input_data)

        if thread_id and thread_id in thread_problems and "problem" not in enriched_input_data:
            # 保存された問題情報は既にJSON serializable形式
            enriched_input_data["problem"] = thread_problems[thread_id]

        # thread_idを必ず含める（stream_queryで履歴管理のため）
        if thread_id:
            enriched_input_data["thread_id"] = thread_id

        # 同期ジェネレータを非同期ジェネレータに変換（inputキーワード引数として渡す）
        for event in mock_reasoning_engine.stream_query(input=enriched_input_data):
            # info_requestまたはfinal_resultの場合は状態を更新
            if thread_id:
                if event.get("event_type") == "info_request":
                    thread_states[thread_id] = "waiting_for_input"
                    # info_requestイベントにチャット履歴がある場合は更新
                    if "state" in event and "chat_history" in event["state"]:
                        thread_chat_histories[thread_id] = event["state"]["chat_history"]
                        # mock_reasoning_engineのthread_chat_historiesも更新
                        mock_reasoning_engine._thread_chat_histories[thread_id] = event["state"]["chat_history"]
                elif event.get("event_type") == "final_result":
                    thread_states[thread_id] = "completed"
                    # final_resultイベントにチャット履歴がある場合は更新
                    if "state" in event and "chat_history" in event["state"]:
                        thread_chat_histories[thread_id] = event["state"]["chat_history"]
                        # mock_reasoning_engineのthread_chat_historiesも更新
                        mock_reasoning_engine._thread_chat_histories[thread_id] = event["state"]["chat_history"]
            yield event

    async def mock_get_thread_state(self, thread_id):
        from why_why_chat_ai.agent.models import ProblemInput, Severity

        # テスト用の特殊な扱い
        # "test-"で始まるスレッドIDは常に有効とする（テスト用）
        if not thread_id.startswith("test-"):
            # UUIDフォーマットのチェック（簡易的な判定）
            import re
            uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

            # 存在しないスレッドIDの場合は例外を発生
            # 404エラーテスト用：UUIDフォーマットでない場合やcreated_thread_idsがセットされていて含まれない場合
            if not uuid_pattern.match(thread_id):
                raise ValueError(f"Thread {thread_id} not found")

        # テスト用のデフォルト問題データ
        default_problem = ProblemInput(
            title="テスト用の品質問題",
            severity=Severity.MEDIUM,
            language="ja"
        )


        # スレッドのステータスを決定
        # thread_states辞書から現在の状態を取得
        if thread_id in thread_states:
            status = thread_states[thread_id]
        elif thread_id in created_thread_ids:
            # thread_statesにない場合は初期状態として'running'
            status = "running"
        else:
            # デフォルトは'completed'
            status = "completed"

        # チャット履歴を取得（存在しない場合は空リスト）
        # selfは_reasoning_engineを持っているはず
        if hasattr(self, '_reasoning_engine') and hasattr(self._reasoning_engine, '_thread_chat_histories'):
            chat_history = self._reasoning_engine._thread_chat_histories.get(thread_id, [])
        else:
            chat_history = thread_chat_histories.get(thread_id, [])

        # チャット履歴が空の場合、mock_reasoning_engineから直接取得を試みる
        if not chat_history and hasattr(mock_reasoning_engine, '_thread_chat_histories'):
            chat_history = mock_reasoning_engine._thread_chat_histories.get(thread_id, [])

        # 問題情報を取得（保存されている場合）
        problem_data = default_problem.model_dump()
        if thread_id in thread_problems:
            problem_data = thread_problems[thread_id]
            # JSON形式で保存されている場合は辞書形式に戻す
            if isinstance(problem_data, dict):
                # すでに辞書形式なのでそのまま使用
                pass
            else:
                # 辞書でない場合はmodel_dumpを使用
                problem_data = problem_data.model_dump()

        return {
            "thread_id": thread_id,
            "status": status,  # ステータスを追加
            "state": {
                "problem": problem_data,
                "chat_history": chat_history,
                "why_nodes": [],
                "root_causes": []
            }
        }

    async def mock_get_thread_snapshot(self, thread_id):
        """get_thread_snapshotメソッドのモック（StateSnapshotを返す）"""
        from langgraph.types import StateSnapshot
        from why_why_chat_ai.agent.models import ProblemInput, Severity
        from unittest.mock import MagicMock

        # テスト用の特殊な扱い
        # "test-"で始まるスレッドIDは常に有効とする（テスト用）
        if not thread_id.startswith("test-"):
            # UUIDフォーマットのチェック（簡易的な判定）
            import re
            uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

            # 存在しないスレッドIDの場合は例外を発生
            if not uuid_pattern.match(thread_id):
                raise ValueError(f"Thread '{thread_id}' not found")

        # テスト用のデフォルト問題データ
        default_problem = ProblemInput(
            title="テスト用の品質問題",
            severity=Severity.MEDIUM,
            language="ja"
        )

        # チャット履歴を取得
        if hasattr(self, '_reasoning_engine') and hasattr(self._reasoning_engine, '_thread_chat_histories'):
            chat_history = self._reasoning_engine._thread_chat_histories.get(thread_id, [])
        else:
            chat_history = thread_chat_histories.get(thread_id, [])

        # 問題情報を取得（保存されている場合）
        problem_data = default_problem
        if thread_id in thread_problems:
            problem_data = ProblemInput(**thread_problems[thread_id])

        # StateSnapshotのモックを作成
        mock_snapshot = MagicMock(spec=StateSnapshot)
        mock_snapshot.values = {
            "problem": problem_data,
            "chat_history": chat_history,
            "why_nodes": {},
            "root_causes": []
        }
        mock_snapshot.next = ("initial_analysis",)
        mock_snapshot.created_at = "2024-01-15T10:30:00Z"

        return mock_snapshot


    # __init__メソッドもモック（初期化パラメータを処理）
    def mock_init(self, project_id=None, location="us-central1", max_retries=3, retry_delay=1.0):
        # project_idをオプショナルにする
        self.project_id = project_id or "test-project"
        self.location = location
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._reasoning_engine = mock_reasoning_engine
        self._initialized = False
        self.agent = mock_reasoning_engine  # 初期化時にagentも設定

    # set_upメソッドもモック（Google認証をスキップ）
    async def mock_set_up(self):
        # Google認証関連の処理を完全にスキップ
        self.agent = mock_reasoning_engine
        self._initialized = True

    # メソッドをパッチ
    monkeypatch.setattr(AgentClient, "__init__", mock_init)
    monkeypatch.setattr(AgentClient, "set_up", mock_set_up)
    monkeypatch.setattr(AgentClient, "astream", mock_astream)
    monkeypatch.setattr(AgentClient, "get_thread_state", mock_get_thread_state)
    monkeypatch.setattr(AgentClient, "get_thread_snapshot", mock_get_thread_snapshot)

    # created_thread_ids、thread_statesをmock_reasoning_engineに保存（テストで使用するため）
    mock_reasoning_engine._created_thread_ids = created_thread_ids
    mock_reasoning_engine._thread_states = thread_states
    # thread_chat_historiesはすでにmock_reasoning_engine内で管理されているので、
    # ローカルのthread_chat_historiesをmock_reasoning_engineのものに置き換える
    thread_chat_histories.update(mock_reasoning_engine._thread_chat_histories)

    return mock_reasoning_engine


@pytest.fixture
async def test_thread_id() -> str:
    """
    テスト用スレッドID生成

    Returns
    -------
    str
        UUID形式のスレッドID
    """
    return str(uuid.uuid4())





@pytest.fixture
def rsa_keys():
    """テスト用のRSAキーペアを生成"""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

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


@pytest.fixture
def create_jwt_token(rsa_keys):
    """
    テスト用のJWTトークンを生成する関数

    Parameters
    ----------
    rsa_keys : tuple
        RSAキーペア（秘密鍵、公開鍵）

    Returns
    -------
    callable
        JWTトークン生成関数
    """
    import jwt
    from datetime import datetime, timedelta, timezone

    private_key, _ = rsa_keys

    def _create_token(
        subject: str = "test-user",
        expires_in: timedelta = timedelta(hours=1),
        issuer: str = "test-issuer",
        audience: str = "test-audience"
    ) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": subject,
            "iss": issuer,
            "aud": audience,
            "iat": now,
            "exp": now + expires_in
        }
        return jwt.encode(payload, private_key, algorithm="RS256")

    return _create_token
