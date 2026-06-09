# Codex Prompt (English, paste-ready)

You are Codex. You will modify a **React + TypeScript + Vite** frontend to fix SSE-driven chat UI updates for a Why-Why analysis app that streams events from an LLM Agent API.

Follow the **minimal-change** principle. **Do not add dependencies** or modify build config. Keep code style consistent with existing ESLint/Prettier/TS settings.

---

## Project context

* App: Why-Why chat UI (root-cause analysis).
* Transport: **SSE stream** from backend Agent.
* Observed behavior:

  * Sometimes the API never sends the `final_result` event, yet `state.status` becomes `"completed"` and the HTTP stream closes.
  * UI fails to show the last tree/root causes, keeps loading, and allows further typing.
  * `thought` payloads are sometimes displayed in the chat.
  * `info_request` does not update the interim tree.
* Goal: Make the UI **state-driven and idempotent** so it finalizes correctly even when `final_result` is missing; show interim state for `info_request`; never render `thought`; keep intermediate events as loading-only.

---

## ImprovementInput (authoritative requirements)

### Correct runtime behavior

| Event kind                                                                                                          | Chat                                                               | Tree                                | Input       | Other                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | ----------- | ----------------------------------------- |
| **info_request**                                                                                                    | Update from `state.chat_history` (AI asks)                         | Update from `state.why_nodes`       | **Enable**  | status: `waiting_for_input`, stop loading |
| **completed**                                                                                                       | Add a **system** message: “分析が完了しました。追加の質問はありません。右側のツリー図をご確認ください。” | Final update from `state.why_nodes` | **Disable** | status: `completed`, stop all loading     |
| **Intermediate** (`analysis_started` / `root_cause_analysis` / `deep_analysis` / `analysis_progress` or no `state`) | **No chat update**                                                 | **No tree update**                  | Disabled    | Show loading and optional progress text   |
| **thought**                                                                                                         | **Never render**                                                   | -                                   | -           | Log-only                                  |

### Event interpretation (robust to API variance)

1. Prefer `data.event_type` if present.
2. Else fallback to `data.type`.
3. Else infer from `data.state.status`:

   * `waiting_for_input` → treat as `info_request`
   * `completed` → treat as **final** (even if `event_type` is not `final_result`)

### Finalization & idempotency

* Maintain a **single-run** guard (e.g., `hasFinalizedRef`) so completion logic runs at most once per session.
* On **SSE stream end** (`reader-done`):

  * If **last** envelope was `final_result` or has `state.status === 'completed'`, **finalize** using that `state`.
  * Otherwise do nothing (likely `info_request`).
* When finalizing:

  * Apply `state.why_nodes` and `state.root_causes`.
  * **Do not** overwrite existing chat history; instead append **one** `system` message (dedupe by stable key like `system-completed-${threadId}`).
  * Set status to `completed`, stop all loaders, disable input, ignore further SSE messages for that session.

### Info request handling

* When `info_request` (or `state.status === 'waiting_for_input'`):

  * Render AI question from `state.chat_history` and interim tree from `state.why_nodes`.
  * Stop loading; enable input.

### Thought handling

* Never render `data.thought` in the UI. Keep it for console/logging only.

### UI/UX

* Input area and send button become disabled when `status === 'completed'` (placeholder: “分析完了 - チャットは無効です”).
* Optional progress copy for intermediates:

  * `analysis_started` → “分析を開始しています...”
  * `root_cause_analysis` → “根本原因を特定中...”
  * `deep_analysis` → “詳細分析を実施中...”

### Data processing

* `processChatHistory` keeps arrival order; maps `{type: "human"|"ai"}` to `user|ai`. Thoughts never appear here.
* `normalizeWhyNodes` converts `state.why_nodes` to the app’s `WhyNode[]`; may add a virtual root if needed.

### Merge & optimistic IDs

* Merge server chat history with optimistic items using a **content+type key** to avoid duplication.
* Keep optimistic message IDs stable to support rollback.

---

## Allowed vs. Forbidden changes

**Allowed files (update only what you need):**

