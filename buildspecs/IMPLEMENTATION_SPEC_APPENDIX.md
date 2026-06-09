# why-why-analysis — Local LLM + RAG Implementation Spec

Target repo: `jatcoltd/why-why-analysis` (Python backend, `why_why_chat_ai` package).
Goal: run fully on-prem with (1) a locally-hosted LLM instead of Vertex/Gemini, and
(2) a RAG step that retrieves past cases + manuals into the why-why agent.

This spec is **Phase 1: backend only**. RAG results are used internally by the agent
and are **not** surfaced in the UI yet. Phase 2 (UI panel) hooks are noted at the end.

Decisions locked:
- LLM wired in via an **OpenAI-compatible HTTP endpoint** (`ChatOpenAI`). The model
  server runs locally — vLLM for the GPU deployment, Ollama fine for dev. Same code.
- Provider is **switchable** via `LLM_PROVIDER` env var (`vertex` | `local`).
- Vertex path is left intact as the fallback.

---

## Touch points (7)

1. `why_why_chat_ai/agent/action.py` — rewrite `_setup_llm()`, gate on `LLM_PROVIDER`
2. `why_why_chat_ai/agent/config.py` — add LLM + vector store settings
3. `why_why_chat_ai/agent/retrieval.py` — NEW: vector store client + retrieval
4. `why_why_chat_ai/agent/why_why_agent.py` — add `retrieve_context` node + state key
5. `why_why_chat_ai/agent/why_why_action.py` — add `{{retrieved_context}}` to prompts
6. `scripts/ingest.py` — NEW: chunk + embed past cases / manuals into vector store
7. `docker-compose.yml`, `pyproject.toml`, `.env.example` — services + deps + config

---

## 1. `agent/action.py` — the LLM swap

This is the ONLY place `ChatVertexAI` is constructed. All builder subclasses call
`super()._setup_llm()`, so this one method covers the whole agent.

### 1a. Imports — make Vertex imports lazy

`ChatVertexAI`, `HarmCategory`, `HarmBlockThreshold`, `vertexai` should only be
imported when actually needed, so a pure-local deployment doesn't require the
`google-cloud-aiplatform` stack at runtime. Move them inside `init_vertexai()` and
the Vertex branch of `_setup_llm()`.

The module-level safety-settings dict (`DEFUALT_SAFETY_SETTINGS`) references
`HarmCategory` — wrap its construction in a function called only on the Vertex path,
or guard the import.

### 1b. New `_setup_llm()`

Replace the body of `_setup_llm()` with a provider branch:

```python
def _setup_llm(self, **kwargs):
    """LLM を設定。LLM_PROVIDER に応じて Vertex / ローカル を切り替える。"""
    provider = os.getenv("LLM_PROVIDER", "vertex").lower()

    if provider == "local":
        self._setup_local_llm(**kwargs)
    else:
        self._setup_vertex_llm(**kwargs)

def _setup_local_llm(self, **kwargs):
    """OpenAI 互換エンドポイント (vLLM / Ollama) 経由のローカル LLM。"""
    from langchain_openai import ChatOpenAI

    base_url = os.getenv("LLM_BASE_URL", "http://llm:8000/v1")
    model = os.getenv("LLM_MODEL", self._model_name)
    api_key = os.getenv("LLM_API_KEY", "not-needed")  # vLLM/Ollama ignore it

    # Vertex 固有の kwargs を捨てる（project/location/safety_settings は無効）
    for k in ("project", "location", "safety_settings"):
        kwargs.pop(k, None)

    self._llm = ChatOpenAI(
        base_url=base_url,
        api_key=api_key,
        model=model,
        temperature=self._temperature,
        timeout=float(os.getenv("LLM_TIMEOUT", "120")),
        max_retries=int(os.getenv("LLM_MAX_RETRIES", "2")),
        **kwargs,
    )

def _setup_vertex_llm(self, **kwargs):
    """既存の Vertex AI 経路（変更なし）。"""
    init_vertexai()
    project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID")
    if project:
        kwargs["project"] = project
    location = os.getenv("GOOGLE_CLOUD_REGION") or os.getenv("GCP_LOCATION")
    if location:
        kwargs["location"] = location
    if kwargs.get("safety_settings", None):
        kwargs["safety_settings"] = self._safety_settings
    from langchain_google_vertexai import ChatVertexAI
    self._llm = ChatVertexAI(
        model=self._model_name,
        temperature=self._temperature,
        **kwargs,
    )
```

### 1c. Tool calling — THE RISK AREA

