## Why

A release can only be seen while it is promoted to `www`. Nobody can open an earlier release, or link to the exact build that was live on a given day. Bare `preview.policeconduct.org` serves a copy of the latest production release, which blurs the rule that a preview is an open PR. The owner asked for a host per released commit and for both bare hosts to send visitors to `www` (owner decisions, 2026-11-18/19).

## What Changes

**Release hosts**

- From: a release folder in the production site bucket is reachable only while `current` names it.
- To: `<commit>.release.policeconduct.org` serves the release of that commit. `<commit>` is a full SHA or a short SHA of 7 to 40 hex characters. A short SHA serves the one matching release; an unknown or ambiguous one returns 404. A rebuild of the same commit goes to the same folder, so the release host shows its latest build.
- Impact: non-breaking. New hosts on the production distribution.

**Release lookup keys**

- From: the production KVS holds `current`, `r:<release-id>:` redirects and `o:<release-id>:` override markers.
- To: it also holds `release:<prefix>` keys. A production deploy writes them after promotion. A one-time backfill writes them for existing release folders.

**Bare hosts**

- From: bare `preview.policeconduct.org` serves the release named by `current:main`. Bare `release.policeconduct.org` does not resolve.
- To: both return a 301 to `https://www.policeconduct.org` with the same path and query string. `/robots.txt` on both still returns the deny-all file.
- Impact: breaking for anyone who used bare `preview.` to see the latest production release. `www` serves the same release.

**No production copy on the preview host**

- From: a production deploy also uploads the release to the preview buckets and moves `current:main` in the preview store.
- To: a production deploy writes only to production resources. `current:main` is deleted from the preview store. The copies of production releases that the mirror left in the preview site bucket and the preview release data bucket are deleted once, with documented commands that list every object and run a dry run first.

**Forms API origins**

- From: both forms API Lambdas accept the apex, `www` and `pr-<N>.preview` origins. A form on a release host would be refused.
- To: the production forms API accepts only the apex, `www` and `*.release.policeconduct.org`. The preview forms API accepts only `*.preview.policeconduct.org`. Each Lambda takes its environment from a new `FORMS_ORIGIN_ENVIRONMENT` setting and fails every request when it is missing or unknown.
- Impact: release hosts can submit forms. Preview pages and production pages are unaffected, because each distribution sends `/api/*` to its own Lambda.

**Analytics and Sentry on release hosts**

- From: Google Analytics already loads only on the apex and `www`. Sentry starts on every host.
- To: on `*.release.policeconduct.org`, decided by the page host in the browser, Sentry does not start and Google Analytics stays off. "Report a site issue" opens `/about/contact/` there.

**Certificate and DNS**

- The production certificate adds `release.<domain>` and `*.release.<domain>`. It is replaced create-before-destroy. Route 53 gets `A` and `AAAA` alias records for both names, pointing at the production distribution.

Crawling rules do not change: the router already answers `/robots.txt` with deny-all on every host except the apex and `www`. Slugs do not change. No approval gate is added.

## Capabilities

### New Capabilities

None. `deploy-hosting` is introduced by `atomic-sha-deploys`, which is below this change in the stack.

### Modified Capabilities

- `deploy-hosting`: adds release hosts, release lookup keys, the bare-host redirects, production deploys that write only production resources, the one-time deletion of the preview-bucket mirror copies, per-environment forms API origins, analytics and Sentry off on release hosts, and the release-host certificate and DNS.

## Impact

- `infrastructure/bootstrap-policeconduct/functions/router.js`: release-host branch, bare-host redirects, `current:main` branch removed.
- `infrastructure/bootstrap-policeconduct/main.tf`: release names in the production aliases, certificate SANs and validation domains; release DNS records; `FORMS_ORIGIN_ENVIRONMENT` on both forms API Lambdas.
- `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`: per-environment origin rules.
- `sentry.client.config.ts`, new `src/lib/client/release-host.js`: Sentry off on release hosts.
- `scripts/load-release-hosts.mjs` (new): writes `release:` keys.
- `scripts/upload-release.sh`, `scripts/deploy.sh`: drop the preview mirror; write release keys after promotion.
- `package.json` (`test:redirects`, `test:client`): runs the new tests.
- Tests: `scripts/cloudfront-router.test.mjs`, `scripts/deploy-release-guard.test.mjs`, new `scripts/load-release-hosts.test.mjs`, `lambdas/forms-api/index.test.mjs`, new `scripts/release-host.test.mjs`, `tests/e2e/analytics.spec.mjs`, `tests/e2e/forms-submit.spec.mjs`.
- Docs: `infrastructure/bootstrap-policeconduct/functions/EGM.md`, `infrastructure/bootstrap-policeconduct/EGM.md`, `infrastructure/bootstrap-policeconduct/lambdas/forms-api/EGM.md`, `scripts/EGM.md`, `src/lib/client/EGM.md`, `src/layouts/EGM.md`, `README.md` deploy section.
- Operations: one Terraform apply from `main` after merge; a one-time backfill of release keys; deletion of `current:main`; a one-time deletion of the mirror copies in the two preview buckets.
- No database, slug, or page change. `scripts/terraform-outputs.mjs` needs no new output: `KVS_ARN` already names the production store.
