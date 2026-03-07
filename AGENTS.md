---
description:
alwaysApply: true
---

# AGENTS.md

Guidance for autonomous coding agents working in `Persona`.

MUST DO: Always check available skills/tools that may help the current task and use them when relevant.

## 1) Repository Scope
- Monorepo managed with npm workspaces.
- Workspace globs: `apps/*`, `packages/*`.
- Main apps:
  - `apps/web`: Next.js 15 + React 19 frontend.
  - `apps/api`: NestJS 10 + Prisma backend.
- Shared package: `packages/types` (shared TypeScript types).

## 2) Rules Files (Cursor / Copilot)
Current repository state (verified):
- `.cursor/rules/`: not present.
- `.cursorrules`: not present.
- `.github/copilot-instructions.md`: not present.

If any of these files are added later:
- Treat them as higher-priority instructions than this file.
- Re-check this file and update this section.
- Keep this section accurate for future agents.

## 3) Prerequisites and First-Time Setup
- Node.js 20+ and npm 10+ are required.
- Install dependencies: `npm install`.
- Copy env templates: `cp apps/api/.env.example apps/api/.env` and `cp apps/web/.env.example apps/web/.env.local`.
- Generate Prisma client + sync schema: `npm run db:setup --workspace apps/api`.

## 4) Development Commands
- Run both services: `npm run dev`.
- Run only API: `npm run dev:api`.
- Run only web: `npm run dev:web`.
- Default local URLs:
  - Web: `http://localhost:3000` (web dev script can auto-pick next open port).
  - API: `http://localhost:4000`.

## 5) Build, Lint, Typecheck, and Test

### Build
- Build all workspaces: `npm run build`.
- Build API only: `npm run build --workspace apps/api`.
- Build web only: `npm run build --workspace apps/web`.

### Lint / Typecheck
- No dedicated lint script exists in root or workspace scripts.
- Use build + typecheck as the quality gate.
- Typecheck commands: `npx tsc -p apps/api/tsconfig.json --noEmit` and `npx tsc -p apps/web/tsconfig.json --noEmit`.

### Test
- Only API has automated tests configured (Jest + Supertest).
- Run full API suite: `npm run test --workspace apps/api`.
- Run a single test file: `npm run test --workspace apps/api -- src/modules/auth/auth-and-guards.spec.ts`.
- Run a single test by exact name: `npm run test --workspace apps/api -- -t "returns 401 for /api/v1/auth/me without token"`.
- Run one file + one test name: `npm run test --workspace apps/api -- src/modules/workflows/workflows.service.spec.ts -t "queues a job when available credits include pending reservation"`.
- Jest config: `apps/api/jest.config.js`.
- API test file pattern: `*.spec.ts`.
- Web has no automated tests configured.

## 6) Environment and Data Notes
- Prisma datasource is PostgreSQL (`apps/api/prisma/schema.prisma`), not SQLite.
- API Prisma operations require `DATABASE_URL` and `DIRECT_URL`.
- API also depends on auth/provider env vars (for example `JWT_SECRET`, Supabase keys, Stripe keys).
- Web calls API through `NEXT_PUBLIC_API_URL` (defaults to local API URL in code).
- API may create local JSON stores under `apps/api/data/` at runtime.
- Never commit real secrets or populated `.env` files.

## 7) Code Style and Conventions

### General
- Keep changes scoped; avoid unrelated refactors.
- Preserve strict typing (`strict: true`) in both API and web.
- Prefer small, composable functions and clear module boundaries.

### Formatting
- Follow existing style in each touched file.
- Dominant style is 2-space indentation, single quotes, semicolons.
- Some files intentionally differ; do not mass-reformat untouched files.

### Imports
- Group imports clearly: external packages first, internal modules second.
- In web code, prefer `@/*` alias imports over deep relative paths.
- Remove unused imports/symbols.
- Use `import type` where it improves clarity.

### Types
- Add explicit types at API/web module boundaries.
- Prefer `type` aliases for object/union shapes in web code.
- Use DTO classes + `class-validator` for API request validation.
- Avoid `any`; prefer `unknown` + narrowing.
- Reuse existing shared/local types before adding new duplicates.

### Naming
- `PascalCase`: React components, Nest classes, DTO classes.
- `camelCase`: variables, functions, hooks, methods, object fields.
- `UPPER_SNAKE_CASE`: constants and enum-like values.
- Keep filename conventions consistent:
  - Next App Router: `app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`.
  - Nest: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`, `*.guard.ts`.

### React / Next.js
- Use `'use client';` only when hooks/browser APIs are required.
- Keep page files orchestration-focused; move reusable UI to components.
- Keep server/client boundaries explicit.
- Handle loading/empty/error states with concise user-facing copy.
- Avoid adding new hardcoded localhost endpoints; prefer env-based API URLs.

### NestJS / API
- Keep controllers thin and delegate business logic to services.
- Use typed Nest exceptions for expected client-facing failures.
- Keep persistence logic in service/data layers.
- Parse and validate untrusted JSON defensively.
- Preserve auth/workspace guard behavior when extending endpoints.

### Error Handling
- Return actionable, user-safe messages for expected failures.
- API: prefer `BadRequestException`, `UnauthorizedException`, etc.
- API internals: include useful context when logging unexpected failures.
- Web: catch async failures and keep UI state consistent.

## 8) Testing Conventions
- Prefer behavior-focused test names (`returns 401 when ...`).
- Keep tests deterministic and isolated.
- During iteration: run a single spec or `-t` target first, then full suite.
- When API behavior/contracts change, update/add tests in `apps/api/src/**/*.spec.ts`.

## 9) Agent Workflow Expectations
- Inspect scripts/config in affected workspaces before implementing changes.
- Run the narrowest useful validation command(s) first.
- Do not change unrelated files for formatting/style only.
- If scripts, test layout, or rules files change, update this `AGENTS.md`.

## 10) Quick Validation Sequences
- API change (fast loop): run one targeted spec or `-t` test first, then `npm run test --workspace apps/api`.
- API contract/schema change: run `npm run build --workspace apps/api` and `npx tsc -p apps/api/tsconfig.json --noEmit`.
- Web UI/state change: run `npm run build --workspace apps/web` and `npx tsc -p apps/web/tsconfig.json --noEmit`.
- Cross-workspace change: run `npm run build` before final handoff.