`SingleToolLLMActionBuilder`, `MultipleSameToolLLMActionBuilder`, and
`ToolUsingLLMActionBuilder` all call `self._llm.bind_tools(...)` in their own
`_setup_llm()` overrides. `bind_tools` works on `ChatOpenAI` too, so the override
code does not change.

BUT: behaviour differs by model.
- `InitialWhyAnalysisActionBuilder` / `DeepWhyAnalysisActionBuilder`: `_tool = Cause`
  (2 fields), `_use_tool_calls = "auto"` — low risk.
- `RootCauseAnalysisActionBuilder`: `_tool = RootCauseSchema` (3 fields incl. a
  float `root_cause_confidence`), via `SingleToolLLMActionBuilder` which forces
  `tool_choice=RootCauseSchema.__name__`. **This is the highest-risk node.**

Validation checklist after the swap:
- Pick a model with solid tool/function-calling support. `qwen2.5:32b-instruct`
  is the safe default on a GPU server; `qwen2.5:14b-instruct` if VRAM-limited.
- Test `root_cause_analysis` end to end. Confirm the model returns a valid
  `RootCauseSchema` (float parsed correctly, all 3 fields populated).
- If a model ignores forced `tool_choice`, fall back to structured output via
  `with_structured_output(RootCauseSchema)` instead of `bind_tools` — keep this
  as a known plan B.
- Keep `LLM_PROVIDER=vertex` available so you can A/B: if a node misbehaves,
  switch back and confirm whether it's the model or the code.

---

## 2. `agent/config.py` — settings

Add to `AgentSettings`:

```python
# LLM provider
llm_provider: str = Field(default="vertex", alias="LLM_PROVIDER")
llm_base_url: Optional[str] = Field(default=None, alias="LLM_BASE_URL")
llm_model: Optional[str] = Field(default=None, alias="LLM_MODEL")
llm_api_key: Optional[str] = Field(default=None, alias="LLM_API_KEY")
llm_timeout: int = Field(default=120, alias="LLM_TIMEOUT")

# Embeddings + vector store (RAG)
embedding_base_url: Optional[str] = Field(default=None, alias="EMBEDDING_BASE_URL")
embedding_model: str = Field(default="nomic-embed-text", alias="EMBEDDING_MODEL")
vector_store_url: Optional[str] = Field(default=None, alias="VECTOR_STORE_URL")
rag_enabled: bool = Field(default=False, alias="RAG_ENABLED")
rag_top_k_cases: int = Field(default=3, alias="RAG_TOP_K_CASES")
rag_top_k_manuals: int = Field(default=2, alias="RAG_TOP_K_MANUALS")
```

`action.py` reads env directly today; that's fine to keep, or route through
`settings` for consistency. `RAG_ENABLED` lets you ship the node disabled and
turn it on once ingestion has run.

---

## 3. `agent/retrieval.py` — NEW

Responsibilities: embed a query, search the vector store, return structured hits.

Recommended stack: **Qdrant** (clean Docker image, payload filtering) for the
vector store; embeddings via the same OpenAI-compatible endpoint (vLLM and Ollama
both serve an `/v1/embeddings` route — e.g. `nomic-embed-text` on Ollama).

```python
"""RAG: 過去事例・マニュアルの検索"""
import os
from dataclasses import dataclass
from typing import List, Literal
from qdrant_client import QdrantClient
from langchain_openai import OpenAIEmbeddings

COLLECTION = "whywhy_knowledge"

@dataclass
class RetrievedChunk:
    text: str
    source_type: Literal["case", "manual"]
    source_id: str
    score: float

def _embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        base_url=os.getenv("EMBEDDING_BASE_URL", os.getenv("LLM_BASE_URL")),
        api_key=os.getenv("LLM_API_KEY", "not-needed"),
        model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
    )

def _client() -> QdrantClient:
    return QdrantClient(url=os.getenv("VECTOR_STORE_URL", "http://vectordb:6333"))

def retrieve(query: str, top_k_cases: int = 3, top_k_manuals: int = 2) -> List[RetrievedChunk]:
    """事例とマニュアルを別々に top-k 取得して結合する。"""
    vec = _embeddings().embed_query(query)
    client = _client()
    out: List[RetrievedChunk] = []
    for source_type, k in (("case", top_k_cases), ("manual", top_k_manuals)):
        hits = client.search(
            collection_name=COLLECTION,
            query_vector=vec,
            limit=k,
            query_filter={"must": [{"key": "source_type", "match": {"value": source_type}}]},
        )
        for h in hits:
            out.append(RetrievedChunk(
                text=h.payload["text"],
                source_type=source_type,
                source_id=h.payload.get("source_id", ""),
                score=h.score,
            ))
    return out

def format_for_prompt(chunks: List[RetrievedChunk]) -> str:
    """プロンプト埋め込み用の文字列に整形。"""
    if not chunks:
        return "（参考情報なし）"
    lines = []
    for c in chunks:
        label = "過去事例" if c.source_type == "case" else "マニュアル"
        lines.append(f"[{label}] {c.text}")
    return "\n\n".join(lines)
```

