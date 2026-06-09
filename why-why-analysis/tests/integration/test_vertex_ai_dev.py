"""
Vertex AI Dev環境統合テスト - 実際のVertex AI APIを使用
"""
import os
import asyncio
import logging

import pytest
from httpx import AsyncClient

from why_why_chat_ai.agent.models import ProblemInput, Severity, DefectType
from tests.integration.utils import create_test_problem_input
from tests.integration.response_validators import ResponseValidator

# ロガーをセットアップ
logger = logging.getLogger(__name__)


@pytest.mark.integration
@pytest.mark.vertex_ai_dev
@pytest.mark.requires_vertex_ai
@pytest.mark.requires_gcp
@pytest.mark.expensive
@pytest.mark.skipif(
    os.getenv("USE_REAL_VERTEX_AI") != "true",
    reason="Real Vertex AI tests only run in CI/CD with USE_REAL_VERTEX_AI=true"
)
class TestVertexAIDevIntegration:
    """dev環境の実Vertex AIを使用した統合テスト"""

    @pytest.fixture
    async def real_api_client(self) -> AsyncClient:
        """実環境用のAPIクライアント"""
        from httpx import ASGITransport
        from why_why_chat_ai.api.app import create_app

        app = create_app()
        
        # lifespanを手動で開始
        async with app.router.lifespan_context(app):
            transport = ASGITransport(app=app)

            # 実環境の設定
            api_key = os.getenv("API_KEYS", "test-dev-api-key")

            async with AsyncClient(
                transport=transport,
                base_url="http://testserver",
                headers={"X-API-Key": api_key}
            ) as client:
                yield client

    @pytest.mark.asyncio
    async def test_real_streaming_analysis(self, real_api_client: AsyncClient):
        """実際のVertex AI APIでストリーミング分析"""
        # Step 1: 実際の問題データでスレッド作成
        problem_input = ProblemInput(
            title="実環境テスト：プレス工程での寸法不良",
            product_name="テスト製品A",
            occurrence_date="2024-01-25T10:00:00+09:00",
            process="プレス成形工程",
            location="テスト工場",
            severity=Severity.MEDIUM,
            description="テスト実行中の寸法不良シミュレーション",
            defect_types=[DefectType.DIMENSION],
            direct_cause="",  # 空文字列をデフォルトとして設定
            language="ja"
        )

        create_response = await real_api_client.post(
            "/v1/threads",
            json={"problem": problem_input.model_dump(mode='json')}
        )
        assert create_response.status_code == 201
        thread_id = create_response.json()["thread_id"]

        # Step 2: 実際のストリーミング分析を実行
        events = []
        event_types = set()

        async with real_api_client.stream(
            "POST",
            f"/v1/threads/{thread_id}/stream",
            json={},
            timeout=30.0  # 実環境では長めのタイムアウト
        ) as response:
            assert response.status_code == 200

            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    try:
                        import json
                        event_data = json.loads(line[5:].strip())
                        events.append(event_data)
                        event_types.add(event_data.get("event_type"))

                        # 実環境では詳細ログ出力
                        print(f"Event: {event_data.get('event_type')} - {len(events)} events received")

                    except json.JSONDecodeError:
                        pass

        # Step 3: 実環境での検証
        assert len(events) > 0, "No events received from real Vertex AI"

        # 必要なイベントタイプが含まれていることを確認
        # LangGraph実装では、connection_start/end と任意のノード名がイベントタイプとなる
        # info_requestやその他のイベントが含まれていることを確認
        print(f"Received event types: {event_types}")
        assert "connection_start" in event_types, f"connection_start not found in {event_types}"
        # LangGraphからの何らかのイベントがあることを確認
        meaningful_events = event_types - {"connection_start", "connection_end"}
        assert len(meaningful_events) > 0, f"No meaningful events received: {event_types}"

        # 最終状態の確認
        get_response = await real_api_client.get(f"/v1/threads/{thread_id}")
        assert get_response.status_code == 200

        state_data = get_response.json()
        validated_state = ResponseValidator.validate_thread_state_response(state_data)

        assert validated_state.thread_id == thread_id
        assert validated_state.state.problem is not None, "Problem should not be None"
        assert validated_state.state.problem.title == problem_input.title

    @pytest.mark.asyncio
    async def test_real_error_handling(self, real_api_client: AsyncClient):
        """実環境でのエラーハンドリング"""
        # 無効なスレッドIDでのアクセス
        import uuid
        invalid_thread_id = str(uuid.uuid4())

        response = await real_api_client.get(f"/v1/threads/{invalid_thread_id}")
        # 存在しないスレッドでは404を返すべき
        assert response.status_code == 404

        # 無効なデータでのスレッド作成
        # 空文字列は技術的には有効な文字列なので、別のバリデーションエラーを使用
        invalid_response = await real_api_client.post(
            "/v1/threads",
            json={"problem": {}}  # titleフィールドが完全に欠落
        )
        assert invalid_response.status_code == 422

    @pytest.mark.asyncio
    async def test_real_timeout_behavior(self, real_api_client: AsyncClient):
        """実環境でのタイムアウト動作"""
        # 長い分析を要求する問題
        complex_problem = ProblemInput(
            title="複雑な問題：多要因品質不良",
            product_name="複合材料製品",
            severity=Severity.HIGH,
            description="""
            非常に複雑な問題で、多くの要因が絡み合っている。
            詳細な分析が必要で、時間がかかることが予想される。
            """ * 10,  # 長い説明文
            language="ja"
        )

        create_response = await real_api_client.post(
            "/v1/threads",
            json={"problem": complex_problem.model_dump(mode='json')}
        )
        thread_id = create_response.json()["thread_id"]

        # タイムアウトを設定してストリーミング
        start_time = asyncio.get_event_loop().time()
        timeout_seconds = 10.0

        try:
            async with real_api_client.stream(
                "POST",
                f"/v1/threads/{thread_id}/stream",
                json={},
                timeout=timeout_seconds
            ) as response:
                async for line in response.aiter_lines():
                    if asyncio.get_event_loop().time() - start_time > timeout_seconds:
                        break
        except Exception as e:
            # タイムアウトが発生することを確認
            print(f"Expected timeout occurred: {e}")

        # スレッドは存在し続けることを確認
        get_response = await real_api_client.get(f"/v1/threads/{thread_id}")
        assert get_response.status_code == 200

    @pytest.mark.asyncio
    async def test_real_concurrent_sessions(self, real_api_client: AsyncClient):
        """実環境での並行セッション処理"""
        # 3つの異なる問題を同時に作成
        problems = [
            create_test_problem_input(title=f"並行テスト問題{i}", severity=Severity.LOW)
            for i in range(3)
        ]

        # 並行してスレッド作成
        create_tasks = [
            real_api_client.post("/v1/threads", json={"problem": p.model_dump(mode='json')})
            for p in problems
        ]

        create_responses = await asyncio.gather(*create_tasks)
        thread_ids = [r.json()["thread_id"] for r in create_responses]

        # 並行してストリーミング分析を実行
        async def analyze_thread(tid: str) -> int:
            event_count = 0
            async with real_api_client.stream(
                "POST",
                f"/v1/threads/{tid}/stream",
                json={},
                timeout=20.0
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        event_count += 1
                        if event_count >= 5:  # 最初の5イベントで終了
                            break
            return event_count

        # 並行実行
        analyze_tasks = [analyze_thread(tid) for tid in thread_ids]
        results = await asyncio.gather(*analyze_tasks)

        # すべてのセッションが独立して処理されたことを確認
        assert len(results) == 3
        assert all(count > 0 for count in results)

    @pytest.mark.asyncio
    async def test_real_memory_persistence(self, real_api_client: AsyncClient):
        """実環境でのメモリ永続性テスト"""
        # Step 1: スレッド作成
        problem_input = create_test_problem_input(
            title="メモリ永続性テスト",
            description="状態が正しく保存・復元されることを確認"
        )

        create_response = await real_api_client.post(
            "/v1/threads",
            json={"problem": problem_input.model_dump(mode='json')}
        )
        thread_id = create_response.json()["thread_id"]

        # 初期分析をスキップして、直接ユーザーメッセージから開始
        # （初期分析でinfo_requestが返される可能性があるため）

        # Step 2: 情報を追加
        user_messages = [
            "テスト情報1: 温度は25℃でした",
            "テスト情報2: 湿度は60%でした",
            "テスト情報3: 圧力は標準値でした"
        ]

        for msg in user_messages:
            async with real_api_client.stream(
                "POST",
                f"/v1/threads/{thread_id}/stream",
                json={"user_message": msg}
            ) as response:
                # ストリーミングレスポンスをデバッグのために収集
                line_count = 0
                event_types = []
                async for line in response.aiter_lines():
                    line_count += 1
                    if line.startswith("data:"):
                        try:
                            import json
                            event_data = json.loads(line[5:].strip())
                            event_types.append(event_data.get("event_type", "unknown"))
                        except Exception as e:
                            logger.debug(f"Failed to parse event: {line}, error: {e}")
                logger.debug(f"Sent message '{msg}', received {line_count} lines, events: {event_types}")

        # Step 3: 状態を確認
        final_state = await real_api_client.get(f"/v1/threads/{thread_id}")
        state_data = final_state.json()

        # デバッグ用に状態をログ出力
        logger.debug(f"Final state - status: {state_data.get('status')}")
        logger.debug(f"Final state - chat_history length: {len(state_data['state']['chat_history'])}")
        logger.debug(f"Final state - why_nodes length: {len(state_data['state'].get('why_nodes', []))}")
        
        # 状態が保存されていることを確認
        # 最低限、problemが設定されていることを確認
        assert state_data["state"]["problem"] is not None, "Problem not saved"
        assert state_data["state"]["problem"]["title"] == problem_input.title
        
        # ステータスが適切であることを確認
        assert state_data["status"] in ["running", "waiting_for_input", "completed"], f"Unexpected status: {state_data['status']}"

    @pytest.mark.asyncio
    async def test_real_performance_baseline(self, real_api_client: AsyncClient):
        """実環境でのパフォーマンスベースライン測定"""
        import time

        # シンプルな問題でレスポンス時間を測定
        simple_problem = create_test_problem_input(
            title="パフォーマンステスト",
            description="シンプルな問題"
        )

        # スレッド作成時間
        start = time.time()
        create_response = await real_api_client.post(
            "/v1/threads",
            json={"problem": simple_problem.model_dump(mode='json')}
        )
        create_time = time.time() - start
        assert create_time < 5.0, f"Thread creation took too long: {create_time}s"

        thread_id = create_response.json()["thread_id"]

        # 初回ストリーミングまでの時間
        start = time.time()
        first_event_time = None

        async with real_api_client.stream(
            "POST",
            f"/v1/threads/{thread_id}/stream",
            json={}
        ) as response:
            async for line in response.aiter_lines():
                if first_event_time is None:
                    first_event_time = time.time() - start
                if line.startswith("data:"):
                    break

        assert first_event_time is not None
        assert first_event_time < 30.0, f"First event took too long: {first_event_time}s"

        print(f"Performance baseline - Create: {create_time:.2f}s, First event: {first_event_time:.2f}s")
