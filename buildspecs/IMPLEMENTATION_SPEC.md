# Monozukuri App — Local LLM + RAG via API Contracts — Implementation Spec (v4)

Goal: run the why-why analysis stack on-prem. The LLM and RAG capabilities are
provided by **external API services** (built and operated separately — out of
scope here). This spec defines (a) the **API contracts** the app expects those
services to satisfy, and (b) the changes to the three app repos to call them.

Scope change from v3: the app no longer builds or runs the LLM server, the RAG
service, the vector store, embeddings, or ingestion. Those are external
dependencies reached by URL. This spec defines the contract; whoever builds the
services conforms to it.

In scope: `why-why-analysis` (agent), `monozukuriapp_backend` (NestJS),
the frontend, and their Docker/config.
Out of scope: LLM server, RAG service, Qdrant, embeddings, ingestion.

Companion: `IMPLEMENTATION_SPEC_APPENDIX.md` — LLM-swap code blocks + `ChatOpenAI`
settings (valid). Appendix RAG/ingest code is superseded — RAG is external now.

## System map

```
User browser (React)
   │
Frontend (React + nginx)        ─┐
   │  SSE                        │  in scope —
NestJS backend (transparent SSE  │  the app repos
   │  proxy, Prisma/Postgres)     │
Why-why agent (LangGraph,        ─┘
   FastAPI)
   ├── HTTP ──►  LLM API     (external)  — OpenAI-compatible contract  §C1
   └── HTTP ──►  RAG API     (external)  — contract defined in         §C2
```

---

# PART A — API CONTRACTS (what the app expects)

The app is coded against these contracts. The external services MUST satisfy them.

## C1. LLM service contract — OpenAI-compatible

The LLM service MUST expose an **OpenAI-compatible API**:
- `POST /v1/chat/completions` — chat completions.
- MUST support **streaming** (`stream: true`) — the agent streams thoughts via SSE;
  without it the UI's thought-streaming and `connection_end` logic misbehave.
- MUST support **tool / function calling**, including forced tool choice
  (`tool_choice`) — required by the agent's `RootCauseAnalysisActionBuilder`,
  which forces a `RootCauseSchema` tool call. A service that does not honor forced
  `tool_choice` reliably will break root-cause analysis.
- `POST /v1/embeddings` — only required IF the RAG service does not do its own
  embedding (see C2 note). Recommended: RAG owns embeddings, so the app does not
  call this.

Rationale: OpenAI-compatible is the de facto standard (vLLM, Ollama, TGI, etc. all
expose it). The agent uses LangChain `ChatOpenAI` unchanged against it. No custom
LLM API is defined — that would invent a problem.

The app needs from config: `LLM_BASE_URL` (e.g. `http://<host>:<port>/v1`),
`LLM_MODEL` (served model name), `LLM_API_KEY` (if the service requires one;
else a placeholder).

## C2. RAG service contract — defined here

The RAG service MUST expose:

### `POST /retrieve`
Request body:
```json
{
  "query": "string — the problem text to search with (required)",
  "top_k_cases": 3,
  "top_k_manuals": 2
}
```
`top_k_*` optional; the service applies defaults if omitted.

Response — `200 OK`:
```json
{
  "chunks": [
    {
      "text": "string — the retrieved passage",
      "source_type": "case",
      "source_id": "string — stable ID, see note below",
      "title": "string — display title for the 参考事例 panel",
      "score": 0.0
    }
  ]
}
```
- `source_type` MUST be `"case"` or `"manual"`. The app requests and treats the
  two types distinctly.
- `source_id` — for `source_type: "case"`, this MUST be the **same case ID the
  NestJS app uses**, so the 「参考事例」 panel can link to the existing case-detail
  route. If a routable ID cannot be supplied, the panel degrades to title +
  snippet with no link (acceptable fallback). This is the key constraint on
  whoever builds RAG ingestion — see Open Questions #1.
- `title` MUST be present — the panel displays it.
- `chunks` MAY be empty (no relevant results) — the app handles this.

### `GET /health`
Returns `200` when ready. Used by Docker healthcheck / startup ordering.

### Error behavior — part of the contract
The app treats ANY RAG failure — timeout, non-200, malformed body, connection
refused — as **non-fatal**: it proceeds with empty retrieved context and the
why-why analysis still runs. The RAG service author can rely on this (app will not
crash on RAG downtime), and it is a deliberate design choice, not an accident.

### Embeddings — the app sends text, not vectors
`/retrieve` takes plain-text `query`. The RAG service does its own embedding
internally. The app never computes or sends vectors. (Rationale: otherwise the app
and RAG service must agree on an embedding model and stay locked together — fragile.)

### Out of contract
No "fetch full case by ID" endpoint. Full case detail already lives in the NestJS
app's DB and is served by the existing `InternalCaseDetailView` route. RAG does
search only; the panel's link goes to the existing NestJS route. One source of
truth for case detail.

The app needs from config: `RAG_SERVICE_URL` (e.g. `http://<host>:<port>`).

---

# PART B — `why-why-analysis` (agent) changes

## B0. Security
`ai-service-config.json` in `monozukuriapp_backend` has a live Google API key in
git. Revoke/rotate it; move to env.

## B1. `agent/action.py` — LLM swap
Only place `ChatVertexAI` is built; subclasses call `super()._setup_llm()`. Make
Vertex imports lazy. `_setup_llm()` branches on `LLM_PROVIDER` (`vertex` | `local`);
`local` builds `ChatOpenAI(base_url=LLM_BASE_URL, model=LLM_MODEL, ...)`. Full code:
appendix §1. Keep `vertex` path for A/B debugging.