* `src/hooks/useSSE.ts`
* `src/features/whywhy/hooks/useAnalysisState.ts`
* `src/features/whywhy/utils/dataProcessing.ts`
* `src/features/whywhy/components/ChatMessage.tsx`
* `src/features/whywhy/WhyWhyAnalysisView/index.tsx`
* `src/services/apis/whyWhyService.ts` (only if needed for small adjustments)
* `src/features/whywhy/types.ts` (augment message/system types if missing)

**Forbidden (do not modify unless explicitly required by this prompt):**

* Build & config: `vite.config.*`, `tsconfig.*`, `.eslintrc*`, `.prettierrc*`
* `package.json`, lockfiles, CI
* Public assets & styling frameworks
* Any server-side code
* Adding dependencies

---

## Tasks (small, verifiable steps)

1. **SSE ingestion guardrails (`useSSE.ts`):**

   * Implement `extractEventType(data)` with the 3-step precedence described above.
   * Track `lastEnvelopeRef` with `{ type, state }` for stream-end decisions.
   * Add `hasFinalizedRef` (module or hook scope) to ensure **one-time** finalization.
   * On each message call `updateFromSSE(kind, data)`; on stream end apply the finalization fallback (treat `state.status === 'completed'` as final).
   * Do **not** emit `onInfoRequest`/`onFinal` blindly; route through centralized state actions only.

2. **State reducer/hooks (`useAnalysisState.ts`):**

   * Implement `updateFromSSE(kind, data)` that:

     * Early returns if `hasFinalizedRef` is true.
     * Handles `info_request`: update chat & tree from `data.state`, set status `waiting_for_input`, stop loaders, enable input.
     * Detects **final** if: `kind === 'final_result'` **OR** `data.state.status === 'completed'` **OR** non-empty `state.root_causes`.

       * Apply final tree & root causes.
       * **Append one** system message using a stable dedupe key: `system-completed-${currentThreadId}`.
       * Set status `completed`, stop loaders, disable input; set `hasFinalizedRef = true`.
     * Otherwise treat as intermediate: keep status `running`, show loading, optional progress copy.
   * Provide `appendSystemOnce(key: string, content: string)` utility.

3. **Data utilities (`dataProcessing.ts`):**

   * Ensure `processChatHistory` ignores any `thought` fields and preserves order.
   * Ensure `normalizeWhyNodes` produces the expected `WhyNode[]`.

4. **UI components:**

   * `ChatMessage.tsx`: add message type union `"system"` with distinct minor style (info icon, subtle background).
   * `WhyWhyAnalysisView/index.tsx`:

     * Disable input & send button when `status === 'completed'`; update placeholder accordingly.
     * Show spinner during intermediates; optionally show progress text based on last intermediate event.
     * After finalization, ignore node-click ask actions (pass undefined handler).

5. **Merge/rollback & send guard:**

   * Stabilize optimistic message IDs.
   * In the send action, short-circuit if `status === 'completed'`.

6. **Stream failure fallback (optional but recommended):**

   * If SSE ends unexpectedly or parsing fails, perform a **GET thread** fetch; if it returns `state.status === 'completed'`, route through the same finalization path.

---

## Output format

Return a **single unified diff** patch covering only the necessary files listed above. Do not include unrelated changes. Use consistent file paths from repo root. After the diff, output:

* A conventional commit message (e.g., `fix(whywhy): finalize via state.status fallback; ignore thought; idempotent SSE`).
* A short PR description (What/Why/How/Tests/Risks).
* No binary changes.

If a file does not yet exist (e.g., utility), add it in the patch minimally.

---

## Verification steps (run locally)

1. Type checking & lint:

```bash
npm run typecheck
npm run lint
```

2. Build:

```bash
npm run build
```

3. Dev (manual QA):

```bash
npm run dev
```

Then run the following manual scenarios via the app or mocked SSE:

* **S1: info_request flow**

  * Start analysis → see loading.
  * Receive `info_request` (`state.status=waiting_for_input`).
  * Chat shows AI question (from `state.chat_history`), tree updates (from `state.why_nodes`), input enabled, loaders stop.

