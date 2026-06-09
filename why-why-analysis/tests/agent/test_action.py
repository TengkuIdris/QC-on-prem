import os
import pytest
from unittest.mock import MagicMock
from pydantic import BaseModel
import google.auth.exceptions
from langchain_core.runnables import (
    RunnableSequence, RunnableLambda, RunnableParallel, RunnablePassthrough, RunnableBinding
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticToolsParser, JsonOutputParser
from langchain_core.messages import AIMessage, ToolCall
from langchain.prompts import SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_google_vertexai import ChatVertexAI
from why_why_chat_ai.agent.action import (
    LLMActionBuilder, ResidualLLMActionBuilder, SingleToolLLMActionBuilder, MultipleSameToolLLMActionBuilder
)


class TestLLMActionBuilder:

    def test__format_input(self):
        # _format_input メソッドが正しく入力をフォーマットするかをテスト
        input_data = {
            "actual_var": "test_input",
            "input_var": "wrong_input",
            "unused_var": "should_not_be_used"
        }

        builder = LLMActionBuilder()
        builder._input_variables = ["template_var"]
        builder._input_mapping = {"template_var": "actual_var"}

        formatted_input = builder._format_input(input_data)

        assert formatted_input == {"template_var": "test_input"}

    def test__format_input_without_mapping(self):
        # マッピングがない場合のテスト
        input_data = {"input_var": "test_input", "unused_var": "should_not_be_used"}

        builder = LLMActionBuilder()
        builder._input_variables = ["input_var"]

        formatted_input = builder._format_input(input_data)

        assert formatted_input == {"input_var": "test_input"}

    def test__format_input_with_mustache(self):
        # Mustacheテンプレートを使用する場合のテスト
        input_data = {"actual_var": "test_input"}

        builder = LLMActionBuilder()
        builder._template_format = "mustache"
        builder._input_variables = ["template_var"]
        builder._input_mapping = {"template_var": "actual_var"}

        formatted_input = builder._format_input(input_data)

        assert formatted_input == {"template_var": "test_input"}

    def test__format_input_with_missing_value(self):
        # 値が見つからない場合のテスト（Mustacheとf-string）
        builder = LLMActionBuilder()
        builder._input_variables = ["missing_var"]

        # f-string の場合
        formatted_input = builder._format_input({})
        assert formatted_input == {"missing_var": ""}

        # Mustache の場合
        builder._template_format = "mustache"
        formatted_input = builder._format_input({})
        assert formatted_input == {"missing_var": None}

    def test_with_input_mapping(self):
        # with_input_mapping メソッドのテスト
        builder = LLMActionBuilder()
        mapping = {"template_var": "actual_var"}

        builder = builder.with_input_mapping(mapping)

        assert builder._input_mapping == mapping

    def test__format_output(self):
        # _format_output メソッドが正しく出力をフォーマットするかをテスト
        output_data = "test_output"

        builder = LLMActionBuilder()

        formatted_output = builder._format_output(output_data)

        assert formatted_output == {"output": "test_output"}

    def test_with_profile(self):
        # with_profile メソッドが正しくプロフィールを設定するかをテスト
        builder = LLMActionBuilder()
        profile = "test_profile"

        builder = builder.with_profile(profile)

        assert builder._profile == profile

    def test_with_model(self):
        # with_model メソッドが正しくモデル名を設定するかをテスト
        builder = LLMActionBuilder()
        model_name = "test-model"

        builder = builder.with_model(model_name)

        assert builder._model_name == model_name

    def test_with_temperature(self):
        # with_temperature メソッドが正しく温度を設定するかをテスト
        builder = LLMActionBuilder()
        temperature = 0.8

        builder = builder.with_temperature(temperature)

        assert builder._temperature == temperature

    def test_with_output_variable(self):
        # with_output_variable メソッドが正しく出力変数名を設定するかをテスト
        builder = LLMActionBuilder()
        variable = "test_var"

        builder = builder.with_output_variable(variable)

        assert builder._output_variable == variable

    def test_with_output_parser(self):
        # with_output_parser メソッドが正しく出力パーサーを設定するかをテスト
        builder = LLMActionBuilder()
        parser = JsonOutputParser()

        builder = builder.with_output_parser(parser)

        assert builder._output_parser == parser

    def test__setup_prompt(self):
        # _setup_prompt メソッドが正しくプロンプトを設定するかをテスト
        builder = LLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"

        builder._setup_prompt()

        assert isinstance(builder._prompt_template, ChatPromptTemplate)
        assert len(builder._prompt_template.messages) == 2
        assert isinstance(builder._prompt_template.messages[0], SystemMessagePromptTemplate)
        assert isinstance(builder._prompt_template.messages[1], HumanMessagePromptTemplate)

    def test__setup_llm(self):
        # _setup_llm メソッドが正しくLLMを設定するかをテスト
        builder = LLMActionBuilder()
        builder._model_name = "test-model"
        builder._temperature = 0.5

        builder._setup_llm()

        assert isinstance(builder._llm, ChatVertexAI)
        assert builder._llm.model_name == "test-model"
        assert builder._llm.temperature == 0.5

    def test_build(self):
        # build メソッドが正しく RunnableSequence を構築するかをテスト
        builder = LLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder._model_name = "test-model"
        builder._temperature = 0.5
        builder._output_variable = "test_output"

        action = builder.build()

        # RunnableSequence が正しい構成になっているか確認
        assert isinstance(action, RunnableSequence)
        assert isinstance(action.first, RunnableLambda)  # _format_input
        assert isinstance(action.middle[0], ChatPromptTemplate)  # _prompt_template
        assert isinstance(action.middle[1], ChatVertexAI)  # _llm
        assert isinstance(action.middle[2], StrOutputParser)  # _output_parser
        assert isinstance(action.last, RunnableLambda)  # _format_output

        # builder の属性が各要素に反映されているか確認
        prompt = action.middle[0]
        assert prompt.messages[0].prompt.template == "test_profile"
        assert prompt.messages[1].prompt.template == "test_instruction"

        llm = action.middle[1]
        assert llm.model_name == "test-model"
        assert llm.temperature == 0.5


class TestResidualLLMActionBuilder:
    def test_build(self):
        # build メソッドが正しく RunnableSequence を構築するかをテスト
        builder = ResidualLLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder._model_name = "test-model"
        builder._temperature = 0.5
        builder._output_variable = "test_output"

        action = builder.build()

        # RunnableSequence が正しい構成になっているか確認
        assert isinstance(action, RunnableSequence)
        assert isinstance(action.first, RunnableParallel)
        assert isinstance(action.first.steps__["output"], RunnableSequence)
        assert isinstance(action.first.steps__["input"], RunnablePassthrough)
        assert isinstance(action.last, RunnableLambda)

        # process_output の構成を確認
        process_output = action.first.steps__["output"]
        assert isinstance(process_output.first, RunnableLambda)  # _format_input
        assert isinstance(process_output.middle[0], ChatPromptTemplate)  # _prompt_template
        assert isinstance(process_output.middle[1], ChatVertexAI)  # _llm
        assert isinstance(process_output.last, StrOutputParser)  # _output_parser

        # builder の属性が各要素に反映されているか確認
        prompt = process_output.middle[0]
        assert prompt.messages[0].prompt.template == "test_profile"
        assert prompt.messages[1].prompt.template == "test_instruction"

        llm = process_output.middle[1]
        assert llm.model_name == "test-model"
        assert llm.temperature == 0.5

    def test__format_output(self):
        # _format_output メソッドが正しく動作するかをテスト
        builder = ResidualLLMActionBuilder()
        builder._output_variable = "test_output"

        output = "test output"
        input_data = {"input": "test input"}
        result = builder._format_output(output=output, input=input_data)

        assert isinstance(result, dict)
        assert result["test_output"] == "test output"

    def test_invoke_with_mock(self):
        # モックを使用して invoke の動作をテスト
        builder = ResidualLLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder._output_variable = "test_output"

        action = builder.build()

        # LLM をモック化
        action.first.steps__["output"].middle[1] = MagicMock()
        action.first.steps__["output"].middle[1].invoke.return_value = AIMessage(content="test output")

        input_data = {"input": "test"}
        result = action.invoke(input_data)

        assert result["test_output"] == "test output"
        action.first.steps__["output"].middle[1].invoke.assert_called_once()


class TestSingleToolLLMActionBuilder:

    def test_with_tool(self):
        # テスト用の Pydantic モデルを定義
        class MockToolSchema(BaseModel):
            output: str

        # with_tool メソッドのテスト
        builder = SingleToolLLMActionBuilder()
        result = builder.with_tool(MockToolSchema)

        assert result == builder
        assert builder._tool == MockToolSchema

    def test_setup_llm_without_tool(self):
        # ツールを設定せずに setup_llm を呼び出した場合の例外テスト
        builder = SingleToolLLMActionBuilder()

        with pytest.raises(AssertionError, match="tool is not set"):
            builder._setup_llm()

    def test_build(self):
        # テスト用の Pydantic モデルを定義
        class MockToolSchema(BaseModel):
            output: str

        # ビルダーの設定とビルド
        builder = SingleToolLLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder.with_tool(MockToolSchema)
        action = builder.build()

        # RunnableSequence が正しい構成になっているか確認
        assert isinstance(action, RunnableSequence)
        assert isinstance(action.first, RunnableLambda)  # _format_input
        assert isinstance(action.middle[0], ChatPromptTemplate)  # _prompt_template
        assert isinstance(action.middle[1], RunnableBinding)  # _llm
        assert isinstance(action.middle[1].bound, ChatVertexAI)  # 実際のLLM
        assert isinstance(action.middle[2], PydanticToolsParser)  # _output_parser
        assert isinstance(action.last, RunnableLambda)  # _format_output

        # プロンプトテンプレートの構成を確認
        prompt = action.middle[0]
        assert len(prompt.messages) == 2
        assert isinstance(prompt.messages[0], SystemMessagePromptTemplate)
        assert isinstance(prompt.messages[1], HumanMessagePromptTemplate)
        assert prompt.messages[0].prompt.template == "test_profile"
        assert prompt.messages[1].prompt.template == "test_instruction"

        # LLM の設定を確認
        llm = action.middle[1].bound
        assert llm.model_name == "gemini-2.5-flash"
        # RunnableBinding の設定を確認
        binding = action.middle[1]
        assert binding.kwargs.get("tools")[0]["function"]["name"] == "MockToolSchema"
        assert binding.kwargs.get("tool_choice") == "MockToolSchema"

        # 出力パーサーの設定を確認
        parser = action.middle[2]
        assert parser.tools == [MockToolSchema]
        assert parser.first_tool_only

    def test_invoke_with_mock(self):
        # テスト用の Pydantic モデルを定義
        class MockToolSchema(BaseModel):
            output: str

        # ビルダーの設定とビルド
        builder = SingleToolLLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder.with_tool(MockToolSchema)
        action = builder.build()

        # LLM をモック化
        from unittest.mock import MagicMock
        from langchain_core.messages import AIMessage
        action.middle[1].bound = MagicMock()
        action.middle[1].bound.invoke.return_value = AIMessage(
            content="", tool_calls=[ToolCall(name="MockToolSchema",args={"output":"test output"}, id="123")])

        # 実行とアサーション
        input_data = {"input": "test"}
        result = action.invoke(input_data)

        assert result["output"].output == "test output"
        action.middle[1].bound.invoke.assert_called_once()



class TestMultipleSameToolLLMActionBuilder:
    class MockToolSchema(BaseModel):
        output: str

    def test_build(self):
        # ビルダーの設定とビルド
        builder = MultipleSameToolLLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder.with_tool(self.MockToolSchema)
        action = builder.build()

        # プロンプトテンプレートの構成を確認
        prompt = action.middle[0]
        assert len(prompt.messages) == 2
        assert isinstance(prompt.messages[0], SystemMessagePromptTemplate)
        assert isinstance(prompt.messages[1], HumanMessagePromptTemplate)
        assert prompt.messages[0].prompt.template == "test_profile"
        assert prompt.messages[1].prompt.template == "test_instruction"

        # LLM の設定を確認
        llm = action.middle[1].bound
        assert llm.model_name == "gemini-2.5-flash"
        # RunnableBinding の設定を確認
        binding = action.middle[1]
        assert binding.kwargs.get("tools")[0]["function"]["name"] == "MockToolSchema"
        assert binding.kwargs.get("tool_choice")

        # 出力パーサーの設定を確認
        parser = action.middle[2]
        assert parser.tools == [self.MockToolSchema]
        assert not parser.first_tool_only

    def test_invoke_with_mock(self):
        # ビルダーの設定とビルド
        builder = MultipleSameToolLLMActionBuilder()
        builder._profile = "test_profile"
        builder._instruction = "test_instruction"
        builder.with_tool(self.MockToolSchema)
        action = builder.build()

        # LLM をモック化
        from unittest.mock import MagicMock
        from langchain_core.messages import AIMessage
        action.middle[1].bound = MagicMock()
        action.middle[1].bound.invoke.return_value = AIMessage(
            content="",
            tool_calls=[
                ToolCall(name="MockToolSchema", args={"output":"test output 1"}, id="123"),
                ToolCall(name="MockToolSchema", args={"output":"test output 2"}, id="456")
            ]
        )

        # 実行とアサーション
        input_data = {"input": "test"}
        result = action.invoke(input_data)

        assert len(result["output"]) == 2
        assert result["output"][0].output == "test output 1"
        assert result["output"][1].output == "test output 2"
        action.middle[1].bound.invoke.assert_called_once()

    @pytest.mark.integration
    @pytest.mark.skipif(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS") is None,
        reason="Google Cloud credentials not configured"
    )
    def test_invoke_with_real_llm(self):
        class Value(BaseModel):
            name: str
            value: int

        # ビルダーの設定とビルド
        builder = (
            MultipleSameToolLLMActionBuilder()
            .with_profile("ユーザー入力から名前と値のペアを抽出してください。")
            .with_tool(Value)
        )
        builder._instruction = "{input}"

        action = builder.build()

        # 実行とアサーション
        input_data = {"input": "apple 100 yen, orange 150 yen"}

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

        assert len(result["output"]) == 2
        assert isinstance(result["output"][0], Value)
        assert isinstance(result["output"][1], Value)
        assert result["output"][0].name == "apple"
        assert result["output"][0].value == 100
        assert result["output"][1].name == "orange"
        assert result["output"][1].value == 150
