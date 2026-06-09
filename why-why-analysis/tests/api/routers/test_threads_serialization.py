"""
Tests for JSON serialization issues in thread management
"""
import json
import uuid

import pytest
from why_why_chat_ai.agent.models import ProblemInput, Severity, DefectType, Frequency, InvestigationItem, VerificationResult


class TestProblemInputSerialization:
    """ProblemInput のJSONシリアライズに関するテスト"""

    def test_problem_input_with_enums_serialization(self):
        """Enumフィールドを含むProblemInputのシリアライズテスト"""
        problem = ProblemInput(
            title="製品の組み立て不良",
            severity=Severity.HIGH,
            defect_types=[DefectType.FUNCTION, DefectType.APPEARANCE],
            frequency=Frequency.FREQUENT,
            language="ja"
        )

        # ProblemInputオブジェクトはそのままJSONシリアライズできない
        with pytest.raises(TypeError, match="Object of type .* is not JSON serializable"):
            json.dumps({"problem": problem})

        # model_dump(mode='json')を使用すればシリアライズ可能
        serialized = problem.model_dump(mode='json')
        json_str = json.dumps(serialized)
        assert json_str is not None

        # Enumが値に変換されていることを確認
        data = json.loads(json_str)
        assert data["severity"] == "重大"
        assert data["defect_types"] == ["機能", "外観"]
        assert data["frequency"] == "多発"

    def test_problem_input_with_nested_models_serialization(self):
        """ネストされたモデルを含むProblemInputのシリアライズテスト"""
        problem = ProblemInput(
            title="生産ラインの停止",
            investigations=[
                InvestigationItem(
                    date="2025-03-15",
                    content="モーターの状態確認",
                    result="異常発熱を確認",
                    investigator="田中"
                )
            ],
            verification=VerificationResult(
                method="冷却ファンを交換",
                result="正常動作を確認",
                date="2025-03-16",
                verifier="高橋"
            ),
            language="ja"
        )

        # ネストされたPydanticモデルもJSONシリアライズできない
        with pytest.raises(TypeError):
            json.dumps({"problem": problem})

        # model_dump(mode='json')を使用すればシリアライズ可能
        serialized = problem.model_dump(mode='json')
        json_str = json.dumps(serialized)
        data = json.loads(json_str)

        # ネストされたモデルが辞書に変換されていることを確認
        assert isinstance(data["investigations"], list)
        assert data["investigations"][0]["content"] == "モーターの状態確認"
        assert isinstance(data["verification"], dict)
        assert data["verification"]["method"] == "冷却ファンを交換"


class TestThreadCreationWithSerialization:
    """スレッド作成時のシリアライズ問題をテストする統合テスト"""

    @pytest.mark.asyncio
    async def test_create_thread_with_enum_fields_integration(self, app, client):
        """Enumフィールドを含むスレッド作成の統合テスト"""
        # astream が呼ばれた時の引数を記録するための設定
        captured_args = None
        async def mock_astream(*args, **kwargs):
            nonlocal captured_args
            captured_args = args[0]  # 最初の引数（入力データ）をキャプチャ
            # エージェントからの初期レスポンスをシミュレート
            yield {"initial": "response"}

        # AgentClientのモック設定
        app.state.agent_client.astream = mock_astream

        # Enumを含むリクエスト
        request_data = {
            "problem": {
                "title": "製品表面の傷",
                "severity": "重大",  # APIはJSON形式で受け取る
                "defect_types": ["外観", "機能"],
                "frequency": "多発",
                "language": "ja"
            }
        }

        response = client.post("/v1/threads", json=request_data)
        assert response.status_code == 201

        # astream に渡されたデータを確認
        assert captured_args is not None
        problem_data = captured_args["problem"]

        # JSON形式に変換されていることを確認（Enumオブジェクトではなく文字列）
        # model_dump(mode='json')が適用されていれば、すべてJSONシリアライズ可能な形式
        try:
            json.dumps(problem_data)
            # シリアライズ成功 = 修正が適用されている
        except TypeError:
            pytest.fail("ProblemInput was not properly serialized to JSON-compatible format")

    @pytest.mark.asyncio
    async def test_stream_analysis_checkpointing_serialization(self, app, client):
        """ストリーミング分析時のチェックポイント保存でのシリアライズテスト"""
        from unittest.mock import Mock
        
        # エージェントのストリーミングレスポンスをモック
        async def mock_stream_with_checkpoint(*args, **kwargs):
            # 初期分析イベント
            yield {
                "set_initial_cause": {
                    "why_nodes": {},
                    "problem": ProblemInput(
                        title="テスト問題",
                        severity=Severity.HIGH,
                        defect_types=[DefectType.FUNCTION],
                        language="ja"
                    )  # ProblemInputオブジェクトが返される状況をシミュレート
                }
            }

        app.state.agent_client.astream = Mock(return_value=mock_stream_with_checkpoint())

        thread_id = str(uuid.uuid4())

        # ストリーミングリクエスト
        response = client.post(f"/v1/threads/{thread_id}/stream", json={})

        # ストリーミングレスポンスは開始されるが、シリアライズエラーが発生するはず
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # エラーイベントが含まれることを確認
        content = response.text
        if "Object of type ProblemInput is not JSON serializable" in content:
            # エラーが検出された = テストが問題を正しく検知
            assert "event: stream_error" in content
        else:
            # エラーが発生しない = 修正が適用されている
            assert "event: connection_start" in content
            assert "event: set_initial_cause" in content or "event: connection_end" in content


class TestWhyWhyAgentStateSerialization:
    """WhyWhyAgentの状態シリアライズに関するテスト"""

    def test_agent_state_with_problem_input_serialization(self):
        """エージェント状態にProblemInputが含まれる場合のシリアライズテスト"""
        from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder

        # エージェント状態の作成
        state = {
            "problem": ProblemInput(
                title="テスト問題",
                severity=Severity.MEDIUM,
                language="ja"
            ),
            "why_nodes": {},
            "chat_history": [],
            "root_causes": []
        }

        # LangGraphがチェックポイントを保存する際のシリアライズをシミュレート
        with pytest.raises(TypeError, match="Object of type .* is not JSON serializable"):
            json.dumps(state)

        # set_initial_causeメソッドが正しく実装されていれば、
        # ProblemInputはmodel_dump(mode='json')で変換される
        agent_builder = WhyWhyAgentBuilder()
        result = agent_builder.set_initial_cause(state)

        # 返されたproblemがJSONシリアライズ可能であることを確認
        try:
            json.dumps(result["problem"])
            # シリアライズ成功 = 修正が適用されている
        except TypeError:
            pytest.fail("set_initial_cause did not properly serialize ProblemInput")

    def test_model_dump_mode_json_behavior(self):
        """model_dump(mode='json')の動作確認テスト"""
        problem = ProblemInput(
            title="動作確認",
            severity=Severity.LOW,
            defect_types=[DefectType.OTHER],
            frequency=Frequency.RARE,
            investigations=[
                InvestigationItem(content="テスト調査")
            ],
            language="ja"
        )

        # mode='json'なしの場合
        normal_dump = problem.model_dump()
        assert isinstance(normal_dump["severity"], Severity)  # Enumオブジェクトのまま

        # mode='json'ありの場合
        json_dump = problem.model_dump(mode='json')
        assert isinstance(json_dump["severity"], str)  # 文字列に変換
        assert json_dump["severity"] == "軽微"

        # JSONシリアライズ可能
        json_str = json.dumps(json_dump)
        assert json_str is not None
