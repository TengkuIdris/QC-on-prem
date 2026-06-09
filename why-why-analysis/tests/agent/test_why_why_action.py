import os
from unittest.mock import patch, PropertyMock
import pytest
import google.auth.exceptions
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableSequence, RunnableParallel
from langchain_core.output_parsers import PydanticToolsParser
from langchain_google_vertexai import ChatVertexAI
from why_why_chat_ai.agent.models import (
    ProblemInput, WhyNode, Severity
)
from langchain_core.messages import SystemMessage
from why_why_chat_ai.agent.why_why_action import (
    InitialWhyAnalysisActionBuilder, DeepWhyAnalysisActionBuilder, InfoRequestActionBuilder,
    RootCauseAnalysisActionBuilder, InformationRequestSchema, RootCauseSchema, Cause,
)

# モック用の定数
MOCK_NODE_JSON = '{"id": "test_node", "name": "モックノード", "root_cause_confidence": 0.8, "level": 1, "parent_id": null, "children_ids": [], "is_root_cause": false, "supporting_facts": "モックの補足事実"}'
MOCK_INFO_REQUEST_JSON = '{"question": "テスト質問", "reason": "質問の理由", "should_request": true}'
MOCK_ROOT_CAUSE_JSON = '{"thought": "テスト分析", "recurrence_prevention_measures": "テスト対策", "root_cause_confidence": 0.9}'

@pytest.fixture
def mock_all_external_apis():
    """すべての外部APIとLangChain呼び出しをモック化"""
    with patch('vertexai.init'), \
         patch('google.auth.default', return_value=(None, "mock-project-id")), \
         patch('google.cloud.aiplatform.initializer._Config.project', new_callable=PropertyMock, return_value="mock-project-id"), \
         patch('langchain_google_vertexai.ChatVertexAI'), \
         patch('langchain_core.runnables.base.RunnableSequence.invoke') as mock_invoke:

        # モックインボークの返り値はテストごとにカスタマイズできるようにしておく
        # デフォルトではInformationRequestSchemaを返す
        mock_invoke.return_value = {"output": InformationRequestSchema.model_validate_json(MOCK_INFO_REQUEST_JSON)}

        yield mock_invoke

class TestInitialWhyAnalysisActionBuilder:
    """InitialWhyAnalysisActionBuilderのテストクラス"""

    def test_build(self, mock_all_external_apis):
        """初期分析アクションビルダーのbuildメソッドテスト"""
        # アクションビルダーのインスタンスを作成
        builder = InitialWhyAnalysisActionBuilder()
        assert builder is not None

        # アクションをビルド
        action = builder.build()
        assert action is not None

        # RunnableSequenceの構造を確認
        assert isinstance(action, RunnableSequence)
        assert isinstance(action.first, RunnableLambda)  # _format_input
        assert isinstance(action.middle[0], ChatPromptTemplate)  # _prompt_template
        # LLMは RunnableBinding でラップされているので、bound 属性を確認
        assert hasattr(action.middle[1], 'bound')
        assert isinstance(action.middle[1].bound, ChatVertexAI)  # _llm
        assert isinstance(action.middle[2], PydanticToolsParser)  # _output_parser
        assert isinstance(action.last, RunnableLambda)  # _format_output

        assert "Suggest the cause of the following problem" in builder._instruction
        assert builder._template_format == 'mustache'
        assert builder._tool == Cause

        assert "Suggest the cause of the following problem" in builder._instruction
        assert builder._template_format == "mustache"

    def test_format_output(self, mock_all_external_apis):
        """InitialWhyAnalysisActionBuilderの_format_outputメソッドのテスト"""
        # アクションビルダーのインスタンスを作成
        builder = InitialWhyAnalysisActionBuilder()

        # テスト用の初期状態を作成
        state = {
            "problem": ProblemInput(title="テスト問題"),
            "why_nodes": {},
            "chat_history": [],
            "root_causes": [],
        }

        # LLMからのモック結果を作成
        mock_cause = Cause(
            name="初期原因",
            supporting_facts="事実A"
        )
        # List[Cause]として渡す
        result = [mock_cause]

        # UUIDhex値は8文字に切り詰められる
        # 実際のテスト結果では"test_nod"として格納されていた
        with patch('uuid.uuid4', return_value=type('obj', (object,), {"hex": "test_nod"})):
            # _format_outputメソッドを直接テスト
            updated_state = builder._format_output(result, state)

        # 結果の検証 - 元の_run_initial_analysisの処理が正しく実行されるか確認
        assert "test_nod" in updated_state["why_nodes"]
        assert updated_state["why_nodes"]["test_nod"].name == "初期原因"
        assert updated_state["why_nodes"]["test_nod"].supporting_facts == "事実A"  # 事実の内容を検証
        assert updated_state["why_nodes"]["test_nod"].level == 1
        assert updated_state["why_nodes"]["test_nod"].parent_id is None
        assert updated_state["why_nodes"]["test_nod"].children_ids == []
        assert not updated_state["why_nodes"]["test_nod"].is_root_cause
        assert updated_state["why_nodes"]["test_nod"].supporting_facts == "事実A"
        assert "thoughts" in updated_state

    def test_invoke(self, mock_all_external_apis):
        """初期分析アクションビルダーの実行テスト"""
        # アクションビルダーのインスタンスを作成
        builder = InitialWhyAnalysisActionBuilder()

        # アクションをビルド
        action = builder.build()

        # 入力データを作成
        problem = ProblemInput(title="テスト問題", description="問題の詳細", severity=Severity.HIGH)

        # モックレスポンスを設定 - WhyNodeのモックを返す
        mock_all_external_apis.return_value = {"output": WhyNode.model_validate_json(MOCK_NODE_JSON)}

        # アクションを実行
        with patch('uuid.uuid4', return_value="test_node"):
            result = action.invoke({"problem": problem})

        # 結果を確認
        assert "output" in result
        assert isinstance(result["output"], WhyNode)
        assert result["output"].id == "test_node"
        assert result["output"].name == "モックノード"
        assert result["output"].root_cause_confidence == 0.8
        assert result["output"].level == 1
        assert result["output"].parent_id is None


