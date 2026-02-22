# T-1 Production Dry Run Runbook

## Completed locally (AI)

- `npm run build` passed.
- `npm run test --workspace apps/api` passed with required env vars (`JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- CORS config is wired through `FRONTEND_URL` secret in deploy workflow.

## Remaining operator steps

## 1) Confirm CI on `main`

- Push branch and merge to `main`.
- Confirm `.github/workflows/ci.yml` succeeds on `main`.

## 2) Tag release candidate

From a machine with git history and a clean merged commit:

```bash
git checkout main
git pull
git tag -a v0.1.0-rc.1 -m "Release candidate 1"
git push origin v0.1.0-rc.1
```

## 3) Rehearse rollback (Cloud Run + Stripe)

### 3.1 Cloud Run revision rollback drill

```bash
gcloud run revisions list --service persona-api --region us-east1
gcloud run services describe persona-api --region us-east1 --format='value(status.traffic)'
```

Pick previous healthy revision and route 100% traffic to it:

```bash
gcloud run services update-traffic persona-api --region us-east1 --to-revisions <PREVIOUS_REVISION>=100
```

Verify:

```bash
curl -sS https://<api-domain>/api/v1/health
```

### 3.2 Stripe webhook disable drill

- In Stripe Dashboard, locate staging/prod webhook endpoint.
- Confirm you can temporarily disable and re-enable it.
- Confirm secret rotation procedure (replace `STRIPE_WEBHOOK_SECRET` in secret manager, redeploy API).

## 4) Monitoring and alert checks

Verify dashboards/alerts exist for:

- API 5xx error rate
- Billing webhook 4xx/5xx rate
- Payment processing failures (application log filter on billing errors)

Recommended quick checks:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="persona-api" AND severity>=ERROR' --limit=50 --freshness=1h
```

If no alert policies exist yet, create them before launch.
