#import pytest
from unittest.mock import patch
import uuid
from why_why_chat_ai.agent.utils import (
    get_default_config, THREAD_ID, why_nodes_to_markdown_list, why_nodes_to_mermaid
)
from why_why_chat_ai.agent.models import WhyNode


def test_get_default_config():
    # UUIDをモック
    mock_uuid = "12345678123456781234567812345678"  # 有効な16進数のUUID文字列に修正

    with patch('why_why_chat_ai.agent.utils.uuid.uuid4') as mock_uuid4:
        mock_uuid4.return_value = uuid.UUID(mock_uuid)

        # デフォルトの設定をテスト
        config = get_default_config()

        assert config["configurable"][THREAD_ID] == mock_uuid
        assert "recursion_limit" in config

        # 追加の設定をテスト
        additional_config = {"test_key": "test_value"}
        config_additional = get_default_config(additional_configurables=additional_config)

        assert config_additional["configurable"][THREAD_ID] == mock_uuid
        assert config_additional["configurable"]["test_key"] == "test_value"


def test_why_nodes_to_markdown_list():
    """WhyNodeの木構造からMarkdownリストを生成する関数のテスト"""
    # テスト用のWhyNodeデータを作成
    why_nodes = {
        # ルートノード
        "root1": WhyNode(
            id="root1",
            name="ルート原因1",
            root_cause_confidence=0.8,
            level=1,
            parent_id=None,
            children_ids=["child1", "child2"],
            is_root_cause=False,
            supporting_facts="事実1"
        ),
        # 子ノード1
        "child1": WhyNode(
            id="child1",
            name="子原因1",
            root_cause_confidence=0.6,
            level=2,
            parent_id="root1",
            children_ids=["grandchild1"],
            is_root_cause=False,
            supporting_facts="事実2"
        ),
        # 子ノード2
        "child2": WhyNode(
            id="child2",
            name="子原因2",
            root_cause_confidence=0.7,
            level=2,
            parent_id="root1",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実3"
        ),
        # 孫ノード
        "grandchild1": WhyNode(
            id="grandchild1",
            name="孫原因1",
            root_cause_confidence=0.9,
            level=3,
            parent_id="child1",
            children_ids=[],
            is_root_cause=True,
            supporting_facts="事実4"
        ),
        # 別のルートノード
        "root2": WhyNode(
            id="root2",
            name="ルート原因2",
            root_cause_confidence=0.4,
            level=1,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実5"
        )
    }

    # テスト1: 全体の木構造をMarkdownリストとして取得（説明文なし）
    result = why_nodes_to_markdown_list(why_nodes, add_description=False)
    expected = "- ルート原因1 [80%]\n  - 子原因1 [60%]\n    - 孫原因1 [90%]\n  - 子原因2 [70%]\n- ルート原因2 [40%]\n"
    assert result == expected

    # テスト2: 特定のルートノードを指定した場合（説明文なし）
    result = why_nodes_to_markdown_list(why_nodes, "root1", add_description=False)
    expected = "- ルート原因1 [80%]\n  - 子原因1 [60%]\n    - 孫原因1 [90%]\n  - 子原因2 [70%]\n"
    assert result == expected

    # テスト3: 子ノードを指定した場合（説明文なし）
    result = why_nodes_to_markdown_list(why_nodes, "child1", add_description=False)
    expected = "- 子原因1 [60%]\n  - 孫原因1 [90%]\n"
    assert result == expected

    # テスト4: 存在しないIDを指定した場合は空文字列を返す
    result = why_nodes_to_markdown_list(why_nodes, "non_existent", add_description=False)
    assert result == ""

    # テスト5: 空の辞書を渡した場合
    result = why_nodes_to_markdown_list({}, add_description=False)
    assert result == ""

    # テスト6: ルートノードをソートする場合（name属性でソート）（説明文なし）
    result = why_nodes_to_markdown_list(why_nodes, sort_roots=True, add_description=False)
    expected = "- ルート原因1 [80%]\n  - 子原因1 [60%]\n    - 孫原因1 [90%]\n  - 子原因2 [70%]\n- ルート原因2 [40%]\n"  # ルート原因1, ルート原因2 の順序（アルファベット順）
    assert result == expected

    # テスト7: ルートノードをroot_cause_confidenceでソートする場合（説明文なし）
    result = why_nodes_to_markdown_list(why_nodes, sort_roots=True, sort_key='root_cause_confidence', add_description=False)
    # ルート原因2 (0.4) が先、ルート原因1 (0.8) が後
    expected = "- ルート原因2 [40%]\n- ルート原因1 [80%]\n  - 子原因1 [60%]\n    - 孫原因1 [90%]\n  - 子原因2 [70%]\n"
    assert result == expected