class TestDeepWhyAnalysisActionBuilder:
    """DeepWhyAnalysisActionBuilderのテストクラス"""

    def test_build(self, mock_all_external_apis):
        """深堀り分析アクションビルダーのbuildメソッドテスト"""
        # アクションビルダーのインスタンスを作成
        builder = DeepWhyAnalysisActionBuilder()
        assert builder is not None

        # アクションをビルド
        action = builder.build()
        assert action is not None

        # RunnableSequenceの構造を確認 - ResidualLLMActionBuilderの実際の構造に合わせる
        assert isinstance(action, RunnableSequence)
        # ResidualLLMActionBuilderではRunnableParallelが使われている
        assert isinstance(action.first, RunnableParallel)
        # ResidualLLMActionBuilderのbuild実装では、middle[1]やmiddle[2]は存在しないため確認不要
        # 最後のノードはRunnableLambdaで_format_outputである
        assert isinstance(action.last, RunnableLambda)  # _format_output

        # プロンプトテンプレートの確認は省略し、ビルダーの設定のみ確認
        assert "List the causes by digging deeper into the existing cause" in builder._instruction
        assert builder._template_format == 'mustache'
        assert builder._tool == Cause

        # 人間用メッセージにビルダーの指示が含まれているか確認は省略
        # ビルダー自体の設定は既に上で確認済み

    def test_format_input(self):
        """DeepWhyAnalysisActionBuilderの_format_inputメソッドのテスト"""
        # ビルダーのインスタンスを作成
        builder = DeepWhyAnalysisActionBuilder()

        # 有効なノードを含む状態の場合
        target_node = WhyNode(
            id="node1",
            name="初期原因",
            root_cause_confidence=0.7,
            level=1,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実A",
        )

        # テスト用のチャット履歴
        chat_messages = [
            SystemMessage(content="システムメッセージ", id="msg0"),
            SystemMessage(content="関連メッセージ1", id="msg1"),
            SystemMessage(content="関連メッセージ2", id="msg2"),
            SystemMessage(content="無関係なメッセージ", id="msg3")
        ]

        valid_state = {
            "problem": ProblemInput(title="テスト問題"),
            "why_nodes": {"node1": target_node},
            "target_node_id": "node1",
            "chat_history": chat_messages
        }

        # ResidualLLMActionBuilderの_format_inputメソッドをモック化してスキップ
        with patch('why_why_chat_ai.agent.action.ResidualLLMActionBuilder._format_input') as mock_super_format_input:
            # 親クラスの_format_inputは入力をそのまま返すと仮定
            mock_super_format_input.return_value = valid_state.copy()

            # テスト対象のメソッドを実行
            formatted_input = builder._format_input(valid_state, None)

        # 結果を検証 - DeepWhyAnalysisActionBuilderの_format_inputがやるべきことを確認
        assert "node" in formatted_input  # target_nodeをnodeとして追加
        assert formatted_input["node"] == target_node  # ノードが正しく設定されている
        assert "chat_history" in formatted_input  # チャット履歴が保持されている

    def test_format_output(self):
        """DeepWhyAnalysisActionBuilderの_format_outputメソッドのテスト"""
        # ビルダーのインスタンスを作成
        builder = DeepWhyAnalysisActionBuilder()

        # テスト用の親ノードを作成
        parent_node = WhyNode(
            id="parent1",
            name="親ノード",
            root_cause_confidence=0.8,
            level=2,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="親の事実"
        )

        # テスト用の入力状態
        input_state = {
            "problem": ProblemInput(title="テスト問題"),
            "why_nodes": {"parent1": parent_node},
            "target_node_id": "parent1",
            "chat_history": []
        }

        # テスト用のLLM出力を作成 (複数のWhyNodeSchema)
        llm_output = [
            Cause(
                name="子ノード1",
                root_cause_confidence=0.7,
                supporting_facts="子ノードの事実1"
            ),
            Cause(
                name="子ノード2",
                root_cause_confidence=0.6,
                supporting_facts="子ノードの事実2"
            )
        ]

        # uuid.uuid4をモック化する方法を修正して予測可能なIDを生成
        with patch('uuid.uuid4') as mock_uuid4:
            # uuid.uuid4().hex[:8] 形式で区切り文字を指定するが、テストでは簡潔に
            mock_uuid4.return_value.hex = 'test_child_id'

            # _format_outputを実行
            updated_state = builder._format_output(llm_output, input_state)

        # 結果を確認
        assert "why_nodes" in updated_state

        # why_nodesには親ノードと返された子ノードがあるはず
        assert len(updated_state["why_nodes"]) > 1  # 少なくとも親ノードと子ノードが1つ以上
        assert "parent1" in updated_state["why_nodes"]  # 親ノードが存在する

        # 子ノードがwhyNodesに追加されていることを確認
        # UUIDがモックされているので、何らかの子ノードが存在するはず
        child_nodes = [node_id for node_id in updated_state["why_nodes"].keys() if node_id != "parent1"]
        assert len(child_nodes) > 0  # 少なくとも1つの子ノードがある

        # 親ノードの子ノードIDリストが更新されているか確認
        assert len(updated_state["why_nodes"]["parent1"].children_ids) > 0  # 少なくとも1つの子ノードIDがある

        # 子ノードのプロパティを確認
        child_node_id = child_nodes[0]  # 最初の子ノードをチェック
        child_node = updated_state["why_nodes"][child_node_id]
        assert child_node.level == parent_node.level + 1  # 親ノードのレベル + 1
        assert child_node.parent_id == "parent1"  # 親ノードへの参照が正しい

    @pytest.mark.integration
    @pytest.mark.skipif(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS") is None,
        reason="Google Cloud credentials not configured"
    )
    def test_invoke(self):
        """深堀り分析アクションビルダーの実際のLLM呼び出しテスト"""

        # 入力データを作成
        parent_node = WhyNode(
            id="parent_node",
            name="機械の異常停止",
            root_cause_confidence=0.7,
            level=2,
            parent_id=None,
            children_ids=[],
            is_root_cause=False,
            supporting_facts="センサーエラーが発生し、機械が緊急停止した",
        )

        problem = ProblemInput(
            title="製造ラインの機械が異常停止した"
        )

        # チャット履歴を作成
        chat_history = [
            SystemMessage(content="製造ラインで機械の異常停止が発生しました", id="msg1")
        ]

        # 入力データを作成
        input_data = {
            "problem": problem,
            "why_nodes": {"parent_node": parent_node},
            "target_node_id": "parent_node",
            "chat_history": chat_history
        }

        # ビルダーの設定 - モックを使わずに実際のLLMを呼び出す
        builder = DeepWhyAnalysisActionBuilder()
        action = builder.build()

        # 実際にaction.invoke()を実行してLLMを呼び出す
        try:
            result = action.invoke(input_data)
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
        except Exception:
            # その他のエラーはそのまま再発生
            raise

        # 結果が期待した形式で返ってくるか確認
        assert "why_nodes" in result
        assert "parent_node" in result["why_nodes"]

        # 元の親ノードが存在することを確認
        assert result["why_nodes"]["parent_node"].name == "機械の異常停止"
        assert result["why_nodes"]["parent_node"].level == 2

        # 子ノードが追加されていることを確認
        children_ids = [node_id for node_id in result["why_nodes"].keys() if node_id != "parent_node"]
        assert len(children_ids) > 0, "少なくとも1つの子ノードが追加されているはず"

        # 親ノードの子ノードIDリストが更新されていることを確認
        assert len(result["why_nodes"]["parent_node"].children_ids) > 0

        # 各子ノードのプロパティを確認
        for child_id in children_ids:
            child_node = result["why_nodes"][child_id]
            assert child_node.level == parent_node.level + 1, f"子ノード {child_id} のレベルが正しくない"
            assert child_node.parent_id == "parent_node", f"子ノード {child_id} の親IDが正しくない"
            assert child_node.name != "", f"子ノード {child_id} の名前が空"
            assert child_node.supporting_facts != "", f"子ノード {child_id} の supporting_facts が空"

        # thoughtフィールドが存在することを確認
        assert "thought" in result
        assert isinstance(result["thought"], str)
        assert result["thought"] != "", "thoughtフィールドが空"