RISK: `RootCauseAnalysisActionBuilder` forces `tool_choice` for `RootCauseSchema`.
Validate against the real LLM service (contract C1 requires forced tool calling).
Plan B: `with_structured_output`.

## B2. `agent/config.py` — settings
Add: `llm_provider`, `llm_base_url`, `llm_model`, `llm_api_key`, `llm_timeout`,
`rag_service_url`, `rag_enabled`, `rag_timeout`.

## B3. `agent/why_why_agent.py` — `retrieve_context` node
Add `retrieved_context: Optional[List[dict]]` to `State`. Register node, splice
between `set_initial_cause` and `joint`. The node is a thin HTTP client calling the
RAG contract C2 `/retrieve`:
```python
def retrieve_context(self, state, config=None):
    if os.getenv("RAG_ENABLED", "false").lower() != "true":
        return {"retrieved_context": []}
    import httpx
    problem = state.get("problem", {})
    query = ProblemInput(**problem).to_markdown(base_level=2) if problem else ""
    try:
        resp = httpx.post(
            f"{os.getenv('RAG_SERVICE_URL')}/retrieve",
            json={"query": query},
            timeout=float(os.getenv("RAG_TIMEOUT", "30")),
        )
        resp.raise_for_status()
        chunks = resp.json()["chunks"]
    except Exception as e:
        logger.warning(f"RAG call failed, continuing without context: {e}")
        return {"retrieved_context": []}
    return {"retrieved_context": chunks,
            "thoughts": ["関連する過去事例を検索しました"]}
```
Non-fatal on failure — per contract C2.

## B4. SSE — make RAG visible
`api/routers/threads.py` emits `event: <node_name>` for nodes NOT in
`STREAMING_UNNEEDED_EVENTS`. **Do NOT add `retrieve_context`** — it then auto-streams
as `event: retrieve_context` carrying `retrieved_context`. No custom SSE code.

## B5. `agent/why_why_action.py` — prompts
Mustache. Add `{{retrieved_context}}` 「参考情報」 section to
`INITIAL_WHY_ANALYSIS_PROMPT_TEMPLATE` and `DEEP_WHY_ANALYSIS_PROMPT_TEMPLATE`
(with a "reference only" guard). Each builder's `_format_input` pulls
`retrieved_context` from `input` and joins the chunk dicts into text.
`RootCauseAnalysisActionBuilder` prompt unchanged.

---

# PART C — `monozukuriapp_backend` (NestJS) changes
Transparent SSE proxy (`ai.service.ts` pipes chunks straight through). The
`retrieve_context` event passes through with no code change.

- Repoint `AI_SERVICE_URL` from the GCP gateway to the local agent
  (e.g. `http://api:8000`).
- Rotate the leaked key (B0); move `AI_SERVICE_API_KEY` to env.
- Note: `ai.service.ts` has a mock-response block when AI config is absent — unset
  `AI_SERVICE_URL` gives fake data, not an error.

---

# PART D — Frontend changes
- `useSSE.ts` — `extractEventType` recognises `retrieve_context`, stores
  `state.retrieved_context`.
- New 「参考事例」 panel — appears once, early. Each entry: title + snippet + link.
- Link routes to the existing `InternalCaseDetailView` / `InternalCasesSearchPage`
  using `source_id`. No routable id → fallback to title + snippet.

---

# PART E — Docker / config

The app's `docker-compose.yml` runs the in-scope containers: `frontend`,
`backend` (NestJS), `api` (agent), `postgres`. The LLM and RAG services are
**external** — referenced by URL, not defined in this compose file (they run
elsewhere / are managed separately).

Agent (`api`) env:
```
LLM_PROVIDER=local
LLM_BASE_URL=<external LLM URL>/v1
LLM_MODEL=<served model name>
LLM_API_KEY=<if required>
RAG_ENABLED=true
RAG_SERVICE_URL=<external RAG URL>
```
NestJS env: `AI_SERVICE_URL=http://api:8000`.

Agent deps: add `langchain-openai`, `httpx`.

If the external LLM/RAG services run on the same Docker host, they can share a
Docker network and be addressed by service name; if on other hosts, use their
network address. Either way the app only needs the two URLs.

---

# Suggested order of work
1. LLM swap (Part B1–B2). `RAG_ENABLED=false`. Validate `root_cause_analysis`
   against the real LLM endpoint once it exists (or a stand-in OpenAI-compatible
   server, e.g. a dev Ollama).
2. NestJS repoint (Part C). Confirm end-to-end, no RAG.
3. RAG integration (Part B3–B5) + frontend panel (Part D). `RAG_ENABLED=true`.
   Test against the real RAG endpoint or a mock honoring contract C2.
Steps separable. Until the external services exist, develop against stand-ins
that honor C1 / C2 (any OpenAI-compatible server; a small mock for /retrieve).

---

# Open questions
1. **Case IDs** — can RAG ingestion tag each case chunk with the NestJS case ID as
   `source_id`? Decides whether the 「参考事例」 panel link works (contract C2 note).
   Depends on where past cases live and whether they have stable IDs.
2. **LLM endpoint availability** — when will the external LLM service exist, and
   will it honor forced tool calling (contract C1)? Until then, develop against an
   OpenAI-compatible stand-in.
3. **RAG endpoint availability** — when will it exist? Until then, a mock honoring
   contract C2 `/retrieve` unblocks app development.
4. **Auth** — do the LLM / RAG services require auth (API key, token)? Contract
   assumes optional; confirm so config is right.
5. **Network topology** — do the external LLM/RAG services run on the same Docker
   host as the app, or elsewhere? Affects only the URL values.
