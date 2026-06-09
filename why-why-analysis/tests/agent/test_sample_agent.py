import pytest
from unittest.mock import MagicMock
from langchain_core.messages import AIMessage
from langchain_core.prompts import SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableSequence
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph.state import CompiledStateGraph, START, END, StateGraph
from langchain_google_vertexai import ChatVertexAI
from why_why_chat_ai.agent.utils import get_default_config
from why_why_chat_ai.agent.sample_agent import CauseAndEffectDiagramProposalActionBuilder, PROFILE, BaselineAgentBuilder


class TestCauseAndEffectDiagramProposalActionBuilder:

    @pytest.fixture
    def builder(self):
        return CauseAndEffectDiagramProposalActionBuilder()

    def test_build(self, builder: CauseAndEffectDiagramProposalActionBuilder):
        # build メソッドが正しく RunnableSequence を構築するかをテスト
        action = builder.build()

        # RunnableSequence が正しい構成になっているか確認
        assert isinstance(action, RunnableSequence)
        assert isinstance(action.first, RunnableLambda)  # _format_input
        assert isinstance(action.middle[0], ChatPromptTemplate)  # _prompt_template
        assert isinstance(action.middle[1], ChatVertexAI)  # _llm
        assert isinstance(action.middle[2], JsonOutputParser)  # _output_parser
        assert isinstance(action.last, RunnableLambda)  # _format_output

        # プロンプトテンプレートの構成を確認
        prompt = action.middle[0]
        assert len(prompt.messages) == 2
        assert isinstance(prompt.messages[0], SystemMessagePromptTemplate)
        assert isinstance(prompt.messages[1], HumanMessagePromptTemplate)
        assert prompt.messages[0].prompt.template == PROFILE
        assert prompt.messages[1].prompt.template == "{{input}}"

    @pytest.mark.integration
    def test_action_invoke_with_mock_llm(self, builder: CauseAndEffectDiagramProposalActionBuilder):
        # LLM をモック化して実際の動作をテスト
        action = builder.build()

        llm = MagicMock()
        llm.invoke.return_value = AIMessage(content='{"diagram_id": "CED_001", "problem": "test problem", "main_categories": [], "category_source": "AI生成 (4M)"}')
        action.middle[1] = llm

        input_data = {"input": "test problem"}
        result = action.invoke(input_data)

        assert result == {"output": {
            "diagram_id": "CED_001",
            "problem": "test problem",
            "main_categories": [],
            "category_source": "AI生成 (4M)"
        }}
        llm.invoke.assert_called_once()



class TestBaselineAgentBuilder:
    @pytest.fixture
    def builder(self):
        return BaselineAgentBuilder()

    def test_init(self, builder: BaselineAgentBuilder):
        # 初期化時に正しくアクションが設定されているか確認
        assert isinstance(builder._propose_cause_and_effect_diagram, RunnableSequence)

    def test_set_up_graph(self, builder: BaselineAgentBuilder):
        # テストデータ
        graph = StateGraph(state_schema=BaselineAgentBuilder.State)

        # 実行
        builder._set_up_graph(graph)

        # 検証
        assert "propose" in graph.nodes

        # エッジの検証
        edges = graph.edges
        assert (START, "propose") in edges
        assert ("propose", END) in edges

    def test_build(self, builder: BaselineAgentBuilder):
        # 実行
        agent = builder.build()
        # 検証
        assert isinstance(agent, CompiledStateGraph)

    @pytest.mark.integration
    def test_agent_invoke(self, builder: BaselineAgentBuilder):
        # モックを使用して実際の動作をテスト

        # LLMをモック化
        llm = MagicMock()
        llm.invoke.return_value = AIMessage(content='{"diagram_id": "CED_001", "problem": "test problem", "main_categories": [], "category_source": "AI生成 (4M)"}')
        builder._propose_cause_and_effect_diagram.middle[1] = llm
        # エージェントを構築
        agent = builder.build()
        # 実行
        result = agent.invoke({"input": "test problem"}, config=get_default_config())
        # 検証
        assert result["output"] == {
            "diagram_id": "CED_001",
            "problem": "test problem",
            "main_categories": [],
            "category_source": "AI生成 (4M)"
        }
        llm.invoke.assert_called_once()