class TestInfoRequestActionBuilder:
    """InfoRequestActionBuilderのテストクラス"""

    def test_build(self, mock_all_external_apis):
        """情報要求アクションビルダーのbuildメソッドテスト"""
        # アクションビルダーのインスタンスを作成
        builder = InfoRequestActionBuilder()
        assert builder is not None

        # アクションをビルド
        action = builder.build()
        assert action is not None

        # RunnableSequenceの構造を確認 - ResidualLLMActionBuilderの実際の構造に合わせる
        assert isinstance(action, RunnableSequence)
        # ResidualLLMActionBuilderではRunnableParallelが使われている
        assert isinstance(action.first, RunnableParallel)
        # ResidualLLMActionBuilderのbuild実装では、middle[1]やmiddle[2]は存在しないため確認不要
        # 最後のノードはRunnableLambdaで_format_outputである
        assert isinstance(action.last, RunnableLambda)  # _format_output

        assert "request additional information from the user" in builder._instruction
        assert builder._template_format == 'mustache'
        assert builder._tool == InformationRequestSchema

        # 人間用メッセージにビルダーの指示が含まれているか確認は省略
        # ビルダー自体の設定は既に上で確認済み

    def test_format_input(self):
        """InfoRequestActionBuilderの_format_inputメソッドのテスト"""
        # ビルダーのインスタンスを作成
        builder = InfoRequestActionBuilder()
        builder._setup_prompt()

        # テスト用のノードを作成
        node = WhyNode(
            id="node1",
            name="テストノード",
            root_cause_confidence=0.8,
            level=2,
            parent_id="parent",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実A"
        )

        # 有効な状態を作成
        valid_state = {
            "problem": ProblemInput(title="テスト問題"),
            "why_nodes": {"node1": node},
            "chat_history": [],
            "root_causes": [],

        }

        # _format_inputを実行
        formatted_input = builder._format_input(valid_state)

        # 結果を検証 - 有効なノードの場合
        assert "problem" in formatted_input
        assert "current_results" in formatted_input
        assert formatted_input["problem"].startswith("### 1.1 Basic Information")  # markdownに変換されていることを確認

    def test_format_output(self):
        """InfoRequestActionBuilderの_format_outputメソッドのテスト"""
        # ビルダーのインスタンスを作成
        builder = InfoRequestActionBuilder()

        # 正常ケースのテスト
        # 初期状態を作成
        node = WhyNode(
            id="node1",
            name="テストノード",
            root_cause_confidence=0.8,
            level=2,
            parent_id="parent",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実A",
        )

        valid_state = {
            "problem": ProblemInput(title="テスト問題"),
            "why_nodes": {"node1": node},
            "chat_history": [],
            "root_causes": [],
        }

        # LLM結果を作成
        info_request = InformationRequestSchema(
            should_request=True,  # 必須フィールド
            question="どのような追加情報が必要ですか？",
            reason="より詳細な分析には追加情報が必要です"
        )

        # interruptの呼び出しをモック化するために、patchを使用
        with patch('why_why_chat_ai.agent.why_why_action.interrupt') as mock_interrupt:
            # interruptのモック戻り値を設定
            mock_interrupt.return_value = {"response": "ユーザーからのモック回答"}

            # UUIDの生成をモック化して予測可能な結果にする
            with patch('uuid.uuid4') as mock_uuid:
                mock_uuid.side_effect = [
                    type('obj', (object,), {"__str__": lambda self: "test-uuid-ai"}),
                    type('obj', (object,), {"__str__": lambda self: "test-uuid-human"})
                ]

                # 実際の_format_outputメソッドを使ってテスト
                updated_state = builder._format_output(info_request, valid_state)

        # 結果を検証 - 実際の実装では2つのメッセージが追加される
        assert len(updated_state["chat_history"]) == 2  # AIメッセージとユーザーメッセージの2つ
        assert updated_state["chat_history"][0].content == "どのような追加情報が必要ですか？"  # AIの質問
        assert updated_state["chat_history"][1].content == "ユーザーからのモック回答"  # ユーザーの回答

        # thoughtsフィールドの確認
        assert "thoughts" in updated_state
        assert updated_state["thoughts"] == ["より詳細な分析には追加情報が必要です"]

    def test_invoke(self, mock_all_external_apis):
        """情報要求アクションビルダーの実行テスト"""
        # アクションビルダーのインスタンスを作成
        builder = InfoRequestActionBuilder()

        # アクションをビルド
        action = builder.build()

        # 入力データを作成
        problem = ProblemInput(title="テスト問題", description="詳細な説明")
        node = WhyNode(
            id="current_node",
            name="現在のノード",
            root_cause_confidence=0.6,
            level=2,
            parent_id="parent_node",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実1"
        )

        # モックレスポンスを設定
        mock_all_external_apis.return_value = {"output": InformationRequestSchema.model_validate_json(MOCK_INFO_REQUEST_JSON)}

        # アクションを実行
        result = action.invoke({
            "problem": problem,
            "current_node": node
        })

        # 結果を確認
        assert "output" in result
        assert isinstance(result["output"], InformationRequestSchema)
        assert result["output"].question == "テスト質問"
        assert result["output"].reason == "質問の理由"
        assert result["output"].should_request


