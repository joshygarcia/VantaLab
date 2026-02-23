# Persona Engine - Production AI Workflow SaaS

TL;DR stack: Next.js 15 + React 19, NestJS 10 + Prisma/PostgreSQL, Supabase Auth/Realtime, Stripe Billing, Google Cloud Run, Vercel, GitHub Actions.

I built Persona Engine to help creators generate image/video content from reusable node-based workflows, with built-in credit billing and production-grade deployment.

- Live app: `https://persona-web-kohl.vercel.app`
- API health: `https://persona-api-cahsiez3nq-ue.a.run.app/api/v1/health`

## What I Built (1-Minute Overview)

- Built and launched a full-stack AI SaaS (Next.js + NestJS) from product UX to cloud deployment.
- Shipped a React Flow studio that turns prompt/media logic into reusable nodes (prompt lists, image lists, multi-shot prompts, identity vault).
- Implemented asynchronous generation orchestration with idempotent jobs, SSE status streaming, and polling fallback.
- Added Stripe credit monetization with webhook-based credit settlement and replay-safe idempotency controls.
- Deployed production on Vercel (web) and Google Cloud Run (api) with GitHub Actions CI/CD and documented rollout runbooks.

## Impact

- Problem: creators often manage prompting, generation, and assets across disconnected tools.
- Solution: Persona Engine unifies that workflow into one studio with reusable creative building blocks and built-in billing.
- Technical complexity: the product combines workspace-scoped auth, async job processing, realtime sync, and idempotent payment settlement across split deployments.

## Product Capabilities

- Supabase-authenticated studio experience (Google OAuth)
- Node-based workflow canvas for text/image/video pipelines
- Kie.ai-powered generation orchestration
- Workspace spaces and Kling elements library management
- Billing dashboard with credit purchases and transaction history
- Admin tooling for KPIs, provider key management, and system logs

## Visual Proof

Captured from the live deployment:

![Persona Engine Pricing Section](docs/persona-pricing.png)

![Persona Engine Preview GIF](docs/persona-preview.gif)

## Architecture Snapshot

- `apps/web` - Next.js 15 + React 19 frontend
- `apps/api` - NestJS 10 + Prisma backend
- `packages/types` - shared TypeScript package
- Supabase - authentication and realtime sync
- PostgreSQL - durable workflow and billing data
- Hosting split - Vercel (web) + Google Cloud Run (api)

## Tech Stack

- Frontend: Next.js 15, React 19, Tailwind CSS, Zustand, React Flow
- Backend: NestJS 10, Prisma, PostgreSQL, Stripe SDK
- Auth and Realtime: Supabase
- Cloud: Google Cloud (Cloud Run, Artifact Registry, Secret Manager)
- CI/CD: GitHub Actions (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`)

## Documentation

- Full app documentation: `docs/app-documentation.md`
- Deployment execution plan: `docs/plans/2026-02-22-gcp-mcp-gcloud-execution-plan.md`
- Dry-run runbook: `docs/plans/2026-02-22-t1-dry-run-runbook.md`
- Staging runbook: `docs/plans/2026-02-22-t2-staging-runbook.md`
- Deployment checklist: `docs/plans/2026-02-22-deployment-checklist.md`

## Resume-Ready Highlights

- Built and launched a full-stack AI SaaS using Next.js, NestJS, Prisma, and Supabase with a node-based workflow studio and Stripe credit monetization.
- Implemented asynchronous media orchestration with idempotent execution, SSE status streaming, polling fallback, and provider API-key load balancing.
- Shipped a production split deployment (Vercel + Google Cloud Run) with CI/CD automation, migration handling, rollout runbooks, and webhook idempotency validation.