def test_why_nodes_to_mermaid_empty():
    """空のWhyNodesを渡した場合のテスト"""
    # 空の辞書を渡す
    result = why_nodes_to_mermaid({})
    assert result == ""


def test_why_nodes_to_mermaid_single_node():
    """単一のノードを渡した場合のテスト"""
    # 単一のノードを作成
    node_id = uuid.uuid4().hex
    node = WhyNode(
        id=node_id,
        name="テストノード",
        root_cause_confidence=0.8,
        level=1,
        parent_id=None,
        children_ids=[],
        is_root_cause=False,
        supporting_facts=""
    )
    why_nodes = {node_id: node}

    result = why_nodes_to_mermaid(why_nodes)
    assert "テストノード" in result
    assert "flowchart TD" in result
    # レベル1は原因なので、確信度が表示される
    assert "確信度" in result
    assert "80%" in result


def test_why_nodes_to_mermaid_parent_child():
    """親子関係のあるノードを渡した場合のテスト"""
    # 親ノードを作成
    parent_id = uuid.uuid4().hex
    parent_node = WhyNode(
        id=parent_id,
        name="親ノード",
        root_cause_confidence=0.7,
        level=1,
        parent_id=None,
        children_ids=[],
        is_root_cause=False,
        supporting_facts=""
    )

    # 子ノードを作成
    child_id = uuid.uuid4().hex
    child_node = WhyNode(
        id=child_id,
        name="子ノード",
        root_cause_confidence=0.9,
        level=2,
        parent_id=parent_id,
        children_ids=[],
        is_root_cause=True,
        supporting_facts=""
    )

    # 親ノードの子ノードリストを更新
    parent_node.children_ids.append(child_id)

    why_nodes = {parent_id: parent_node, child_id: child_node}

    result = why_nodes_to_mermaid(why_nodes)
    assert "親ノード" in result
    assert "子ノード" in result
    assert "90%" in result  # 確信度90%
    assert "L1N0 --> L2N0" in result  # 接続関係


def test_why_nodes_to_mermaid_complex_tree():
    """複雑なツリー構造のテスト"""
    nodes = {}

    # レベル1のルートノード
    root_id = uuid.uuid4().hex
    root = WhyNode(
        id=root_id,
        name="問題",
        root_cause_confidence=0.5,
        level=1,
        parent_id=None,
        children_ids=[],
        is_root_cause=False,
        supporting_facts=""
    )
    nodes[root_id] = root

    # レベル2のノード（2つ）
    for i in range(2):
        node_id = uuid.uuid4().hex
        node = WhyNode(
            id=node_id,
            name=f"原因{i+1}",
            root_cause_confidence=0.6 + i*0.1,
            level=2,
            parent_id=root_id,
            children_ids=[],
            is_root_cause=False,
            supporting_facts=""
        )
        nodes[node_id] = node
        root.children_ids.append(node_id)

        # 各レベル2ノードの子（レベル3）を追加
        child_id = uuid.uuid4().hex
        child = WhyNode(
            id=child_id,
            name=f"詳細{i+1}",
            root_cause_confidence=0.8,
            level=3,
            parent_id=node_id,
            children_ids=[],
            is_root_cause=(i == 1),  # 2つ目の詳細を真因とする
            supporting_facts=""
        )
        nodes[child_id] = child
        node.children_ids.append(child_id)

    result = why_nodes_to_mermaid(nodes)

    # 基本的な検証
    assert "問題" in result
    assert "原因1" in result
    assert "原因2" in result
    assert "詳細1" in result
    assert "詳細2" in result
    assert "80%" in result  # 確信度

    # 真因のスタイル確認（詳細2は真因）
    assert "fill:#50C878" in result


