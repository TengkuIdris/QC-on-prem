# KaizenHub Frontend Architecture

This document describes the architecture of the KaizenHub frontend
application: how routing, state, APIs, and real-time communication are
structured, and how the main feature modules fit together. :contentReference[oaicite:0]{index=0}

If anything in the codebase conflicts with this document, treat the
actual source code as the ultimate source of truth and update this file
to match.

---

## 1. High-Level Overview

**KaizenHub** is an AI-powered quality management platform that
combines classic QC tools (Pareto charts, Fishbone diagrams, Why-Why
analysis, FTA) with AI assistance. The frontend is built with:

- React 18 + TypeScript + Vite
- MUI, Tailwind CSS, styled-components
- Redux Toolkit + Zustand + React Context
- AWS Amplify (Cognito) for authentication
- Axios-based API services
- Server-Sent Events (SSE) and Socket.io for real-time updates 

Backend APIs are implemented in a **separate repository**.  
This frontend talks to that backend via HTTP (and real-time channels)
using base URLs and paths defined in the frontend services layer and/or
Vite dev proxy configuration. 

---

## 2. Routing & Navigation

Routing is defined under `src/routes/` with a **split routing
architecture**: :contentReference[oaicite:3]{index=3}

- **Public routes**  
  `src/routes/config/publicRoutes.tsx`  
  - Handles unauthenticated entry flows, e.g. `InitialPage`
  - Does not require Cognito authentication

- **Protected routes**  
  `src/routes/config/layoutRoutes.tsx`  
  - Main authenticated app (wrapped by `Layout` component)
  - Requires a valid Cognito session
  - Each feature (Pareto, Fishbone, FTA, Why-Why, Settings, etc.) is
    mounted under this tree

- **KaizenHub routes (community features)**  
  `src/routes/config/kaizenHubRoutes.tsx`  
  - Community / KaizenHub-specific screens
  - Access controlled by roles (e.g. `KAIZENHUB_MAIN_SCREEN`,
    `KAIZENHUB_POST_AND_VIEW`)

The central router component, `src/routes/Routers.tsx`, composes these
configurations and decides which route sets to render based on
authentication/roles. :contentReference[oaicite:4]{index=4}

---

## 3. Authentication & Authorization

Authentication is handled via AWS Amplify + Cognito, with a frontend
flow that validates sessions on app start and stores roles in Redux. 

### 3.1 Auth Flow

1. On app load, the `useCheckAuth` hook (`src/hooks/useCheckAuth.ts`)
   validates the Cognito session (via Amplify).
2. Auth details (user info, roles, tokens/flags) are stored in Redux
   under `authSlice` (`src/store/slices/authSlice.ts`).
3. `Routers.tsx` and route configs use this `auth` state to:
   - Gate access to protected routes
   - Apply role-based access control (RBAC) for KaizenHub features

### 3.2 Auth Header & Token Encryption

Both Axios interceptors and the SSE hook follow the same pattern to
construct an encrypted auth header: 

- Fetch tokens via `fetchAuthSession` from `aws-amplify/auth`
- Encrypt the Cognito ID token and a local `indenty` value using AES
  with a shared secret key
- Build a `Bearer` header that concatenates:
  - Raw access token
  - Encrypted ID token
  - Encrypted `indenty`

This logic lives in:

- `src/services/apis/axiosClient.ts` (Axios interceptors)
- `src/hooks/useSSE.ts` (SSE connection)

When adding new network paths, **reuse this central logic** instead of
reinventing auth headers.

---

## 4. State Management

The app uses a **hybrid state model** combining Redux Toolkit, Zustand,
and React Context. 

### 4.1 Redux Toolkit

Global application state is managed by Redux Toolkit in
`src/store/store.ts`. Key slices include:

- `auth` – authentication, user profile, roles, sessions
- `pareto`, `fta`, `whywhy`, `diagram` – feature-specific data
- `settings`, `layout` – UI preferences, theme/layout toggles
- `error`, `file`, `tree` – shared cross-cutting state

Redux is the canonical place for:

- Data shared across multiple pages/features
- Auth and user/session information
- Layout & settings that affect the whole app

### 4.2 Zustand

Zustand is used for **lightweight local state** where Redux would be
overkill, typically within a single feature or component cluster.

Use cases include:

- Local tool state inside a complex editor
- Short-lived UI state not needed elsewhere

### 4.3 React Context

React Context is used for tree-scoped shared state such as:

- `BreadcrumbContext` – sharing breadcrumb information across nested
  routes/components

When deciding where to store new state:

1. If it must be accessible app-wide → **Redux**
2. If it belongs to a local UI cluster only → **Zustand or component
   state**
3. If it needs to be shared across a subtree with clear boundaries →
   **Context**

---

## 5. Feature-Based Structure

KaizenHub uses a **feature-first folder structure** under
`src/features/`: 

```text
src/features/
├── auth/           # Authentication UI
├── diagram/        # Fishbone diagram tools
├── fta/            # Fault Tree Analysis
├── kaizen-hub/     # Community & KaizenHub-specific features
├── pareto/         # Pareto chart tools
├── settings/       # User settings
└── whywhy/         # Why-Why analysis with AI chat
```

A typical feature folder contains:

* `components/` – React components for this feature
* `hooks/` – feature-specific hooks
* `types.ts` – TypeScript types/interfaces
* `utils/` – feature helpers/utilities
* Redux slice (if needed) under `src/store/slices/<feature>Slice.ts`

When adding a new major capability, prefer to:

1. Create a new folder under `src/features/<feature-name>/`
2. Add a route under the appropriate routes config
3. Add a Redux slice if the feature needs global state
4. Add services under `src/services/apis/` if backend interaction is
   required

---

## 6. API Services Architecture

All HTTP communications with the backend are centralized in
`src/services/apis/`.

Key components:

* `axiosClient.ts`

  * Configured Axios instance
  * Injects auth headers using the encrypted token scheme
  * Applies common interceptors (error handling, logging, etc.)

* `baseService.ts`

  * Base class encapsulating common CRUD patterns
  * Provides shared helpers for feature services

* Feature services (e.g., `fishboneService`, `whyWhyService`,
  `ftaService`, etc.)

  * Extend `baseService`
  * Implement feature- and domain-specific API calls

During development, Vite can proxy certain paths (e.g. `/api`) to the
backend dev server (running from the **separate backend repository**).
The proxy is configured in `vite.config.ts`.

When adding a new API endpoint:

1. Extend the relevant service or create a new one
2. Reuse the shared `axiosClient`
3. Add TypeScript types for request/response payloads
4. Handle errors in a way compatible with existing error slices & hooks

---

## 7. Real-Time Communication

KaizenHub uses two main real-time mechanisms: **Server-Sent Events
(SSE)** for AI streaming and **Socket.io** for collaborative diagram
editing.

### 7.1 SSE (AI Streaming)

The `useSSE` hook (`src/hooks/useSSE.ts`) manages streaming responses,
primarily for Why-Why analysis.

Features:

* Auto-reconnection with exponential backoff for network errors
* Idle timeout detection (e.g., no events > 60s)
* Keepalive messages to avoid ALB or proxy timeouts
* Type-safe discriminated union for SSE message types
* Buffering and parsing of partial messages

Error classification:

* 401/403 → fatal (no retry)
* 429 with `Retry-After` → obey server’s retry window
* 5xx / network errors → handled with backoff and limited retries

Callers must pass full error objects to `onError` to preserve HTTP
status for this classification.

### 7.2 Socket.io (Collaboration)

Real-time collaboration for Fishbone diagrams uses Socket.io via the
`useFishboneSocket` hook (`src/hooks/useFishboneSocket.ts`).

Guidelines:

* Use SSE for **streaming AI responses** and long-running server
  computations.
* Use Socket.io for **multi-user, low-latency collaborative editing**.
* Avoid mixing SSE and Socket.io responsibilities in the same feature
  unless absolutely necessary.

---

## 8. Layout System

The authenticated app uses a **three-column layout** implemented in
`src/components/layout/Layout.tsx`.

```text
+----------+------------------+---------------+
| Sidebar  |     Header       | Right Panel   |
| (70-280px| (64px height)    | (300-350px)   |
|          +------------------+               |
|          | Main Content     |               |
|          | (Outlet)         |               |
|          |                  |               |
+----------+------------------+---------------+
```

* **Sidebar**

  * Collapsible navigation
  * 280px expanded, 72px collapsed
  * On mobile/tablet: overlay mode

* **Header**

  * Fixed 64px height
  * Contains breadcrumbs, global actions, and feature-level controls

* **Main Content**

  * React Router `<Outlet />` mounting feature screens
  * Standardized padding and background

* **Right Panel**

  * 300–350px width on desktop
  * Optional; used for logs, details, or AI context
  * Hidden or toggled away on smaller viewports

Responsive behavior is implemented using MUI breakpoints and
`useMediaQuery`. 

---

## 9. Environment & Configuration

This **frontend repository** is intentionally light on environment
variables:

* There is currently **no dedicated `.env.example` specific to this
  repo**.
* Environment-specific configuration for the backend (URLs, secrets,
  Cognito pool IDs, etc.) is managed in the **separate backend
  repository and/or infrastructure configuration**, not here.
* The frontend typically:

  * Uses relative paths (e.g. `/api/...`) which are proxied in dev via
    `vite.config.ts`.
  * Relies on deployment-time configuration (e.g. reverse proxy,
    environment-specific base URLs) set up outside this repo.

When you need to point the frontend to a different backend environment:

1. Prefer changing the proxy/base URL configuration (e.g. in
   `vite.config.ts` or deployment config).
2. Coordinate environment variables and secrets with the **backend repo
   or infra**; avoid adding secret values directly to this frontend
   repository.

Local development is typically:

```bash
npm install
npm run dev
```

with the backend running from its own repository (on a known port or
URL) and proxied or configured accordingly.

---

## 10. Extending the Architecture

When adding new capabilities, follow these patterns:

1. **New feature**

   * Create `src/features/<feature>/` with `components/`, `hooks/`,
     `types.ts`, etc.
   * Add routes in `src/routes/config/layoutRoutes.tsx` (or
     `kaizenHubRoutes.tsx` if appropriate).
   * Add Redux slice if the feature has global/shared state.

2. **New API integration**

   * Add or extend a service under `src/services/apis/`.
   * Use `axiosClient` for all HTTP calls.
   * Ensure auth headers follow the existing encryption pattern.

3. **New real-time behavior**

   * Prefer integrating with existing `useSSE` or Socket hooks.
   * If new real-time mode is needed, implement it as a focused hook and
     document its behavior here.

4. **Cross-cutting changes**

   * For large or risky changes (auth, routing, core state), create an
     ExecPlan under `.ai/plans/tmp/` and follow the planning discipline
     described in `.ai/plans/PLANS.md`.

Keep this document in sync as the architecture evolves. If you introduce
a new major subsystem (e.g., new analysis engine, report builder), add a
short section describing where its code lives, how it interacts with
existing features, and how it should be extended.