# CLAUDE.md

This file tells Claude Code how to behave in this repository.

It should stay concise. For deeper details about architecture or UI, prefer
separate docs files and link to them here.

---

## 1. What to read first

- Follow the general AI rules in `AGENTS.md`.
- For planning complex work, use ExecPlans as described in `.ai/plans/PLANS.md`.
- When asked to work on a non-trivial feature, **always plan first, then code**:
  1. Read relevant code and docs.
  2. Create or update an ExecPlan.
  3. Only then start editing code and running commands.

### ExecPlan rules (important)

- ExecPlan template & philosophy: `.ai/plans/PLANS.md`
- Per-task ExecPlans should be stored under:

  - `.ai/plans/tmp/YYYY-MM-DD-short-task-name.md`

- If the user names a specific ExecPlan file, you MUST:
  - Read that file first.
  - Follow its `Plan of Work` and `Concrete Steps`.
  - Keep `Progress`, `Surprises & Discoveries`, `Decision Log`,
    and `Outcomes & Retrospective` up to date as you work.

---

## 2. Project overview (very short)

- Project name: **KaizenHub** – AI-powered quality management platform
- Frontend stack: React 18 + TypeScript 5 + Vite + MUI + Tailwind + Redux Toolkit + Zustand :contentReference[oaicite:3]{index=3}
- Auth & backend:
  - AWS Amplify (Cognito) for auth
  - Axios-based API layer in `src/services/apis/`
  - SSE for AI streaming, Socket.io for real-time collaboration 

For full architecture details, see:

- `docs/architecture.md`  (routing, state, APIs, SSE, sockets)
- `docs/ui-design.md`     (colors, typography, layout, components)
- `docs/development.md`   (env setup, commands, known quirks)

(If these files do not exist yet, prefer creating them and moving detailed
sections out of CLAUDE.md into those docs.)

---

## 3. Common commands

Run these from the repo root:

### Development

```bash
npm run dev          # Start dev server (localhost:5173)
npm run dev:mock     # Dev server + local mock backend
npm run build        # Production build
npm run preview      # Preview production build
```

### Quality & tests

```bash
npm run lint         # ESLint
npm run format       # Prettier on src/**/*.{ts,tsx}
npm test             # Jest + React Testing Library
```

### Storybook

```bash
npm run storybook        # Run Storybook (port 6006)
npm run build-storybook  # Build static Storybook
```

If you add new workflows (e.g. e2e tests, visual tests), document the main
commands here and move longer explanations to `docs/development.md`.

---

## 4. Code style & organization (essentials only)

For full details, see `.eslintrc.cjs`, `.prettierrc`, and `docs/development.md`.
Below is the minimum Claude should treat as rules, not suggestions:

### TypeScript

* Avoid `any` in new code, even though the rule is disabled. 
* Prefer `interface` for object shapes.
* Use `@/` for imports from `src/`.

### React

* Use function components with hooks.
* Typescript-based props (no `prop-types`).
* Co-locate tests and stories next to components:

  * `ComponentName.tsx`
  * `ComponentName.test.tsx`
  * `ComponentName.stories.tsx` 

### File layout

* Features live under `src/features/feature-name/` with:

  * `components/`, `hooks/`, `types.ts`, `utils/`, etc.
* Global state:

  * Redux store in `src/store/store.ts`
  * Feature slices (`pareto`, `fta`, `whywhy`, `diagram`, etc.)
* Local state:

  * Use Zustand and React context where appropriate.

---

## 5. Critical patterns & gotchas

These are places where small mistakes can cause big problems.

### Auth & API calls

* Auth tokens must be encrypted before sending to the backend.
* Use the existing pattern in:

  * `src/services/apis/axiosClient.ts`
  * `src/hooks/useSSE.ts`
* Do **not** introduce new ad-hoc auth headers; reuse the existing helpers.

### SSE & real-time

* SSE streaming (Why-Why analysis) is handled via `useSSE`:

  * Has its own retry / backoff / timeout logic.
  * Always pass full error objects to preserve HTTP status.
* Socket.io is used only where real-time collaboration is needed
  (fishbone diagrams, etc.). Do not mix responsibilities between SSE and sockets.

### Environment variables

Use `.env.example` as the source of truth and copy to `.env`:

* `VITE_USER_POOL_ID`
* `VITE_USER_POOL_CLIENT_ID`
* `VITE_SECRET_KEY`
* `VITE_BACKEND_URL_V1`
* `VITE_BACKEND_TARGET` 

Keep secrets out of the repo. If you need new env vars, update `.env.example`
and document their purpose in `docs/development.md`.

---

## 6. Working with Claude Code 2.0 features

### Planning & ExecPlans

* For multi-step / risky work:

  * Ask the user if an ExecPlan already exists.
  * If not, create one in `.ai/plans/tmp/` using the skeleton from PLANS.md.
  * Treat the ExecPlan as the single source of truth while implementing.

This matches the “plan, then execute” workflow recommended by Anthropic and
community best practices. ([anthropic.com][1])

### Checkpoints & rewind

* Claude Code automatically tracks edits as checkpoints; use `/rewind`
  if changes go off track. ([Claude Code][2])
* Checkpoints are **not** a replacement for git:

  * Continue to use branches and commits for real history.
  * Think of checkpoints as “local undo” during a session.

---

## 7. When unsure

When you are unsure about:

* behavior of a feature → read code under `src/features/<feature>/`
* global architecture → open `docs/architecture.md`
* UI / design rules → open `docs/ui-design.md`
* workflows / commands → open `docs/development.md`

Prefer reading these files (and updating them) rather than expanding CLAUDE.md
into a long narrative doc.