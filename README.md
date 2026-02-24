# policeconduct.org

Astro site with AWS infrastructure managed by Terraform.

## Local Development

```bash
npm ci
npm run dev
```

Set `FORMS_API_PROXY_TARGET` to the preview forms API URL in `.env-policeconduct`
for local UI testing against deployed forms infrastructure.

## Build

```bash
npm run build
```

## End-to-End Form Tests

Run browser E2E tests for form submission flows:

```bash
npm run test:e2e
```

These tests mock reCAPTCHA and `/api/forms/*` responses to keep runs stable and
independent from external services.

Build metadata is embedded automatically:

- `GIT_COMMIT_SHA` (defaults to current git commit)
- `GIT_COMMIT_DIRTY` (`1` when tracked/untracked changes exist)

These are emitted into page meta tags:

- `build-commit`
- `build-commit-dirty`

## Pre-Publish Audits (Manual Deploy Flow)

Run audits against existing `dist/` (no build step):

```bash
npm run preflight:publish
```

Run full flow including build:

```bash
npm run preflight:publish:full
```

Optional tuning for large sites:

- `SEO_AUDIT_MAX_PAGES` (default `5000`) limits HTML files checked by `seo:audit`.
- `A11Y_MAX_URLS` (default `200`) limits URLs sampled from sitemap for headless a11y.
- `A11Y_PORT` (default `4173`) changes local audit server port.

## Infrastructure

Terraform bootstrap stack:

- `infrastructure/bootstrap-policeconduct`

It provisions:

- Static hosting (S3 + CloudFront + Route53 + ACM)
- Preview hosting (S3 + CloudFront wildcard preview domain)
- GitHub Actions OIDC role and env vars
- Forms API (`POST /forms/draft`, `POST /forms/submit`)
- Form draft + submission storage buckets

Bootstrap usage:

```bash
cp infrastructure/bootstrap-policeconduct/terraform.tfvars.example infrastructure/bootstrap-policeconduct/terraform.tfvars
export GITHUB_TOKEN=<github-token-with-repo-admin-access>
terraform -chdir=infrastructure/bootstrap-policeconduct init
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh
```

See:

- `infrastructure/README.md`
- `infrastructure/bootstrap-policeconduct/README.md`

## Environment Variables (Canonical)

After running:

- `bash infrastructure/bootstrap-recaptcha/scripts/apply.sh`
- `bash infrastructure/bootstrap-policeconduct/scripts/apply.sh`

your `.env-recaptcha` and `.env-policeconduct` should include the canonical
runtime/build variables below.

`.env-policeconduct` is the assembled runtime file for site/forms local runs.
`bootstrap-policeconduct` sync merges Terraform outputs and required reCAPTCHA
values (fallback from `.env-recaptcha`) and fails if required keys are missing.

### Required For Local Forms Runtime

- `DRAFTS_BUCKET`
- `DRAFTS_KMS_KEY_ID`
- `SUBMISSIONS_BUCKET`
- `SUBMISSIONS_KMS_KEY_ID`
- `RECAPTCHA_PROJECT_ID`
- `RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`
- `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`
- `RECAPTCHA_WIF_AUDIENCE`

### Required For Frontend Build/Client

- `RECAPTCHA_SITE_KEY`

### Canonical Apply Inputs (non-`TF_VAR` env names)

- `RECAPTCHA_PROJECT_ID`
- `RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`
- `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`
- `RECAPTCHA_WIF_AUDIENCE`

Optional examples:

- `GA_MEASUREMENT_ID_PRODUCTION`
- `GA_MEASUREMENT_ID_PREVIEW`
- `SENTRY_DSN_PRODUCTION`
- `SENTRY_DSN_PREVIEW`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

### Canonical Deploy/Infra Convenience

- `TF_STATE_BUCKET`
- `AWS_ROLE_ARN`
- `S3_BUCKET`
- `S3_BUCKET_PREVIEW`
- `CLOUDFRONT_DIST_ID`
- `CLOUDFRONT_DIST_PREVIEW`
- `DRAFTS_BUCKET`
- `SUBMISSIONS_BUCKET`

### Canonical Terraform Output Mirror

- `TF_OUT_*` keys are generated automatically for every Terraform output.
- Treat these as generated read-only values.

## Deploy

GitHub Actions workflows:

- `.github/workflows/deploy.yml`
- `.github/workflows/preview.yml`
- `.github/workflows/preview-cleanup.yml`

## Local Deploy (Recommended)

Production:

```bash
export S3_BUCKET=<prod-bucket>
export CLOUDFRONT_DIST_ID=<prod-distribution-id>
npm run deploy:prod
```

Production (explicit alias, includes CloudFront invalidation):

```bash
export S3_BUCKET=<prod-bucket>
export CLOUDFRONT_DIST_ID=<prod-distribution-id>
npm run deploy:prod:invalidate
```

Optional: invalidate only specific paths instead of `/*`:

```bash
export CLOUDFRONT_INVALIDATION_PATHS="/about/contact/ /personnel/* /_astro/*"
npm run deploy:prod
```

Preview:

```bash
export PR_NUMBER=<pr-number>
export S3_BUCKET_PREVIEW=<preview-bucket>
export CLOUDFRONT_DIST_PREVIEW=<preview-distribution-id>
npm run deploy:preview
```

Both scripts also load `.env` automatically if present.

## Sentry

Frontend Sentry is enabled when these are set:

- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`

Terraform bootstrap can manage GitHub environment vars/secrets for the same org and project:

- `TF_VAR_sentry_org` (set to your Sentry org slug)
- `TF_VAR_sentry_project` (set to `PoliceConduct`)
- `TF_VAR_sentry_auth_token` (for source-map upload in workflows)
