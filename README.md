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

### Local Database

This repository owns no Supabase project. `supabase/` here holds only ignored
CLI state (`.branches/`, `.temp/`), and there is no `supabase/config.toml`.
The default local setup points `DATABASE_URL` at `127.0.0.1:54322`, the local
Supabase instance owned by the **intake** repository
(`../intake`, `project_id = "police-conduct-intake"`). Schema, migrations, and
all data loading live there.

**`supabase/seed.sql` is retired. Do not look for it in this repository and do
not reseed from it.** Intake's `supabase/config.toml` sets `[db.seed] sql_paths
= []`, so `db reset` no longer loads it. The database is built from migrations
alone and then populated by the config-driven intake sources and the replayable
data-mutation chain (intake ADR 0033). The legacy `seed.sql` is kept only as a
record of the old website data.

To populate or repopulate the database, run these from the **intake** repository
root (they need `INTAKE_WORKSPACE`, set by intake's `mise.toml` / `.env`):

```bash
npm run cli -- data status            # applied vs pending chain entries
npm run cli -- data up                # replay already-generated chain entries
npm run cli -- data reset --no-acquire # full rebuild from already-acquired files
```

- `data up` only applies chain entries that already exist. It regenerates
  nothing and is the cheapest way to bring a migrated-but-empty database to the
  chain head.
- `data reset --no-acquire` is the full rebuild: it resets the schema to current
  migrations, moves the existing mutation chain into the reset command's output
  directory, then runs transform → generate → up for every source in dependency
  order. Rebuild time depends on the retained inputs and local resources.
- A reset archives the chain it replaced at
  `$INTAKE_WORKSPACE/command/<timestamp>-<id>/intake/output/previous-mutations/`.
  That archive is the fastest recovery path after an unwanted reset: the chain
  that produced the previous dataset is preserved there and can be replayed
  instead of regenerated.

#### The default database is shared

Worktrees using the default intake `project_id`, ports, and database connection
share the instance on port 54322. A reset targeting that instance replaces the
database for every client connected to it. A separate worktree alone does not
isolate the database, and no worktree lock or lease protects it.

Explicit isolated setups can use a separate database or container and a different
loopback port, with `DATABASE_URL` set for that target. A separate Supabase stack
also needs a distinct `project_id` and non-conflicting service ports. Keep its
intake workspace and mutation chain separate. Changing `DATABASE_URL` alone does
not retarget Supabase CLI reset or stop commands: confirm the active project and
configuration for each command. Before a restore or reset, verify both the
connection target and the command target; do not assume they match.

Because of that, before running `data reset`, `supabase db reset`, or
`supabase stop`, confirm no other worktree is mid-verification — a reset during
another agent's run invalidates that run's results. If the tables are
unexpectedly empty, check whether a rebuild is already in progress before
loading anything yourself; writing into an in-flight rebuild corrupts it.
`docker logs supabase_db_police-conduct-intake` shows whether the data directory
was re-initialized, and `$INTAKE_WORKSPACE/command/` records which command did
it.
## Google Analytics settings

`config/analytics.json` records the managed settings for the existing property
and web stream: custom dimensions, key events and their counting methods, event
creation rules, data retention, enhanced measurement, and data redaction.

Supply an authorized OAuth access token through `GOOGLE_ANALYTICS_ACCESS_TOKEN`
in your shell. The Analytics Admin API must be enabled for the token's project,
and the account must have access to this property. Comparison accepts the
`https://www.googleapis.com/auth/analytics.readonly` or
`https://www.googleapis.com/auth/analytics.edit` scope. Applying changes requires
`analytics.edit` and permission to edit the property. These commands do not log
in, read stored credentials, or change your Cloud CLI account. Keep the token
out of files, commits, and command history.

```bash
npm run analytics:compare
npm run analytics:apply
```

Compare reads all pages of live settings and reports managed differences without
changing Google Analytics. Its exit code is `0` for a match, `1` for differences,
and `2` for an error. Apply reads and plans changes first, then creates or patches
managed resources and reads them back to verify the result. Apply exits `0` only
for a verified result or a match, and `2` for an error. A matching apply does not
write anything. Apply is explicit; it does not run during builds or deployment.

Only listed resources and fields are managed. Dimensions are matched by scope
and parameter name, key events by event name, and creation rules by destination
event name. Ambiguous matches fail. Unlisted resources and fields stay in place;
dimensions and creation rules are never archived or deleted. The only event that
may be unmarked as a key event is `form_submit_success`. Other key events,
including Google's default events, stay in place. Rule conditions and redaction
query keys compare without regard to order; parameter mutations keep their order.

Traffic filters and internal-traffic definitions remain manual Google Analytics
Admin settings. The internal-traffic filter stays in **Testing**, with no IP
rules; team visits to production remain included. These commands do not manage
tags, website events, users, access, consent, or other property settings.

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
| Analytics config tests   | `test:analytics-config`: mocked Admin API comparison and apply behavior    |
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
      All past and future dependency exceptions expire thirty days after
      approval. At expiry, update the dependencies or obtain a new exception.
- [ ] Add task-relevant checks beyond the aggregate: form validation,
      payload/reset behavior, accessible labels and keyboard focus, and mobile
      and desktop placement for form/UI changes. For generated HTML changes run
      targeted rendering and `validate:no-inline-css` checks appropriate to the
      change. Record commands and outcomes. A full final build and sitemap
      verification are production-release gates, not PR merge prerequisites.
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
intake fixtures, environment, and Playwright browsers configured, generate the
HTML needed by the tests and its Pagefind index, then serve on loopback before
the full validation gate. A full build is one way to prepare those assets:

```bash
mise exec -- npm run build
mise exec -- npm run preview -- --host 127.0.0.1 --port 4321
# In another terminal with the same configured environment:
mise exec -- npm run validate
```

The browser runner reuses the server on port 4321. Confirm it serves this head's
matching generated HTML and index, not an unrelated or stale process. Existing
assets may be reused when their source matches the final head (for example,
a documentation-only change). `npm run build:search-index` generates the index
from rendered `dist/` HTML. Required browser assertions must actually run;
preparing their assets does not make the complete build or sitemap a merge gate. Without a built server the runner
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

Before production release, require an error-free full final build and sitemap
verification for the release artifact. Record these separately from PR merge
evidence; merging a PR does not satisfy or waive either release check.

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
