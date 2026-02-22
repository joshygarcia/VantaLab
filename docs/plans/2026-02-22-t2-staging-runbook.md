# T-2 Staging Runbook

## 1) Configure staging secrets

Create/update these Google Secret Manager secrets used by `.github/workflows/deploy.yml`:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `REDIS_URL`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

For GitHub -> GCP authentication, configure one option:

- Preferred: `WIF_PROVIDER` + `WIF_SERVICE_ACCOUNT`
- Fallback: `GCP_CREDENTIALS_JSON`

Create/update these Vercel project env vars for staging:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 2) Apply database migrations to staging

From repo root:

```bash
npm install
npm run prisma:migrate:deploy --workspace apps/api
```

If staging was previously bootstrapped with `prisma db push` (existing tables, no migration history), baseline first:

```bash
npx prisma migrate resolve --schema apps/api/prisma/schema.prisma --applied 20260222_init
npm run prisma:migrate:deploy --workspace apps/api
```

## 3) Deploy services

- Trigger `.github/workflows/deploy.yml` from GitHub Actions.
- Confirm API deploy logs include successful migration step.
- Confirm Vercel build and deploy complete.

## 4) Configure Stripe staging webhook

- Endpoint: `https://<staging-api-domain>/api/v1/billing/stripe/webhook`
- Events: `payment_intent.succeeded`
- Save generated signing secret to `STRIPE_WEBHOOK_SECRET` (staging).

## 5) Smoke test checklist

- Login/session works in staging app.
- Billing checkout creates a payment intent.
- Webhook call is accepted with valid signature.
- Credit balance increases once after successful payment.
- Replaying same webhook does not double-credit.
- Billing transaction appears in history UI.
