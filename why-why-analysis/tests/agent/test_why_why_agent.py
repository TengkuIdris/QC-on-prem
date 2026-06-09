"""なぜなぜ分析エージェントのテスト"""
import os
import pytest
from unittest.mock import patch, MagicMock
import google.auth.exceptions

from langgraph.constants import START, END
from langgraph.types import Command
from langgraph.graph.state import CompiledStateGraph

from why_why_chat_ai.agent.utils import get_default_config
from why_why_chat_ai.agent.why_why_agent import WhyWhyAgentBuilder
from why_why_chat_ai.agent.models import ProblemInput, WhyNode, VerificationResult


@pytest.fixture
def mock_vertex_ai():
    """Google VertexAI APIをモックして認証をバイパスするフィクスチャ"""
    # より包括的なモックの適用
    with patch('langchain_google_vertexai.chat_models.ChatVertexAI') as mock_chat, \
         patch('google.auth.default', return_value=([MagicMock()], 'project')), \
         patch('google.oauth2.credentials.Credentials'), \
         patch('google.oauth2.service_account.Credentials'):

        # モックに動作を追加
        mock_chat.return_value.invoke.return_value = {"content": "モックレスポンス"}

        # アクションビルダーのモックを設定
        with patch('why_why_chat_ai.agent.why_why_agent.InitialWhyAnalysisActionBuilder') as mock_initial, \
             patch('why_why_chat_ai.agent.why_why_agent.DeepWhyAnalysisActionBuilder') as mock_deep, \
             patch('why_why_chat_ai.agent.why_why_agent.InfoRequestActionBuilder') as mock_info, \
             patch('why_why_chat_ai.agent.why_why_agent.RootCauseAnalysisActionBuilder') as mock_root:

            # 各アクションのモックオブジェクトを作成
            for mock_builder in [mock_initial, mock_deep, mock_info, mock_root]:
                mock_action = MagicMock()
                mock_action.invoke.return_value = {}  # 空の結果を返す
                mock_builder.return_value.build.return_value = mock_action

            yield


def test_why_why_agent_builder_init():
    """WhyWhyAgentBuilderの初期化テスト"""
    builder = WhyWhyAgentBuilder()

    # 内部のLLMアクションが正しく初期化されていることを確認
    assert builder._initial_analysis is not None
    assert builder._deep_analysis is not None
    assert builder._info_request is not None
    assert builder._root_cause_analysis is not None


def test_set_up_graph():
    """_set_up_graphメソッドのテスト"""
    # StateGraphのモック
    mock_graph = MagicMock()

    # WhyWhyAgentBuilderのインスタンス化
    builder = WhyWhyAgentBuilder()

    # _set_up_graphメソッドを呼び出す
    builder._set_up_graph(mock_graph)

    # 必要なノードが追加されたことを確認
    # 現在の実装では8つのノードが追加される
    assert mock_graph.add_node.call_count == 8
    mock_graph.add_node.assert_any_call("initial_analysis", builder._initial_analysis)
    mock_graph.add_node.assert_any_call("deep_analysis", builder._deep_analysis)
    mock_graph.add_node.assert_any_call("info_request", builder._info_request)
    mock_graph.add_node.assert_any_call("root_cause_analysis", builder._root_cause_analysis)

    # エッジが追加されたことを確認
    # 現在の実装では4つの通常エッジが追加される
    assert mock_graph.add_edge.call_count == 4
    # 現在の実装でのエッジ追加を確認
    mock_graph.add_edge.assert_any_call(START, "set_initial_cause")
    mock_graph.add_edge.assert_any_call("set_initial_cause", "joint")
    mock_graph.add_edge.assert_any_call("deep_analysis", "map_root_cause_analysis")

    # 条件付きエッジが追加されたことを確認
    # 現在の実装では5つの条件付きエッジが追加される
    assert mock_graph.add_conditional_edges.call_count == 5
    # テスト中はメソッドの中身まで確認せず、適切なメソッドが渡されたことだけを確認


