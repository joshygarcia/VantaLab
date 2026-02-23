# T-2 Staging Runbook

## Execution Status (2026-02-22)

Staging/production-like deploy flow has been executed successfully.

## 1) Secrets and auth configuration

Configured in GitHub and GCP Secret Manager for deploy/runtime:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `REDIS_URL`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

GitHub -> GCP auth is configured via WIF:

- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`

Vercel deploy auth is pinned to the correct project with:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 2) Database migration and schema state

- Prisma migration baseline applied for `20260222_init`.
- Schema synchronized in Supabase after baseline.
- Billing tables verified present and serving traffic (`UserCreditBalance`, `CreditTransaction`).

## 3) Deploy services

- `.github/workflows/deploy.yml` is passing on `main`.
- API deploy logs show successful Prisma migration step.
- Vercel build + deploy complete for `persona-web`.

## 4) Stripe webhook configuration

- Endpoint URL: `https://persona-api-cahsiez3nq-ue.a.run.app/api/v1/billing/stripe/webhook`
- Event: `payment_intent.succeeded`
- Endpoint ID: `we_1T3kEAD5imEvK000sFtfyq3p`
- `STRIPE_WEBHOOK_SECRET` synced to GitHub + GCP Secret Manager.

## 5) Smoke test checklist

Completed:

- Login/session works in deployed app.
- Billing checkout creates payment intents.
- Webhook accepted with valid signature.
- Credit balance increases once after successful payment.
- Replay webhook does not double-credit (idempotency verified).
- Billing transaction appears in history data.

Recent validated payment simulation for user `367bc4f1-6be2-4b19-993e-d9854df36e17`:

- Payment Intent: `pi_3T3lagD5imEvK00000TDJ09n`
- Credits delta: `+500`
- Transaction ID: `cmlycllm90003s601iqgsvnyk`

Replay verification result:

- Same payment intent replayed through signed webhook payload.
- Balance unchanged and transaction count unchanged.
