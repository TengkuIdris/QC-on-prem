# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- **Goal for Claude**
  - Understand what this project is and how it is structured.
  - Know exactly how to set up, run, test, and deploy it.
  - Follow the architectural and testing conventions described here.
  - For complex features or significant refactors, always use an **ExecPlan** as described in `.ai/plans/PLANS.md`.

- **Important**
  - Do **not** run production builds locally.
  - Use local `.env` for development.
  - Use `sample_env.md` to understand production settings and AWS deployment configuration.

---

## 1. Project Overview

This is the **JATCO backend API** – a **NestJS-based** application for a **Kaizen Hub platform** that provides problem analysis tools:

- WhyWhy / 5 Why analysis
- Fishbone diagrams
- Pareto charts
- FTA

The application includes **AI-powered features** via an external AI service.

### 1.1 Tech Stack

- NestJS (Node.js >= 18.0.0)
- PostgreSQL with Prisma ORM
- Redis for caching and Bull queues
- AWS Cognito for authentication
- AWS S3 for file storage
- AWS SES for email
- Socket.IO for real-time features
- External AI service for analysis (configured via `AI_SERVICE_URL`)

---

## 2. Local Development

### 2.1 Minimal Setup Flow

When starting work locally, follow this order:

1. Install dependencies  
   ```bash
   yarn
```

2. Start Docker services (PostgreSQL, etc.)

   ```bash
   docker-compose up -d
   ```
3. Run database migrations

   ```bash
   npx prisma migrate deploy
   ```
4. (Optional) Seed database

   ```bash
   yarn seed
   ```
5. Start development server with hot reload

   ```bash
   yarn start:dev
   ```
6. (Optional) Start in debug mode

   ```bash
   yarn start:debug
   ```

### 2.2 Development Commands

#### Formatting

```bash
# Format code
yarn format

# Format a specific file
yarn format:file <file-path>
```

#### Linting

```bash
yarn lint
```

#### Testing

```bash
# Run unit tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run e2e tests
yarn test:e2e

# Generate test coverage
yarn test:cov
```

#### Build

```bash
# Build locally (for verifying the build process)
yarn build
```

> Local builds are for verification only. Production builds are handled by AWS infrastructure.

### 2.3 Database Operations

Use Prisma for all schema and migration operations:

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration (development)
npx prisma migrate dev --name <migration-name>

# Apply migrations (used locally and in AWS deployment)
npx prisma migrate deploy

# Open Prisma Studio to browse the database
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

---

## 3. Deployment & Environment

### 3.1 Deployment Pipeline (AWS)

Production builds and deployments are handled by AWS infrastructure:

* **AWS CodeBuild**

  * Builds Docker images using `buildspec` configuration.
  * Environment variables are passed as Docker build args.
* **AWS ECR**

  * Stores Docker images (e.g. `jatco-be` repository).
* **AWS ECS**

  * Runs containers with task definitions that pull environment variables from:

    * Direct values for non-sensitive config
    * AWS Secrets Manager for sensitive data (credentials, API keys)
    * AWS Systems Manager Parameter Store for shared configuration
* **Google Service Account**

  * Downloaded from S3 during build (`jatco-mzkapp.json`) for Fishbone Assistant API.

**Important:** All production environment variables, `buildspec` configuration, and ECS task definitions are documented in `sample_env.md`. Use that file to understand:

* CodeBuild environment variables and `buildspec.yml` structure
* ECS task definition environment variables (direct values and ARN references)
* The complete deployment pipeline configuration

### 3.2 Local Environment Configuration

For local development, use a `.env` file (see `.env.example`). Do **not** run production builds locally.

Required environment variables for local development include (examples):

* `NODE_ENV` – `development` / `production`
* `APP_PORT` – API port (default: `3001`)
* `APP_PREFIX` – API prefix (default: `/api/v1`)
* `DATABASE_URL` – PostgreSQL connection string
* `POSTGRES_*` – Database credentials
* `REDIS_*` – Redis configuration
* `AWS_*` – AWS Cognito, S3, SES credentials
* `AI_SERVICE_URL` – External AI service endpoint
* `AI_SERVICE_API_KEY` – AI service authentication
* `CORS_ORIGIN` – Allowed CORS origin for production
* `GOOGLE_CLIENT_EMAIL` – Google service account email for Fishbone Assistant
* `GOOGLE_PROJECT_ID` – Google Cloud project ID
* `GOOGLE_ENGINE_ID` – Google custom search engine ID
* `FISHBONE_ASSISTANT_API_URL` – Google AI Platform endpoint

### 3.3 Production Environment Configuration

