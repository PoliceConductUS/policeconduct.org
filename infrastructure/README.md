# Infrastructure

This repo uses two Terraform entrypoints:

1. `infrastructure/bootstrap` (policeconduct.org foundation + static-site infra)
2. `infrastructure/bootstrap-iceconduct` (independent iceconduct.org redirect infra)

## Zero-to-Deploy

Use these steps in order if you are starting from a brand-new AWS account.

1. Sign in to AWS Console as root and enable MFA.
2. Create IAM user `policeconduct-setup-admin`.
3. Attach `AdministratorAccess` to that user (setup phase only).
4. Create an access key for that user.
5. Configure local CLI and verify account:

```bash
aws configure --profile policeconduct-setup-admin
export AWS_PROFILE=policeconduct-setup-admin
aws sts get-caller-identity
```

6. Run bootstrap:

```bash
export GITHUB_TOKEN=<github-token-with-repo-admin-access>
terraform -chdir=infrastructure/bootstrap init
terraform -chdir=infrastructure/bootstrap apply
```

Or load from local `.env` (gitignored):

```bash
set -a
source .env
set +a
terraform -chdir=infrastructure/bootstrap init
terraform -chdir=infrastructure/bootstrap apply
```

Optional phased bootstrap (create buckets/KMS/forms API first, sync `.env`, then finish DNS/CDN):

```bash
PHASE=foundation bash infrastructure/bootstrap/scripts/apply.sh
PHASE=full bash infrastructure/bootstrap/scripts/apply.sh
```

7. If bootstrap created a new hosted zone, update nameservers at your registrar to the Route 53 values:

```bash
terraform -chdir=infrastructure/bootstrap output route53_name_servers
dig +short NS <your-domain>
```

8. Wait for DNS propagation, then re-run bootstrap apply if ACM is still pending:

```bash
terraform -chdir=infrastructure/bootstrap apply
```

If apply is waiting at `aws_acm_certificate_validation.site`, fetch nameservers from the just-created zone and update your registrar:

```bash
terraform -chdir=infrastructure/bootstrap output route53_name_servers
```

9. Bootstrap also creates GitHub environments and environment variables for workflows:
   `production` (`AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`) and
   `preview` (`AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`).
   If GA IDs are set in bootstrap tfvars, it also writes `PUBLIC_GA_MEASUREMENT_ID` per environment.
   If Sentry DSNs are set in bootstrap tfvars, it also writes `PUBLIC_SENTRY_DSN` and `PUBLIC_SENTRY_ENVIRONMENT` per environment.
   If `sentry_org`/`sentry_project` are set, workflows can upload source maps to Sentry.
   If `sentry_auth_token` is set in bootstrap inputs, bootstrap also writes `SENTRY_AUTH_TOKEN` as a GitHub environment secret for both environments.

If `bucket_name` is omitted in `infrastructure/bootstrap/terraform.tfvars`, bootstrap uses `<project_name>-site-<account_id>`.

10. Optional hardening: remove `AdministratorAccess` from `policeconduct-setup-admin`, then disable or delete its access key.

## PII Handling Defaults

- Draft and submission buckets are encrypted with SSE-KMS (customer-managed keys).
- Draft bucket keeps versioning enabled and stores objects indefinitely.
- Draft API only returns drafts updated within `forms_draft_active_window_seconds` (default `3600`).
- Submission bucket retains objects indefinitely by default.
- Forms API is served at `/api/*` through CloudFront to a Lambda Function URL origin.
- Production and preview forms drafts/submissions are isolated in separate buckets and Lambda APIs.
- Forms API is rate-limited with AWS WAF and monitored with CloudWatch alarms.

## Account Selection

Terraform runs in whichever AWS account your active credentials point to.

```bash
aws sts get-caller-identity
```

To switch:

```bash
export AWS_PROFILE=<profile-name>
aws sts get-caller-identity
```

## GitHub Actions

Bootstrap is manual/local only and creates infra.

1. Run `infrastructure/bootstrap` locally once.
2. Then GitHub deploy workflows (`deploy.yml`, `preview.yml`, `preview-cleanup.yml`) only publish content and assume infra already exists.

Credentials used by deploy workflows:

1. OIDC role via `AWS_ROLE_ARN`

## More Detail

1. `infrastructure/bootstrap/README.md`
2. `infrastructure/bootstrap-iceconduct/`
