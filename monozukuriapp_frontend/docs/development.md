# KaizenHub Frontend Development Guide

This document explains how to set up, develop, test, and contribute to
the KaizenHub frontend. It complements:

- `docs/architecture.md` – structure, routing, state, APIs, real-time
- `docs/ui-design.md` – colors, typography, layout, design system

If anything here goes out of sync with the actual code (scripts,
configs), update this file after fixing the source.

---

## 1. Getting Started

### 1.1 Prerequisites

- Node.js (LTS; e.g. 18+)
- npm (bundled with Node)
- Git
- The **backend repository** cloned in a sibling directory if you need
  full type support and API behavior (see Known Quirks below). :contentReference[oaicite:0]{index=0}  

Recommended directory layout:

```text
/your-workspace/
  monozukuriapp_backend_f1/   # Backend repo (example)
  monozukuriapp_frontend_f1/  # This repo
```

We do **not** store secrets or heavy environment configuration in this
frontend repo. Backend URLs, keys, Cognito settings, etc. live in the
backend/infra setup.

### 1.2 Install dependencies

From the frontend repo root:

```bash
npm install
```

If this is the first time on your machine, also ensure Git hooks
(Husky/lint-staged) are installed by running:

```bash
npx husky install
```

(Husky is typically wired via `postinstall`, but if hooks don’t fire,
run this once.) 

---

## 2. Running the App

### 2.1 Development server (with real backend)

If you have the backend running from its own repo (dev environment):

1. Start the backend (see backend repo docs for commands/ports).
2. From the frontend repo root:

   ```bash
   npm run dev
   ```

   Default Vite dev server: `http://localhost:5173` (or the port Vite
   prints). Requests such as `/api/...` are proxied to the running
   backend according to `vite.config.ts`.

Use this mode when you want to exercise real APIs and end-to-end flows.

### 2.2 Development server with mock backend

For frontend-only development (no backend required):

```bash
npm run dev:mock
```

This starts:

* Vite dev server
* A local mock backend server under `mock-server/` (Express)

Use this when:

* You’re working on UI that doesn’t require real data
* Backend dev environment is not available or unstable

### 2.3 Production build & preview

To create an optimized production build:

```bash
npm run build
```

To preview the built app locally (simulates production server):

```bash
npm run preview
```

These commands are Vite-standard and should be used as the reference for
CI/CD and deployment checks. 

---

## 3. Code Quality: Linting & Formatting

### 3.1 Linting

Run ESLint on TypeScript/React code:

```bash
npm run lint
```

ESLint config: `.eslintrc.cjs` 

Key points:

* Based on:

  * `eslint:recommended`
  * `plugin:@typescript-eslint/recommended`
  * `plugin:react-hooks/recommended`
  * `plugin:react/recommended`
  * `plugin:storybook/recommended`
* Integrated with Prettier (formatting via ESLint)
* Some rules are disabled but **should still be respected in spirit**:

  * `@typescript-eslint/no-explicit-any` – disabled, but avoid `any`
  * `react-hooks/exhaustive-deps` – disabled, but be deliberate with
    effect deps
  * `react/no-children-props` – disabled for some patterns

### 3.2 Formatting

We use Prettier and ESLint formatting rules configured in
`.prettierrc` and `.eslintrc.cjs`. 

Useful scripts:

```bash
npm run format    # Format src/**/*.{ts,tsx} with Prettier
npm run pretty    # Format all files with Prettier (if defined)
```

Conventions:

* 2 spaces, no tabs
* Semicolons required
* Trailing commas where possible
* 120-character print width
* One JSX attribute per line when multi-line

### 3.3 Git hooks (Husky + lint-staged)

On commit, Husky + lint-staged will run lint/format checks automatically
to keep the main branch clean. 

If you see commits being blocked:

* Fix the errors shown by ESLint/Prettier
* Re-run `npm run lint` or `npm run format` locally
* Commit again

---

## 4. Testing

Tests are handled by Jest + React Testing Library.

### 4.1 Commands

From the repo root:

```bash
npm test         # Run full test suite once
npm test:watch   # Watch mode during development
```

Configuration: `jest.config.cjs`.

### 4.2 Test Placement

The preferred convention is **co-location** with the component:

* Component: `src/features/foo/components/BarCard.tsx`
* Test: `src/features/foo/components/BarCard.test.tsx`

Guidelines:

* Test user behavior, not implementation details
* Use React Testing Library patterns (queries by role/text, etc.)
* For hooks, consider small targeted tests or integration through
  components

---

## 5. Storybook

Storybook is used for component development and visual testing.

### 5.1 Commands

```bash
npm run storybook        # Start Storybook (port 6006 by default)
npm run build-storybook  # Build static Storybook bundle
```

Story files live alongside components:

* `ComponentName.stories.tsx`

Use Storybook when:

* Designing new UI components
* Validating responsive behavior
* Sharing component usage examples

---

