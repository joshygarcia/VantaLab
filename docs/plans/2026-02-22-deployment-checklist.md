# Persona Deployment Execution Checklist

Use this checklist to coordinate final implementation, staging validation, launch, and post-launch verification.

Legend:
- Status: `todo` | `in_progress` | `done` | `blocked`
- Owner: assign a person/team name

## T-3 Days: Code Freeze Prep

| Status | Owner | Task |
|---|---|---|
| todo |  | Fix API compile blockers in `apps/api/src/modules/workflows/workflows.service.ts:35` and `apps/api/src/modules/workspaces/workspaces.service.ts:194` and `apps/api/src/modules/workspaces/workspaces.service.ts:307`. |
| todo |  | Replace mock billing UI data in `apps/web/src/app/(studio)/billing/page.tsx:8` with API-backed balance and transactions. |
| todo |  | Add API billing read endpoints (balance and transactions) and wire frontend calls. |
| todo |  | Add test coverage for webhook signature handling, idempotent crediting, and transaction persistence correctness. |
| todo |  | Align docs and env setup notes (README and env examples). |

### T-3 Validation Commands

- `npm run build --workspace apps/api`
- `npm run test --workspace apps/api`
- `npm run build --workspace apps/web`

## T-2 Days: Staging Readiness

| Status | Owner | Task |
|---|---|---|
| done | AI | Create Prisma migration for billing schema updates (production-safe migration path). |
| blocked | AI | Apply migration to staging database and verify schema integrity. |
| blocked | You | Ensure staging API secrets are configured: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. |
| blocked | You | Ensure staging web env vars are configured: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. |
| done | AI | Update deployment workflow secrets wiring in `.github/workflows/deploy.yml` for Stripe vars. |
| blocked | You | Deploy API to staging Cloud Run. |
| blocked | You | Configure Stripe staging webhook endpoint to `/api/v1/billing/stripe/webhook`. |

### T-2 Staging Smoke Tests

| Status | Owner | Test |
|---|---|---|
| blocked | You | Auth/session login works via Supabase. |
| blocked | You | Payment intent creation works from billing UI. |
| blocked | You | Webhook events are received and signature verification passes. |
| blocked | You | Credits increase exactly once for successful payment. |
| blocked | You | Retried/replayed webhook does not double-credit. |
| blocked | You | Billing page shows updated balance and transaction row. |

## T-1 Day: Production Dry Run

| Status | Owner | Task |
|---|---|---|
| blocked | You | Confirm full CI passes on `main`. |
| blocked | You | Tag release candidate. |
| blocked | You | Rehearse rollback (Cloud Run revision rollback + webhook disable path). |
| blocked | You | Verify monitoring and alerts (API 5xx, webhook failures, payment processing errors). |
| done | AI | Confirm CORS/URL alignment (`FRONTEND_URL` and production web domain). |

## Launch Day

| Status | Owner | Task |
|---|---|---|
| todo |  | Apply Prisma migration to production database. |
| todo |  | Deploy API to production Cloud Run. |
| todo |  | Deploy web to production Vercel with production env vars. |
| todo |  | Configure Stripe production webhook endpoint and signing secret. |
| todo |  | Run production smoke flow with a low-value real transaction. |
| todo |  | Monitor logs and metrics closely for 30-60 minutes after deploy. |

## Post-Launch: First 24 Hours

| Status | Owner | Task |
|---|---|---|
| todo |  | Reconcile successful Stripe payments vs `CreditTransaction` records. |
| todo |  | Spot-check user balances for correctness. |
| todo |  | Review and resolve failed webhook events/retries. |
| todo |  | Capture and prioritize follow-up fixes. |
