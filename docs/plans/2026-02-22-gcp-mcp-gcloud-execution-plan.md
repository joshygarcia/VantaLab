# GCP WIF + Deploy Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure Google Cloud authentication, deployment prerequisites, and staging deploy flow using MCP + `gcloud`, then validate end-to-end billing behavior.

**Architecture:** Use `gcloud` CLI as the source of truth for provisioning IAM/WIF/Cloud resources. Use MCP as the operational interface for inspecting Cloud Run services/logs/revisions after deployment. Keep GitHub Actions as the deployment orchestrator.

**Tech Stack:** Google Cloud Run, Workload Identity Federation (WIF), IAM, Artifact Registry, Secret Manager, GitHub Actions, Stripe, Supabase, Prisma.

---

## Task 1: Prepare local operator environment

**Files:**

- Reference: `.github/workflows/deploy.yml`
- Reference: `docs/plans/2026-02-22-t2-staging-runbook.md`

**Step 1: Verify required CLIs are available**

Run:

```bash
gcloud --version
gh --version
```

Expected:

- Both commands return versions.

**Step 2: Verify MCP server is loaded after restart**

Run your MCP host's "list servers" command and confirm the Google Cloud Run server is present.

Expected:

- Google Cloud Run MCP server appears as connected/available.

**Step 3: Authenticate tools**

Run:

```bash
gcloud auth login
gh auth login
```

Expected:

- Authenticated sessions for both CLIs.

---

## Task 2: Set environment variables for setup session

**Step 1: Export setup variables**

```bash
export PROJECT_ID="<your-project-id>"
export REGION="us-east1"
export GITHUB_REPO="<org>/Persona"

export POOL_ID="github-pool"
export PROVIDER_ID="github-provider"
export DEPLOY_SA_NAME="github-deploy"

export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export DEPLOY_SA_EMAIL="${DEPLOY_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
export RUNTIME_SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

**Step 2: Set active project**

```bash
gcloud config set project "$PROJECT_ID"
```

Expected:

- Active project is your deployment project.

---

## Task 3: Bootstrap required GCP services and registry

**Step 1: Enable required APIs**

```bash
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com
```

**Step 2: Ensure Artifact Registry repo exists**

```bash
gcloud artifacts repositories describe persona --location "$REGION" >/dev/null 2>&1 || \
gcloud artifacts repositories create persona \
  --repository-format=docker \
  --location="$REGION" \
  --description="Persona Docker images"
```

Expected:

- `persona` Docker repository exists in the target region.

---

## Task 4: Configure WIF + Service Account

**Step 1: Create deploy service account (if missing)**

```bash
gcloud iam service-accounts describe "$DEPLOY_SA_EMAIL" >/dev/null 2>&1 || \
gcloud iam service-accounts create "$DEPLOY_SA_NAME" --display-name="GitHub Deploy SA"
```

**Step 2: Grant deploy permissions**

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/secretmanager.viewer"

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA_EMAIL" \
  --member="serviceAccount:$DEPLOY_SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

**Step 3: Create Workload Identity Pool and Provider**

```bash
gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global >/dev/null 2>&1 || \
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" >/dev/null 2>&1 || \
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor,attribute.workflow=assertion.workflow" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}' && assertion.ref=='refs/heads/main'"
```

**Step 4: Bind GitHub repo principal to deploy SA**

```bash
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

**Step 5: Capture WIF provider resource name**

```bash
WIF_PROVIDER="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --format='value(name)')"

echo "$WIF_PROVIDER"
```

Expected:

- A value like `projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`.

---

## Task 5: Configure GitHub Actions secrets

**Step 1: Set required auth secrets**

```bash
gh secret set GCP_PROJECT_ID --body "$PROJECT_ID"
gh secret set WIF_PROVIDER --body "$WIF_PROVIDER"
gh secret set WIF_SERVICE_ACCOUNT --body "$DEPLOY_SA_EMAIL"
```

Optional fallback auth:

```bash
# Only if you choose JSON key auth fallback
gh secret set GCP_CREDENTIALS_JSON --body "$(cat /path/to/key.json)"
```

**Step 2: Set deploy runtime secrets (if not already set)**

Set these in GitHub secrets to match your workflow usage:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `REDIS_URL`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## Task 6: Seed/refresh GCP Secret Manager values

**Step 1: Upsert secrets used by Cloud Run deploy step**

For each required secret, create once then add versions on updates.

Example pattern:

```bash
printf '%s' "$DATABASE_URL" | gcloud secrets create DATABASE_URL --replication-policy=automatic --data-file=- 2>/dev/null || \
printf '%s' "$DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=-
```

Repeat for all names used in `.github/workflows/deploy.yml` under `secrets:`.

Expected:

- All required secrets exist with current versions.

---

## Task 7: Trigger deploy and validate

**Step 1: Trigger deploy workflow**

```bash
gh workflow run Deploy --ref main
gh run watch
```

Expected:

- `Validate GCP auth configuration` passes.
- `google-github-actions/auth@v2` succeeds.
- `Run Prisma migrations` succeeds.
- API and web deploy jobs both complete.

**Step 2: Verify API health**

```bash
curl -sS https://<api-domain>/api/v1/health
```

Expected:

- JSON response with `status: ok`.

---

## Task 8: Post-deploy staging validation (MCP + CLI)

**Step 1: Use MCP to inspect Cloud Run service**

- List services in region and confirm `persona-api` revision is latest.
- Inspect recent logs for 4xx/5xx spikes.

**Step 2: CLI fallback checks**

```bash
gcloud run services describe persona-api --region "$REGION" --format='value(status.url,status.traffic)'
gcloud run revisions list --service persona-api --region "$REGION"
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="persona-api" AND severity>=ERROR' --limit=50 --freshness=1h
```

**Step 3: Stripe webhook setup**

- Endpoint: `https://<api-domain>/api/v1/billing/stripe/webhook`
- Event: `payment_intent.succeeded`
- Save webhook signing secret as `STRIPE_WEBHOOK_SECRET`.

**Step 4: Billing smoke tests**

- Login succeeds.
- Payment intent creation succeeds.
- Webhook accepted and processed.
- Credits increment exactly once.
- Replayed webhook does not double-credit.
- Transaction appears on billing page.

---

## Success Criteria

- GitHub Deploy workflow succeeds without auth failures.
- Cloud Run API is healthy and serving new revision.
- Prisma migration step is successful in deploy logs.
- Stripe webhook path is active and idempotent.
- Billing UI reflects live balance/transactions after payment.
