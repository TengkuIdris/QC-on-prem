"""
Thread management router for Why-Why Analysis Agent API
"""
import json
import uuid
from enum import Enum
import traceback
from datetime import datetime, timezone
from typing import Dict, Any

import structlog
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, status, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage
from langgraph.types import Command, Interrupt, StateSnapshot
from langgraph.constants import START

from ...api.config import settings
from ...api.services.agent_client import AgentClient
from ..models import ThreadCreateRequest, ThreadCreateResponse, StreamRequest, ThreadStateResponse, ThreadState, MessageSchema
from ..auth import get_current_auth
from ..rate_limiting import limiter

logger = structlog.get_logger(__name__)

# ルーター作成
router = APIRouter(prefix="/v1/threads", tags=["threads"])

# AgentClient インスタンスは起動時に初期化される

# ストリーミング不要なイベントのリスト (info_request はユーザー入力の状態更新後に発生し対応不要)
STREAMING_UNNEEDED_EVENTS = ["set_initial_cause", "joint", "info_request", "map_deep_analysis", "map_root_cause_analysis"]


class ModelJSONEncoder(json.JSONEncoder):
    """
    このプロジェクトで利用するモデル及び特定のオブジェクトを処理するカスタムJSONエンコーダー
    """
    def default(self, obj):
        # Message は内容とタイプ(ai or human) のみをシリアライズ
        if isinstance(obj, BaseMessage):
            return obj.model_dump(include={"type", "content"}, mode="json")
        # Interrupt オブジェクトをシリアライズ可能な形式に変換
        if isinstance(obj, Interrupt):
            # Interrupt オブジェクトを辞書形式に変換
            return {
                "_type": "Interrupt",
                "value": getattr(obj, 'value', None),
                "resumable": getattr(obj, 'resumable', True)
            }
        # Pydantic Base Model の場合は、model_dump() を活用してサブ要素も適切にシリアライズする
        if isinstance(obj, BaseModel):
            obj_dict = obj.model_dump(mode="json")
            return obj_dict
        # Enum の場合は、value を直接シリアライズする
        if isinstance(obj, Enum):
            return obj.value

        # その他のシリアライズできないオブジェクトの処理
        try:
            return super().default(obj)
        except TypeError:
            # シリアライズできない場合は文字列表現を返す
            return str(obj)


def _format_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """
    SSE（Server-Sent Events）形式のイベントを生成します。

    Parameters
    ----------
    event_type : str
        イベントタイプ
    data : Dict[str, Any]
        イベントデータ

    Returns
    -------
    str
        SSE形式の文字列
    """
    json_data = json.dumps(data, ensure_ascii=False, cls=ModelJSONEncoder)
    return f"event: {event_type}\ndata: {json_data}\n\n"


def _format_thread_state_response(thread_id: str, snapshot: StateSnapshot) -> ThreadStateResponse:
    """
    AgentClientから取得したStateSnapshotをThreadStateResponseに整形します。

    Parameters
    ----------
    thread_id : str
        スレッドID
    snapshot : StateSnapshot
        エージェントの最新のStateSnapshot

    Returns
    -------
    ThreadStateResponse
        整形されたスレッド状態レスポンス
    """
    # StateSnapshotから状態データを取得
    state_data = snapshot.values

    # エージェント状態から直接データを取得
    problem = state_data.get("problem")  # 既に ProblemInput 型
    root_causes = state_data.get("root_causes", [])
    why_nodes = [n for n in state_data.get("why_nodes", {}).values() if n is not None]  # None のノードをスキップ

    # チャット履歴の変換（BaseMessage → MessageSchema）
    chat_history = []
    raw_chat_history = state_data.get("chat_history", [])
    for msg in raw_chat_history:
        try:
            chat_history.append(MessageSchema(**msg.model_dump(include={"type", "content"}, mode="json")))
        except Exception as e:
            logger.warning(f"Failed to parse chat message: {e}\n{msg}")

    # 状態ステータスの判定（StateSnapshot.next を活用）
    if snapshot.next == ():
        # next が空のタプル = 実行完了
        status = "completed"
    elif "info_request" in snapshot.next:
        # info_request が次に実行される = ユーザー入力を待機中
        status = "waiting_for_input"
    else:
        # その他 = 実行中
        status = "running"

    # 時刻情報の取得
    created_at = snapshot.created_at or datetime.now(timezone.utc).isoformat()
    updated_at = snapshot.created_at or datetime.now(timezone.utc).isoformat()

    return ThreadStateResponse(
        thread_id=thread_id,
        created_at=created_at,
        updated_at=updated_at,
        status=status,
        state=ThreadState(
            problem=problem,
            chat_history=chat_history,
            why_nodes=why_nodes,
            root_causes=root_causes
        )
    )


