# Terraform Bootstrap (One-Time Infra)

> **State recovery required before apply.** The existing infrastructure must not
> be bootstrapped again with empty state. `scripts/apply.sh` now refuses missing,
> unreadable, invalid, or managed-instance-free state before any apply work.
> Passing this guard proves only that some managed state exists, not that recovery
> is complete. Do not apply until resource-by-resource reconciliation and a reviewed
> plan show no unexpected creates, replacements, or destroys. Do not bypass the
> wrapper with a direct `terraform apply`.
>
> Backend location, AWS identity, and live resources must be verified before
> configuring or migrating state. Never commit state files or plan JSON: they can
> contain credentials. Recovery remains outstanding; these usage examples are not
> authorization to recreate the live stack.

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

## Where values come from

- **Inputs** for each stack are tracked in its `*.auto.tfvars` file.
- **Secrets** live only in AWS Systems Manager Parameter Store, as SecureString parameters named `/policeconduct/secrets/<NAME>`.
- **Deployed resource names** (buckets, CloudFront IDs, redirect stores, the preview forms API URL, the reCAPTCHA site key) are Terraform outputs. Scripts read them at run time through `scripts/terraform-outputs.mjs`; nothing copies them into a file. A value already set in the environment is kept, which is how CI passes them in.
- **Machine settings** go in the git-ignored `.env` at the repo root: `AWS_PROFILE`, `DATABASE_URL`, `INTAKE_WORKSPACE`, and the public `PUBLIC_GA_MEASUREMENT_ID`, `PUBLIC_SENTRY_DSN` and `PUBLIC_SENTRY_ENVIRONMENT`.

Reading a Terraform output needs AWS credentials for the account that holds the state. The first read in a new checkout runs `terraform init` for that stack.

The inputs for this stack are tracked in `policeconduct.auto.tfvars`, which Terraform loads on every plan and apply, so every checkout and worktree plans against the same values. Secrets never go in that file. A private `terraform.tfvars` is not needed; values in `policeconduct.auto.tfvars` take precedence over one.

Before it changes anything, `scripts/apply.sh`:

- writes one plan, and refuses it when it destroys or replaces a resource whose address is not listed, one per line, in `TERRAFORM_APPROVED_DESTROYS`;
- asks for `yes`, then applies exactly that plan. When live infrastructure already matches, it applies nothing.

`extra_dns_records` must not repeat a record that `existing-dns.tf` manages; the plan fails if it does.

## Shared redirect rollout

Production and preview use `functions/router.js` with separate CloudFront KeyValueStores. Local deployments load the built `_redirect-map.json` after uploading content. `KVS_ARN` selects the production store (`r:prod:`); `KVS_ARN_PREVIEW` selects the preview store (`r:pr-N:`). Terraform outputs and `scripts/sync-env.sh` supply these values.

For the first activation in each environment, **populate the store before publishing the router**. Do not run a full Terraform apply against an empty store: both function resources publish immediately. Use this order:

1. Provision only that environment's store (`aws_cloudfront_key_value_store.site_redirects` or `aws_cloudfront_key_value_store.preview_redirects`). Keep the current live function active.
2. Use the redirect map belonging to that environment's deployed content. Verify every destination exists, then run `node scripts/load-redirects.mjs <store-arn> <r:prod:|r:pr-N:> <map-path>` with the environment's actual namespace.
3. Update and test the matching function in CloudFront's DEVELOPMENT stage with its populated store association. Verify exact redirects, pagination patterns, repeated query parameters, ordinary pages, and assets.
4. Publish only that environment's tested function, then verify live 301 responses and their destinations.

Preview activation does not authorize production activation. Never load a preview build's map into the production namespace. Subsequent local content deployments use the same loader automatically.

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

Bootstrap applies DNS records from `extra_dns_records` in `policeconduct.auto.tfvars`.

Current default includes Google Workspace MX:

- `@ MX 1 smtp.google.com.`

Add your domain-specific TXT verification/DKIM records in `policeconduct.auto.tfvars` under `extra_dns_records` so they are applied with the zone.

Verification email is sent from `noreply@mail.policeconduct.org` by default.
The forms Lambda currently sends verification email through Resend using `RESEND_API_KEY`.
Terraform still creates the SES identity verification and DKIM records under `mail.policeconduct.org`.
Terraform also configures a custom SES MAIL FROM domain at `bounce.mail.policeconduct.org` by default, with the required MX and SPF records.
Terraform creates a DMARC TXT record for `_dmarc.mail.policeconduct.org` and defaults it to monitoring mode (`p=none`).
Terraform also enables SES Virtual Deliverability Manager, creates a dedicated verification email configuration set, and publishes verification email events to the default EventBridge bus.
Custom MAIL FROM can remain in `Pending` for a while after apply while SES checks DNS. AWS documents that this can take up to 72 hours, though Route 53 changes are often detected sooner.

## Resend Domain Bootstrap

- create or look up the Resend sending domain for `forms_email_verification_domain`
- preserve existing provider tracking and capability settings
- fetch the required DNS records from Resend
- create those DNS records in Route 53 automatically

The values are fixed in this repo:

- sending domain: `mail.policeconduct.org`
- SES custom MAIL FROM: `bounce.mail.policeconduct.org`
- tracking DNS: included in `aws_route53_record.resend_domain_record` from the exact Resend response, alongside sending and receiving records

If a previous bootstrap wrote incorrect doubled-`mail` Route 53 records such as
`send.mail.mail.policeconduct.org`, inspect the exact DNS diff and prepare a scoped
change with rollback. Do not run an untargeted Terraform apply for email repairs.

