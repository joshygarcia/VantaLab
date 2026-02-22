# Persona Engine MVP (Localhost)

This repository now includes a first runnable MVP with:

- `apps/web`: Next.js canvas UI (React Flow)
- `apps/api`: NestJS workflow API
- Native Node.js background async workflow processing
- Prisma + PostgreSQL persistent workflow and billing records

## Prerequisites

- Node.js 20+
- npm 10+

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Initialize API database client/schema (first run):

```bash
npm run db:setup --workspace apps/api
```

### Required environment setup

- API env: copy `apps/api/.env.example` to `apps/api/.env` and set values.
- Web env: copy `apps/web/.env.example` to `apps/web/.env.local` and set values.
- Billing requires Stripe keys:
  - API: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Web: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

3. Start web + api together:

```bash
npm run dev
```

4. Open the app:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## MVP flow

1. Open `/canvas/local`
2. Click **Generate Video**
3. The node goes to `processing`
4. After a few seconds, the job resolves with a sample media URL

## Notes

- Workflow and billing data are persisted in PostgreSQL via `DATABASE_URL`.
- Queue processing has been simplified to run in-memory within the NestJS process.
- Workflow endpoints require a JWT bearer token with workspace scope.
- The web app auto-mints a dev token via `POST /api/v1/auth/dev-token` per workspace.
- Set `JWT_SECRET` to replace the local default signing key.