Production environment variables are managed in AWS and documented in `sample_env.md`:

* **CodeBuild**

  * Environment variables defined in the CodeBuild project and passed as Docker build args.
* **ECS Task Definition**

  * Runtime environment variables provided by:

    * AWS Secrets Manager
    * AWS Systems Manager Parameter Store

Always refer to `sample_env.md` for the complete production configuration.

---

## 4. Architecture

### 4.1 Module Organization

The application follows **NestJS modular architecture** with domain-driven design.

**Core Modules (examples):**

* `auth` – AWS Cognito authentication with JWT guards
* `user` – User management and profiles
* `analysis` – AI-powered problem analysis sessions (SSE streaming)
* `kaizenhub` – Improvement / Kaizen case management
* `fishbone` – Fishbone diagram tool with AI assistant
* `pareto` – Pareto chart analysis
* `fta` – Fault Tree Analysis
* `socket` – Socket.IO real-time communication
* `feedback` – User feedback system
* `categories` – Categorization for improvements
* `related-documents` – Document linking
* `implementation-steps` – Action plan tracking
* `recent-files` – User activity tracking
* `ses` – AWS SES email service
* `audit-log` – Audit trail logging

**Shared Infrastructure:**

* `src/services/` – Shared services (e.g. `PrismaService`, `AiService`, `AnalysisService`, `TokenValidationService`)
* `src/controllers/` – Shared controllers (e.g. `AnalysisController`)
* `src/guards/` – Guards in module directories (`JwtAuthGuard`, `LicenseGuard`, etc.)
* `src/middlewares/` – Security and file protection middleware
* `src/decorators/` – Custom decorators (`@User`, `@Public`)
* `src/interceptor/` – Response transformation
* `src/pipes/` – Validation pipes
* `src/types/` – TypeScript type definitions
* `src/utils/` – Utility functions
* `src/helpers/` – Helper functions
* `src/configs/` – Configuration files (Redis, AWS, etc.)
* `src/constants/` – Application constants
* `src/exceptions/` – Custom exceptions

---

## 5. Key Architectural Patterns

### 5.1 AI Analysis Flow

The `analysis` module implements an **SSE (Server-Sent Events)** streaming pattern:

1. User creates an analysis session → the server calls an external AI service to create a thread.
2. Session is stored in Prisma with status tracking.
3. SSE connection is established for real-time AI response streaming.
4. The AI service sends events (e.g. `analysis_started`, `node_updated`, `analysis_completed`).
5. Events are forwarded to the client via SSE.
6. Session state is synchronized between the AI service and the local database.

### 5.2 Authentication

* AWS Cognito JWT tokens are verified via a Cognito guard.
* `TokenValidationService` validates tokens and extracts user info.
* Guards are placed on controllers/routes.
* Use `@Public()` decorator to bypass auth when needed.
* Socket.IO uses token authentication middleware.

### 5.3 Database Access

* Prisma ORM with PostgreSQL.
* `PrismaService` is injected as a singleton.
* Schema in `prisma/schema.prisma`.
* Key models include `User`, `Improvement`, `AnalysisSession`, `FishBone`, `Pareto`, `FTA`.
* Soft deletes are used (e.g. `deleted_at` field).

### 5.4 Real-time Communication

* Socket.IO gateway in `src/socket/index.ts`.
* Token-based authentication for socket connections.
* Room-based sessions (e.g. `join_session` events).
* Used for collaborative and real-time features.

### 5.5 File Uploads

* AWS S3 via `@aws-sdk/client-s3`.
* Upload module provides multer configuration.
* Images/documents are stored in S3 buckets.

### 5.6 Caching & Queues

* Redis for caching (`cache-manager` with Redis store).
* Bull queues for background jobs.
* Global cache module configured in `app.module.ts`.

### 5.7 API Response Format

* `ResponseTransformInterceptor` standardizes all responses.
* `createApiResponse` utility for consistent formatting.
* Swagger documentation is available at `/api/v1/swagger`.

### 5.8 Validation

* `class-validator` and `class-transformer` on DTOs.
* Global `ValidationPipe` with `transform` enabled.
* Zod schemas for complex validations (e.g. in `analysis.types.ts`).

---

## 6. Important Implementation Details

### 6.1 Enum Transformations

The AI integration layer maps English enums to Japanese before sending data to the external AI service. Examples:

* **Severity:** `LOW` → 軽微, `MEDIUM` → 中程度, `HIGH` → 重大
* **DefectType:** `APPEARANCE` → 外観, `FUNCTION` → 機能, etc.
* **Frequency:** `FREQUENT` → 多発, `RARE` → 稀, etc.

