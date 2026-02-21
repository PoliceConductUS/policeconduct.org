# policeconduct.org

Astro site with AWS infrastructure managed by Terraform.

## Local Development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

Build metadata is embedded automatically:

- `GIT_COMMIT_SHA` (defaults to current git commit)
- `GIT_COMMIT_DIRTY` (`1` when tracked/untracked changes exist)

These are emitted into page meta tags:

- `build-commit`
- `build-commit-dirty`

## Infrastructure

Terraform bootstrap stack:

- `infrastructure/bootstrap`

It provisions:

- Static hosting (S3 + CloudFront + Route53 + ACM)
- Preview hosting (S3 + CloudFront wildcard preview domain)
- GitHub Actions OIDC role and env vars
- Forms API (`POST /forms/draft`, `POST /forms/submit`)
- Form draft + submission storage buckets

Bootstrap usage:

```bash
cp infrastructure/bootstrap/terraform.tfvars.example infrastructure/bootstrap/terraform.tfvars
export GITHUB_TOKEN=<github-token-with-repo-admin-access>
terraform -chdir=infrastructure/bootstrap init
bash infrastructure/bootstrap/scripts/apply.sh
```

See:

- `infrastructure/README.md`
- `infrastructure/bootstrap/README.md`

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

- `PUBLIC_SENTRY_DSN`
- `PUBLIC_SENTRY_ENVIRONMENT`

Terraform bootstrap can manage GitHub environment vars/secrets for the same org and project:

- `TF_VAR_sentry_org` (set to your Sentry org slug)
- `TF_VAR_sentry_project` (set to `PoliceConduct`)
- `TF_VAR_sentry_auth_token` (for source-map upload in workflows)