def _format_sse_keepalive() -> str:
    """
    SSE keep-alive メッセージを生成します。

    Returns
    -------
    str
        Keep-alive用のSSE文字列
    """
    return ": keep-alive\n\n"


@router.post(
    "",
    response_model=ThreadCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新規分析スレッドを作成",
    description="新規なぜなぜ分析スレッドを作成し、問題情報を登録します。",
    responses={
        201: {"description": "スレッドが正常に作成されました"},
        400: {"description": "リクエストデータのバリデーションエラー"},
        401: {"description": "認証失敗"},
        403: {"description": "権限不足"},
        429: {"description": "レート制限超過"},
        500: {"description": "内部サーバーエラー"}
    },
    dependencies=[Depends(get_current_auth)]
)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def create_thread(
    request: Request,
    thread_request: ThreadCreateRequest,
    auth_info: dict = Depends(get_current_auth)
) -> ThreadCreateResponse:
    """
    新規なぜなぜ分析スレッドを作成します。

    Parameters
    ----------
    request : ThreadCreateRequest
        スレッド作成リクエスト（問題情報を含む）

    Returns
    -------
    ThreadCreateResponse
        作成されたスレッドの情報

    Raises
    ------
    HTTPException
        バリデーションエラーまたは内部エラーの場合
    """
    try:
        # スレッドIDを生成
        thread_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)

        logger.info(
            "Creating new thread",
            thread_id=thread_id,
            problem_title=thread_request.problem.title,
            auth_type=auth_info.get("auth_type")
        )

        # Agentクライアントをapp.stateから取得
        agent_client = request.app.state.agent_client

        # LangGraphチェックポイント機能でスレッドを初期化
        # thread_id を使ってチェックポイントが作成され、状態が永続化される
        async for event in agent_client.astream({"problem": thread_request.problem.model_dump(mode='json')}, thread_id):
            # 最初のイベントが返ってチェックポイント作成されたら初期化完了
            event_type = list(event.keys())[0]
            if event_type in [START, "set_initial_cause"]:
                logger.debug(f"Initial checkpoint created: {event_type}", thread_id=thread_id)
                break

        # レスポンス作成
        response = ThreadCreateResponse(thread_id=thread_id, created_at=created_at)
        logger.info("Thread created successfully", thread_id=thread_id, created_at=created_at)
        return response

    except Exception as e:
        logger.error(
            "Failed to create thread",
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="スレッドの作成に失敗しました"
        ) from e