Note: retrieving cases and manuals with separate top-k (not a blind top-5)
prevents one source type from crowding out the other. The decision to index both
is yours from earlier.

---

## 4. `agent/why_why_agent.py` — graph wiring

### 4a. Add a state key

In `WhyWhyAgentBuilder.State` (TypedDict), add:

```python
retrieved_context: Optional[List[dict]]   # RetrievedChunk を dict 化して保持
```

Store it as structured dicts, NOT a flattened string — this is the Phase 2 hook
(so a future SSE event can emit it without re-doing retrieval).

### 4b. Add the node + edge

In `_set_up_graph`, register the node and splice it between `set_initial_cause`
and `joint`:

```python
graph.add_node("retrieve_context", self.retrieve_context)
# old: graph.add_edge("set_initial_cause", "joint")
graph.add_edge("set_initial_cause", "retrieve_context")
graph.add_edge("retrieve_context", "joint")
```

### 4c. The node method

```python
def retrieve_context(self, state: State, config: Optional[RunnableConfig] = None) -> dict:
    """問題文から過去事例・マニュアルを検索し state に格納する。"""
    if os.getenv("RAG_ENABLED", "false").lower() != "true":
        return {"retrieved_context": []}

    from .retrieval import retrieve

    problem_data = state.get("problem", {})
    problem = ProblemInput(**problem_data) if isinstance(problem_data, dict) else problem_data
    # 検索クエリ: タイトル + 説明 + 5M1E をまとめる
    query = problem.to_markdown(base_level=2) if problem else ""

    try:
        chunks = retrieve(
            query,
            top_k_cases=int(os.getenv("RAG_TOP_K_CASES", "3")),
            top_k_manuals=int(os.getenv("RAG_TOP_K_MANUALS", "2")),
        )
    except Exception as e:
        logger.warning(f"RAG retrieval failed, continuing without context: {e}")
        return {"retrieved_context": []}

    return {"retrieved_context": [c.__dict__ for c in chunks]}
```

Retrieval failure must be non-fatal — if the vector DB is down, the agent should
still run, just without RAG context.

`retrieve_context` will be an internal node (not in the client SSE stream) — same
treatment as `set_initial_cause`. No SSE change in Phase 1.

---

## 5. `agent/why_why_action.py` — prompts

Prompts use Mustache, so injecting context is additive.

### 5a. Templates

Add a section to `INITIAL_WHY_ANALYSIS_PROMPT_TEMPLATE` and
`DEEP_WHY_ANALYSIS_PROMPT_TEMPLATE`:

```
# 参考情報（過去の類似事例・関連マニュアル）
{{retrieved_context}}

これらは参考であり、必ずしも本件に当てはまるとは限りません。
事実に基づき、関連する場合のみ利用してください。
```

(Last line guards against the model over-trusting retrieved cases.)

### 5b. Get the value into `_format_input`

The action builders' `_format_input` only passes through declared template vars.
`retrieved_context` arrives in the agent `state`, so it's available in the `input`
dict that LangGraph passes to the action. Two options:

- Simplest: in each builder's `_format_input`, pull `retrieved_context` from
  `input`, run it through `retrieval.format_for_prompt`, and set the string on
  the returned dict. `DeepWhyAnalysisActionBuilder` already overrides
  `_format_input` — follow that pattern; add an override to
  `InitialWhyAnalysisActionBuilder`.
- Because the agent stores dicts, convert back: rebuild `RetrievedChunk` or just
  format the dicts directly.

`RootCauseAnalysisActionBuilder` does not need retrieved context (it judges an
existing cause) — leave its prompt unchanged.

---

## 6. Docker / deps / env

### 6a. `pyproject.toml` — add

```
"langchain-openai>=0.2.0",
"qdrant-client>=1.12.0",
```

`langchain-google-vertexai` stays (Vertex fallback). Run `uv lock` after editing.

### 6b. `docker-compose.yml` — add two services

