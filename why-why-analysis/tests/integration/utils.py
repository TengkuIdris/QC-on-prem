"""
統合テスト用の共通ユーティリティ
"""
import asyncio
import json
import time
from functools import wraps
from typing import Any, Dict, List, Callable
from unittest.mock import Mock

from why_why_chat_ai.agent.models import ProblemInput, Severity, DefectType, Frequency


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    非同期関数用のリトライデコレータ

    Parameters
    ----------
    max_attempts : int
        最大試行回数
    delay : float
        初回リトライまでの待機時間（秒）
    backoff_factor : float
        リトライごとの待機時間の倍率
    exceptions : tuple
        リトライ対象の例外タイプ
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff_factor
                    else:
                        raise

            if last_exception:
                raise last_exception

        return wrapper
    return decorator


def create_test_problem_input(
    title: str = "テスト用の品質問題",
    severity: Severity = Severity.MEDIUM,
    description: str = "テスト環境で発生した品質問題のシミュレーション",
    language: str = "ja"
) -> ProblemInput:
    """
    テスト用の問題入力データを生成

    Parameters
    ----------
    title : str
        問題のタイトル
    severity : Severity
        問題の重要度
    language : str
        出力言語

    Returns
    -------
    ProblemInput
        テスト用の問題入力データ
    """
    return ProblemInput(
        title=title,
        product_name="テスト製品A",
        occurrence_date="2024-01-15T10:30:00+09:00",
        process="組立工程",
        location="第1工場",
        severity=severity,
        description=description,
        man_details="作業者の習熟度が低い可能性",
        machine_details="設備の定期点検記録あり",
        material_details="材料の品質証明書確認済み",
        method_details="標準作業手順書に従って作業",
        measurement_details="測定器の校正期限内",
        environment_details="温度・湿度は管理範囲内",
        defect_types=[DefectType.DIMENSION, DefectType.FUNCTION],
        frequency=Frequency.OCCASIONAL,
        frequency_percentage="5%",
        direct_cause="テスト用の直接原因",
        language=language
    )


def parse_sse_events(data: str) -> List[Dict[str, Any]]:
    """
    SSEイベントストリームをパースしてイベントのリストに変換

    Parameters
    ----------
    data : str
        SSEフォーマットのデータ

    Returns
    -------
    List[Dict[str, Any]]
        パースされたイベントのリスト
    """
    events = []
    current_event = {}

    for line in data.strip().split('\n'):
        if line.startswith('event:'):
            current_event['event'] = line[6:].strip()
        elif line.startswith('data:'):
            try:
                current_event['data'] = json.loads(line[5:].strip())
            except json.JSONDecodeError:
                current_event['data'] = line[5:].strip()
        elif line == '' and current_event:
            events.append(current_event)
            current_event = {}

    # 最後のイベントを追加
    if current_event:
        events.append(current_event)

    return events