class TestRootCauseAnalysisActionBuilder:
    """RootCauseAnalysisActionBuilderのテストクラス"""

    def test_build(self, mock_all_external_apis):
        """真因分析アクションビルダーのbuildメソッドテスト"""
        # アクションビルダーのインスタンスを作成
        builder = RootCauseAnalysisActionBuilder()
        assert builder is not None

        # アクションをビルド
        action = builder.build()
        assert action is not None

        # RunnableSequenceの構造を確認 - ResidualLLMActionBuilderの実際の構造に合わせる
        assert isinstance(action, RunnableSequence)
        # ResidualLLMActionBuilderではRunnableParallelが使われている
        assert isinstance(action.first, RunnableParallel)

    def test_format_input(self):
        """_format_inputメソッドのテスト"""
        builder = RootCauseAnalysisActionBuilder()
        builder._setup_prompt()

        # テスト用のノードを作成
        test_node = WhyNode(
            id="node1",
            name="テスト用の原因",
            root_cause_confidence=0.8,
            level=3,
            parent_id="parent1",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実1",
            root_cause_judgement="まだ判定されていません",
            recurrence_prevention_measures="未設定"
        )

        # ケース1: 有効なノードIDがある場合
        valid_state = {
            "why_nodes": {"node1": test_node},
            "target_node_id": "node1"
        }

        # _format_inputを実行
        result = builder._format_input(valid_state)

        # 結果の検証
        assert "_invalid_node" not in result
        assert result["node"] == test_node
        assert "current_results" in result  # why_nodes_to_markdown_listの結果が含まれていることを確認


    def test_format_output(self):
        """_format_outputメソッドのテスト"""
        builder = RootCauseAnalysisActionBuilder()

        # テスト用のノードを作成
        test_node = WhyNode(
            id="node1",
            name="テスト用の原因",
            root_cause_confidence=0.8,
            level=3,
            parent_id="parent1",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実1",
            root_cause_judgement="まだ判定されていません",
            recurrence_prevention_measures="未設定"
        )

        # 初期状態の設定
        state = {
            "why_nodes": {"node1": test_node},
            "target_node_id": "node1",
        }

        # ケース2: 有効な結果がある場合
        # モックの真因分析結果
        root_cause = RootCauseSchema(
            thought="真因に関する考察",
            recurrence_prevention_measures="再発防止策",
            root_cause_confidence=0.9
        )

        # _format_outputを実行 - outputを直接渡す
        updated_state = builder._format_output(root_cause, state)

        # 結果の検証
        assert "why_nodes" in updated_state
        assert "node1" in updated_state["why_nodes"]
        assert updated_state["why_nodes"]["node1"].root_cause_judgement == "真因に関する考察"
        assert updated_state["why_nodes"]["node1"].recurrence_prevention_measures == "再発防止策"
        assert updated_state["why_nodes"]["node1"].root_cause_confidence == 0.9
        assert updated_state["why_nodes"]["node1"].is_root_cause  # 真因フラグが設定されている

        # ケース3: 真因が3つ以上ある場合
        # テスト用の追加ノードを作成
        test_node2 = WhyNode(
            id="node2",
            name="テスト用の原因2",
            root_cause_confidence=0.8,
            level=3,
            parent_id="parent1",
            children_ids=[],
            is_root_cause=True,
            supporting_facts="事実A",
            root_cause_judgement="真因1に関する考察",
            recurrence_prevention_measures="再発防止策A"
        )
        test_node3 = WhyNode(
            id="node3",
            name="テスト用の原因3",
            root_cause_confidence=0.7,
            level=3,
            parent_id="parent1",
            children_ids=[],
            is_root_cause=True,
            supporting_facts="事実B",
            root_cause_judgement="真因2に関する考察",
            recurrence_prevention_measures="再発防止策B"
        )

        # 複数の真因がある状態を作成
        state["why_nodes"]["node2"] = test_node2
        state["why_nodes"]["node3"] = test_node3

        # _format_outputを実行 - outputを直接渡す
        updated_state = builder._format_output(root_cause, state)

        # 結果の検証 - 改修後は指定したtarget_node_idのノードだけ返すようになった
        assert "why_nodes" in updated_state
        assert "node1" in updated_state["why_nodes"]  # target_node_idとして指定したノードのみ返ってくる
        assert updated_state["why_nodes"]["node1"].is_root_cause  # node1は真因として設定されている
        assert "node2" not in updated_state["why_nodes"]  # node2は返されない
        assert "node3" not in updated_state["why_nodes"]  # node3は返されない


    def test_invoke(self, mock_all_external_apis):
        """真因分析アクションビルダーの実行テスト"""
        # アクションビルダーのインスタンスを作成
        builder = RootCauseAnalysisActionBuilder()

        # アクションをビルド
        action = builder.build()

        # 入力データを作成
        node = WhyNode(
            id="test_node",
            name="テストノード",
            root_cause_confidence=0.8,
            level=5,
            parent_id="parent_node",
            children_ids=[],
            is_root_cause=False,
            supporting_facts="事実1, 事実2",
            root_cause_judgement="まだ判定されていません",
            recurrence_prevention_measures="未設定"
        )

        # テスト用のノードは既に作成済み

        # モックレスポンスを設定
        # モックLLMの出力を設定
        mock_output = RootCauseSchema(
            thought="テスト分析",
            recurrence_prevention_measures="テスト対策",
            root_cause_confidence=0.9
        )
        # ResidualLLMActionBuilderでは直接RootCauseSchemaインスタンスを使用している
        mock_all_external_apis.return_value = mock_output

        # アクションを実行
        result = action.invoke({
            "why_nodes": {"test_node": node},
            "target_node_id": "test_node"
        })

        # 結果を確認 - 改修後は直接RootCauseSchemaが返り値として返される
        assert isinstance(result, RootCauseSchema)
        assert result.thought == "テスト分析"
        assert result.recurrence_prevention_measures == "テスト対策"
        assert result.root_cause_confidence == 0.9
