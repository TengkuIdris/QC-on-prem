"""
統合テスト用のバリデーション関数

Pydanticモデルを使用してAPIレスポンスの厳格な検証を行う
"""
import json
from typing import Any, Dict, List

from pydantic import ValidationError

from why_why_chat_ai.api.models import (
    ThreadCreateResponse,
    ThreadStateResponse,
    MessageSchema,
)
from why_why_chat_ai.agent.models import WhyNode, ProblemInput
from why_why_chat_ai.agent.why_why_action import RootCauseSchema


class ResponseValidator:
    """APIレスポンスの厳格な検証を行うクラス"""

    @staticmethod
    def validate_thread_create_response(data: Dict[str, Any]) -> ThreadCreateResponse:
        """
        スレッド作成レスポンスの検証

        Parameters
        ----------
        data : Dict[str, Any]
            レスポンスデータ

        Returns
        -------
        ThreadCreateResponse
            検証済みのレスポンスモデル

        Raises
        ------
        ValidationError
            検証エラーの場合
        """
        try:
            return ThreadCreateResponse.model_validate(data)
        except ValidationError as e:
            raise AssertionError(f"スレッド作成レスポンスの検証に失敗しました: {e}")

    @staticmethod
    def validate_thread_state_response(data: Dict[str, Any]) -> ThreadStateResponse:
        """
        スレッド状態レスポンスの検証

        Parameters
        ----------
        data : Dict[str, Any]
            レスポンスデータ

        Returns
        -------
        ThreadStateResponse
            検証済みのレスポンスモデル

        Raises
        ------
        ValidationError
            検証エラーの場合
        """
        try:
            return ThreadStateResponse.model_validate(data)
        except ValidationError as e:
            raise AssertionError(f"スレッド状態レスポンスの検証に失敗しました: {e}")

    @staticmethod
    def validate_sse_event(event_data: str) -> Dict[str, Any]:
        """
        SSEイベントデータの検証

        Parameters
        ----------
        event_data : str
            SSEイベントのdataフィールド

        Returns
        -------
        Dict[str, Any]
            検証済みのイベントデータ

        Raises
        ------
        AssertionError
            検証エラーの場合
        """
        try:
            # JSONパース
            data = json.loads(event_data)
        except json.JSONDecodeError as e:
            raise AssertionError(f"SSEイベントのJSONパースに失敗しました: {e}")

        # 必須フィールドの検証
        assert "event_type" in data, "event_typeフィールドが必要です"

        event_type = data["event_type"]

        # イベントタイプ別の検証
        if event_type in ["final_result", "info_request"]:
            assert "state" in data, f"{event_type}イベントにはstateフィールドが必要です"
            ResponseValidator._validate_state_fields(data["state"])

        elif event_type in ["connection_start", "connection_end", "stream_error"]:
            assert "thread_id" in data, f"{event_type}イベントにはthread_idフィールドが必要です"
            assert "timestamp" in data, f"{event_type}イベントにはtimestampフィールドが必要です"

        # thoughtフィールドの検証（オプション）
        if "thought" in data:
            assert isinstance(data["thought"], str), "thoughtフィールドは文字列である必要があります"
            assert len(data["thought"]) > 0, "thoughtフィールドは空文字列であってはいけません"

        return data

    @staticmethod
    def _validate_state_fields(state: Dict[str, Any]) -> None:
        """
        状態フィールドの内部検証

        Parameters
        ----------
        state : Dict[str, Any]
            状態データ
        """
        # 必須フィールドの存在確認
        required_fields = ["problem", "chat_history", "why_nodes", "root_causes"]
        for field in required_fields:
            assert field in state, f"stateに{field}フィールドが必要です"

        # 各フィールドの型検証
        if state["problem"] is not None:
            try:
                ProblemInput.model_validate(state["problem"])
            except ValidationError as e:
                raise AssertionError(f"problemフィールドの検証に失敗しました: {e}")

        # chat_historyの検証
        assert isinstance(state["chat_history"], list), "chat_historyはリストである必要があります"
        for msg in state["chat_history"]:
            try:
                MessageSchema.model_validate(msg)
            except ValidationError as e:
                raise AssertionError(f"chat_historyメッセージの検証に失敗しました: {e}")

        # why_nodesの検証
        assert isinstance(state["why_nodes"], list), "why_nodesはリストである必要があります"
        for node in state["why_nodes"]:
            try:
                WhyNode.model_validate(node)
            except ValidationError as e:
                raise AssertionError(f"why_nodeの検証に失敗しました: {e}")

        # root_causesの検証
        assert isinstance(state["root_causes"], list), "root_causesはリストである必要があります"
        for cause in state["root_causes"]:
            try:
                RootCauseSchema.model_validate(cause)
            except ValidationError as e:
                raise AssertionError(f"root_causeの検証に失敗しました: {e}")

    @staticmethod
    def validate_why_node_structure(nodes: List[Dict[str, Any]]) -> None:
        """
        WhyNodeの階層構造の検証

        Parameters
        ----------
        nodes : List[Dict[str, Any]]
            WhyNodeのリスト
        """
        if not nodes:
            return

        # IDの一意性チェック
        node_ids = [node["id"] for node in nodes]
        assert len(node_ids) == len(set(node_ids)), "WhyNodeのIDは一意である必要があります"

        # 親子関係の整合性チェック
        node_map = {node["id"]: node for node in nodes}

        for node in nodes:
            # 親ノードが存在する場合
            if node.get("parent_id"):
                assert node["parent_id"] in node_map, f"親ノードID {node['parent_id']} が存在しません"
                parent = node_map[node["parent_id"]]
                assert node["id"] in parent.get("children_ids", []), \
                    f"ノード {node['id']} が親ノードの子リストに含まれていません"

            # 子ノードが存在する場合
            for child_id in node.get("children_ids", []):
                assert child_id in node_map, f"子ノードID {child_id} が存在しません"
                child = node_map[child_id]
                assert child.get("parent_id") == node["id"], \
                    f"子ノード {child_id} の親IDが不整合です"

        # レベルの整合性チェック
        for node in nodes:
            if node.get("parent_id"):
                parent = node_map[node["parent_id"]]
                assert node["level"] == parent["level"] + 1, \
                    f"ノード {node['id']} のレベルが親ノードと整合していません"

    @staticmethod
    def validate_streaming_response_sequence(events: List[str]) -> None:
        """
        SSEストリーミングレスポンスのシーケンス検証

        Parameters
        ----------
        events : List[str]
            SSEイベントの文字列リスト
        """
        parsed_events = []

        for event in events:
            lines = event.strip().split('\n')
            event_data = {}

            for line in lines:
                if line.startswith('event:'):
                    event_data['event'] = line[6:].strip()
                elif line.startswith('data:'):
                    try:
                        event_data['data'] = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        event_data['data'] = line[5:].strip()

            if 'data' in event_data:
                parsed_events.append(event_data['data'])

        # イベントシーケンスの検証
        assert len(parsed_events) > 0, "少なくとも1つのイベントが必要です"

        # connection_startイベントの検証（存在する場合）
        if parsed_events[0].get("event_type") == "connection_start":
            assert "thread_id" in parsed_events[0], "connection_startにはthread_idが必要です"

        # 最終イベントの検証
        last_event = parsed_events[-1]
        if last_event.get("event_type") == "connection_end":
            assert "thread_id" in last_event, "connection_endにはthread_idが必要です"

        # エラーイベントのチェック
        for event in parsed_events:
            if event.get("event_type") == "stream_error":
                assert "error" in event, "stream_errorにはerrorフィールドが必要です"
