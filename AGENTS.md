---
description: 
alwaysApply: true
---

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
  - `apps/api`: NestJS 10 + Prisma + SQLite backend.
- Shared package: `packages/types`.

## 2) Rules Files (Cursor / Copilot)
Checked in this repository (current state):
- `.cursor/rules/` -> not present.
- `.cursorrules` -> not present.
- `.github/copilot-instructions.md` -> not present.

If any of these files are later added:
- Treat them as higher-priority instructions than this file.
- Re-check and update this AGENTS.md summary.

## 3) Prerequisites and Setup
- Node.js 20+ and npm 10+.
- Install dependencies from repo root:
```bash
npm install
```
- First-time API setup (Prisma client + DB push):
```bash
npm run db:setup --workspace apps/api
```

## 4) Development Commands
- Run both services together:
```bash
npm run dev
```
- Run only API:
```bash
npm run dev:api
```
- Run only web:
```bash
npm run dev:web
```
- Default local URLs:
  - Web: `http://localhost:3000`
  - API: `http://localhost:4000`

## 5) Build, Lint, Typecheck, and Test

### Build
- Build all workspaces:
```bash
npm run build
```
- Build API only:
```bash
npm run build --workspace apps/api
```
- Build web only:
```bash
npm run build --workspace apps/web
```

### Lint / Typecheck
- There is currently no lint script in root/app package scripts.
- Use `build` as the default quality gate.
- Optional explicit type checks:
```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

### Test
- API is the only workspace with tests configured (`jest`).
- Run full API suite:
```bash
npm run test --workspace apps/api
```
- Run one test file:
```bash
npm run test --workspace apps/api -- src/modules/auth/auth-and-guards.spec.ts
```
- Run one test by exact/specific name:
```bash
npm run test --workspace apps/api -- -t "returns 401 for /api/v1/auth/me without token"
```
- Jest config: `apps/api/jest.config.js`.
- Test pattern: `*.spec.ts` (`testRegex: .*\.spec\.ts$`).

## 6) Environment and Data Notes
- API local SQLite DB lives at `apps/api/prisma/dev.db`.
- API may create JSON stores under `apps/api/data/` at runtime.
- Never commit secrets from real `.env` files.
- `JWT_SECRET` can override the default local signing key behavior.

## 7) Code Style and Conventions

### General
- Keep strict typing (`strict: true`) intact in API and web.
- Keep functions focused and composable.
- Avoid unrelated refactors while implementing scoped changes.

### Formatting
- Follow the existing style in each touched file.
- Current codebase pattern is mostly:
  - 2-space indentation
  - semicolons
  - single quotes
- Do not mass-format untouched files.

### Imports
- Prefer import grouping: external packages first, internal modules second.
- In web app code, prefer alias imports from `@/*` over deep relative paths.
- Remove unused imports.

### Types
- Add explicit types at module boundaries.
- Prefer `type` aliases for object/union shapes in web code.
- Use DTO classes + `class-validator` decorators for API request validation.
- Avoid `any`; use `unknown` and narrow.
- Reuse existing shared/local types before adding duplicates.

### Naming
- `PascalCase`: React components, Nest classes, DTO classes.
- `camelCase`: variables, functions, methods, hooks, object fields.
- `UPPER_SNAKE_CASE`: constants and enum-like values.
- Keep file naming consistent with existing patterns:
  - Next App Router: `app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
  - Nest: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`, `*.guard.ts`.

### React / Next.js
- Use `'use client';` only for client components that require hooks/browser APIs.
- Keep route/page files orchestration-focused.
- Memoize expensive derived values and stable callbacks when beneficial.
- Keep user-facing status and error copy concise and actionable.
- Preserve existing visual language from `apps/web/src/app/globals.css`.

### NestJS / API
- Keep controllers thin and delegate business logic to services.
- Throw Nest HTTP exceptions for expected client-facing failures.
- Keep persistence in Prisma services/helpers and avoid leaking DB concerns to controllers.
- Use defensive parsing for optional/untrusted JSON payloads.

### Error Handling
- Return actionable messages for expected failures.
- API: prefer typed Nest exceptions (`BadRequestException`, `UnauthorizedException`, etc.).
- API internals: throw/log `Error` with context.
- Web: catch async errors, keep fallback messages user-safe, and maintain UI state consistency.

### Testing Conventions
- Use Jest + Supertest for API behavior and guard tests.
- Prefer behavior-focused test names (`returns 401 when ...`).
- Keep tests deterministic and isolated.
- During iteration: run single file or `-t` target first, then full suite.