* **S2: completed without `final_result`**

  * Last SSE envelope has `event_type: deep_analysis` (or other) but `state.status=completed`, then the stream closes.
  * Tree/root causes update; **one** system message appended; input disabled; all loaders stop.

* **S3: completed with `final_result`**

  * Same end state as S2; no duplicate system messages.

* **S4: intermediate events**

  * For `analysis_started` / `root_cause_analysis` / `deep_analysis`, no chat/tree update; only loading/progress text is shown.

* **S5: thought suppression**

  * Any `thought` content is never rendered in chat/tree/loading; only visible in console logs.

* **S6: fast replays / retries**

  * Completion is idempotent; subsequent SSE messages do nothing; send action is blocked after completion.

Capture console logs around `[SSE Event]`, `[State Update]`, `[UI Update]` (retain existing logging if present).

Success criteria:

* All scenarios pass visually.
* No TypeScript errors or lint violations.
* Build succeeds.
* No duplicate system messages.
* No regressions in non-WhyWhy views.

---

## Retry & diagnostics

If tests fail:

* Print the exact failing scenario, final `state.status`, and whether `hasFinalizedRef` was set.
* Re-run only the necessary patch with minimal edits; do not introduce new dependencies.
* Keep changes scoped to allowed files.

---

## Commit / PR templates

**Commit message:**

```
fix(whywhy): robust SSE finalization via state.status; ignore thought; idempotent completion; interim tree on info_request
```

**PR description (fill What/Why/How/Tests/Risks):**

```
### What
- Make SSE handling state-driven and idempotent.
- Fallback finalize when final_result is absent but state.status === 'completed'.
- Suppress thought from UI; show interim tree on info_request.
- Add one-time system message and disable input on completion.

### Why
- API sometimes closes without final_result; UI remained loading and editable.

### How
- extractEventType with precedence; lastEnvelopeRef + hasFinalizedRef.
- updateFromSSE implements info/completed/intermediate branches.
- appendSystemOnce; stopAllLoaders; input disable; send guard.

### Tests
- Manual scenarios S1–S6, plus typecheck/lint/build.

### Risks
- Double-finalization (guarded); unintended merges (dedupe by key).
```

---

# Verification Report

After producing the unified diff patch, output a **Verification Report**:

- Section 1: Commands
  - Show the exact outputs (or “no errors”) for: `npm run typecheck`, `npm run lint`, and `npm run build` as text summaries.

- Section 2: Review Checklist Results
  For each item (1–10), output `PASS/FAIL/UNCLEAR` with a **short evidence** pointer:
  - file + line/region (e.g., `useSSE.ts: extractEventType`, `useAnalysisState.ts: hasFinalizedRef`, `WhyWhyAnalysisView/index.tsx: input disabled condition`)
  - or console log marker names if applicable.

- Section 3: Manual QA Hints
  State which log lines should appear for S1–S6 scenarios (e.g., `[SSE Event]`, `[State Update]`, `[UI Update]`), and expected UI state snapshot (one sentence each).

If any item is `FAIL` or `UNCLEAR`, propose the smallest follow-up patch scope (file list + 1–2 bullets).

---

# Assumptions Gate

Before making any changes, perform an **Assumptions Gate**:

- A1: The truth source for finalization is `state.status` from SSE envelopes.
- A2: A session/thread identifier is available (e.g., `state.session?.id` or equivalent) to dedupe the one-time system message.
- A3: There exist minimal actions/utilities to stop all loaders and set status (e.g., `stopAllLoaders`, `setStatus`) or they can be introduced locally without touching build configuration or adding deps.
- A4: `processChatHistory` and `normalizeWhyNodes` exist and can be minimally adjusted.
- A5: Input controls can be disabled from `WhyWhyAnalysisView` based on `status`.

For each assumption, write a **one-line verdict**: `PASS`, `WEAK`, or `FAIL`.
- If `PASS`: proceed.
- If `WEAK`: proceed with the safest minimal adaptation.
- If `FAIL`: implement the **smallest local shim** in allowed files to satisfy the requirement (no new deps, no config edits). Document the shim in the PR description.
Do **not** stop or ask questions; choose the minimal safe path and continue.