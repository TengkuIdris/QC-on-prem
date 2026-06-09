"""
APIモデルのJSONシリアライゼーションテスト
"""
import json
from datetime import datetime


from why_why_chat_ai.api.models import (
    ThreadCreateRequest, ThreadCreateResponse,
    StreamRequest, MessageSchema,
    ThreadState, ThreadStateResponse
)
from why_why_chat_ai.agent.models import (
    ProblemInput, WhyNode, Severity, DefectType, Frequency
)
from why_why_chat_ai.agent.why_why_action import RootCauseSchema


def test_json_serialization_thread_create_request():
    """ThreadCreateRequestのJSONシリアライゼーションテスト"""
    problem = ProblemInput(
        title="製品の表面に傷が発生",
        product_name="自動車部品A",
        occurrence_date="2024-01-15T10:30:00Z",
        process="プレス工程",
        location="第1工場",
        severity=Severity.HIGH,
        description="製品表面に線状の傷が複数確認された",
        language="Japanese"
    )

    request = ThreadCreateRequest(problem=problem)
    request_dict = request.model_dump(mode="json")
    request_json = json.dumps(request_dict, ensure_ascii=False)

    # 基本情報の確認
    assert "製品の表面に傷が発生" in request_json
    assert "自動車部品A" in request_json
    assert "2024-01-15T10:30:00Z" in request_json
    assert "プレス工程" in request_json
    assert "第1工場" in request_json
    assert "重大" in request_json
    assert "製品表面に線状の傷が複数確認された" in request_json
    assert "Japanese" in request_json


def test_json_serialization_thread_create_response():
    """ThreadCreateResponseのJSONシリアライゼーションテスト"""
    created_at = datetime(2024, 1, 15, 10, 30, 0)

    response = ThreadCreateResponse(
        thread_id="550e8400-e29b-41d4-a716-446655440000",
        created_at=created_at
    )
    response_dict = response.model_dump(mode="json")
    response_json = json.dumps(response_dict, ensure_ascii=False)

    # 基本情報の確認
    assert "550e8400-e29b-41d4-a716-446655440000" in response_json
    assert "2024-01-15T10:30:00" in response_json


def test_json_serialization_stream_request():
    """StreamRequestのJSONシリアライゼーションテスト"""
    # 空のリクエスト
    empty_request = StreamRequest()
    empty_request_dict = empty_request.model_dump(mode="json")
    empty_request_json = json.dumps(empty_request_dict, ensure_ascii=False)
    assert "null" in empty_request_json  # user_message
    assert "false" in empty_request_json  # is_retry

    # ユーザーメッセージ付きリクエスト
    message_request = StreamRequest(
        user_message="プレス機の刃の摩耗が確認されました"
    )
    message_request_dict = message_request.model_dump(mode="json")
    message_request_json = json.dumps(message_request_dict, ensure_ascii=False)
    assert "プレス機の刃の摩耗が確認されました" in message_request_json
    assert "false" in message_request_json  # is_retry

    # リトライリクエスト
    retry_request = StreamRequest(
        user_message="修正: プレス機の刃の欠けが確認されました",
        is_retry=True
    )
    retry_request_dict = retry_request.model_dump(mode="json")
    retry_request_json = json.dumps(retry_request_dict, ensure_ascii=False)
    assert "修正: プレス機の刃の欠けが確認されました" in retry_request_json
    assert "true" in retry_request_json  # is_retry


def test_json_serialization_message_schema():
    """MessageSchemaのJSONシリアライゼーションテスト"""
    # AIメッセージ
    ai_message = MessageSchema(
        type="ai",
        content="プレス工程での傷の原因について詳しく教えてください。"
    )
    ai_message_dict = ai_message.model_dump(mode="json")
    ai_message_json = json.dumps(ai_message_dict, ensure_ascii=False)
    assert "ai" in ai_message_json
    assert "プレス工程での傷の原因について詳しく教えてください。" in ai_message_json

    # 人間メッセージ
    human_message = MessageSchema(
        type="human",
        content="プレス機の刃が摩耗していました"
    )
    human_message_dict = human_message.model_dump(mode="json")
    human_message_json = json.dumps(human_message_dict, ensure_ascii=False)
    assert "human" in human_message_json
    assert "プレス機の刃が摩耗していました" in human_message_json


