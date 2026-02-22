# AGENTS.md

Guidance for autonomous coding agents working in `Persona`.

MUST DO: Always check for available skills that could be helpful to the task at hand and use them.

## 1) Repository Scope
- Monorepo using npm workspaces.
- Root workspaces: `apps/*`, `packages/*`.
- Main apps:
  - `apps/web`: Next.js 15 + React 19 frontend.
  - `apps/api`: NestJS 10 + Prisma + SQLite backend.
- Shared package: `packages/types`.

## 2) Rules Files Check (Cursor / Copilot)
- Checked for policy files and found none in this repository.
- `.cursor/rules/` -> not present.
- `.cursorrules` -> not present.
- `.github/copilot-instructions.md` -> not present.
- If these files are added later, treat them as higher-priority instructions and update this file.

## 3) Prerequisites and Setup
- Node.js 20+.
- npm 10+.
- Install dependencies:
```bash
npm install
```
- Initialize API DB/client (first run):
```bash
npm run db:setup --workspace apps/api
```
- `db:setup` runs Prisma generate + Prisma db push.

## 4) Development Commands
- Run both web and API:
```bash
npm run dev
```
- Run API only: `npm run dev:api`
- Run web only: `npm run dev:web`
- Default local URLs:
  - Web: `http://localhost:3000`
  - API: `http://localhost:4000`

## 5) Build, Lint, and Test Commands

### Build
- Build all: `npm run build`
- Build API only: `npm run build --workspace apps/api`
- Build web only: `npm run build --workspace apps/web`
- API build uses `tsc`; web build uses `next build`.

### Lint / Typecheck
- There is currently **no dedicated lint script** in root, API, or web package scripts.
- Use build as the primary quality gate.
- Optional explicit type checks:
```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

### Test
- Run full API test suite:
```bash
npm run test --workspace apps/api
```
- Run a single test file (fast iteration):
```bash
npm run test --workspace apps/api -- src/modules/auth/auth-and-guards.spec.ts
```
- Run a single test by name:
```bash
npm run test --workspace apps/api -- -t "returns 401 for /api/v1/auth/me without token"
```
- Jest config: `apps/api/jest.config.js`.
- Test file pattern: `*.spec.ts`.
- Current repo has API tests only; no web test runner script is configured.

## 6) Environment and Data Notes
- SQLite DB: `apps/api/prisma/dev.db`.
- JSON data stores used by API services:
  - `apps/api/data/kling-elements-library.json`
  - `apps/api/data/custom-spaces.json`
- Never commit secrets from `.env` or `.env.local`.
- `JWT_SECRET` can override local default signing key.

## 7) Code Style and Conventions

### General
- Use TypeScript throughout.
- TS strict mode is enabled in both apps; keep code type-safe.
- Prefer small, composable functions.
- Keep architectural boundaries intact.
- Avoid unrelated refactors.

### Formatting
- Follow the style of the file you are editing.
- Most files use 2-space indentation and semicolons.
- Keep lines readable; break long objects/chains.
- Do not mass-reformat untouched files.

### Imports
- Group imports as external first, internal second.
- In web code, prefer alias imports via `@/*`.
- Remove unused imports.
- Prefer named imports over namespace imports unless needed.

### Types
- Prefer explicit types at module boundaries.
- Web code commonly uses `type` aliases for object shapes/unions.
- API request boundaries use DTO classes with `class-validator`.
- Avoid `any`; use `unknown` plus narrowing when needed.
- Guard optional fields before use.
- Reuse existing types before introducing new duplicate shapes.

### Naming
- `PascalCase`: React components, Nest classes (service/controller/guard), DTO classes.
- `camelCase`: variables, functions, hooks, object fields.
- `UPPER_SNAKE_CASE`: constants/enumeration-like values.
- File naming patterns to keep:
  - Next routes: `app/.../page.tsx`, `layout.tsx`.
  - Nest files: `*.controller.ts`, `*.service.ts`, `*.dto.ts`, `*.guard.ts`.
- CSS classes in global styles are kebab-case.

### React / Next.js
- Add `'use client';` only when browser APIs/hooks are required.
- Keep route pages orchestration-focused.
- Move reusable logic to `src/lib` or reusable components.
- Use `useMemo`/`useCallback` for expensive derived values or stable handlers.
- Keep user-facing status/error text concise.
- Follow existing visual/class patterns in `globals.css` and related style files.

### NestJS / API
- Keep controllers thin; place business logic in services.
- Validate input with DTO decorators.
- Use Nest HTTP exceptions for expected request failures.
- Keep workspace scope/auth checks consistent across endpoints.
- Keep persistence logic centralized (Prisma + JSON store helpers).

### Error Handling
- Return or surface actionable failure messages.
- API: use typed Nest exceptions for client-facing errors.
- API internals: throw/log `Error` with context.
- Web: catch async failures and update status state.
- Use defensive `try/catch` when parsing optional JSON.

### Testing Conventions
- Use Jest + Supertest for API behavior and guard tests.
- Prefer behavior-first test names (for example `returns 401 when ...`).
- Keep tests deterministic and local.
- During iteration: run one file/test first, then full API suite.

## 8) Agent Working Agreement
- Inspect nearby code before editing; match local conventions.
- Touch the smallest practical set of files.
- Validate with targeted commands first, then broader build/test.
- If you add scripts/tools, document them in `package.json` and this file.
- If linting or web tests are added, update section 5.
