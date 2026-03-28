# policeconduct.org

Astro static site with AWS infrastructure managed by Terraform.

## Local Development

```bash
npm ci
npm run dev
```

Set `FORMS_API_PROXY_TARGET` to the preview forms API URL in `.env-policeconduct`
for local UI testing against deployed forms infrastructure.

## Build

Build requires `RECAPTCHA_SITE_KEY`. The build script loads `.env`,
`.env-recaptcha`, and `.env-policeconduct` before validating env.

```bash
npm run build
```

The build pipeline:

1. **Validates** required environment variables (`validate-build-env.mjs`)
2. **Resolves** `GIT_COMMIT_SHA` and `GIT_COMMIT_DIRTY` from git state
3. **Builds** the Astro static site with PurgeCSS (production only)

CSS is externalized (`inlineStylesheets: "never"`) and tree-shaken via PurgeCSS
so that Bootstrap and custom styles ship as a single shared file instead of being
inlined into every page.

### Build Metadata

Build metadata is derived from git state automatically:

- `GIT_COMMIT_SHA` defaults to the current git commit.
- `GIT_COMMIT_DIRTY` defaults to `1` when tracked or untracked changes exist.

The build emits these page meta tags:

- `build-commit`
- `build-commit-dirty`

Production deploys also attach build metadata to each uploaded S3 object as
`build-commit` and `build-dirty`. `build.json` is not part of the standard
build, audit, preview deploy, or production deploy flow.

## Audits

Audits run against the existing `dist/` output. `dist/` is not checked in, and
audits require a fresh full build first. Stale or partial build output is not a
supported audit baseline.

```bash
npm run build
npm run audit
```

Run either audit directly when needed:

```bash
npm run audit:seo
npm run audit:a11y
```

Optional tuning for large sites:

| Variable              | Default | Description                                 |
| --------------------- | ------- | ------------------------------------------- |
| `SEO_AUDIT_MAX_PAGES` | `5000`  | HTML files checked by `seo:audit`           |
| `A11Y_MAX_URLS`       | `200`   | URLs sampled from sitemap for headless a11y |
| `A11Y_PORT`           | `4173`  | Local audit server port                     |

## End-to-End Form Tests

```bash
npm run test:e2e
```

These tests mock reCAPTCHA and `/api/forms/*` responses to keep runs stable and
independent from external services.

## Deploy

### Preview Deploy

Preview deploy builds the site with a PR-specific `SITE_URL`, syncs `dist/` to
the preview S3 prefix, and invalidates the preview CloudFront path for that PR.

```bash
export PR_NUMBER=<pr-number>
export S3_BUCKET_PREVIEW=<preview-bucket>
export CLOUDFRONT_DIST_PREVIEW=<preview-distribution-id>
npm run deploy:preview
```

### Production Deploy

Production deploy uses the incremental deploy script. It runs a fresh build by
default, uploads only changed files from `dist/`, deletes removed objects, and
invalidates only the affected CloudFront paths.

```bash
export S3_BUCKET=<prod-bucket>
export CLOUDFRONT_DIST_ID=<prod-distribution-id>
npm run deploy:prod
```

To deploy an existing `dist/` without rebuilding:

```bash
export S3_BUCKET=<prod-bucket>
export CLOUDFRONT_DIST_ID=<prod-distribution-id>
npm run deploy:prod -- --skip-build
```

### Incremental Deploy Baseline

If `.deploy-cache/d` is empty and you already synced the current production site
locally, seed the incremental baseline manifest before the first run:

```bash
bash scripts/seed-deploy-manifest.sh /path/to/synced-site
```

Then compare your current `dist/` against that baseline:

```bash
export S3_BUCKET=<prod-bucket>
export CLOUDFRONT_DIST_ID=<prod-distribution-id>
bash scripts/deploy-incremental.sh --skip-build --dry-run
```

After the baseline exists, `npm run deploy:prod` and
`bash scripts/deploy-incremental.sh` use the same production deploy flow.

### Deploy Environment Variables

Required for production:

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `S3_BUCKET`          | Production S3 bucket               |
| `CLOUDFRONT_DIST_ID` | Production CloudFront distribution |

Required for preview:

| Variable                  | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `PR_NUMBER`               | Pull request number used in the preview URL and S3 prefix |
| `S3_BUCKET_PREVIEW`       | Preview S3 bucket                                         |
| `CLOUDFRONT_DIST_PREVIEW` | Preview CloudFront distribution                           |

Optional:

| Variable           | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `GIT_COMMIT_SHA`   | Override commit hash (default: auto-detected from git) |
| `GIT_COMMIT_DIRTY` | Override dirty flag (default: auto-detected from git)  |

## Infrastructure

Terraform bootstrap stack in `infrastructure/bootstrap-policeconduct/`.

Provisions:

- Static hosting (S3 + CloudFront + Route53 + ACM)
- Preview hosting (S3 + CloudFront wildcard preview domain)
- Deployment OIDC role and env vars
- Forms API (`POST /forms/draft`, `POST /forms/submit`, `GET /status/{submissionId}`)
- Form draft + submission storage buckets

Bootstrap usage:

```bash
cp infrastructure/bootstrap-policeconduct/terraform.tfvars.example \
   infrastructure/bootstrap-policeconduct/terraform.tfvars
export GITHUB_TOKEN=<github-token-with-repo-admin-access>
terraform -chdir=infrastructure/bootstrap-policeconduct init
bash infrastructure/bootstrap-policeconduct/scripts/apply.sh
```

See `infrastructure/README.md` and `infrastructure/bootstrap-policeconduct/README.md`.

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

### Submission Status

- User-facing status lookup page: `/status/`
- API endpoint: `/api/status/{submissionId}`
- Endpoint behavior: always returns HTTP `200` with JSON.
  If no status file exists, response falls back to:
  `{ "submissionId": "<id>", "status": "pending" }`.

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

## Sentry

Frontend Sentry is enabled when these are set:

- `PUBLIC_SENTRY_DSN`
- `PUBLIC_SENTRY_ENVIRONMENT`

Terraform bootstrap can manage GitHub environment vars/secrets for the same org
and project:

- `TF_VAR_sentry_org` (set to your Sentry org slug)
- `TF_VAR_sentry_project` (set to `PoliceConduct`)
- `TF_VAR_sentry_auth_token` (for source-map upload during deploys)