def test_json_serialization_thread_state():
    """ThreadStateのJSONシリアライゼーションテスト"""
    problem = ProblemInput(
        title="製品の表面に傷が発生",
        language="Japanese"
    )

    chat_history = [
        MessageSchema(type="ai", content="分析を開始します"),
        MessageSchema(type="human", content="プレス機の刃が摩耗していました")
    ]

    why_node = WhyNode(
        id="node_001",
        name="プレス機の刃が摩耗した",
        level=1,
        supporting_facts="プレス機の刃に摩耗の跡が確認された"
    )

    root_cause = RootCauseSchema(
        thought="刃の摩耗が直接的な原因と考えられる",
        recurrence_prevention_measures="定期的な刃の交換を実施する",
        root_cause_confidence=0.8
    )

    thread_state = ThreadState(
        problem=problem,
        chat_history=chat_history,
        why_nodes=[why_node],
        root_causes=[root_cause]
    )

    thread_state_dict = thread_state.model_dump(mode="json")
    thread_state_json = json.dumps(thread_state_dict, ensure_ascii=False)

    # 基本情報の確認
    assert "製品の表面に傷が発生" in thread_state_json
    assert "Japanese" in thread_state_json

    # チャット履歴の確認
    assert "分析を開始します" in thread_state_json
    assert "プレス機の刃が摩耗していました" in thread_state_json

    # WhyNodeの確認
    assert "node_001" in thread_state_json
    assert "プレス機の刃が摩耗した" in thread_state_json
    assert "プレス機の刃に摩耗の跡が確認された" in thread_state_json

    # RootCauseの確認
    assert "刃の摩耗が直接的な原因と考えられる" in thread_state_json
    assert "定期的な刃の交換を実施する" in thread_state_json
    assert "0.8" in thread_state_json


def test_json_serialization_thread_state_response():
    """ThreadStateResponseのJSONシリアライゼーションテスト"""
    problem = ProblemInput(
        title="製品の表面に傷が発生",
        language="Japanese"
    )

    chat_history = [
        MessageSchema(type="ai", content="分析を開始します")
    ]

    thread_state = ThreadState(
        problem=problem,
        chat_history=chat_history,
        why_nodes=[],
        root_causes=[]
    )

    response = ThreadStateResponse(
        thread_id="550e8400-e29b-41d4-a716-446655440000",
        created_at="2024-01-15T10:30:00Z",
        updated_at="2024-01-15T10:35:00Z",
        status="waiting_for_input",
        state=thread_state
    )

    response_dict = response.model_dump(mode="json")
    response_json = json.dumps(response_dict, ensure_ascii=False)

    # 基本情報の確認
    assert "550e8400-e29b-41d4-a716-446655440000" in response_json
    assert "2024-01-15T10:30:00Z" in response_json
    assert "2024-01-15T10:35:00Z" in response_json
    assert "waiting_for_input" in response_json

    # 状態情報の確認
    assert "製品の表面に傷が発生" in response_json
    assert "Japanese" in response_json
    assert "分析を開始します" in response_json


def test_json_serialization_edge_cases():
    """APIモデルのエッジケースJSONシリアライゼーションテスト"""
    # 空のThreadState
    empty_thread_state = ThreadState()
    empty_thread_state_dict = empty_thread_state.model_dump(mode="json")
    empty_thread_state_json = json.dumps(empty_thread_state_dict, ensure_ascii=False)
    assert "null" in empty_thread_state_json  # problem
    assert "[]" in empty_thread_state_json  # 空のリスト

    # 最小限のStreamRequest
    minimal_stream_request = StreamRequest()
    minimal_stream_request_dict = minimal_stream_request.model_dump(mode="json")
    minimal_stream_request_json = json.dumps(minimal_stream_request_dict, ensure_ascii=False)
    assert "null" in minimal_stream_request_json  # user_message
    assert "false" in minimal_stream_request_json  # is_retry


