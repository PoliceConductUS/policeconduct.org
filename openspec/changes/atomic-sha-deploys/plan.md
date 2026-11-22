# Plan

This change records the shipped deploy model and adds five deltas: rebuilding a commit into its same folder, PR-only previews, the release and preview lifecycle, the route coverage requirement on `shared-redirects`, and redirect files in place of KVS redirect keys. The route coverage work below is done. Tasks are in `tasks.md`.

## Remaining work

1. Rebuilding a commit (tasks 2.x): `src/lib/data-version.js` reads the data version once (the last entry in `public.data_mutation_applied`, design.md "Data version"); `src/layouts/SiteLayout.astro` renders it as `data-data-version` on every page; `scripts/build-release.mjs` records it in `.release/source.json` and writes `.release/build/release.json`. `scripts/write-release-news.mjs` is deleted, so the build uploads no page data, roster or aliases (task 2.6). `scripts/upload-release.sh` syncs `<commit>/build/` and `builds/<commit>/build/` with `--delete` instead of `--no-overwrite`, uploads `release.json` last, and never names `<commit>/override/` or `builds/<commit>/data/`. `scripts/promote.sh` checks `release.json` (task 2.7). Tests: `src/lib/data-version.test.mjs` with fixture rows, a case in `tests/e2e/content-pages-smoke.spec.ts`, and cases in `scripts/deploy-release-guard.test.mjs` with the fake AWS command; no cloud calls.
2. PR-only previews (tasks 3.x): `scripts/deploy.sh` requires `PR_NUMBER`; `router.js` accepts only `pr-<N>` preview labels. Tests extend `scripts/cloudfront-router.test.mjs` and `scripts/deploy-release-guard.test.mjs`.
3. Lifecycle (tasks 4.x): `scripts/cleanup-preview.mjs` removes an unshared preview folder at PR close; `scripts/manage-release.mjs delete` removes only preview-store keys and never deletes a folder. New `scripts/cleanup-preview.test.mjs`; updated `scripts/manage-release.test.mjs`.
4. Documentation (tasks 5.x): `README.md` deploy section and the `viewer-response.js` header comment.
5. Redirect files (tasks 7.x): `scripts/redirect-object-key.mjs`, `scripts/write-redirect-files.mjs` and `scripts/upload-redirects.mjs` (new); `router.js` drops `r:` reads and gains the retired prefix rewrite; `functions/viewer-response.js` turns `x-amz-meta-redirect-location` into a 301 on both distributions; `load-redirects.mjs` is deleted; the coverage check reads `.release/redirects.json`. Tests: new `scripts/redirect-object-key.test.mjs`, `scripts/write-redirect-files.test.mjs`, `scripts/upload-redirects.test.mjs`, `scripts/cloudfront-response.test.mjs`; updated `scripts/cloudfront-router.test.mjs`, `scripts/verify-redirect-coverage.test.mjs`, `scripts/deploy-release-guard.test.mjs`.
6. Verify (tasks 6.x), ending with `npm run validate` on the final head.

## Redirect cutover

Run from the `main` folder after the PR merges (task 7.12). No approval gate.

1. Apply Terraform: `bash infrastructure/bootstrap-policeconduct/scripts/apply.sh` with `TERRAFORM_APPROVED_DESTROYS='aws_cloudfront_function.preview_noindex'`. From here until step 2 ends, the promoted release (uploaded before this change) serves no redirects.
2. Run `npm run deploy -- prod`. Check that one retired path from `.release/redirects.json` returns 301 on `www` with its query string kept.
3. Delete the `r:` keys in each store (production `KVS_ARN`, preview `KVS_ARN_PREVIEW`). List keys with `aws cloudfront-keyvaluestore list-keys --kvs-arn <arn>` (paged with `--next-token`), keep keys that start with `r:`, and delete them with `aws cloudfront-keyvaluestore update-keys --kvs-arn <arn> --if-match <etag> --deletes '[{"Key":"..."}]'` in batches of 50, reading a fresh ETag with `describe-key-value-store` before each batch. Never delete `current*`, `o:` or `release:` keys. Record the count deleted per store in `verify.md`.

Each section ends with `npm run test:redirects`. Live checks in 6.1-6.5 need a preview deploy and a production deploy.

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