`infrastructure/bootstrap-policeconduct/scripts/apply.sh` reads its secrets from AWS Systems Manager Parameter Store, as SecureString parameters named `/policeconduct/secrets/<NAME>`. It does not use a secret from a `.env` file; the stored value always wins. A secret stored as any type other than SecureString stops the script, and stops the production release build that reads `SENTRY_AUTH_TOKEN`.

- `RESEND_API_KEY`: send-only key used by the forms Lambda verification-email path
- `RESEND_API_KEY_FULL_ACCESS`: full-access key used only by `scripts/bootstrap-resend-domain.mjs` for Resend Domains API calls
- `SENTRY_AUTH_TOKEN`: written to the GitHub `production` environment only, with `SENTRY_ORG` and `SENTRY_PROJECT`. `npm run deploy:prod` also reads it from Parameter Store so the production release build uploads its sourcemaps to Sentry
- `GITHUB_TOKEN`: used by the Terraform GitHub provider

To change one, run `aws ssm put-parameter --overwrite --type SecureString --name /policeconduct/secrets/<NAME> --value file://<file>`.

Example:

```bash
export PATH=/opt/homebrew/bin:$PATH
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh
```

Terraform uses `--read`: it only looks up the existing domain and DNS records.
A missing domain fails the plan without creating anything. Planning never creates,
updates, or triggers verification of the Resend domain.

To inspect the domain manually:

```bash
source scripts/parameter-store-secrets.sh
load_parameter_store_secrets RESEND_API_KEY_FULL_ACCESS
node scripts/bootstrap-resend-domain.mjs --read
```

Creating a missing domain is a separate, explicit production change.
`--apply` preserves all settings on existing domains; it never configures tracking
or triggers verification. Configure tracking separately through the Resend
Domains API or dashboard after inspecting the current settings. After obtaining the applicable production approval, run:

```bash
source scripts/parameter-store-secrets.sh
load_parameter_store_secrets RESEND_API_KEY_FULL_ACCESS
node scripts/bootstrap-resend-domain.mjs --apply
```

If you want to trigger a Resend verification pass manually after DNS changes:

```bash
source scripts/parameter-store-secrets.sh
load_parameter_store_secrets RESEND_API_KEY_FULL_ACCESS
node scripts/bootstrap-resend-domain.mjs --verify
```

## GitHub Environments + Vars

Terraform manages these GitHub environments automatically:

- `production`
- `preview`

And sets these environment variables automatically:

- `production`: `AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`, `FORMS_API_URL`
- `preview`: `AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`, `FORMS_API_URL`

Optional GA inputs in `policeconduct.auto.tfvars`:

- `ga_measurement_id_production`
- `ga_measurement_id_preview`

If set, Terraform also creates `GA_MEASUREMENT_ID` in the matching GitHub environment.
If unset/null, no GA variable is written and the GA component renders nothing.

Optional Sentry inputs in `policeconduct.auto.tfvars`, or `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_DSN_PRODUCTION` and `SENTRY_DSN_PREVIEW` in `.env`. The auth token is a secret: set `SENTRY_AUTH_TOKEN` in `.env` only.

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

### Tracking DNS reconciliation (INS-153)

Resend readback on November 14, 2026 requests the CNAME
`links.mail.policeconduct.org` → `links1.resend-dns.com`.
Click tracking is enabled, open tracking is disabled, and the tracking subdomain
is `links`. Terraform reads these settings without modifying them. The lookup
includes Tracking records in `records_json`; do not create DNS separately using
the AWS CLI or console.

Before applying, use the existing backend and approved AWS profile. Inspect state
and a saved targeted plan for `aws_route53_record.resend_domain_record`.
Reconcile existing records with state through imports when missing; do not assume
this bootstrap stack already owns live records. The expected DNS change is one
tracking CNAME, TTL 600. Reject changes to existing DKIM, SPF, sending MX, receiving
MX, root Google MX, or unrelated infrastructure. Record keys contain the provider
response index: inspect exact addresses in the plan rather than assuming an index.
Apply only the reviewed saved plan under the production authorization gate.

After applying, compare all authoritative nameservers with the provider response
and run the separate verification command. A receiving record can match DNS while
Resend still reports pending; do not change inbound routing to resolve that status.
Rollback must use Terraform: revert the tracking inclusion, review a targeted
plan removing only the newly managed CNAME, and apply that saved plan. Never remove
pre-existing records or disable provider tracking as an implicit rollback.

Provider settings are preserved and observed, not Terraform-managed resources.
A matching DNS configuration does not prove the entire AWS account is free of drift;
that requires authenticated state refresh and plan review.

## Existing regional account security

`account-security.tf.json` declares the existing GuardDuty detectors, Security Hub
accounts and enabled standards, and Inspector scanning in 17 regions. Its 85
import blocks adopt existing resources into this bootstrap root; they do not
authorize enabling new services. The `security_` provider aliases restrict the
account and preserve existing untagged resources without inheriting site tags.
Every declared security resource has `prevent_destroy`.

Before adoption, inspect a fresh saved plan against this root's authoritative
state. All 85 security actions must be imports with no remote changes. Do not
apply unrelated bootstrap drift. Keep state backups private and verify the
post-import plan. State-backend migration remains a separate operation.

GuardDuty detector features are deliberately not declared here: AWS provider
6.41.0 cannot import them and cannot represent every observed feature. Creating
feature resources calls UpdateDetector, so it is a security-setting change, not
state-only adoption. Preserve current settings until that change is separately
reviewed. Security Hub custom control parameters and external ownership checks
remain part of the audit; importing these resources is not account-wide closure.
