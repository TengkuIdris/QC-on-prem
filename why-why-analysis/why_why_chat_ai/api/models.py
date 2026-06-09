"""
API Request/Response Models for Why-Why Analysis Agent API
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from ..agent.models import ProblemInput, WhyNode
from ..agent.why_why_action import RootCauseSchema


class ThreadCreateRequest(BaseModel):
    """
    新規スレッド作成のリクエストモデル
    """
    problem: ProblemInput = Field(..., description="問題情報")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "problem": {
                    "title": "製品の表面に傷が発生",
                    "product_name": "自動車部品A",
                    "occurrence_date": "2024-01-15T10:30:00Z",
                    "process": "プレス工程",
                    "location": "第1工場",
                    "severity": "重大",
                    "description": "製品表面に線状の傷が複数確認された",
                    "language": "Japanese"
                }
            }
        }
    )


class ThreadCreateResponse(BaseModel):
    """
    新規スレッド作成のレスポンスモデル
    """
    thread_id: str = Field(..., description="作成されたスレッドの一意なID")
    created_at: datetime = Field(..., description="作成時刻")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "thread_id": "550e8400-e29b-41d4-a716-446655440000",
                "created_at": "2024-01-15T10:30:00Z"
            }
        }
    )


class StreamRequest(BaseModel):
    """
    ストリーミング分析のリクエストモデル
    """
    user_message: Optional[str] = Field(None, description="ユーザー応答メッセージ。初回分析開始時は省略可能")
    is_retry: bool = Field(False, description="trueの場合はユーザーが入力内容を修正して再送信する意図を示す")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "description": "分析開始・継続",
                    "value": {}
                },
                {
                    "description": "ユーザー応答",
                    "value": {
                        "user_message": "プレス機の刃の摩耗が確認されました"
                    }
                },
                {
                    "description": "入力修正",
                    "value": {
                        "user_message": "修正: プレス機の刃の欠けが確認されました",
                        "is_retry": True
                    }
                }
            ]
        }
    )


class MessageSchema(BaseModel):
    """
    チャット履歴のメッセージスキーマ
    """
    type: str = Field(..., description="メッセージタイプ (human|ai)")
    content: str = Field(..., description="メッセージ内容")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "ai",
                "content": "プレス工程での傷の原因について詳しく教えてください。"
            }
        }
    )


class ThreadState(BaseModel):
    """
    スレッドの分析状態
    """
    problem: Optional[ProblemInput] = Field(None, description="問題情報")
    chat_history: List[MessageSchema] = Field(default_factory=list, description="対話履歴")
    why_nodes: List[WhyNode] = Field(default_factory=list, description="なぜ分析ノード")
    root_causes: List[RootCauseSchema] = Field(default_factory=list, description="真因候補")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "problem": {
                    "title": "製品の表面に傷が発生",
                    "language": "Japanese"
                },
                "chat_history": [
                    {"type": "ai", "content": "分析を開始します"},
                    {"type": "human", "content": "プレス機の刃が摩耗していました"}
                ],
                "why_nodes": [],
                "root_causes": []
            }
        }
    )


class ThreadStateResponse(BaseModel):
    """
    スレッド状態取得のレスポンスモデル
    """
    thread_id: str = Field(..., description="スレッドID")
    created_at: str = Field(..., description="スレッド作成時刻 (ISO8601形式)")
    updated_at: str = Field(..., description="最新チェックポイントの更新時刻 (ISO8601形式)")
    status: str = Field(..., description="分析状態 (running|waiting_for_input|completed|error)")
    state: ThreadState = Field(..., description="最新チェックポイントから取得した状態")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "thread_id": "550e8400-e29b-41d4-a716-446655440000",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:35:00Z",
                "status": "waiting_for_input",
                "state": {
                    "problem": {
                        "title": "製品の表面に傷が発生",
                        "language": "Japanese"
                    },
                    "chat_history": [
                        {"type": "ai", "content": "分析を開始します"}
                    ],
                    "why_nodes": [],
                    "root_causes": []
                }
            }
        }
    )