def test_json_serialization_round_trip():
    """APIモデルのJSONシリアライゼーションラウンドトリップテスト"""
    # StreamRequestのラウンドトリップテスト
    original_request = StreamRequest(
        user_message="テストメッセージ",
        is_retry=True
    )

    # シリアライズ
    request_dict = original_request.model_dump(mode="json")
    request_json = json.dumps(request_dict, ensure_ascii=False)

    # デシリアライズ
    request_dict_restored = json.loads(request_json)
    restored_request = StreamRequest(**request_dict_restored)

    # 比較
    assert restored_request.user_message == original_request.user_message
    assert restored_request.is_retry == original_request.is_retry

    # MessageSchemaのラウンドトリップテスト
    original_message = MessageSchema(
        type="human",
        content="テストコンテンツ"
    )

    # シリアライズ
    message_dict = original_message.model_dump(mode="json")
    message_json = json.dumps(message_dict, ensure_ascii=False)

    # デシリアライズ
    message_dict_restored = json.loads(message_json)
    restored_message = MessageSchema(**message_dict_restored)

    # 比較
    assert restored_message.type == original_message.type
    assert restored_message.content == original_message.content


def test_json_serialization_complex_nested_structures():
    """複雑なネスト構造のJSONシリアライゼーションテスト"""
    # 複雑なProblemInput
    problem = ProblemInput(
        title="複雑な問題",
        product_name="製品B",
        occurrence_date="2024-01-15T10:30:00Z",
        process="組立工程",
        location="第2工場",
        severity=Severity.MEDIUM,
        description="複雑な問題の詳細説明",
        defect_types=[DefectType.APPEARANCE, DefectType.FUNCTION],
        frequency=Frequency.OCCASIONAL,
        frequency_percentage="15",
        language="Japanese"
    )

    # 複雑なThreadState
    chat_history = [
        MessageSchema(type="ai", content="分析を開始します"),
        MessageSchema(type="human", content="詳細な情報を提供します"),
        MessageSchema(type="ai", content="追加情報を確認しました")
    ]

    why_nodes = [
        WhyNode(
            id="node_001",
            name="直接原因1",
            level=1,
            supporting_facts="直接的な証拠1"
        ),
        WhyNode(
            id="node_002",
            name="直接原因2",
            level=1,
            supporting_facts="直接的な証拠2"
        )
    ]

    root_causes = [
        RootCauseSchema(
            thought="真因分析の思考プロセス1",
            recurrence_prevention_measures="再発防止策1",
            root_cause_confidence=0.9
        ),
        RootCauseSchema(
            thought="真因分析の思考プロセス2",
            recurrence_prevention_measures="再発防止策2",
            root_cause_confidence=0.7
        )
    ]

    thread_state = ThreadState(
        problem=problem,
        chat_history=chat_history,
        why_nodes=why_nodes,
        root_causes=root_causes
    )

    thread_state_dict = thread_state.model_dump(mode="json")
    thread_state_json = json.dumps(thread_state_dict, ensure_ascii=False)

    # 複雑な構造の確認
    assert "複雑な問題" in thread_state_json
    assert "製品B" in thread_state_json
    assert "組立工程" in thread_state_json
    assert "第2工場" in thread_state_json
    assert "中程度" in thread_state_json
    assert "外観" in thread_state_json
    assert "機能" in thread_state_json
    assert "散発" in thread_state_json
    assert "15" in thread_state_json

    # チャット履歴の確認
    assert "分析を開始します" in thread_state_json
    assert "詳細な情報を提供します" in thread_state_json
    assert "追加情報を確認しました" in thread_state_json

    # WhyNodeの確認
    assert "node_001" in thread_state_json
    assert "node_002" in thread_state_json
    assert "直接原因1" in thread_state_json
    assert "直接原因2" in thread_state_json

    # RootCauseの確認
    assert "真因分析の思考プロセス1" in thread_state_json
    assert "真因分析の思考プロセス2" in thread_state_json
    assert "再発防止策1" in thread_state_json
    assert "再発防止策2" in thread_state_json
    assert "0.9" in thread_state_json
    assert "0.7" in thread_state_json
