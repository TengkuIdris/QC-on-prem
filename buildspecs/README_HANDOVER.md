# Monozukuri App — Local LLM + RAG Migration — Developer Handover

## What this is
The Monozukuri why-why analysis app currently runs on Google Cloud and uses
Vertex AI / Gemini as its LLM. This work migrates it to run on-prem, calling a
**local LLM service** and a new **RAG service** instead — both reached as HTTP
APIs. RAG-retrieved past cases are shown to the user in a 「参考事例」 panel.

The LLM and RAG services themselves are being built separately (another effort,
in progress). This handover covers the **app side** only: the three app repos and
the API contracts they expect those services to satisfy.

## Files in this handover

1. **IMPLEMENTATION_SPEC.md** — the spec. Start here. Read top to bottom.
   - Part A: the two API contracts (LLM, RAG) the app is coded against.
   - Parts B–E: changes to each repo (agent, NestJS, frontend, Docker).
   - Open questions: things to resolve while building.

2. **IMPLEMENTATION_SPEC_APPENDIX.md** — supporting code blocks the spec
   references (the LLM-swap settings, the docker-compose service definitions,
   sketches for config). Use alongside the spec; the spec says when.
   NOTE: the appendix predates the "RAG as external service" decision — its
   RAG/ingest code is superseded by the spec's contract approach. The LLM-swap
   and docker sections are still valid.

3. **action.py** — the FIRST code change, already done. This is the finished,
   syntax-checked replacement for `why_why_chat_ai/agent/action.py` in the
   `why-why-analysis` repo. Drop it in. It implements the LLM provider switch
   (Part B1 of the spec). See "How action.py was done" below.

## The three repos
- `why-why-analysis` (Python, LangGraph agent) — most of the work
- `monozukuriapp_backend` (NestJS) — minimal: one URL repoint + key rotation
- frontend (React) — the 「参考事例」 panel

## Suggested build order (from the spec)
1. LLM swap — `action.py` is done; also do `config.py` settings (Part B2).
   Test with `RAG_ENABLED=false` against any OpenAI-compatible server
   (a dev Ollama works) before the real LLM service exists.
2. NestJS repoint (Part C). Confirm end-to-end, no RAG.
3. RAG integration (Part B3–B5) + frontend panel (Part D), `RAG_ENABLED=true`.
   Test against a mock honoring the RAG contract (spec Part A, C2) until the
   real RAG service is ready.

## How action.py was done — read before continuing
- `_setup_llm()` now branches on the `LLM_PROVIDER` env var: `vertex` (default,
  unchanged behaviour) or `local` (`ChatOpenAI` against `LLM_BASE_URL`).
- Vertex imports are now lazy so a local-only deploy doesn't need the
  `google-cloud-aiplatform` packages installed.
- `_bind_tools()` helper hides a provider difference: `use_tool_calls` is a
  Vertex-only `bind_tools` kwarg that `ChatOpenAI` rejects.

THE KEY RISK: `RootCauseAnalysisActionBuilder` (in `why_why_action.py`) forces a
tool call for the `RootCauseSchema` (3 fields incl. a float). Local models vary
in how reliably they honor forced `tool_choice`. After the swap, TEST the
`root_cause_analysis` step specifically. If it fails, the fallback is
`with_structured_output(RootCauseSchema)` instead of `bind_tools`. The Vertex
path is kept intact precisely so you can A/B: switch back to confirm whether a
bug is the model or the code.

Verify in the repo: grep for any other file importing `DEFUALT_SAFETY_SETTINGS`
or `HarmCategory` from `action.py` — if found, apply the same lazy-import fix.

## Security — do this first, independent of everything else
`ai-service-config.json` in `monozukuriapp_backend` contains a live Google API
key committed to git. Revoke/rotate it in the Google Cloud console and move it
to an env var.

## Open questions to resolve while building (full list in the spec)
1. Can RAG ingestion tag each case with the NestJS case ID? Decides whether the
   panel's "see full case" link works.
2. When will the LLM service exist? Until then, develop against an
   OpenAI-compatible stand-in.
3. When will the RAG service exist? Until then, build a mock honoring the
   contract.
4. Do the LLM/RAG services require auth?
5. Network topology — same Docker host as the app, or elsewhere?