## 6. Code Style & Organization (Quick Reference)

Full details live in `CLAUDE.md` and `docs/ui-design.md`. Here are the
bare essentials from a development workflow perspective.

### 6.1 TypeScript & React

* Prefer `interface` for object shapes
* Avoid `any` in new code
* Use function components and hooks
* Use TypeScript for props instead of `prop-types`
* Use path alias `@/` for imports from `src/`:

  * `import { Foo } from "@/features/foo/components/Foo";`

### 6.2 Directory & File Naming

* Components: `ComponentName.tsx` (PascalCase)
* Hooks: `useSomething.ts`
* Tests: `ComponentName.test.tsx`
* Stories: `ComponentName.stories.tsx`
* Directories: `lowercase-with-dashes` (e.g., `kaizen-hub`)

### 6.3 Forms

* Legacy forms: Formik (e.g., some Pareto flows)
* New forms: **React Hook Form** is preferred
* Validation: Yup or Zod schemas 

---

## 7. Working with Backend & Real-Time Features

Details of the architecture are in `docs/architecture.md`. Here is what
you need to know from the day-to-day development side.

### 7.1 Separate Backend Repository

* The backend is implemented in a **separate repo**.
* This frontend communicates via:

  * HTTP (Axios via `axiosClient`)
  * SSE (`useSSE` for AI streaming)
  * Socket.io (`useFishboneSocket` for collaboration)
* Some TypeScript types are imported from the backend repo, e.g.:

  * `../monozukuriapp_backend_f1/src/types/enums/problem.ts`

  → Ensure the backend repo is cloned in the expected relative path for
  type imports to succeed. 

### 7.2 SSE (Server-Sent Events) for AI Streams

When working on Why-Why analysis or other SSE consumers:

* Use `useSSE` from `src/hooks/useSSE.ts`
* Always pass full error objects to `onError` so the hook can classify
  HTTP status codes correctly (401/403 vs 429 vs 5xx). 
* Do **not** introduce new ad-hoc SSE clients; extend the existing hook
  if new message types are needed.

### 7.3 Socket.io for Collaboration

Fishbone diagrams use Socket.io through `useFishboneSocket`.

Guideline:

* SSE = AI streaming / long-running analysis
* Socket.io = multi-user collaborative editing
* Keep responsibilities separate

---

## 8. Known Quirks & Gotchas

These are patterns that often trip people up.

1. **Path Alias `@/`**

   * `@/` maps to `src/` via `tsconfig.json` and `vite.config.ts`.
   * If you see weird module resolution errors, check these configs. 

2. **Mock Server (`npm run dev:mock`)**

   * Starts a local Express server under `mock-server/`.
   * Great for UI work without a running backend.

3. **Git Hooks**

   * Husky + lint-staged run automatically on commit to enforce linting
     and formatting.
   * If you bypass hooks (e.g., `--no-verify`), you’re responsible for
     ensuring `npm run lint` and tests pass. 

4. **Backend Type Imports**

   * Some TypeScript files import enums/types from the backend repo, e.g.:
     `../monozukuriapp_backend_f1/src/types/enums/problem.ts`.
   * If you see TS cannot find module errors, ensure the backend repo is
     cloned and the relative path is correct. 

5. **SSE vs WebSocket**

   * SSE (via `useSSE`) is for AI streaming (Why-Why).
   * Socket.io (via `useFishboneSocket`) is for collaborative diagrams.
   * Don’t swap them casually; they solve different problems.

---

## 9. Large Changes & ExecPlans

For **complex features** or **significant refactors**, we use
ExecPlans.

* Specification & philosophy:

  * `.ai/plans/PLANS.md`
* Quick rule from `AGENTS.md`:

  * “When writing complex features or significant refactors, use an
    ExecPlan (as described in `.ai/plans/PLANS.md`) from design to
    implementation.”

Workflow:

1. Create a new ExecPlan under:

   ```text
   .ai/plans/tmp/YYYY-MM-DD-short-task-name.md
   ```

2. Flesh it out using the skeleton in `PLANS.md`.

3. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`,
   `Outcomes & Retrospective` updated as you work.

4. Only then start editing code and running commands.

This helps both humans and AI agents execute large changes safely and
repeatably.

---

## 10. Quick Checklist Before Opening a PR

* [ ] `npm run lint` passes
* [ ] `npm test` passes (and relevant new tests added)
* [ ] UI looks correct and responsive (check key breakpoints)
* [ ] You reused existing patterns (layout, colors, state) instead of
  creating one-off solutions
* [ ] Any new patterns are documented in:

  * `docs/ui-design.md` (design/pattern level)
  * `docs/architecture.md` (architecture-level concerns)
* [ ] For large/risky changes, an ExecPlan exists under `.ai/plans/tmp/`
  and is updated

If you’re unsure about where something should go, err on the side of:

* Adding a small note here in `docs/development.md`, and
* Linking to the relevant source files and ExecPlan for future readers.