def test_get_leaf_nodes():
    """_get_leaf_nodesメソッドのテスト"""
    # テスト用のノード辞書を作成
    # ノード構造:
    # root (node1)
    # ├── 子ノード1 (node2)
    # │   ├── 孫ノード1 (node4) - 葉
    # │   └── 孫ノード2 (node5) - 葉
    # └── 子ノード2 (node3) - 葉

    nodes = {
        "node1": WhyNode(
            id="node1",
            name="ルートノード",
            root_cause_confidence=0.9,
            level=1,
            parent_id=None,
            children_ids=["node2", "node3"],
            is_root_cause=False,
            supporting_facts="事実1"
        ),
        "node2": WhyNode(
            id="node2",
            name="子ノード1",
            root_cause_confidence=0.8,
            level=2,
            parent_id="node1",
            children_ids=["node4", "node5"],
            is_root_cause=False,
            supporting_facts="事実2"
        ),
        "node3": WhyNode(
            id="node3",
            name="子ノード2",
            root_cause_confidence=0.7,
            level=2,
            parent_id="node1",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実3"
        ),
        "node4": WhyNode(
            id="node4",
            name="孫ノード1",
            root_cause_confidence=0.6,
            level=3,
            parent_id="node2",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実4"
        ),
        "node5": WhyNode(
            id="node5",
            name="孫ノード2",
            root_cause_confidence=0.5,
            level=3,
            parent_id="node2",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実5"
        )
    }

    # メソッドの実行
    leaf_nodes = WhyWhyAgentBuilder._get_leaf_nodes(nodes)

    # 結果の検証
    assert len(leaf_nodes) == 3, "葉ノードは3つあるはずです"

    # 葉ノード(children_idsが空のノード)のIDリスト
    leaf_ids = [node.id for node in leaf_nodes]
    assert "node3" in leaf_ids, "node3は葉ノードであるべきです"
    assert "node4" in leaf_ids, "node4は葉ノードであるべきです"
    assert "node5" in leaf_ids, "node5は葉ノードであるべきです"

    # 非葉ノードが含まれていないことを確認
    assert "node1" not in leaf_ids, "node1は葉ノードではないため含まれるべきではありません"
    assert "node2" not in leaf_ids, "node2は葉ノードではないため含まれるべきではありません"


def test_map_deep_analysis():
    """map_deep_analysisメソッドのテスト"""
    from langgraph.types import Send
    builder = WhyWhyAgentBuilder()

    # テスト用のノード辞書を作成
    nodes = {
        "node1": WhyNode(
            id="node1",
            name="親ノード",
            root_cause_confidence=0.8,
            level=1,
            parent_id=None,
            children_ids=["node2"],
            is_root_cause=False,
            supporting_facts="事実1"
        ),
        "node2": WhyNode(
            id="node2",
            name="子ノード",
            root_cause_confidence=0.7,
            level=2,
            parent_id="node1",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実2"
        ),
        "node3": WhyNode(
            id="node3",
            name="別の葉ノード",
            root_cause_confidence=0.6,
            level=2,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実3"
        )
    }

    # テスト用の状態を作成
    state = {
        "problem": ProblemInput(title="テスト問題"),
        "why_nodes": nodes,
    }

    # メソッドの実行
    result = builder.map_deep_analysis(state)

    # 結果の検証
    assert len(result) == 2, "葉ノードは2つあるため、Sendオブジェクトも2つあるはずです"

    # 各Sendオブジェクトを検証
    for send in result:
        assert isinstance(send, Send), "返り値はSendオブジェクトのリストであるべきです"

        # Sendオブジェクトのnodeプロパティが"deep_analysis"であることを確認
        assert send.node == "deep_analysis", "送信先ノードは'deep_analysis'であるべきです"

        # 状態にtarget_node_idが含まれていることを確認
        assert "target_node_id" in send.arg, "引数にtarget_node_idが含まれている必要があります"

        # target_node_idが葉ノードのIDであることを確認
        assert send.arg["target_node_id"] in ["node2", "node3"], "target_node_idは葉ノードのIDであるべきです"

        # stateの内容が含まれていることを確認
        assert send.arg["problem"] == state["problem"], "元の状態の問題情報が保持されているべきです"
        assert send.arg["why_nodes"] == state["why_nodes"], "元の状態のノード情報が保持されているべきです"


#@pytest.mark.skip(reason="修正中")
@pytest.mark.integration
@pytest.mark.skipif(
    os.getenv("GOOGLE_APPLICATION_CREDENTIALS") is None,
    reason="Google Cloud credentials not configured"
)
def test_agent_invoke():
    # エージェントビルダーのインスタンス作成
    builder = WhyWhyAgentBuilder(max_level=2)

    # ビルドメソッドが実行可能なエージェントを返すか確認
    # モックを使わずに実際のエージェントオブジェクトをチェック
    agent = builder.build(checkpointer=False)

    # ビルドメソッドがエージェントを返すか確認
    assert agent is not None, "buildメソッドはエージェントを返す必要があります"
    assert isinstance(agent, CompiledStateGraph), "buildメソッドはCompiledStateGraphを返す必要があります"

    config = get_default_config()
    input = {"problem": ProblemInput(title="工場の生産性低下")}
    
    try:
        while True:
            for event in agent.stream(input, config=config):
                print(event)
            if "__interrupt__" in event:
                response = "分かりません"
                input = Command(resume={"response": response})
            else:
                break
        res = agent.get_state(config)
        assert isinstance(res.values, dict)
    except google.auth.exceptions.RefreshError:
        # 認証エラーの場合は分かりやすいメッセージで失敗
        pytest.fail(
            "\n\n" + "="*70 + "\n" +
            "Google Cloud認証エラー\n" +
            "="*70 + "\n" +
            "認証の有効期限が切れています。以下のコマンドを実行してください：\n\n" +
            "  gcloud auth application-default login\n\n" +
            "実行後、もう一度テストを実行してください。\n" +
            "="*70 + "\n"
        )


