import os
import logging
from typing import Dict, Optional, Any, Literal, Type, List
from pydantic import BaseModel
from langchain_core.runnables import RunnableLambda, RunnableConfig, RunnableSequence, RunnablePassthrough, RunnableParallel
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import BaseOutputParser, StrOutputParser, PydanticToolsParser

logger = logging.getLogger(__name__)

# NOTE: Vertex AI と langchain_google_vertexai は遅延 import する。
# LLM_PROVIDER=local の場合 google-cloud-aiplatform スタックを実行時に
# 必要としないようにするため。Vertex 固有のシンボルは _vertex_symbols() 経由で取得する。

_vertexai_initialized = False


def _get_llm_provider() -> str:
    """LLM プロバイダ名を返す。'vertex'（既定）または 'local'。"""
    return os.getenv("LLM_PROVIDER", "vertex").lower()


def _vertex_symbols():
    """langchain_google_vertexai のシンボルを遅延 import で取得する。"""
    from langchain_google_vertexai import ChatVertexAI, HarmBlockThreshold, HarmCategory
    return ChatVertexAI, HarmBlockThreshold, HarmCategory


def _default_safety_settings():
    """Vertex 用のセーフティ設定を生成する（Vertex 経路でのみ呼ばれる）。"""
    _, HarmBlockThreshold, HarmCategory = _vertex_symbols()
    return {
        HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    }


def init_vertexai(force=False):
    """Vertex AIを初期化する（遅延初期化）"""
    global _vertexai_initialized

    # すでに初期化済みで強制再初期化でない場合はスキップ
    if _vertexai_initialized and not force:
        return

    import vertexai

    project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GOOGLE_CLOUD_REGION") or os.getenv("GCP_LOCATION")

    # デバッグ用ログ
    logger.debug(f"init_vertexai - project: {project}, location: {location}")

    if project:
        vertexai.init(project=project, location=location)
        _vertexai_initialized = True
    else:
        # プロジェクトIDが設定されていない場合、デフォルトの認証情報から取得を試みる
        try:
            import google.auth
            _, project_id = google.auth.default()
            if project_id:
                vertexai.init(project=project_id, location=location)
                _vertexai_initialized = True
        except Exception as e:
            logger.warning(f"Failed to initialize vertexai: {e}")
            pass  # 初期化に失敗した場合は、後でChatVertexAI作成時にエラーになる

USER = "user"
SYSTEM = "system"
NAME = "name"
ENDPOINT = "endpoint"
DEFAULT_MODEL_NAME = "gemini-2.5-flash"

# 後方互換のため名前は残す。Vertex 経路でのみ参照される（遅延生成）。
DEFUALT_SAFETY_SETTINGS = None