```yaml
  llm:
    image: vllm/vllm-openai:latest
    container_name: why-why-chat-ai-llm
    command: >
      --model Qwen/Qwen2.5-32B-Instruct
      --served-model-name qwen2.5-32b-instruct
      --gpu-memory-utilization 0.90
      --max-model-len 16384
      --port 8000
    ports:
      - "8001:8000"          # host 8001 to avoid clashing with api:8000
    volumes:
      - hf_cache:/root/.cache/huggingface
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 300s     # model load is slow

  vectordb:
    image: qdrant/qdrant:latest
    container_name: why-why-chat-ai-vectordb
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
    driver: local
  hf_cache: {}
  qdrant_data: {}
```

Add to the `api` service `environment:` block:

```yaml
      - LLM_PROVIDER=local
      - LLM_BASE_URL=http://llm:8000/v1
      - LLM_MODEL=qwen2.5-32b-instruct
      - EMBEDDING_BASE_URL=http://llm:8000/v1   # or a separate embedding server
      - EMBEDDING_MODEL=nomic-embed-text
      - VECTOR_STORE_URL=http://vectordb:6333
      - RAG_ENABLED=true
```

And add `llm` + `vectordb` to the `api` service `depends_on`.

Notes:
- vLLM does not serve embeddings for every model. If `nomic-embed-text` isn't
  served by your vLLM model, run a small separate embeddings container (Ollama
  with `nomic-embed-text` is the easy option) and point `EMBEDDING_BASE_URL` at it.
- Host prerequisite: **NVIDIA Container Toolkit** installed; `nvidia-smi` works
  inside a test container. Verify this before bringing up `llm`.
- The on-prem box must have enough VRAM for the chosen model
  (Qwen2.5-32B ~ needs a 48GB+ card, or use the 14B / an AWQ-quantised build).

### 6c. `.env.example` — document the new vars

Add an `# LLM Provider` and `# RAG` block mirroring section 2.

---

## 7. `scripts/ingest.py` — NEW (one-shot ingestion)

Not part of the API server. Run via `docker compose run --rm api python scripts/ingest.py`.

Responsibilities:
1. Read source docs — past why-why cases and manuals. (Format TBD — see open
   questions. Cases may come from the existing Postgres DB / past analysis
   exports; manuals are likely PDFs/Word.)
2. Chunk them (e.g. ~500–800 tokens, small overlap).
3. Embed each chunk via the same `OpenAIEmbeddings` as `retrieval.py`.
4. Upsert into Qdrant collection `whywhy_knowledge`, with payload
   `{text, source_type: "case"|"manual", source_id}`.
5. Create the collection first if missing (vector size must match the embedding
   model's dimension — `nomic-embed-text` = 768).

Keep `source_type` accurate — `retrieval.py` filters on it.

---

## Suggested order of work

1. LLM swap only (`action.py`, `config.py`, deps, compose `llm` service).
   Keep `RAG_ENABLED=false`. Get the agent fully working on the local model.
   **Validate the `root_cause_analysis` tool-calling node** — the make-or-break step.
2. Vector store + ingestion (`retrieval.py`, `ingest.py`, compose `vectordb`).
   Run ingestion, sanity-check retrieval quality from a script before wiring it in.
3. Graph node + prompts (`why_why_agent.py`, `why_why_action.py`).
   Flip `RAG_ENABLED=true`. Verify retrieved context reaches the prompts.
4. (Phase 2, later) Surface retrieved cases in the UI.

Treat steps 1–3 as separable PRs; each is independently testable.

---

## Phase 2 hooks (UI visibility — not in this spec)

When you want a 「参考事例」 panel:
- `retrieved_context` is already structured in `State` — no re-retrieval needed.
- Emit it as a new SSE event type from the stream presenter (the file your
  「②」Excel calls `stream_event_presenter.py`).
- Add the new event type to `extractEventType` in the frontend `useSSE.ts`.
- Frontend already has `InternalCaseDetailView` / `InternalCasesSearchPage`
  under `src/features/whywhy/` — reuse those for rendering.

---

## Open questions to resolve before / during implementation

1. **Case data source** — where do past why-why cases live? The Postgres DB
   (completed analyses)? Exported files? This determines the `ingest.py` reader.
2. **Manual formats** — PDF, Word, plain text? Affects chunking/parsing.
3. **Model + hardware** — confirm the GPU's VRAM, then pick model size
   (32B vs 14B, full vs quantised).
4. **Embeddings serving** — can your vLLM model also serve embeddings, or do you
   want a separate small embeddings container?