@router.post(
    "/{thread_id}/stream",
    summary="ストリーミング分析を実行",
    description="指定されたスレッドでなぜなぜ分析をストリーミング実行します。",
    responses={
        200: {"description": "分析が正常に実行されました", "content": {"text/event-stream": {}}},
        401: {"description": "認証失敗"},
        403: {"description": "権限不足"},
        404: {"description": "指定されたスレッドが見つかりません"},
        429: {"description": "レート制限超過"},
        500: {"description": "内部サーバーエラー"}
    },
    dependencies=[Depends(get_current_auth)]
)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def stream_analysis(
    request: Request,
    thread_id: str,
    stream_request: StreamRequest,
    auth_info: dict = Depends(get_current_auth)
) -> StreamingResponse:
    """
    指定されたスレッドでストリーミング分析を実行します。

    Parameters
    ----------
    thread_id : str
        対象のスレッドID
    request : StreamRequest
        ストリーミング実行リクエスト
    http_request : Request
        FastAPIリクエストオブジェクト（クライアント切断検知用）

    Returns
    -------
    StreamingResponse
        SSEストリーミングレスポンス

    Raises
    ------
    HTTPException
        スレッドが見つからない場合または内部エラーの場合
    """
    try:
        logger.info(
            "Starting stream analysis",
            thread_id=thread_id,
            user_message=stream_request.user_message,
            is_retry=stream_request.is_retry,
            auth_type=auth_info.get("auth_type")
        )

        async def generate_events():
            """
            SSEイベントを生成する非同期ジェネレータ
            - LangGraphチェックポイント機能を使用してストリーミング分析を実行
            - クライアント切断検知付き
            """
            try:
                # 接続開始イベント
                start_event = {
                    "event_type": "connection_start",
                    "thread_id": thread_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                yield _format_sse_event("connection_start", start_event)

                if stream_request.user_message:
                    # ユーザーからの入力を受け付ける
                    input_data = Command(resume={"response": stream_request.user_message})
                else:
                    # 前回から継続実行
                    input_data = None
                # Agentクライアントをapp.stateから取得
                agent_client = request.app.state.agent_client
                async for event in agent_client.astream(input_data, thread_id, stream_request.is_retry):
                    # クライアント切断チェック
                    if await request.is_disconnected():
                        logger.info("Client disconnected, stopping stream", thread_id=thread_id)
                        break
                    event_type = list(event.keys())[0]
                    # 不要なイベントはスキップ
                    if event_type in STREAMING_UNNEEDED_EVENTS:
                        continue
                    # 割り込みイベント (info_request)
                    if event_type == "__interrupt__":
                        interrupt = event.get("__interrupt__")[0]
                        thought = interrupt.value["thought"]
                        # ユーザーへの質問をチャット履歴に追加
                        state = await agent_client.get_thread_state(thread_id)
                        state.pop("thoughts", None)  # event に thought が含まれているので削除
                        question = AIMessage(content=interrupt.value["question"])
                        if "chat_history" in state and isinstance(state["chat_history"], list):
                            state["chat_history"].append(question)
                        else:
                            state["chat_history"] = [question]
                        # 一度ストリーミングを終了し、ユーザーからの入力を待つ
                        yield _format_sse_event("info_request", {"thought": thought, "state": state})
                        return
                    # その他イベント
                    state = event[event_type]
                    thought = state.pop("thoughts", [""])[-1] if isinstance(state, dict) else ""
                    yield _format_sse_event(event_type, {"thought": thought, "state": state})

                # 接続終了イベント（正常終了の場合）
                if not await request.is_disconnected():
                    end_event = {
                        "event_type": "connection_end",
                        "thread_id": thread_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    yield _format_sse_event("connection_end", end_event)

            except Exception as e:
                logger.error("Error in stream generation", thread_id=thread_id, error=str(e), exc_info=True)
                # エラーイベント送信
                error_event = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "event_type": "stream_error",
                    "thread_id": thread_id,
                    "error": str(e),
                    "traceback": traceback.format_exc(),
                }
                if settings.is_development:
                    error_event["traceback"] = traceback.format_exc()
                yield _format_sse_event("stream_error", error_event)

        logger.info("Stream analysis started", thread_id=thread_id)

        # SSEストリーミングレスポンスを返す
        return StreamingResponse(
            generate_events(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # nginx buffering を無効化
            }
        )

    except Exception as e:
        logger.error("Failed to execute stream analysis", thread_id=thread_id, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="分析の実行に失敗しました"
        ) from e


@router.get(
    "/{thread_id}",
    response_model=ThreadStateResponse,
    summary="スレッド状態を取得",
    description="指定されたスレッドの現在の分析状態を取得します。",
    responses={
        200: {"description": "スレッド状態が正常に取得されました"},
        401: {"description": "認証失敗"},
        403: {"description": "権限不足"},
        404: {"description": "指定されたスレッドが見つかりません"},
        429: {"description": "レート制限超過"},
        500: {"description": "内部サーバーエラー"}
    },
    dependencies=[Depends(get_current_auth)]
)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def get_thread_state(
    request: Request,
    thread_id: str,
    auth_info: dict = Depends(get_current_auth)
) -> ThreadStateResponse:
    """
    指定されたスレッドの現在の状態を取得します。

    Parameters
    ----------
    thread_id : str
        対象のスレッドID

    Returns
    -------
    ThreadStateResponse
        スレッドの状態情報

    Raises
    ------
    HTTPException
        スレッドが見つからない場合または内部エラーの場合
    """
    try:
        logger.info("Getting thread state", thread_id=thread_id, auth_type=auth_info.get("auth_type"))
        try:
            logger.debug("Retrieving thread state", thread_id=thread_id)

            # Agentクライアントをapp.stateから取得
            agent_client: AgentClient = request.app.state.agent_client
            # AgentClient経由でStateSnapshotを取得
            snapshot = await agent_client.get_thread_snapshot(thread_id)
            logger.debug(
                "Snapshot retrieved from agent",
                thread_id=thread_id,
                snapshot_type=str(type(snapshot)),
                snapshot_keys=list(snapshot.values.keys()) if snapshot and hasattr(snapshot, 'values') else None
            )

            # レスポンスをThreadStateResponseに整形
            thread_state_response = _format_thread_state_response(thread_id, snapshot)

        except HTTPException:
            # HTTPExceptionはそのまま再raise（内側のtryでも必要）
            raise
        except Exception as agent_error:
            logger.warning("Failed to retrieve state from agent", thread_id=thread_id, error=str(agent_error))
            # スレッドが見つからない場合は404を返す
            error_message = str(agent_error).lower()
            if isinstance(agent_error, ValueError) or "not found" in error_message or "does not exist" in error_message or "no checkpoint" in error_message or "not initialized" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"スレッド '{thread_id}' が見つかりません"
                )
            # その他のエラーの場合は500を返す
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="スレッド状態の取得に失敗しました"
            ) from agent_error

        logger.info("Thread state retrieved successfully", thread_id=thread_id, status=thread_state_response.status)
        return thread_state_response

    except HTTPException:
        # HTTPExceptionはそのまま再raise
        raise
    except Exception as e:
        logger.error("Failed to get thread state", thread_id=thread_id, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="スレッド状態の取得に失敗しました"
        ) from e
