# Persona Deployment Execution Checklist

Use this checklist to coordinate final implementation, staging validation, launch, and post-launch verification.

Legend:
- Status: `todo` | `in_progress` | `done` | `blocked`
- Owner: assign a person/team name

Last updated: 2026-02-22

## T-3 Days: Code Freeze Prep

| Status | Owner | Task |
|---|---|---|
| done | AI | Fix API compile blockers in `apps/api/src/modules/workflows/workflows.service.ts:35` and `apps/api/src/modules/workspaces/workspaces.service.ts:194` and `apps/api/src/modules/workspaces/workspaces.service.ts:307`. |
| done | AI | Replace mock billing UI data in `apps/web/src/app/(studio)/billing/page.tsx:8` with API-backed balance and transactions. |
| done | AI | Add API billing read endpoints (balance and transactions) and wire frontend calls. |
| done | AI | Add test coverage for webhook signature handling, idempotent crediting, and transaction persistence correctness. |
| done | AI | Align docs and env setup notes (README and env examples). |

### T-3 Validation Commands

- `npm run build --workspace apps/api` (done)
- `npm run test --workspace apps/api` (done)
- `npm run build --workspace apps/web` (done)

## T-2 Days: Staging Readiness

| Status | Owner | Task |
|---|---|---|
| done | AI | Create Prisma migration for billing schema updates (production-safe migration path). |
| done | AI | Apply migration to staging database and verify schema integrity. |
| done | AI | Ensure staging API secrets are configured: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. |
| done | AI | Ensure staging web env vars are configured: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. |
| done | AI | Update deployment workflow secrets wiring in `.github/workflows/deploy.yml` for Stripe vars. |
| done | AI | Deploy API to staging Cloud Run. |
| done | AI | Configure Stripe staging webhook endpoint to `/api/v1/billing/stripe/webhook`. |

### T-2 Staging Smoke Tests

| Status | Owner | Test |
|---|---|---|
| done | You | Auth/session login works via Supabase. |
| done | AI | Payment intent creation works from billing flow. |
| done | AI | Webhook events are received and signature verification passes. |
| done | AI | Credits increase exactly once for successful payment. |
| done | AI | Retried/replayed webhook does not double-credit. |
| in_progress | You | Billing page shows updated balance and transaction row. |

## T-1 Day: Production Dry Run

| Status | Owner | Task |
|---|---|---|
| done | AI | Confirm full CI passes on `main`. |
| done | AI | Tag release candidate. |
| done | AI | Rehearse rollback (Cloud Run revision rollback + webhook disable path). |
| done | AI | Verify monitoring and alerts (API 5xx, webhook failures, payment processing errors). |
| done | AI | Confirm CORS/URL alignment (`FRONTEND_URL` and production web domain). |

## Launch Day

| Status | Owner | Task |
|---|---|---|
| done | AI | Apply Prisma migration to production database. |
| done | AI | Deploy API to production Cloud Run. |
| done | AI | Deploy web to production Vercel with production env vars. |
| done | AI | Configure Stripe production webhook endpoint and signing secret. |
| in_progress | You | Run production smoke flow with a low-value real transaction. |
| in_progress | You | Monitor logs and metrics closely for 30-60 minutes after deploy. |

## Post-Launch: First 24 Hours

| Status | Owner | Task |
|---|---|---|
| done | AI | Reconcile successful Stripe payments vs `CreditTransaction` records. |
| done | AI | Spot-check user balances for correctness. |
| done | AI | Review and resolve failed webhook events/retries. |
| done | AI | Capture and prioritize follow-up fixes. |

## Follow-up Items

| Priority | Status | Owner | Item |
|---|---|---|---|
| High | todo | You | Attach notification channels (email/PagerDuty/Slack) to Cloud Monitoring alert policies. |
| High | todo | You | Run MCP host "list servers" and confirm Google Cloud Run MCP server is connected. |
| Medium | todo | You | Verify billing UI row visually after hard refresh on `https://persona-web-kohl.vercel.app/billing`. |
| Medium | todo | You | If launching in live mode, run one true live Stripe low-value purchase and reconcile. |
| Medium | todo | You | Enable Supabase RLS for billing tables and keep service-role-only access policies. |