def test_why_nodes_to_mermaid_forest():
    """複数の独立した木（森）を表現するテスト"""
    nodes = {}

    # 2つの独立したルートノードを作成
    root_ids = []
    for root_idx in range(2):
        root_id = uuid.uuid4().hex
        root = WhyNode(
            id=root_id,
            name=f"問題{root_idx+1}",
            root_cause_confidence=0.5,
            level=1,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts=""
        )
        nodes[root_id] = root
        root_ids.append(root_id)

        # 各ルートノードに子ノードを追加
        child_id = uuid.uuid4().hex
        child = WhyNode(
            id=child_id,
            name=f"原因{root_idx+1}",
            root_cause_confidence=0.7,
            level=2,
            parent_id=root_id,
            children_ids=[],
            is_root_cause=(root_idx == 0),  # 1つ目の木の子ノードを真因とする
            supporting_facts=""
        )
        nodes[child_id] = child
        root.children_ids.append(child_id)

    result = why_nodes_to_mermaid(nodes)

    # 両方のルートが存在することを確認
    assert "問題1" in result
    assert "問題2" in result
    assert "原因1" in result
    assert "原因2" in result

    # 親子関係をチェック
    # レベル1の問題1と問題2がそれぞれレベル2の原因1と原因2に接続される
    assert "L1N0 --> L2N0" in result
    assert "L1N1 --> L2N1" in result

    # 真因のスタイル確認（原因1は真因）
    assert "fill:#50C878" in result


def test_why_nodes_to_mermaid_with_level_zero():
    """レベル0のノードを含む木構造のテスト"""
    nodes = {}

    # レベル0のノードを作成
    level_zero_id = uuid.uuid4().hex
    level_zero = WhyNode(
        id=level_zero_id,
        name="カテゴリ",
        root_cause_confidence=0.0,
        level=0,
        parent_id=None,
        children_ids=[],
        is_root_cause=False,
        supporting_facts=""
    )
    nodes[level_zero_id] = level_zero

    # レベル1のノード（レベル0の子）
    level_one_id = uuid.uuid4().hex
    level_one = WhyNode(
        id=level_one_id,
        name="問題",
        root_cause_confidence=0.5,
        level=1,
        parent_id=level_zero_id,
        children_ids=[],
        is_root_cause=False,
        supporting_facts=""
    )
    nodes[level_one_id] = level_one
    level_zero.children_ids.append(level_one_id)

    # レベル2のノード（レベル1の子）
    level_two_id = uuid.uuid4().hex
    level_two = WhyNode(
        id=level_two_id,
        name="原因",
        root_cause_confidence=0.8,
        level=2,
        parent_id=level_one_id,
        children_ids=[],
        is_root_cause=True,
        supporting_facts=""
    )
    nodes[level_two_id] = level_two
    level_one.children_ids.append(level_two_id)

    result = why_nodes_to_mermaid(nodes)

    # 各ノードが存在することを確認
    assert "カテゴリ" in result
    assert "問題" in result
    assert "原因" in result

    # レベル0のノードには確信度が表示されないことを確認
    # レベル0は問題なので確信度表示なし
    assert "L0N0[\"カテゴリ\"" in result
    assert "L0N0[\"カテゴリ<br>確信度" not in result

    # レベル1のノードには確信度が表示される
    assert "問題<br>確信度: 50%" in result

    # レベル2のノードには確信度が表示される
    assert "原因<br>確信度: 80%" in result

    # 接続関係を確認
    assert "L0N0 --> L1N0" in result  # レベル0からレベル1への接続
    assert "L1N0 --> L2N0" in result  # レベル1からレベル2への接続

    # 真因のスタイル確認（レベル2のノードが真因）
    assert "fill:#50C878" in result