def test_set_initial_cause():
    """set_initial_causeメソッドのテスト"""
    builder = WhyWhyAgentBuilder()

    # ケース1: 直接原因が設定されている場合
    state_with_cause = {
        "problem": ProblemInput(
            title="テスト問題",
            direct_cause="直接原因",
            verification=VerificationResult(method="検証方法", result="検証結果")
        )
    }

    with patch('uuid.uuid4', return_value=MagicMock(hex='testid12345678')):
        result_with_cause = builder.set_initial_cause(state_with_cause)

    # 結果の検証
    assert "why_nodes" in result_with_cause, "返り値にwhy_nodesキーが含まれるべきです"
    assert len(result_with_cause["why_nodes"]) == 1, "1つのノードが作成されるべきです"

    # ノードの内容を検証
    node_id = list(result_with_cause["why_nodes"].keys())[0]
    assert node_id == "testid12", "UUIDが正しく使われているべきです"
    node = result_with_cause["why_nodes"][node_id]
    assert node.name == "直接原因", "ノード名は直接原因と一致するべきです"
    assert "検証方法" in node.supporting_facts, "補足情報に検証方法が含まれるべきです"
    assert "検証結果" in node.supporting_facts, "補足情報に検証結果が含まれるべきです"
    assert node.root_cause_confidence == 0.5, "初期の確信度は0.5であるべきです"
    assert node.level == 1, "レベルは1であるべきです"
    assert node.parent_id is None, "親ノードIDはNoneであるべきです"
    assert node.children_ids == [], "子ノードIDは空リストであるべきです"
    assert node.is_root_cause is False, "is_root_causeはFalseであるべきです"

    # ケース2: 直接原因が設定されていない場合
    state_without_cause = {
        "problem": ProblemInput(
            title="テスト問題"
        )
    }

    result_without_cause = builder.set_initial_cause(state_without_cause)

    # 結果の検証
    assert "why_nodes" in result_without_cause, "返り値にwhy_nodesキーが含まれるべきです"
    assert len(result_without_cause["why_nodes"]) == 0, "直接原因がない場合はノードが作成されないべきです"


def test_should_continue():
    """should_continueメソッドのテスト"""
    # 最大レベルを3に設定したビルダーを作成
    builder = WhyWhyAgentBuilder(max_level=3)

    # ケース1: why_nodesが空の場合、分析を続けるべき
    empty_state = {"why_nodes": {}}
    assert builder.should_continue(empty_state) == "continue", "why_nodesが空の場合はcontinueを返すべきです"

    # ケース2: 十分な確信度を持つノードがあれば、分析を終了するべき
    high_confidence_state = {
        "why_nodes": {
            "node1": WhyNode(
                id="node1",
                name="高確信度ノード",
                root_cause_confidence=0.95,
                level=2,
                parent_id=None,
                children_ids=[],
                is_root_cause=True,
                supporting_facts="事実1"
            )
        }
    }
    assert builder.should_continue(high_confidence_state) == END, "確信度が0.9以上のノードがある場合はENDを返すべきです"

    # ケース3: 足りていない確信度で、かつ、有効な葉ノードがあれば分析を続けるべき
    low_confidence_state = {
        "why_nodes": {
            "node1": WhyNode(
                id="node1",
                name="ルートノード",
                root_cause_confidence=0.7,
                level=1,
                parent_id=None,
                children_ids=["node2"],
                is_root_cause=False,
                supporting_facts="事実1"
            ),
            "node2": WhyNode(
                id="node2",
                name="葉ノード",
                root_cause_confidence=0.6,
                level=2,
                parent_id="node1",
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実2"
            )
        }
    }
    assert builder.should_continue(low_confidence_state) == "continue", "確信度が低く、有効な葉ノードがある場合はcontinueを返すべきです"

    # ケース4: 有効な葉ノードがない場合は分析を終了するべき
    # max_levelを3に設定したので、レベル4の葉ノードは無視されるべき
    deep_level_state = {
        "why_nodes": {
            "node1": WhyNode(
                id="node1",
                name="ルートノード",
                root_cause_confidence=0.7,
                level=1,
                parent_id=None,
                children_ids=["node2"],
                is_root_cause=False,
                supporting_facts="事実1"
            ),
            "node2": WhyNode(
                id="node2",
                name="中間ノード",
                root_cause_confidence=0.6,
                level=2,
                parent_id="node1",
                children_ids=["node3"],
                is_root_cause=False,
                supporting_facts="事実2"
            ),
            "node3": WhyNode(
                id="node3",
                name="中間ノード2",
                root_cause_confidence=0.5,
                level=3,
                parent_id="node2",
                children_ids=["node4"],
                is_root_cause=False,
                supporting_facts="事実3"
            ),
            "node4": WhyNode(
                id="node4",
                name="深い葉ノード",
                root_cause_confidence=0.4,
                level=4,
                parent_id="node3",
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実4"
            )
        }
    }
    assert builder.should_continue(deep_level_state) == END, "max_level以下の葉ノードがない場合はENDを返すべきです"


