# policeconduct.org

Astro static site with AWS infrastructure managed by Terraform.

## Purpose

PoliceConduct.org helps residents evaluate whether law-enforcement agencies and
the people working there appear safe, accountable, transparent, and improving.
The site also aims to identify positive deviance: officers, supervisors, units,
agencies, policies, and practices that produce unusually good public-trust and
public-safety outcomes under comparable constraints. Positive examples must be
evidence-backed and framed as practices to investigate or learn from, not as
blanket endorsements.

## Local Development

```bash
./scripts/bootstrap-dev.sh
npm run doctor
npm run
npm ci
npm run dev
```

Set `FORMS_API_PROXY_TARGET` to the preview forms API URL in `.env-policeconduct`
for local UI testing against deployed forms infrastructure.

`npm run` is the project command surface. Common setup and validation commands:

- `npm run setup`: interactive developer bootstrap.
- `npm run doctor`: read-only readiness check for local tools and agent workflow files.
- `npm run openspec:status -- <change-name>`: show OpenSpec change status.
- `npm run validate:openspec`: validate all OpenSpec artifacts.
- `npm run validate`: run the aggregate validation gate.

## PR merge checklist

`package.json` defines the executable gates. Keep this checklist and the PR
template synchronized whenever those scripts change. All items below apply to
the final PR head, including documentation-only PRs.

- [ ] Use `mise exec -- node --version` and `mise exec -- npm --version` to record
      the configured runtime (`mise.toml`, currently Node 24). Install with
      `mise exec -- npm ci`; use the nested lockfile for any nested package.
      Compare every installed package version to its `package-lock.json` entry
      (including transitive packages); do not borrow shared `node_modules`.
- [ ] Record `git rev-parse HEAD`, then run `mise exec -- npm run validate` in
      full. Preserve complete output and command exit status. Re-run the entire
      command after fixes or any head change. Scoped checks do not replace it.
- [ ] Record the outcome of every stage below. An early failure means later
      stages did not run, not that they passed.

| Aggregate stage          | Current scripts / required evidence                                        |
| ------------------------ | -------------------------------------------------------------------------- |
| Repository formatting    | `format:check`: repository-wide Prettier                                   |
| JavaScript and SQL lint  | `lint` → `lint:es` (ESLint), `lint:sql` (pinned SQLFluff through mise)     |
| Astro/type diagnostics   | `validate:types`: errors, warnings, and individually reviewed hints        |
| Shell syntax             | `validate:shell`: hooks and deployment/bootstrap scripts                   |
| Database schema contract | `validate:schema`: configured local database and table outcome             |
| OpenSpec                 | `validate:openspec`: all changes/specs, including warning output           |
| Personal-data scan       | `scan:personal-data`: tracked tree, finding count                          |
| Redirect tests           | `test:redirects`: coverage, router, loading, map generation, release guard |
| Media tests              | `test:media`: video and personnel photos                                   |
| Forms API tests          | `test:lambda`: nested locked dependencies and Lambda suite                 |
| CSS tests                | `test:css`: built CSS purging                                              |
| Personal-data tests      | `test:personal-data`: scanner regressions                                  |
| Coverage tests           | `test:coverage`: coverage calculations                                     |
| Browser tests            | `test:e2e`: all Playwright suites, including built-index search            |

- [ ] Fix every error and warning, including pre-existing findings. An exit-zero
      run with unresolved warnings is not merge-ready. Inspect each diagnostic
      hint and fix it or document a specific technical justification. Labels
      such as advisory, harmless, baseline, and out of scope do not waive review.
- [ ] Fix causes without disabling rules, adding ignores, weakening assertions,
      hiding output, skipping tests, or changing fixtures merely to get green.
      Fixtures must retain the tested behavior: resolve temporary paths properly,
      isolate module scope, supply required form fields, and select records that
      actually meet the tested relationship instead of relaxing expectations.
- [ ] Resolve missing local configuration, services, database/intake fixtures,
      browsers, and generated assets safely. These are verification blockers.
      Never change production data, publish personnel, or commit credentials,
      absolute home paths, or private data to make a test pass.