class LLMActionBuilder:
    """
    LangGraph のエージェントから実行されることを前提とした LLM によって1つの行動を実行する LCEL chain を構築するクラス。
    """

    # LLM のモデル名
    _model_name: str = DEFAULT_MODEL_NAME
    # モデルのサンプリング温度
    _temperature: float = 1.0
    # セーフティ設定。Vertex 経路でのみ使用。None の場合 _setup_vertex_llm で遅延生成する。
    _safety_settings: Optional[Dict] = None

    # エージェントのプロフィール。システムプロンプトとして設定される。
    _profile: str = ""
    # アクションの指示。サブクラスで定義する必要がある
    _instruction: str = ""
    # プロンプトのテンプレートエンジンのフォーマット
    _template_format: Literal["f-string", "mustache"] = "f-string"

    # プロンプトテンプレートに嵌めるべき変数名リスト。これらの変数は入力に含める必要がある。
    _input_variables: List[str]
    # 実際に入力する変数名とプロンプトテンプレートに嵌めるべき変数名のマッピング。キープロンプトテンプレートに嵌めるべき変数名、値が実際の入力変数名。
    # 例えば、プロンプトテンプレートには {input} と記述してあるが、実際の入力の対応する値は `actual` である場合などに使用する。
    _input_mapping: Dict[str, str] = {}
    # 出力の辞書の属性名。LLM の出力をそのまま出す場合にこの属性名で出す。それ以外の場合は _format_output() で設定する。
    _output_variable: str = "output"

    # 出力パーサー
    _output_parser: BaseOutputParser = StrOutputParser()

    def with_profile(self, profile: str) -> "LLMActionBuilder":
        """エージェントのプロフィールを設定する"""
        self._profile = profile
        return self

    def with_model(self, model_name: str) -> "LLMActionBuilder":
        """LLM のモデル名を設定する"""
        self._model_name = model_name
        return self

    def with_temperature(self, temperature: float) -> "LLMActionBuilder":
        """モデルのサンプリング温度を設定する"""
        self._temperature = temperature
        return self

    def with_input_mapping(self, mapping: Dict[str, str]) -> "LLMActionBuilder":
        """
        実際に入力する変数名とプロンプトテンプレートに嵌めるべき変数名のマッピングを設定する。
        キープロンプトテンプレートに嵌めるべき変数名、値が実際の入力変数名。
        """
        self._input_mapping = mapping
        return self

    def with_output_variable(self, variable: str) -> "LLMActionBuilder":
        self._output_variable = variable
        return self

    def with_output_parser(self, parser: BaseOutputParser) -> "LLMActionBuilder":
        self._output_parser = parser
        return self

    def _format_input(self, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """
        input をプロンプトテンプレートに嵌まるようにフォーマットする。
        ここでは最小限の実装をしており、inputからのテンプレート含まれる変数抽出のみ行っている。必要がれば、Override する。

        Parameters
        ----------
        input : Dict[str, Any]

        Returns
        -------
        Dict[str, str]
        """
        # マッピングを考慮して入力変数を取得
        _input = {}
        for template_var in self._input_variables:
            # マッピングがある場合はそれを使用、ない場合は変数名をそのまま使用
            input_var = self._input_mapping.get(template_var, template_var)
            _input[template_var] = input.get(input_var, None if self._template_format == "mustache" else "")
        return _input

    def _format_output(self, output: Any, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """
        self._invoke (内部の LCEL chain) の出力をフォーマットしてエージェントの出力方式に合わせる。
        エージェントでは状態の属性とそこに格納する値をペアにした辞書型を返すことを想定している。
        ここでは最小限の実装をしており、出力変数が1つの場合のみ対応している。必要があれば Override する。

        Parameters
        ----------
        output : Any
            self._invoke の出力
        input : Dict[str, Any]
            self.invke() への入力

        Returns
        -------
        Dict[str, Any]
        """
        return {self._output_variable: output}

    def _setup_prompt(self):
        """プロンプトを設定"""
        messages = []
        if self._profile:
            messages.append(SystemMessagePromptTemplate.from_template(self._profile, template_format=self._template_format))
        messages.append(HumanMessagePromptTemplate.from_template(self._instruction, template_format=self._template_format))
        self._prompt_template = ChatPromptTemplate.from_messages(messages)
        self._input_variables = self._prompt_template.input_variables

    def _setup_llm(self, **kwargs):
        """
        LLM を設定する。LLM_PROVIDER 環境変数に応じて Vertex AI / ローカル LLM を切り替える。
        - vertex (既定) : 従来どおり ChatVertexAI を使用する。
        - local         : OpenAI 互換エンドポイント (vLLM / Ollama 等) を ChatOpenAI で呼ぶ。
        """
        provider = _get_llm_provider()
        if provider == "local":
            self._setup_local_llm(**kwargs)
        else:
            self._setup_vertex_llm(**kwargs)

    def _setup_vertex_llm(self, **kwargs):
        """Vertex AI 経由で LLM を設定する（従来実装）。"""
        # Vertex AIが初期化されていることを確認
        init_vertexai()

        ChatVertexAI, _, _ = _vertex_symbols()

        # プロジェクトIDを明示的に設定
        project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID")
        if project:
            kwargs["project"] = project

        # リージョンを明示的に設定
        location = os.getenv("GOOGLE_CLOUD_REGION") or os.getenv("GCP_LOCATION")
        if location:
            kwargs["location"] = location

        if kwargs.get("safety_settings", None):
            # 遅延生成: HarmCategory を import できるのは Vertex 経路のみ
            if self._safety_settings is None:
                self._safety_settings = _default_safety_settings()
            kwargs["safety_settings"] = self._safety_settings
        self._llm = ChatVertexAI(
            model=self._model_name,
            temperature=self._temperature,
            **kwargs,
        )

    def _setup_local_llm(self, **kwargs):
        """OpenAI 互換エンドポイント (vLLM / Ollama 等) 経由でローカル LLM を設定する。"""
        from langchain_openai import ChatOpenAI

        # Vertex 固有の kwargs はローカル経路では無効なので捨てる
        for k in ("project", "location", "safety_settings"):
            kwargs.pop(k, None)

        base_url = os.getenv("LLM_BASE_URL", "http://llm:8000/v1")
        # LLM_MODEL が未設定なら with_model() で設定された値を使う
        model = os.getenv("LLM_MODEL") or self._model_name
        api_key = os.getenv("LLM_API_KEY", "not-needed")  # vLLM/Ollama は無視する

        self._llm = ChatOpenAI(
            base_url=base_url,
            api_key=api_key,
            model=model,
            temperature=self._temperature,
            timeout=float(os.getenv("LLM_TIMEOUT", "120")),
            max_retries=int(os.getenv("LLM_MAX_RETRIES", "2")),
            **kwargs,
        )

    def _bind_tools(self, tools: List[Type[BaseModel]], tool_choice, use_tool_calls):
        """
        プロバイダ差を吸収して bind_tools を呼ぶ。
        ChatVertexAI は use_tool_calls 引数を受け付けるが、ChatOpenAI は受け付けないため
        ローカル経路では use_tool_calls を渡さない。
        """
        if _get_llm_provider() == "local":
            return self._llm.bind_tools(tools, tool_choice=tool_choice)
        return self._llm.bind_tools(tools, tool_choice=tool_choice, use_tool_calls=use_tool_calls)

    def build(self, **kwargs) -> RunnableSequence:
        """
        アクションを表現する RunnableSequence を構築して返す

        Returns
        -------
        RunnableSequence
        """
        self._setup_prompt()
        self._setup_llm(**kwargs)
        return (
            RunnableLambda(self._format_input)
            | self._prompt_template
            | self._llm
            | self._output_parser
            | RunnableLambda(self._format_output)
        )


class ResidualLLMActionBuilder(LLMActionBuilder):
    """
    LangGraph のエージェントから実行されることを前提とした LLM によって1つの行動を実行する LCEL chain を構築するクラス。
    アクションの出力をフォーマットする _format_output() にアクションへの入力も必要とする場合、このクラスを使用する。
    クラス名は、LCEL chain の構造が Residual Neural Network に似ていることから。
    """

    def build(self, **kwargs) -> RunnableSequence:
        """
        アクションを表現する RunnableSequence を構築して返す

        Returns
        -------
        RunnableSequence
        """
        self._setup_prompt()
        self._setup_llm(**kwargs)
        process_output = (
            RunnableLambda(self._format_input)
            | self._prompt_template
            | self._llm
            | self._output_parser
        )
        return (
            RunnableParallel(output=process_output, input=RunnablePassthrough())
            | RunnableLambda(lambda x, config: self._format_output(**x, config=config))
        )

    def _format_output(self, output: Any, input: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:  # type: ignore[override]
        """
        self._invoke (内部の LCEL chain) の出力をフォーマットしてエージェントの出力方式に合わせる。
        出力をフォーマットするのにアクションへの入力も使用する。

        Parameters
        ----------
        output : Any
            self._invoke の出力
        input : Dict[str, Any]
            self.invke() への入力

        Returns
        -------
        Dict[str, Any]
        """
        return {self._output_variable: output}


class SingleToolLLMActionBuilder(LLMActionBuilder):
    """
    LangGraph のエージェントから実行されることを前提とした LLM によって1つの行動を実行する LCEL chain を構築するクラス。
    LLM は割り当てられた 1つのツールを使用し Pydandtic.BaseModel で出力する。
    """

    _tool: Type[BaseModel] = None

    def with_tool(self, tool: Type[BaseModel]) -> "SingleToolLLMActionBuilder":
        self._tool = tool
        return self

    def _setup_llm(self, **kwargs):
        assert self._tool is not None, "tool is not set"
        super()._setup_llm(**kwargs)
        # tool_choice にツール名を渡して強制的にツールを使わせる
        self._llm = self._bind_tools([self._tool], tool_choice=self._tool.__name__, use_tool_calls=True)
        self._output_parser = PydanticToolsParser(tools=[self._tool], first_tool_only=True)


class MultipleSameToolLLMActionBuilder(SingleToolLLMActionBuilder):
    """
    LangGraph のエージェントから実行されることを前提とした LLM によって複数のツールを使用する LCEL chain を構築するクラス。
    LLM は割り当てられたツールを複数回使用し Pydandtic.BaseModel のリストで出力する。
    プロンプトで呼び出し回数を指定するなどして複数回呼び出すことを指示する必要がある。
    """

    # bind_tools() の引数。ツールを使うかどうかのフラグ。True なら必ず使う、"auto" なら LLM が判断する
    _use_tool_calls: Literal["auto", True, False] = True

    def _setup_llm(self, **kwargs):
        assert self._tool is not None, "tool is not set"
        # SingleToolLLMActionBuilder._setup_llm をスキップして LLMActionBuilder._setup_llm を呼ぶ
        LLMActionBuilder._setup_llm(self, **kwargs)
        self._llm = self._bind_tools([self._tool], tool_choice=True, use_tool_calls=self._use_tool_calls)
        self._output_parser = PydanticToolsParser(tools=[self._tool])