Maintain these mappings when adding new enum values or fields.

### 6.2 Security Middleware

* `SecurityMiddleware` and `BlockHiddenFilesMiddleware` are applied globally.
* Helmet is configured with CSP disabled where necessary for cross-origin resources.
* CORS is configured based on `NODE_ENV`:

  * Development: allows `*`
  * Production: uses `CORS_ORIGIN`

### 6.3 Path Aliases

Jest is configured with module name mappers, e.g.:

* `src/*` → `<rootDir>/*`
* `modules/*` → `<rootDir>/modules/*`
* `prisma/*` → `<rootDir>/../prisma/*`

When importing in source code, prefer relative paths or clear root-based paths from `src/`.

---

## 7. Testing Strategy

* Unit tests are placed alongside source files (`*.spec.ts`).
* E2E tests live in the `test/` directory.
* Jest is configured with `ts-jest`.
* Use a `PrismaService` mock for database tests where appropriate.
* Auth tests in `src/modules/auth/auth.spec.ts` provide patterns to follow.

New features should include:

* Unit tests for core logic.
* E2E tests when behavior is user-visible or spans multiple modules.
* Tests for failure cases, not only the happy path.

---

## 8. ExecPlans / AI Plans and Agents

For **complex features or significant refactors**, work must be driven by an **ExecPlan** rather than ad-hoc prompts.

This repository already provides:

* `.agent/AGENTS.md` – high-level agent usage and workflow notes (Codex-oriented, but conceptually shared).
* `.ai/plans/PLANS.md` – the canonical specification for ExecPlans in this repo.
* `.ai/plans/tmp/` – concrete ExecPlan files for individual tasks.

### 8.1 Locations and Naming

* ExecPlan specification: `@.ai/plans/PLANS.md`
* New ExecPlan files: create under
  `.ai/plans/tmp/YYYY-MM-DD-short-task-name.md`

  Example:

  * `.ai/plans/tmp/2025-11-16-fishbone-improvement.plan.md`

Follow this naming pattern consistently so both Claude and other agents can discover plans automatically.

### 8.2 How Claude should use ExecPlans

When you (Claude) work on a non-trivial change (new feature, major refactor, risky migration):

1. **Check for an existing ExecPlan**

   * Look under `.ai/plans/tmp/` for a relevant plan.
   * If one exists, open it via `@.ai/plans/tmp/<file-name>.md`.

2. **If no plan exists, propose creating one**

   * Suggest a new file in `.ai/plans/tmp/` using the naming scheme above.
   * Draft the plan structure and content according to `.ai/plans/PLANS.md`:

     * Self-contained (all necessary context inside the plan).
     * Understandable to a complete novice to this repo.
     * Outcome-focused (clear, observable behavior and how to verify it).
     * Includes sections for progress, surprises/discoveries, decisions, and outcomes.

3. **While implementing a plan**

   * Treat the ExecPlan as the single source of truth for the task.
   * Do **not** ask the user for “what next?” when the plan already defines milestones; move to the next step yourself.
   * Keep these sections updated as work proceeds (names taken from PLANS.md, do not rename them):

     * `Progress`
     * `Surprises & Discoveries`
     * `Decision Log`
     * `Outcomes & Retrospective`
   * Record all major design decisions and unexpected findings directly in the ExecPlan before or alongside code changes.
   * Ensure the plan always explains:

     * Why the change matters (user-visible perspective).
     * Exact commands to run (tests, dev server, etc.) and the expected outputs.
     * File paths, modules, and any non-obvious terms used.

4. **After completing major work**

   * Update the `Outcomes & Retrospective` section to describe:

     * What was achieved.
     * What remains.
     * Lessons learned or risks.

ExecPlans are **living documents**: any time implementation changes direction, update the plan so that future contributors (or agents) can restart work with only that ExecPlan and the repository checkout.

### 8.3 Relationship with `CLAUDE.md` and `AGENTS.md`

* This `CLAUDE.md` describes project-specific rules (NestJS structure, env setup, testing, etc.).
* `.agent/AGENTS.md` describes more general agent usage patterns and when to reach for ExecPlans.
* For any substantial work:

  1. Read/refresh `CLAUDE.md` (this file) to obey project conventions.
  2. Read/refresh `@.ai/plans/PLANS.md` to obey ExecPlan rules.
  3. Use or create an ExecPlan in `.ai/plans/tmp/` and keep it up to date.

By following these rules, Codex agents and Claude Code share a **neutral ExecPlan format** and workflow, making it easier to switch tools while keeping design and implementation aligned.