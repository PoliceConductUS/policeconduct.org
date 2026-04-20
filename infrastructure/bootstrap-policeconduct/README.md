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

If you want the full infrastructure bootstrap in the correct order across stacks, run the repo-level wrapper from the project root:

```bash
bash scripts/bootstrap-all.sh
```

That wrapper runs reCAPTCHA bootstrap first and then this stack.

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

Or use the single wrapper from repo root:

```bash
bash scripts/bootstrap-all.sh
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

Verification email is sent from `noreply@mail.policeconduct.org` by default.
The forms Lambda currently sends verification email through Resend using `RESEND_API_KEY`.
Terraform still creates the SES identity verification and DKIM records under `mail.policeconduct.org`.
Terraform also configures a custom SES MAIL FROM domain at `bounce.mail.policeconduct.org` by default, with the required MX and SPF records.
Terraform creates a DMARC TXT record for `_dmarc.mail.policeconduct.org` and defaults it to monitoring mode (`p=none`).
Terraform also enables SES Virtual Deliverability Manager, creates a dedicated verification email configuration set, and publishes verification email events to the default EventBridge bus.
Custom MAIL FROM can remain in `Pending` for a while after apply while SES checks DNS. AWS documents that this can take up to 72 hours, though Route 53 changes are often detected sooner.

## Resend Domain Bootstrap

- create or look up the Resend sending domain for `forms_email_verification_domain`
- keep open/click tracking disabled
- fetch the required DNS records from Resend
- create those DNS records in Route 53 automatically

The values are fixed in this repo:

- sending domain: `mail.policeconduct.org`
- SES custom MAIL FROM: `bounce.mail.policeconduct.org`
- tracking host, if you ever enable it later in code: `links.mail.policeconduct.org`

If a previous bootstrap wrote incorrect doubled-`mail` Route 53 records such as
`send.mail.mail.policeconduct.org`, rerunning
`bash infrastructure/bootstrap-policeconduct/scripts/apply.sh` will replace the
managed records with the corrected names and delete the old managed records as
part of the same apply.

`infrastructure/bootstrap-policeconduct/scripts/apply.sh` now loads `.env-policeconduct` and maps `RESEND_API_KEY` into the Terraform input used by the forms Lambda. The same shell environment is used by the Resend bootstrap script, so keeping `RESEND_API_KEY` in `.env-policeconduct` is enough for the normal apply flow.

Key split:

- `RESEND_API_KEY`: send-only key used by the forms Lambda verification-email path
- `RESEND_API_KEY_FULL_ACCESS`: full-access key used only by `scripts/bootstrap-resend-domain.mjs` for Resend Domains API calls

`apply.sh` expects both keys to be present in `.env-policeconduct` or the shell environment.

Example:

```bash
export PATH=/opt/homebrew/bin:$PATH
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh
```

To inspect or verify the domain manually, you can also run:

```bash
source .env-policeconduct
node scripts/bootstrap-resend-domain.mjs --apply
```

If you want to trigger a Resend verification pass manually after DNS changes:

```bash
source .env-policeconduct
node scripts/bootstrap-resend-domain.mjs --verify
```

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

If set, Terraform creates `PUBLIC_SENTRY_DSN` and `PUBLIC_SENTRY_ENVIRONMENT` in the matching GitHub environment.
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
  - Verification email send failures and verification email preparation failures for both preview and production
- Configure `alert_email_endpoints` to have Terraform create and wire an SNS topic for alarm notifications automatically.
- You can still add extra alarm destinations directly with `alarm_actions`.
- AWS still requires each email recipient to confirm the SNS subscription from the confirmation email before notifications start arriving.
- SES verification-email infrastructure remains provisioned, but the forms Lambda currently sends verification email through Resend.
- SES Virtual Deliverability Manager is enabled account-wide with engagement metrics and optimized shared delivery.

## Preview Forms API Logs

Tail recent preview Lambda logs:

```bash
aws logs tail /aws/lambda/policeconduct-forms-api-preview --region us-east-1 --since 15m --follow
```

Filter for verification, origin, and request errors:

```bash
aws logs tail /aws/lambda/policeconduct-forms-api-preview --region us-east-1 --since 15m \
  | rg 'ERROR|forms\.submit\.|forms\.verify\.|forms\.request\.error|origin_rejected'
```

Look up one request by request ID:

```bash
aws logs tail /aws/lambda/policeconduct-forms-api-preview --region us-east-1 --since 1h \
  | rg '<request-id>'
```

Useful message keys for this flow:

- `forms.submit.verification_email_failed`
- `forms.submit.verification_email_not_sent`
- `forms.submit.origin_rejected`
- `forms.verify.success`
- `forms.request.error`
