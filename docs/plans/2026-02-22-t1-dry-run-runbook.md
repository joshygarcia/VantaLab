# T-1 Production Dry Run Runbook

## Execution Status (2026-02-22)

This runbook has been executed against:

- Project: `persona-prod-488212`
- API: `https://persona-api-cahsiez3nq-ue.a.run.app`
- Web: `https://www.vanta-lab.com`

## Completed checks

- `npm run build` passed.
- `npm run test --workspace apps/api` passed with required env vars (`JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- CI on `main` is green (`.github/workflows/ci.yml` recent runs successful).
- Deploy workflow on `main` is green (`.github/workflows/deploy.yml` recent runs successful).
- Release candidate tag created and pushed: `v0.1.0-rc.1`.

## Rollback rehearsal results

### Cloud Run revision rollback drill

- Revisions verified with `gcloud run revisions list --service persona-api --region us-east1`.
- Traffic switched to previous revision (`persona-api-00005-dfx`) and health stayed `ok`.
- Traffic restored to latest revision (`persona-api-00006-d6d`) and health stayed `ok`.

### Stripe webhook disable drill

- Stripe endpoint `we_1T3kEAD5imEvK000sFtfyq3p` was disabled and re-enabled successfully.
- `STRIPE_WEBHOOK_SECRET` is managed in GitHub + GCP Secret Manager and can be rotated by adding a new secret version and redeploying API.

## Monitoring and alerts

Created alert policies in Cloud Monitoring:

- `Persona API 5xx Requests`
- `Persona Billing Webhook 4xx/5xx`
- `Persona Billing Processing Errors`

Current state:

- Policies are enabled and active.
- No notification channels are attached yet; attach PagerDuty/email/Slack channels before launch.

Policy definitions are tracked in:

- `docs/plans/monitoring/vanta-lab-api-5xx-alert.json`
- `docs/plans/monitoring/vanta-lab-billing-webhook-errors-alert.json`
- `docs/plans/monitoring/vanta-lab-billing-processing-errors-alert.json`

## Remaining manual operator check

- On MCP host, confirm Google Cloud Run MCP server appears connected in "list servers".