- [ ] Report passed/failed/skipped counts for each suite. Build and serve the
      Pagefind index and actually run its browser assertions; a dev-server skip
      does not verify search. Explain every skip. Any warning or coverage
      exception requires a linked, explicit human decision with reason, affected
      check, scope, and duration. Silence and acknowledgment are not permission.
- [ ] Add task-relevant checks beyond the aggregate: form validation,
      payload/reset behavior, accessible labels and keyboard focus, and mobile
      and desktop placement for form/UI changes. For generated HTML changes run
      the appropriate build and `validate:no-inline-css`; `npm run build`
      includes the latter. Record commands and outcomes.
- [ ] Inspect the final diff, preserve unrelated changes, and verify GitHub CI
      for the exact final PR SHA. The current workflows run CodeQL and the
      personal-data scan, **not the full aggregate**. Copilot setup installs
      dependencies/browsers only; preview cleanup is not validation. Green CI
      therefore does not substitute for full local validation evidence.
- [ ] Update the PR description and completion report to the final scope, SHA,
      commands, exit codes, stage outcomes, counts, diagnostic dispositions,
      exceptions, and remaining blockers. Partial success is not full validation.
- [ ] Retain human review/merge, production release, and personnel publication
      gates. Merge readiness is not merge permission; merge is not deployment;
      deployment is not evidence of an authorized public release. Claim deployed
      only with deployed evidence. Use feature branches and PRs only.

## Agent Workflow

This repo uses Codex App, OpenSpec, Superpowers, and the OpenSpec Superpowers
bridge for behavior-changing work. OpenSpec captures the intended behavior;
Superpowers supplies the development discipline; the bridge keeps brainstorming,
plans, verification, and retrospectives in `openspec/changes/<change-name>/`.

Recommended flow:

```bash
npm run doctor
npm run validate:openspec
npx openspec schemas
npx openspec status --change <change-name>
```

Then brainstorm the outcome, reuse the active branch and worktree (creating
another requires explicit human permission), and ask Codex to turn the brainstorm into an
OpenSpec change. Use `/opsx:continue <change-name>` until proposal/spec/task/plan
artifacts are coherent, then `/opsx:apply <change-name>`, `/opsx:verify
<change-name>`, `/opsx:continue <change-name>` for the retrospective, and
`/opsx:archive <change-name>`.

Direct PR-sized changes are acceptable for documentation-only edits, formatting,
tooling tweaks, and internal refactors that preserve specified behavior.

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

The current layout does not emit these values as page meta tags. Record the
build's commit and clean/dirty state in the verification evidence; compare served
artifacts with that build rather than assuming a page exposes its source SHA.

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

Required search coverage needs generated assets. With the intended local database,
intake fixtures, environment, and Playwright browsers configured, build and serve
on loopback before the full gate:

```bash
mise exec -- npm run build
mise exec -- npm run preview -- --host 127.0.0.1 --port 4321
# In another terminal with the same configured environment:
mise exec -- npm run validate
```

The browser runner reuses the server on port 4321. Confirm it serves this head's
fresh build, not an unrelated or stale process. Without a built server the runner
starts the development server, which cannot satisfy required Pagefind coverage;
missing search assets fail instead of skipping. Scoped `npm run test:e2e -- ...`
runs remain useful development feedback only.

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

https://8cantwait.org/
https://clean.calmatters.org
https://clearinghouse.net
https://endqi.org/
https://ij.org/report/policing-for-profit-4\
https://invisible.institute
https://legalaidnyc.org/law-enforcement-look-up
https://mappingpoliceviolence.org/
https://mappingpoliceviolence.us
https://nixthe6.org/
https://openoversight.com
https://policecrime.bgsu.edu
https://policedata.org
https://policescorecard.org/
https://policeviolencereport.org/
https://safecitiesproject.org/ (sans economic info)
https://www.minneapolismn.gov/government/government-data/datasource/officer-payouts-dashboard/
https://www.policefilesny.com
https://www.themarshallproject.org/records/1712-police-settlements
https://www.thepolicetransparencyproject.com