def create_mock_reasoning_engine() -> Mock:
    """
    Vertex AI Reasoning Engine のモックを作成

    Returns
    -------
    Mock
        モックされたReasoning Engine
    """
    mock_engine = Mock()

    # スレッドごとのチャット履歴を保存する辞書をmock_engineに追加
    mock_engine._thread_chat_histories = {}

    # query メソッドのモック（Vertex AI SDKのシグネチャに合わせる）
    def mock_query(input: Dict[str, Any] = None, **kwargs) -> Dict[str, Any]:
        # inputキーワード引数または位置引数を処理
        input_data = input or kwargs.get('input_data', {})
        return {
            "event_type": "final_result",
            "status": "completed",  # ステータスを追加
            "state": {
                "problem": input_data.get("problem").model_dump(mode='json') if hasattr(input_data.get("problem"), 'model_dump') else input_data.get("problem"),
                "chat_history": [],
                "why_nodes": [],
                "root_causes": []
            }
        }

    # stream_query メソッドのモック（ジェネレータ、Vertex AI SDKのシグネチャに合わせる）
    def mock_stream_query(input: Dict[str, Any] = None, **kwargs):
        # inputキーワード引数または位置引数を処理
        input_data = input or kwargs.get('input_data', {})
        
        # thread_idを取得
        thread_id = input_data.get("thread_id")

        # 既存のチャット履歴を取得（thread_idがある場合）
        existing_chat_history = []
        if hasattr(mock_engine, '_thread_chat_histories') and thread_id:
            existing_chat_history = mock_engine._thread_chat_histories.get(thread_id, [])

        # 初期思考プロセス
        yield {
            "initial_analysis": {
                "event_type": "initial_analysis",
                "thought": "問題を分析中...",
                "status": "running"  # ステータスを追加
            }
        }

        # 少し間を置く（実際のストリーミングをシミュレート）
        import time
        time.sleep(0.01)

        # ユーザーメッセージがない場合の処理
        if not input_data.get("user_message"):
            # 初回の場合、problemの内容に基づいて判断
            problem = input_data.get("problem", {})
            # problemがPydanticモデルの場合は辞書に変換
            if hasattr(problem, 'model_dump'):
                problem_dict = problem.model_dump(mode='json')
            else:
                problem_dict = problem

            # problemに十分な情報がある場合は直接final_resultを返す
            if problem_dict and problem_dict.get("direct_cause"):
                # 十分な情報があるので分析完了
                new_chat_history = existing_chat_history + [
                    {"type": "ai", "content": "提供された情報を基に根本原因を分析しました。"}
                ]

                yield {
                    "final_result": {
                        "event_type": "final_result",
                        "thought": "十分な情報があるため分析を完了しました",
                        "status": "completed",
                        "state": {
                            "problem": problem_dict,
                            "chat_history": new_chat_history,
                            "why_nodes": [
                            {
                                "id": "node1",
                                "name": "作業手順の不備",
                                "level": 1,
                                "parent_id": None,
                                "children_ids": [],
                                "supporting_facts": "標準作業手順書の内容が不明確",
                                "is_root_cause": True,
                                "root_cause_confidence": 0.8,
                                "root_cause_judgement": "手順書の改訂が必要",
                                "recurrence_prevention_measures": "手順書を見直し、明確化する"
                            }
                        ],
                        "root_causes": [
                            {
                                "cause": "作業手順の不備",
                                "confidence": 0.8,
                                "judgement_reason": "作業手順書の内容が不明確であることが根本原因と判断しました。",
                                "countermeasures": "手順書の改訂と作業者への再教育を実施します。"
                            }
                        ]
                        }
                    }
                }
                # チャット履歴を保存
                if thread_id:
                    mock_engine._thread_chat_histories[thread_id] = new_chat_history
            else:
                # 情報が不足している場合は情報要求
                new_chat_history = existing_chat_history + [
                    {"type": "ai", "content": "この問題についてもう少し詳しく教えてください。"}
                ]
                yield {
                    "info_request": {
                        "event_type": "info_request",
                        "thought": "追加情報が必要です",
                        "status": "waiting_for_input",  # ユーザー入力待ちステータス
                        "state": {
                            "problem": input_data.get("problem").model_dump(mode='json') if hasattr(input_data.get("problem"), 'model_dump') else input_data.get("problem"),
                            "chat_history": new_chat_history,
                            "why_nodes": [],
                            "root_causes": []
                        }
                    }
                }
                # チャット履歴を保存
                if thread_id:
                    mock_engine._thread_chat_histories[thread_id] = new_chat_history
        else:
            # ユーザーメッセージがある場合は処理を続行

            # 分析継続
            yield {
                "event_type": "processing",
                "thought": "ユーザーの情報を基に分析を続行中...",
                "status": "running"
            }

            time.sleep(0.01)

            # 会話の回数に応じて異なる応答を生成
            conversation_count = len([msg for msg in existing_chat_history if msg["type"] == "human"])

            # E2Eテストシナリオの考慮：
            # - 製造業シナリオなど十分な情報が提供されているケースは早めに完了させる
            # - それ以外は通常の対話フローに従う
            problem_data = input_data.get("problem", {})
            # problem_dataがPydanticモデルの場合は辞書に変換
            if hasattr(problem_data, 'model_dump'):
                problem_dict = problem_data.model_dump(mode='json')
            else:
                problem_dict = problem_data

            has_sufficient_info = (
                conversation_count >= 1 and
                problem_dict and
                (problem_dict.get("direct_cause") or problem_dict.get("severity") == "HIGH")
            )

            # 会話が2回未満でも、十分な情報がある場合は最終結果を返す
            if conversation_count < 2 and not has_sufficient_info:
                ai_response = {
                    0: "なるほど、その情報を踏まえて分析します。さらに詳しい状況を教えていただけますか？",
                    1: "情報ありがとうございます。もう少し詳細を確認させてください。"
                }.get(conversation_count, "追加情報をありがとうございます。")

                new_chat_history = existing_chat_history + [
                    {"type": "human", "content": input_data.get("user_message")},
                    {"type": "ai", "content": ai_response}
                ]

                yield {
                    "info_request": {
                        "event_type": "info_request",
                        "thought": "さらなる情報が必要です",
                        "status": "waiting_for_input",
                        "state": {
                            "problem": input_data.get("problem").model_dump(mode='json') if hasattr(input_data.get("problem"), 'model_dump') else input_data.get("problem"),
                            "chat_history": new_chat_history,
                            "why_nodes": [],
                            "root_causes": []
                        }
                    }
                }
                # チャット履歴を保存
                if thread_id:
                    mock_engine._thread_chat_histories[thread_id] = new_chat_history
            else:
                # 十分な情報が集まったので最終結果を返す
                new_chat_history = existing_chat_history + [
                    {"type": "human", "content": input_data.get("user_message")},
                    {"type": "ai", "content": "すべての情報を総合的に分析し、根本原因を特定しました。"}
                ]

                # 最終結果
                yield {
                    "final_result": {
                        "event_type": "final_result",
                        "thought": "分析が完了しました",
                        "status": "completed",  # 完了ステータス
                        "state": {
                            "problem": input_data.get("problem").model_dump(mode='json') if hasattr(input_data.get("problem"), 'model_dump') else input_data.get("problem"),
                            "chat_history": new_chat_history,
                            "why_nodes": [
                            {
                                "id": "node1",
                                "name": "作業手順の不備",
                                "level": 1,
                                "parent_id": None,
                                "children_ids": [],
                                "supporting_facts": "標準作業手順書の内容が不明確",
                                "is_root_cause": True,
                                "root_cause_confidence": 0.8,
                                "root_cause_judgement": "手順書の改訂が必要",
                                "recurrence_prevention_measures": "手順書を見直し、明確化する"
                            }
                        ],
                        "root_causes": [
                            {
                                "cause": "作業手順の不備",
                                "confidence": 0.8,
                                "judgement_reason": "作業手順書の内容が不明確であることが根本原因と判断しました。",
                                "countermeasures": "手順書の改訂と作業者への再教育を実施します。"
                            }
                        ]
                        }
                    }
                }
                # チャット履歴を保存
                if thread_id:
                    mock_engine._thread_chat_histories[thread_id] = new_chat_history

    mock_engine.query = Mock(side_effect=mock_query)
    mock_engine.stream_query = Mock(side_effect=mock_stream_query)

    return mock_engine


async def wait_for_condition(
    condition_func: Callable[[], bool],
    timeout: float = 10.0,
    interval: float = 0.1
) -> bool:
    """
    条件が満たされるまで待機

    Parameters
    ----------
    condition_func : Callable[[], bool]
        条件をチェックする関数
    timeout : float
        タイムアウト時間（秒）
    interval : float
        チェック間隔（秒）

    Returns
    -------
    bool
        条件が満たされたらTrue、タイムアウトしたらFalse
    """
    start_time = time.time()

    while time.time() - start_time < timeout:
        if condition_func():
            return True
        await asyncio.sleep(interval)

    return False


class MockStreamingResponse:
    """SSEストリーミングレスポンスのモック"""

    def __init__(self, events: List[Dict[str, Any]]):
        self.events = events
        self._index = 0

    async def __aiter__(self):
        for event in self.events:
            # SSE形式でイベントを生成
            if 'event' in event:
                yield f"event: {event['event']}\n".encode()

            data = json.dumps(event.get('data', event))
            yield f"data: {data}\n\n".encode()

            # 実際のストリーミングをシミュレート
            await asyncio.sleep(0.1)