def test_next_action():
    """next_actionメソッドのテスト"""
    builder = WhyWhyAgentBuilder()

    # ケース1: why_nodesが空の場合、initial_analysisを返すべき
    empty_state = {"why_nodes": {}}
    assert builder.next_action(empty_state) == "initial_analysis", "why_nodesが空の場合はinitial_analysisを返すべきです"

    # ケース2: why_nodesが存在する場合、deep_analysisを返すべき
    state_with_nodes = {
        "why_nodes": {
            "node1": WhyNode(
                id="node1",
                name="テストノード",
                root_cause_confidence=0.5,
                level=1,
                parent_id=None,
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実1"
            )
        }
    }
    assert builder.next_action(state_with_nodes) == "deep_analysis", "why_nodesが存在する場合はdeep_analysisを返すべきです"

    # ケース3: Noneを含むwhy_nodesがある場合、Noneを除外して判断するべき
    state_with_none = {
        "why_nodes": {
            "node1": None,
            "node2": WhyNode(
                id="node2",
                name="有効ノード",
                root_cause_confidence=0.5,
                level=1,
                parent_id=None,
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実2"
            )
        }
    }
    assert builder.next_action(state_with_none) == "deep_analysis", "Noneを含むwhy_nodesがあっても、有効なノードが存在すればdeep_analysisを返すべきです"


def test_map_root_cause_analysis():
    """map_root_cause_analysisメソッドのテスト"""
    from langgraph.types import Send
    builder = WhyWhyAgentBuilder()

    # ケース1: root_cause_confidenceが設定されていないノードがある場合
    state = {
        "why_nodes": {
            "node1": WhyNode(
                id="node1",
                name="評価済みノード",
                root_cause_confidence=0.7,  # すでに確信度が設定されている
                level=1,
                parent_id=None,
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実1"
            ),
            "node2": WhyNode(
                id="node2",
                name="未評価ノード1",
                root_cause_confidence=0.0,  # 確信度が0
                level=1,
                parent_id=None,
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実2"
            ),
            "node3": WhyNode(
                id="node3",
                name="未評価ノード2",
                root_cause_confidence=0.0,  # 確信度が0
                level=2,
                parent_id=None,
                children_ids=[],
                is_root_cause=False,
                supporting_facts="事実3"
            ),
            "node4": None  # Noneのノードは無視されるべき
        }
    }

    # メソッドの実行
    result = builder.map_root_cause_analysis(state)

    # 結果の検証
    assert len(result) == 2, "root_cause_confidenceが0のノードは2つあるので、Sendオブジェクトも2つあるべきです"

    # 各Sendオブジェクトを検証
    for send in result:
        assert isinstance(send, Send), "返り値はSendオブジェクトのリストであるべきです"

        # Sendオブジェクトのidがnodeプロパティが"root_cause_analysis"であることを確認
        assert send.node == "root_cause_analysis", "送信先ノードは'root_cause_analysis'であるべきです"

        # 状態にtarget_node_idが含まれていることを確認
        assert "target_node_id" in send.arg, "引数にtarget_node_idが含まれている必要があります"

        # target_node_idが評価すべきノードのIDであることを確認
        assert send.arg["target_node_id"] in ["node2", "node3"], "target_node_idはroot_cause_confidence=0のノードのIDであるべきです"

        # stateの内容が含まれていることを確認
        assert "why_nodes" in send.arg, "元の状態が保持されているべきです"
