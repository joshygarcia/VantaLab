# Vanta Lab Application Documentation

## 1. Overview

Vanta Lab is a full-stack AI content studio for building and running image/video generation workflows.

The application combines:

- a Next.js 15 + React 19 web app (`apps/web`) for product UI, studio workflows, and billing
- a NestJS 10 API (`apps/api`) for auth, workflow jobs, workspace data, billing logic, and admin endpoints
- a PostgreSQL database (via Prisma) for durable workflow and billing records
- Supabase for user authentication (Google OAuth) and realtime canvas sync broadcast

Primary UX flow:

1. User signs in with Supabase.
2. User enters a workspace canvas and composes nodes.
3. A media node is executed through the API.
4. The API queues and processes the job asynchronously against Kie.ai endpoints.
5. Job status streams back to the canvas; generated media is previewed and can be downloaded.

---

## 2. Monorepo Structure

```text
Persona/
  apps/
    api/        NestJS + Prisma backend
    web/        Next.js frontend
  packages/
    types/      Shared TypeScript types
  docs/
    plans/      Rollout plans, dry-run/staging runbooks, deployment checklist
```

Key scripts are defined in root `package.json` and workspace `package.json` files.

---

## 3. Product Surfaces (Web Routes)

### Public

- `/`
  - Marketing/landing page with pricing preview and CTA into the studio.
  - Sign-in modal uses Supabase Google OAuth.
- `/auth/callback`
  - Exchanges OAuth code for session and redirects to `/dashboard` (or `next` query target).
- `/auth/auth-code-error`
  - Fallback page for failed/expired auth-code exchanges.

### Studio (authenticated via middleware)

- `/dashboard`
  - Entry hub into Projects, Spaces, Library, Creator Lab.
- `/projects`
  - Client-side project and space organizer (localStorage-backed project metadata).
- `/spaces`
  - Template spaces + API-backed custom spaces CRUD.
- `/library`
  - API-backed Kling elements library management.
- `/element-creator-lab`
  - Prompt-builder + direct generation + save-to-library flow.
- `/canvas/:id`
  - React Flow canvas workspace for node-based generation.
- `/billing`
  - Credit balance, package purchase, transaction history.

### Admin

- `/admin?secret=<ADMIN_SECRET>`
  - Developer/admin dashboard for KPIs, API keys, and system logs.
  - Access gate is query-secret based (MVP guard).

---

## 4. Authentication and Access Model

### Web auth

- Supabase session cookies are managed via `@supabase/ssr` in middleware/server helpers.
- Protected route prefixes in `apps/web/src/middleware.ts`:
  - `/canvas`, `/dashboard`, `/spaces`, `/library`, `/projects`, `/element-creator-lab`, `/billing`, `/admin`

### API auth

`JwtAuthGuard` accepts three token sources:

1. Supabase access token (validated via Supabase `auth.getUser`)
2. locally signed JWT (validated with `JWT_SECRET`)
3. dev override token (`NEXT_PUBLIC_DEV_JWT`) when not in production

`WorkspaceAccessGuard` enforces workspace-level access for workflow operations.

### Dev token flow

- `POST /api/v1/auth/dev-token` mints a short-lived token (12h) with workspace scope.
- Frontend API utility falls back to this flow if no Supabase session is present and no explicit `NEXT_PUBLIC_DEV_JWT` is set.

---

## 5. Canvas Runtime and Workflow Execution

The canvas is built with React Flow + Zustand store (`apps/web/src/store/canvas-store.ts`).

### Node families

- Text and list nodes:
  - `text`, `prompt-list`, `image-list`
- Generation nodes:
  - `image-generator`, `video-generator`
- Structured helper nodes:
  - `multi-shot-prompt`, `kling-elements`, `identity-vault`, `download`
- Legacy/general nodes:
  - `media`, `assistant`, `upscaler`, `upload`, `assets`, `inspiration`, `group`

### Run behavior (high level)

When `Run Pipeline` is triggered from the selected runnable media node:

1. The canvas resolves upstream connected prompt/image/auxiliary nodes.
2. It derives execution parameters (model, prompt, aspect ratio, duration, mode, etc.).
3. It calls `POST /api/v1/workflows/execute` with an idempotency key.
4. It subscribes to SSE updates (`/workflows/jobs/:jobId/events`).
5. On SSE failure, it falls back to polling (`GET /workflows/jobs/:jobId`).
6. Result media is appended to node history and preview updates.

### Batching

- Prompt List + Image List can drive batched iterations in a single run loop.
- Multi-shot constraints are bounded to max 15 seconds total duration.

---

## 6. Backend API Reference

Base path: `/api/v1`

### Health

- `GET /health`
  - Returns status, timestamp, and uptime.

### Auth

- `POST /auth/dev-token`
  - Create dev token with optional `userId` and `workspaceIds`.
- `GET /auth/me`
  - Returns authenticated claims.

### Workflows

- `POST /workflows/execute` (auth + workspace guard)
  - Queue workflow execution.
- `GET /workflows/jobs/:jobId` (auth + workspace guard)
  - Get job state.
- `GET /workflows/jobs/:jobId/events` (SSE)
  - Stream live job updates.

### Workspaces

- `PUT /workspaces/:id/settings`
  - Save workspace-level Kie API key.
- `GET /workspaces/:id/kling-elements-library`
  - Fetch library items.
- `PUT /workspaces/:id/kling-elements-library`
  - Replace library items.
- `POST /workspaces/:id/files/upload`
  - Upload base64 image to Kie file endpoint.
- `GET /workspaces/:id/spaces`
  - List custom spaces (incl. shared team spaces).
- `POST /workspaces/:id/spaces`
  - Create custom space.
- `PATCH /workspaces/:id/spaces/:spaceId`
  - Update custom space.
- `DELETE /workspaces/:id/spaces/:spaceId`
  - Delete custom space.

### Billing

- `GET /billing/balance`
  - Current credit balance.
- `GET /billing/transactions?limit=50`
  - Credit transaction history.
- `POST /billing/payment-intents`
  - Create Stripe PaymentIntent from package.
- `POST /billing/stripe/webhook`
  - Stripe webhook receiver and credit settlement.

### Admin

- `GET /admin/analytics/kpi`
  - KPI aggregates.
- `GET /admin/analytics/logs`
  - Recent workflow job logs.
- `POST /admin/api-keys`
  - Add provider API key.
- `GET /admin/api-keys`
  - List API keys.
- `PATCH /admin/api-keys/:id/status`
  - Activate/deactivate key.
- `DELETE /admin/api-keys/:id`
  - Remove key.

---

## 7. Workflow Processing Internals

Primary service: `WorkflowQueueService`.

### Queue model

- Current queue is in-process "fire-and-forget" background execution.
- Redis env (`REDIS_URL`) exists for future queue backends but is not currently used by the active job loop.

### Provider routing

- Veo path: `https://api.kie.ai/api/v1/veo/generate` + polling `veo/record-info`
- Unified path: `https://api.kie.ai/api/v1/jobs/createTask` + polling `jobs/recordInfo`

### Key selection/load balancing

- Provider keys come from `ApiKey` table.
- Service picks next active key by oldest `lastUsedAt`.
- Usage is logged to `ApiUsageLog` and key usage counters are incremented.

### Idempotency

- `WorkflowJob.idempotencyKey` is unique.
- Payload fingerprint conflicts return `409` to prevent mismatched replays.

---

## 8. Billing and Credits

Credit packages (USD cents):

- `starter`: 500 credits / 500 cents
- `creator`: 1000 credits / 1000 cents
- `pro`: 5500 credits / 5000 cents
- `studio`: 11500 credits / 10000 cents

### Purchase flow

1. Billing page requests `POST /api/create-payment-intent` (Next route handler).
2. Route creates Stripe PaymentIntent with package/user metadata.
3. Stripe client confirms payment in Checkout modal.
4. Stripe sends webhook to API `/api/v1/billing/stripe/webhook`.
5. API verifies signature, validates amount/package, and applies credits in transaction.

### Webhook idempotency

- `CreditTransaction.stripePaymentIntentId` is unique.
- Duplicate webhook deliveries are safely ignored after first successful credit settlement.

---

## 9. Data Layer

### Primary database (Prisma/PostgreSQL)

Main models in `apps/api/prisma/schema.prisma`:

- `WorkflowJob`
  - generation jobs, statuses, media URL, idempotency key
- `Workspace`
  - workspace metadata and optional workspace-level Kie key
- `ApiKey`
  - provider key pool for load balancing
- `ApiUsageLog`
  - per-call cost and status logging
- `UserCreditBalance`
  - current credit balance per user
- `CreditTransaction`
  - immutable purchase/credit settlement records

### JSON stores

Workspace library/spaces are persisted in JSON files under `apps/api/data/`:

- `kling-elements-library.json`
- `custom-spaces.json`

These files are created lazily at runtime if missing.

---

## 10. Realtime Collaboration

Hook: `apps/web/src/hooks/useRealtimeSync.ts`

- Channel: `workspace-<workspaceId>`
- Broadcast events:
  - `canvas:nodes-change` (position/size)
  - `canvas:edges-change` (edge graph)
  - `canvas:full-sync` (full graph)
- Sender IDs prevent local echo.
- Position updates are debounced for drag performance.

---

## 11. Environment Variables

### API (`apps/api/.env`)

Required:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional / environment-specific:

- `REDIS_URL`
- `FRONTEND_URL` (CORS allowlist origin)
- `KIE_FILE_UPLOAD_BASE_URL` (defaults to `https://kieai.redpandaai.co`)
- `JSON_BODY_LIMIT`, `URLENCODED_BODY_LIMIT`

### Web (`apps/web/.env.local`)

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Optional:

- `NEXT_PUBLIC_DEV_JWT` (local-only convenience)
- `STRIPE_SECRET_KEY` (required by Next route `POST /api/create-payment-intent`)
- `ADMIN_SECRET` (for `/admin?secret=...`)

---

## 12. Local Development

Prerequisites:

- Node.js 20+
- npm 10+

Setup:

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:setup --workspace apps/api
npm run dev
```

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

---

## 13. Testing and Quality Gates

### API tests

```bash
npm run test --workspace apps/api
```

Targeted API test examples:

```bash
npm run test --workspace apps/api -- src/modules/auth/auth-and-guards.spec.ts
npm run test --workspace apps/api -- -t "returns 401 for /api/v1/auth/me without token"
```

### Type checks

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

### Build checks

```bash
npm run build
```

Notes:

- No dedicated lint script is currently configured.
- Web test runner is not currently configured.

---

## 14. Deployment Architecture

### Hosting split

- Web: Vercel (`apps/web`)
- API: Google Cloud Run (`apps/api`)
- CI/CD: GitHub Actions (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`)

### Deploy workflow behavior

On push to `main`:

1. API image is built and pushed to Artifact Registry.
2. Prisma migrations are deployed in CI step.
3. Cloud Run service is deployed with runtime secrets.
4. Web is built and deployed through Vercel CLI, pinned by `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`.

### Runbooks and rollout docs

- `docs/plans/2026-02-22-gcp-mcp-gcloud-execution-plan.md`
- `docs/plans/2026-02-22-t1-dry-run-runbook.md`
- `docs/plans/2026-02-22-t2-staging-runbook.md`
- `docs/plans/2026-02-22-deployment-checklist.md`

---

## 15. Known Limitations and Notes

- Admin UI components currently fetch hardcoded localhost API URLs (`http://localhost:4000/...`) and need environment-based API base URL wiring for deployed admin usage.
- Billing has two payment-intent entry points (`/api/create-payment-intent` in web and `/api/v1/billing/payment-intents` in API); the billing page currently uses the web route.
- JSON file stores in `apps/api/data/` are local filesystem based and may need redesign for multi-instance/stateless production behavior.
- Redis is declared but not currently used by the active workflow queue path.

---

## 16. Troubleshooting Quick Reference

- `401 Unauthorized` on API calls:
  - Check Supabase session, bearer token forwarding, or dev-token fallback.
- `403 Forbidden` on workflow execution:
  - Ensure token workspace scope includes requested `workspaceId`.
- Stripe webhook returns `400`:
  - Verify raw-body handling route and matching `STRIPE_WEBHOOK_SECRET`.
- Workflow stuck or failed:
  - Verify active provider API keys in admin key pool and check recent logs in admin dashboard/API logs endpoint.
