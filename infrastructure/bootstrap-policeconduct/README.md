# Terraform Bootstrap (One-Time Infra)

This is the single Terraform entrypoint for infrastructure.
This stack is for `policeconduct.org` and related application infrastructure.
`iceconduct.org` redirect infrastructure is managed independently in
`infrastructure/bootstrap-iceconduct`.

It creates:

- GitHub OIDC provider
- IAM role for GitHub Actions
- GitHub environments (`production`, `preview`) and environment variables used by workflows
- S3 bucket for Terraform state
- S3 bucket for PR preview content
- Production site bucket
- Production forms drafts/submissions S3 buckets
- Preview forms drafts/submissions S3 buckets
- Separate production and preview Lambda Function URL APIs for `/forms/draft` and `/forms/submit`
- CloudFront `/api/*` routing to the forms Lambda origin
- KMS keys for drafts/submissions PII encryption
- WAFv2 Web ACL (rate limit) on the forms API
- CloudWatch alarms for API/Lambda error and latency signals
- CloudFront distribution + OAC + function
- ACM certificate in `us-east-1` + DNS validation
- Route53 hosted zone + records

## Usage

```bash
cd infrastructure/bootstrap-policeconduct
cp terraform.tfvars.example terraform.tfvars
export GITHUB_TOKEN=<github-token-with-repo-admin-access>
terraform init
bash scripts/apply.sh
```

### Phased Apply (Recommended for Long DNS/ACM setup)

Create buckets/KMS/forms API first, sync `.env`, and start uploads while DNS propagates:

```bash
PHASE=foundation bash scripts/apply.sh
```

Then run full infra:

```bash
PHASE=full bash scripts/apply.sh
```

If `PHASE` is omitted, `scripts/apply.sh` defaults to `full`.

## Dependency Order

Run reCAPTCHA bootstrap first so WIF outputs are available to this stack:

```bash
bash infrastructure/bootstrap-recaptcha/scripts/apply.sh
```

Then run this stack:

```bash
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh
```

If reCAPTCHA apply fails with Google auth errors (`invalid_grant` /
`invalid_rapt`), use the troubleshooting steps in:

- `infrastructure/bootstrap-recaptcha/README.md`

## Using .env

This stack syncs Terraform outputs into `.env-policeconduct` (gitignored).
You can keep local values there and load before Terraform:

```bash
set -a
source .env-policeconduct
set +a
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh
```

Example `.env` keys:

- `GITHUB_TOKEN`
- `GA_MEASUREMENT_ID_PRODUCTION`
- `GA_MEASUREMENT_ID_PREVIEW`
- `SENTRY_DSN_PRODUCTION`
- `SENTRY_DSN_PREVIEW`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `RECAPTCHA_PROJECT_ID`
- `RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`
- `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`
- `RECAPTCHA_WIF_AUDIENCE`
- `DRAFTS_BUCKET`
- `DRAFTS_KMS_KEY_ID`
- `SUBMISSIONS_BUCKET`
- `SUBMISSIONS_KMS_KEY_ID`
- `TF_STATE_BUCKET`
- `AWS_ROLE_ARN`
- `S3_BUCKET`
- `CLOUDFRONT_DIST_ID`

`scripts/apply.sh` runs Terraform apply and then syncs `.env-policeconduct` after each phase.
The sync step comments any existing matching `KEY=...` line in `.env-policeconduct` and appends the latest value from Terraform outputs.
It also writes all outputs as `TF_OUT_<OUTPUT_NAME>` keys (uppercase, non-alphanumeric chars replaced with `_`).
For reCAPTCHA values, sync falls back to `.env-recaptcha` and fails fast if any required key is still missing.
Result: `.env-policeconduct` remains the complete runtime env for local site/forms work.

## Which AWS Account Is Used?

Terraform uses the active AWS credentials in your shell.

```bash
aws sts get-caller-identity
```

Use a specific profile:

```bash
export AWS_PROFILE=<profile-name>
aws sts get-caller-identity
```

## First Domain Delegation

After first apply, update your registrar nameservers:

```bash
terraform -chdir=infrastructure/bootstrap-policeconduct output route53_name_servers
dig +short NS <your-domain>
```

Then re-run `terraform apply` until ACM status is issued.

CloudFront bootstrap is idempotent for names:

- If `${project_name}-oac`, `${project_name}-index-rewrite`, or `${project_name}-preview-router` already exist, Terraform reuses them instead of trying to recreate them.
- If distributions already exist with aliases `${domain_name}` or `*.preview.${domain_name}`, Terraform imports and reuses them.

## DNS Records Included

Bootstrap applies DNS records from `extra_dns_records` in `terraform.tfvars`.

Current default includes Google Workspace MX:

- `@ MX 1 smtp.google.com.`

Add your domain-specific TXT verification/DKIM records in local `terraform.tfvars` under `extra_dns_records` so they are applied with the zone.

## GitHub Environments + Vars

Terraform manages these GitHub environments automatically:

- `production`
- `preview`

And sets these environment variables automatically:

- `production`: `AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`, `FORMS_API_URL`
- `preview`: `AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`, `FORMS_API_URL`

Optional GA inputs in `terraform.tfvars`:

- `ga_measurement_id_production`
- `ga_measurement_id_preview`

If set, Terraform also creates `GA_MEASUREMENT_ID` in the matching GitHub environment.
If unset/null, no GA variable is written and the GA component renders nothing.

Optional Sentry inputs in `terraform.tfvars`:

- `sentry_dsn_production`
- `sentry_dsn_preview`
- `sentry_org`
- `sentry_project`

If set, Terraform creates `SENTRY_DSN` and `SENTRY_ENVIRONMENT` in the matching GitHub environment.
If unset/null, Sentry is not initialized in that environment.
If `sentry_org` and `sentry_project` are set, workflows can upload source maps to Sentry.
If `sentry_auth_token` is set, Terraform also writes `SENTRY_AUTH_TOKEN` as a GitHub environment secret in both `production` and `preview`.

## Notes

- Normal deploys do not run Terraform. GitHub Actions only sync files to S3 and invalidate CloudFront.
- Run Terraform again only when infra changes.

## Draft/Submission Security

- Form drafts and submissions use SSE-KMS with customer-managed KMS keys.
- Bucket policies deny non-TLS access and deny uploads that do not use the expected KMS key.
- Draft bucket versioning is enabled.
- Draft objects are retained in S3 indefinitely.
- Draft read API returns data only when `updatedAt` is within `forms_draft_active_window_seconds` (default `3600`).
- Submission objects are retained indefinitely unless you add a submission lifecycle rule.
- Production and preview forms data are isolated in separate buckets and Lambda endpoints.

## Abuse Protection + Alerting

- Forms API has a WAF rate-based block rule (`forms_api_rate_limit_per_5m` per source IP over 5 minutes) scoped to `/api/*`.
- CloudWatch alarms are created for:
  - Forms API Lambda `Errors`
  - Forms API Lambda p95 `Duration`
  - Forms API Lambda `Throttles`
- Configure `alarm_actions` with SNS topic ARNs (or other supported action ARNs) to receive notifications.
