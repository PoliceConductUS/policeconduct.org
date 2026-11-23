# Plan

This change records the shipped deploy model and adds five deltas: rebuilding a commit into its same folder, PR-only previews, the release and preview lifecycle, the route coverage requirement on `shared-redirects`, and redirect files in place of KVS redirect keys. The route coverage work below is done. Tasks are in `tasks.md`.

## Remaining work

First, the coordinated edits to `publish-release-news` and `fix-pr-checks` (task 1.7), before task 2.4.

1. Rebuilding a commit (tasks 2.x): `src/lib/data-version.js` reads the data version once (the newest row, the chain head, in `public.data_mutation_applied`, design.md "Data version"); `src/layouts/SiteLayout.astro` renders it as `data-data-version` on every page; `scripts/build-release.mjs` records it in `.release/source.json` and writes `.release/build/release.json`. `scripts/write-release-news.mjs` is deleted, so the build uploads no page data, roster or aliases (task 2.6). `scripts/upload-release.sh` syncs `<commit>/build/` and `builds/<commit>/build/` with `--delete` instead of `--no-overwrite`, uploads `release.json` last, and never names `<commit>/override/` or `builds/<commit>/data/`. `scripts/promote.sh` checks `release.json` (task 2.7). Tests: `src/lib/data-version.test.mjs` with fixture rows, a case in `tests/e2e/content-pages-smoke.spec.ts`, and cases in `scripts/deploy-release-guard.test.mjs` with the fake AWS command; no cloud calls.
2. PR-only previews (tasks 3.x): `scripts/deploy.sh` requires `PR_NUMBER`; `router.js` accepts only `pr-<N>` preview labels. Tests extend `scripts/cloudfront-router.test.mjs` and `scripts/deploy-release-guard.test.mjs`.
3. Lifecycle (tasks 4.x): `scripts/cleanup-preview.mjs` deletes, at PR close, every preview folder no pointer names; `main.tf` gives CI delete rights on the preview release data bucket only; `scripts/manage-release.mjs delete` removes only preview-store keys and never deletes a folder. New `scripts/cleanup-preview.test.mjs`; updated `scripts/manage-release.test.mjs`.
4. Documentation (tasks 5.x): `README.md` deploy section and the `viewer-response.js` header comment.
5. Redirect build (tasks 7.x): pages name their record (kind and id from intake's page views) in their ld+json (7.13); `scripts/build-redirects.mjs` (`npm run redirects:build -- [<commit>]`, new) compares the `www` sitemap with a target release (default the tip of `main`; target pages from a local build or `<commit>.release`), reads each missing old page's record from `www`, carries forward the redirects of the release `www` serves by listing `redirect/<www commit>/` in the production site bucket (no manifest), skips every old path listed in `route-absences.json` (kept as the redirect exclusions), reports every old path with no target and why, and fails without writing when `www` is unreachable (7.2); `npm run redirects:build:preview -- <pr-number>` runs the same script with `--preview` for the build `current:pr-<N>` names (7.2); it writes only empty redirect objects with `x-amz-meta-redirect-location` under `redirect/<commit>/` in the target's site bucket (production for a release, preview for a preview) and deletes stale ones there (7.4); its one-time fallback starts from `www`'s `/_redirect-map.json`, derives records for pages that name none, and asks the owner about unresolved pages (7.14); `scripts/generate-redirect-map.mjs`, `scripts/workspace-redirects.mjs` and `scripts/load-redirects.mjs` are deleted (7.3, 7.5); `npm run deploy -- prod` runs the redirect build after the upload and before promotion (7.5); `router.js` drops `r:` reads and the prefix list (7.6); `functions/viewer-response.js` turns `x-amz-meta-redirect-location` into a 301 (7.7); Terraform adds, on both distributions, the `/redirect` origin and the origin group failing over on 403 and 404, and `redirect/*` in both site bucket policies (7.8); the coverage check reads the redirect build's output and `route-absences.json` (7.9); the preview cleanup also deletes `redirect/<release-id>/` folders no pointer names (4.1). Tests use synthetic fixtures, a fake `www` and release or preview host on `127.0.0.1`, and a fake `aws` with paged listings: new `scripts/redirect-object-key.test.mjs`, `scripts/page-records.test.mjs`, `scripts/build-redirects.test.mjs`, `scripts/cloudfront-response.test.mjs`, `scripts/cloudfront-redirect-origin.test.mjs`; updated `scripts/cloudfront-router.test.mjs`, `scripts/verify-redirect-coverage.test.mjs`, `scripts/deploy-release-guard.test.mjs`, `tests/e2e/content-pages-smoke.spec.ts`. The live failover check is task 7.15.
6. Verify (tasks 6.x), ending with `npm run validate` on the final head.

## Redirect cutover

Run from the `main` folder after the PR merges (task 7.12). No approval gate.

1. Apply Terraform: `bash infrastructure/bootstrap-policeconduct/scripts/apply.sh` with `TERRAFORM_APPROVED_DESTROYS='aws_cloudfront_function.preview_noindex'`. From here until step 2 ends, the promoted release (uploaded before this change) serves no redirects.
2. Run `npm run deploy -- prod`. Its redirect build is the first: it carries today's exact redirects from `www`'s `/_redirect-map.json`, derives records for old pages, and opens each unresolved page for the owner to answer. Promotion follows. Check that one old path from `.release/redirect-build/<commit>.json` returns 301 on `www` with its query string kept (task 7.15). Open previews serve redirects after `npm run redirects:build:preview -- <N>` runs for each.
3. Delete the `r:` keys in each store (production `KVS_ARN`, preview `KVS_ARN_PREVIEW`). List keys with `aws cloudfront-keyvaluestore list-keys --kvs-arn <arn>` (paged with `--next-token`), keep keys that start with `r:`, and delete them with `aws cloudfront-keyvaluestore update-keys --kvs-arn <arn> --if-match <etag> --deletes '[{"Key":"..."}]'` in batches of 50, reading a fresh ETag with `describe-key-value-store` before each batch. Never delete `current*`, `o:` or `release:` keys. Record the count deleted per store in `verify.md`.

Each section ends with `npm run test:redirects`. Live checks in 6.1-6.5 need a preview deploy and a production deploy, and run after the Terraform apply in step 1 above (task 7.12), which also publishes the router, IAM and lifecycle changes, both origin groups and both bucket policies from tasks 3.2, 4.1, 7.6 and 7.8.

## Route coverage adjustment (done)

This follow-up implemented the owner's September 20, 2026 rule change (approved by the owner in conversation; no written record).

### Outcome and design

Every prior URL must exist, redirect to a terminal current route, or have an exact path and reason in the committed `route-absences.json` list. Absence permits the existing 404 response; it does not declare permanent retirement or promise a return date. The list is release metadata, not a source of personnel identity. Current routes and valid redirects take precedence when a profile returns.

The October 9, 2026 follow-up (approved by the owner in conversation; no written record) excludes empty state pages. Record only exact published state roots and legacy state collection URLs after checking that their states have no current agency assignments, reports, or civil cases. Federal roots and individual record URLs are outside this decision.

The owner approved explicit accounting rather than blanket exemptions or forced redirects. No production paths will be invented or inferred from a missing row.

### Implementation

- [x] Add executable fixture tests for accounted and unaccounted gaps, returning profiles, exact path scope, invalid entries, and redirect integrity.
- [x] Read the explicit absence list in the existing checker and report 404 allowances separately from redirects. Update unresolved generator wording.
- [x] Update the deployment specification and document list maintenance.
- [x] Run focused tests and the aggregate validation gate; record limitations.

### Deployment guard follow-up

`npm run deploy -- <environment>` (with and without `--skip-build`) runs the strict redirect coverage check after the build and before the upload script. This changes no route policy or data.

- [x] Reproduce missing deployment checks with isolated executable shell fixtures.
- [x] Gate the deploy command and include fixtures in `test:redirects`.
- [x] Verify failure blocks all cloud calls and successful coverage follows the build and precedes publication.
