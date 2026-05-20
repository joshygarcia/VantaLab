# Vanta Lab — Production AI Workflow SaaS

**A node-based studio for generating image and video content from reusable AI workflows, with credit-based billing and production-grade cloud deployment.**

- 🌐 **Live app:** https://www.vanta-lab.com
- 🔌 **Live API:** https://vanta-api-883406816411.us-central1.run.app/api/v1/health
- 📦 **Repo:** https://github.com/joshygarcia/VantaLab

---

## Project Overview

Most creators juggle prompting, generation, and asset management across half a dozen disconnected tools. Vanta Lab unifies that workflow into a single visual studio where you compose reusable AI building blocks — text prompt nodes, image generators, video generators, agent nodes — on an infinite canvas, then run the whole pipeline with one click.

Behind the scenes it's a real production SaaS: multi-tenant workspaces, Google sign-in, async job orchestration with idempotent execution, Stripe credit monetization with replay-safe webhook settlement, and a split deployment across Vercel (web) and Google Cloud Run (API).

---

## Technologies Used

**Frontend** ([apps/web](apps/web))
- Next.js 15 + React 19 (App Router)
- Tailwind CSS, GSAP animations
- React Flow (node-based canvas editor)
- Zustand (state management)
- Firebase JS SDK (Auth + Firestore realtime listeners)
- Stripe Elements (checkout)

**Backend** ([apps/api](apps/api))
- NestJS 10 + TypeScript (30+ REST endpoints across auth/workflows/workspaces/billing/api-keys/analytics)
- firebase-admin (auth verification + Firestore data + Cloud Storage)
- Server-Sent Events for live job status; idempotency keys for safe retries
- Stripe SDK with atomic webhook settlement
- helmet, throttling, strict CORS, role-based admin guard

**Data & infra**
- Cloud Firestore — 7 collections with full CRUD, atomic transactions, custom indexes
- Cloud Storage for Firebase — generated media + element library assets
- Firebase Authentication — Google OAuth + HttpOnly session cookies
- Google Cloud Run — containerized API behind an autoscaling URL
- Google Artifact Registry + Cloud Build — image build & registry
- Google Secret Manager — runtime secret injection (JWT, Firebase SA, Stripe)
- Vercel — Next.js web hosting + edge middleware
- GitHub Actions — CI typecheck/tests + automated deploys

**External**
- Kie.ai — multi-model AI generation gateway (Kling 3.0, VEO, Grok Video, nano-banana, Seedream)
- Stripe — payment intents + webhooks

---

## How It Maps to the Assignment

| Requirement | Implementation |
|---|---|
| **Frontend** (responsive, React, interactivity) | Next.js 15 / React 19 / Tailwind. React Flow canvas with drag-drop, dynamic routing per workspace, popup auth modal, GSAP-animated landing. |
| **Backend** (≥2 API endpoints, routing, business logic) | NestJS 10 with **30+ endpoints**. Guards, DTO validation, throttling, SSE streams, Stripe webhook signature verification. |
| **Database** (CRUD) | Cloud Firestore via firebase-admin. Collections: `users`, `workspaces`, `workflowJobs`, `apiKeys` (+ `usage` subcoll), `creditBalances` (+ `transactions` subcoll), `klingElementsLibrary`. Full create/read/update/delete with `runTransaction` for atomic billing settlement. |
| **API integration** (fetch + error handling) | Web sends `Authorization: Bearer <Firebase-ID-token>` on every API call. Idempotency-Key headers prevent double-charges. SSE streaming with polling fallback. Structured Nest exceptions surface user-safe error messages. |
| **Deployment** (public URL) | Web on Vercel → https://www.vanta-lab.com. API on Google Cloud Run → https://vanta-api-883406816411.us-central1.run.app. |
| **Git & README** | Active commit history with descriptive messages; iterative PRs; this README. |

---

## Architecture Snapshot

```
┌───────────────────────────────┐         ┌───────────────────────────────┐
│  Vercel — Next.js 15 web      │  HTTPS  │  Cloud Run — NestJS 10 API    │
│  https://www.vanta-lab.com    │ ──────► │  vanta-api-*.run.app/api/v1   │
│  • React Flow studio          │  Bearer │  • JwtAuthGuard               │
│  • Firebase Auth (popup)      │   IDtok │  • WorkspaceAccessGuard       │
│  • Stripe Elements            │         │  • Stripe webhook (raw body)  │
└───────────────────────────────┘         └──────┬────────────────────────┘
        │                                        │
        │ onSnapshot (canvasEvents)              │ admin SDK
        ▼                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Firebase: Auth · Firestore · Cloud Storage  (project: vanta-lab-prod)    │
│  Secret Manager: JWT, Firebase SA JSON, Stripe keys, Frontend URL         │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                          Kie.ai (AI generation gateway)
```

---

## Installation / Setup

### Prerequisites
- Node.js 20+, npm 10+
- A Firebase project (Auth + Firestore + Storage enabled)
- A Firebase Admin service-account JSON

### Local dev
```bash
git clone https://github.com/joshygarcia/VantaLab.git
cd VantaLab
npm install

# Drop your service-account key at:
#   apps/api/firebase-service-account.json   (gitignored)

# Copy env templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Then fill in Firebase + Stripe values

# Run both apps
npm run dev
# → web at http://localhost:3000
# → api at http://localhost:4000/api/v1/health
```

### Optional: Firebase emulator suite
```bash
npm run emulators --workspace apps/api
# Auth :9099  ·  Firestore :8080  ·  Storage :9199  ·  UI :4001
```

### Tests
```bash
npm run test --workspace apps/api          # 28 Jest specs
npx tsc -p apps/api/tsconfig.json --noEmit # API typecheck
npx tsc -p apps/web/tsconfig.json --noEmit # web typecheck
```

---

## My Process & What I Learned

### The migration I'm most proud of

Mid-project I migrated the entire data plane from **Supabase Auth + Realtime + Storage + Prisma/Postgres → Firebase Auth + Firestore + Cloud Storage** without losing the production-critical guarantees:

- **Stripe idempotency preserved.** The old code relied on a Postgres `UNIQUE` constraint on `stripePaymentIntentId`. The new code uses `db.runTransaction()` + Firestore `.create()` on a document keyed by PaymentIntent ID — `ALREADY_EXISTS` errors get swallowed silently, exactly replicating the SQL behavior. No risk of double-crediting on webhook replays.
- **Atomic credit settlement.** The old workflow spend used a serializable Postgres transaction with conditional `decrement`. Replaced with a Firestore `runTransaction` that reads current balance and writes only if sufficient — single round trip, no race condition.
- **Prisma-shaped facade.** Rather than rewriting every service call site, I built a [`DbService`](apps/api/src/modules/database/db.service.ts) that exposes a Prisma-like API (`workspace.findUnique`, `workflowJob.create`, etc.) backed by Firestore admin SDK. ~1000 lines once, then every service only needed an import swap.
- **Realtime canvas sync re-platformed.** Supabase channel broadcasts → Firestore `onSnapshot` listeners on an ephemeral `workspaces/{id}/canvasEvents` subcollection with TTL cleanup and self-echo filtering.
- **Auth re-platformed.** Supabase OAuth + JWT → Firebase Google popup + HttpOnly session cookie (created server-side via `admin.auth().createSessionCookie()`) + ID-token bearer for API calls.
- **Zero downtime to ship.** Existing data was disposable (test only), but the rollout still used staged verification: smoke-test Firestore writes, smoke-test Storage uploads, then re-deploy and cut traffic.

### Things I learned the hard way

- **PowerShell 5.1 writes UTF-16 with BOM by default.** I created my Secret Manager secrets via PowerShell pipes and `FIREBASE_PROJECT_ID` ended up as `﻿vanta-lab-prod`. Every `verifyIdToken()` failed with 401 because the audience claim mismatched. Always pipe via Bash or `Out-File -Encoding utf8NoBOM`.
- **Cloud Run caches secret values at revision creation.** Updating a secret version is silent until you force a new revision. I now bake an env-var bump (`FORCE_RELOAD=<timestamp>`) into deploys.
- **Vercel rewrites are deceptive.** Setting `NEXT_PUBLIC_API_URL` to the web origin loops requests back to Next.js and 404s. The actual fix is pointing it at the Cloud Run URL with the `/api/v1` suffix included.
- **Firestore composite indexes need to be declared up front** (`firestore.indexes.json`), or your first sorted query in prod throws and gives you a 1-click "create index" URL — fine for dev, embarrassing in front of users.

### AI tools used to build this

- **Claude (Claude Code in the terminal)** — paired with me for the entire Supabase→Firebase migration: exhaustively mapped every Supabase touchpoint, drafted the `DbService` Firestore facade, rewrote the auth guard, regenerated CI workflows and `.env.example` files across 8 files, and ran the actual GCP/Firebase CLI commands (project creation, service account, IAM bindings, Cloud Build, Cloud Run deploy). Also wrote big chunks of this README.
- **GitHub Copilot** — inline completions across the React Flow node implementations and DTO validators.
- **ChatGPT** — sanity-checking the Firestore data model (Stripe idempotency strategy, composite index design) before committing to the rewrite.

The AI didn't write the app *for* me — it accelerated the parts that were already clear, surfaced things I'd missed (BOM in secrets, the Cloud Run secret-caching gotcha above), and let me execute a multi-day migration in a single focused session. Picking when to delegate to it and when to drive manually was its own skill.

---

## Repository Layout

```
apps/
  api/                         NestJS backend
    src/modules/
      auth/                    Firebase ID-token guard + role resolution
      billing/                 Stripe payment intents + idempotent webhook settlement
      database/                Firestore-backed DbService (Prisma-shaped facade)
      firebase/                Admin SDK bootstrap (Firestore + Auth + Storage)
      workflows/               Async job queue, Kie.ai provider, SSE streaming
      workspaces/              Canvas state, custom spaces, element library
      analytics/, api-keys/    Admin tooling
  web/                         Next.js 15 frontend
    src/
      app/                     App Router pages + /api routes
      components/              Studio UI, canvas nodes, admin dashboards
      hooks/useRealtimeSync.ts Firestore onSnapshot canvas broadcasts
      lib/firebase/            Browser + admin Firebase helpers
packages/types/                Shared TypeScript types
firebase.json, firestore.*     Firebase emulator + rules + indexes
.github/workflows/             CI + dev/prod deploy automation
```

---

## Deployment

| Surface | Where | Trigger |
|---|---|---|
| Web | Vercel (`vanta-lab` project) | Push to `main` → auto-deploy |
| API | Google Cloud Run (`vanta-api` in `vanta-lab-prod`, region `us-central1`) | `.github/workflows/deploy.yml` on push to `main` |
| Firestore rules + indexes | Firebase (`vanta-lab-prod`) | `firebase deploy --only firestore` |
| Storage rules | Firebase (`vanta-lab-prod`) | `firebase deploy --only storage` |

Runtime config lives in Google Secret Manager (referenced by [deploy.yml](.github/workflows/deploy.yml)):
`JWT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`.

---

## Resume-Ready Highlights

- Built and shipped a production AI SaaS (Next.js + NestJS) with a visual node-based workflow studio, Firebase Auth + Firestore + Storage, and Stripe credit monetization.
- Implemented asynchronous AI generation orchestration with idempotent execution, SSE status streaming, polling fallback, and multi-key provider load balancing.
- Designed Stripe webhook settlement that survives replays via atomic Firestore transactions keyed on PaymentIntent ID.
- Delivered a split production deployment (Vercel + Google Cloud Run) with GitHub Actions CI/CD, Secret Manager runtime config, and documented rollout runbooks.
- Migrated the entire data plane (Supabase + Prisma/Postgres → Firebase Auth + Firestore + Cloud Storage) end-to-end without losing idempotency or auth guarantees.

---

## License & Acknowledgments

Built solo as my Immersive Engineering Lab capstone. AI generation powered by [Kie.ai](https://kie.ai). UI inspiration credit to React Flow's example gallery.
