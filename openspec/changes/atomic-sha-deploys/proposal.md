## Why

Builds already land in per-commit folders and go live when a CloudFront KeyValueStore (KVS) pointer moves (see design.md "Current deploy model"). The OpenSpec record still describes an older plan (`builds/<id>/` folders, `<id>.builds.<domain>` hosts, one distribution) and does not use the project's terms. Five gaps remain:

- Redeploying a commit against newer data uploads nothing new. The release ID is the bare commit, uploads use `--no-overwrite`, and promotion only checks that the completion marker exists.
- Preview hosts accept any label (`PREVIEW_NAME`), but a preview is a build of an open PR only.
- `npm run deploy:delete` can delete a production release folder, but the owner requires release folders to be kept forever (owner decision Q7, `.egm-reviews/owner-decisions-round1.md`). Closing a PR removes only its pointer, not its preview folders.
- The route coverage rule shipped under this change has no home in `shared-redirects`.
- Redirects live in the KVS as `r:<release-id>:` keys. One real build has about 25,668 redirects, about 3 MB of keys. The 5 MB store fits one release, but releases are kept forever.

## Terms

- **Preview**: a build of an open PR, served at `pr-<N>.preview.policeconduct.org`. A preview is not a release.
- **Release**: a published build of a commit on `main`. Not every `main` commit is released. A release is a folder in the production site bucket.
- **Promote**: move the `current` pointer so `www` and the apex serve a chosen release. Promoting an earlier release is how a release is rolled back. A preview deploy does not promote; it points `current:pr-<N>` at its build with the same steps.
- **Release ID**: the folder name of any uploaded build, preview or release: its full 40-character commit. The name comes from the code (`.release/id`, `RELEASE_ID`); a preview's release ID does not make it a release.

These terms are the owner's (Terms, `.egm-reviews/owner-decisions-round1.md`). Deploys have no approval gate (same source).

## What Changes

### Rebuilding a commit replaces its folder

- From: the release ID is the full commit. A second deploy of the same commit against newer data silently keeps the old pages, because uploads use `--no-overwrite`.
- To: the release ID is still the full commit. A rebuild of the same commit replaces only the build-owned prefixes: `<commit>/build/` in the site bucket and `builds/<commit>/build/` in the release data bucket. Files the new build no longer produces are removed from those two prefixes only. A rebuild never writes, deletes or reads `<commit>/override/` or `builds/<commit>/data/`; those belong to the daily job (owner decision, 2026-11-22). The build does not upload the data it read: no page data, no roster, no aliases. It uploads `builds/<commit>/build/release.json` (`{commit, branch, pr, dataVersion}`) last, as the completion marker. The build records the data version it read: the `version` of the newest row (the chain head) in intake's `public.data_mutation_applied` ledger. Every page carries it in `data-data-version` on `<html>`, next to `data-release-id`, and the local `.release/source.json` records it as `dataVersion` (it is not uploaded; `release.json` is the uploaded record).
- Release folders uploaded before this change have no `builds/<commit>/build/release.json`. They are left out: they cannot be promoted and get no release host. Nothing writes a `release.json` for them (owner decision, 2026-11-22).

### A redirect build replaces redirect keys

- From: `scripts/generate-redirect-map.mjs` writes `dist/_redirect-map.json`. `scripts/promote.sh` loads it into the KVS `r:<release-id>:` namespace with `scripts/load-redirects.mjs`. The router answers 301 from `r:` keys, including `/*` wildcard keys found through a prefix list.
- To: a separate redirect build, `npm run redirects:build -- [<commit>]` (`scripts/build-redirects.mjs`), derives the full redirect set every time (owner decision "Redirect layer", 2026-11-22). Nothing is committed. It compares the `www` sitemap (current production) with a target release commit, by default the tip of `main`. Target pages come from a local build of that commit when present, otherwise from `<commit>.release.policeconduct.org`. For each `www` URL the target lacks, it reads the old page on `www`, takes the record kind and id from its ld+json, and maps that record to its page in the target. A record with no page in the target gets no redirect (404). Old pagination URLs go to the target page that lists the old page's first record; old video URLs get no redirect. It carries forward the redirects of the release `www` serves, found by listing `redirect/<www commit>/` in the production site bucket, re-pointed to current paths. It creates no redirect for, and carries none from, an old URL listed in `route-absences.json`, the committed list of redirect exclusions (old URLs that may return 404). Each run reports every old URL with no target and why. `npm run redirects:build:preview -- <pr-number>` runs the same script for the build `current:pr-<N>` names and writes the preview site bucket. If `www` is unreachable, it fails and changes nothing. A one-time fallback covers today's pages, which name no record: it starts from `www`'s `/_redirect-map.json`, derives each old page's record from its URL, slug, other ld+json and `<h1>`, and opens each page it cannot resolve in the owner's default browser to ask.
- It writes only redirect files: empty objects whose `x-amz-meta-redirect-location` header holds the target, in their own folder `redirect/<commit>/` in the target's site bucket (production for a release, preview for a preview), at `redirect/` plus the key the router requests. It never writes `<commit>/build/` (release build) or `<commit>/override/` (daily job).
- CloudFront serves them through an origin group on each distribution. The primary origin is the site bucket, read as today. On a 403 or 404 it retries the same rewritten path on a second origin, the same bucket with `origin_path = "/redirect"`. The site buckets grant CloudFront no `s3:ListBucket`, so a missing key answers 403, not 404; both codes fail over. Both bucket policies allow reads of `redirect/*`. A new viewer-response CloudFront Function turns a response that carries `x-amz-meta-redirect-location` into a 301 with the query string kept, strips the header, and keeps the preview `noindex` header. Previews serve the redirects of their own preview redirect build.
- `npm run deploy -- prod` runs the redirect build after the upload and before promotion. Before promoting an earlier release with `npm run deploy:promote`, run the redirect build for it. No approval gate.
- Removed: KVS `r:` keys, the router's `mappedTarget` lookup and wildcard prefix list, `scripts/load-redirects.mjs`, `scripts/generate-redirect-map.mjs`, `scripts/workspace-redirects.mjs` and `dist/_redirect-map.json`. `route-absences.json` stays, as the list of redirect exclusions. The KVS keeps the `current*` pointers, `o:` override keys and the `release:` keys from `release-hosts`.
- Each page names its record (kind and id, from intake's page views) in its ld+json, so a later redirect build can read it from the old page.
- Astro's own `redirects` setting is not used: for static output it writes an HTML page with a meta refresh and status 200, not an HTTP 301.

### Previews are PR builds only

- From: `npm run deploy -- preview` takes `PR_NUMBER` or `PREVIEW_NAME`, and the router serves any `<label>.preview.<domain>` host that has a pointer.
- To: a preview requires `PR_NUMBER` matching `^[1-9][0-9]*$` and is served only at `pr-<N>.preview.<domain>`.

### Keep every release; remove previews when the PR closes

- From: `npm run deploy:delete` deletes a production release folder, its release data and its KVS keys. `cleanup-preview.mjs` deletes only the closed PR's pointer.
- To: release folders are never deleted. When a PR closes, its `current:pr-<N>` pointer is deleted, then every folder in the preview site bucket and every `builds/<release-id>/` in the preview release data bucket that no `current*` pointer in the preview store names is deleted. That also removes the folders of the PR's earlier pushes and superseded `current:main` mirror copies (owner decision, 2026-11-22). The daily job publishes only to production, so the preview release data bucket holds no daily output. The removed preview's `o:` keys are removed by hand with `npm run deploy:delete -- <release-id>`, which then works on the preview store only.

### Overrides stay with their release

- Records current behavior (owner decision Q6): a page the release API publishes into `<release>/override/` serves only while that release is promoted. A new release starts with no overrides; promoting an earlier release brings back its own.
- A rebuild of the same commit keeps its overrides; an overridden page keeps the data version it was rendered with until the daily job republishes it.

### Route coverage moves to `shared-redirects`

- The shipped rule that every prior URL has a disposition becomes an ADDED requirement on `shared-redirects`, checked against the redirect build's output: every `www` sitemap path is a route in the target, has a redirect file, or has no target with a recorded reason. The redirect build records each path with no target and its reason every run. `route-absences.json` keeps its `{ path, reason }` entries of exact paths and becomes the list of redirect exclusions: old URLs that may return 404, for which the redirect build creates or carries no redirect.

## Non-Goals

- Release hosts (`<commit>.release.policeconduct.org`) and redirecting bare `preview.` and `release.` hosts to `www`. `openspec/changes/release-hosts/` (PR #58) covers them and lands after this change. This change does not specify them.
- Incremental rendering. Removed for now.
- Moving builds or deploys into CI. Builds and deploys run locally through `npm run deploy -- <environment>`. The CI publication items stay deferred until a change adds CI publication (see `fix-pr-checks`).
- The intake database handoff. That is intake's work.
- Slug-change redirects. Published slugs never change, so no bulk redirect design is needed.

## Capabilities

### New Capabilities

- `deploy-hosting`: release folders and IDs, promotion, how the router picks a release per host, overrides, indexing, and folder lifecycle. It will be the one release capability: task 1.7 removes the separate release-folder rules from `publish-release-news` (owner decision Q13, `.egm-reviews/owner-decisions-round1.md`). Redirect semantics stay in `shared-redirects`.

### Modified Capabilities

- `shared-redirects`: adds the redirect build, the prior-URL coverage requirement checked against its output, and pages naming their record. Redirects are served from redirect files in `redirect/<commit>/` through a CloudFront origin group, not from KVS keys. The generator-based requirements (workspace duplicate mappings, generated legacy collection redirects) are removed.

## Impact

- `src/lib/data-version.js` (new), `src/layouts/SiteLayout.astro`, `scripts/build-release.mjs`, `scripts/validate-schema-contract.mjs` (ledger table in `requiredTables`): read the data version once from the ledger, render it on every page and record it in `.release/source.json` and `.release/build/release.json`.
- `scripts/write-release-news.mjs` (deleted), `scripts/build-release.mjs`, `scripts/release-files.mjs`, `src/lib/data/release-news.ts`, `src/lib/data/coverage.ts`: the build stops writing page data, the roster and aliases.
- `scripts/upload-release.sh`: replace only the build-owned prefixes on a rebuild; upload `release.json` last.
- `scripts/promote.sh`: check `builds/<id>/build/release.json` instead of `builds/<id>/data/dynamic.json`; stop loading redirects.
- `scripts/build-redirects.mjs` (new, `npm run redirects:build` and `npm run redirects:build:preview`), `scripts/redirect-object-key.mjs` (new), `scripts/page-records.mjs` (new), `scripts/verify-redirect-coverage.mjs`, `scripts/deploy.sh` (redirect build before promotion; no coverage gate before upload), `scripts/promote.sh`, `scripts/load-redirects.mjs`, `scripts/generate-redirect-map.mjs`, `scripts/workspace-redirects.mjs` (deleted, with their tests), `route-absences.json` (kept, now the redirect exclusions), `docs/route-coverage.md`, `package.json` (`build:site`, `redirects:build`, `redirects:build:preview`, `validate:redirects`, `test:redirects`): the redirect build.
- `src/layouts/SiteLayout.astro` and the pages rendered from intake page views: each page names its record in its ld+json.
- `infrastructure/bootstrap-policeconduct/functions/router.js`, `functions/viewer-response.js` (new), `functions/noindex.js` (deleted), `main.tf`: no `r:` reads or prefix list; the viewer-response function on both distributions; on both distributions a second origin (`origin_path = "/redirect"`) and an origin group failing over on 403 and 404; `redirect/*` in both site bucket policies.
- `scripts/deploy.sh`, `router.js`: PR-only preview labels.
- `scripts/manage-release.mjs`, `scripts/cleanup-preview.mjs`, `.github/workflows/cleanup-preview.yml`, `package.json` (`deploy:delete`): lifecycle.
- `infrastructure/bootstrap-policeconduct/main.tf`: cleanup IAM on the preview release data bucket, the `RELEASE_DATA_BUCKET_PREVIEW` variable, and 7-day noncurrent-version expiry on the preview release data bucket.
- `README.md` deploy sections, `infrastructure/bootstrap-policeconduct/README.md`, `scripts/EGM.md`, `src/layouts/EGM.md`, `src/lib/EGM.md`, `infrastructure/bootstrap-policeconduct/functions/EGM.md`: documentation.
- `openspec/changes/publish-release-news/` and `openspec/changes/fix-pr-checks/`: coordinated edits (task 1.7).
- Tests: `src/lib/data-version.test.mjs` (new), `tests/e2e/content-pages-smoke.spec.ts`, `scripts/deploy-release-guard.test.mjs`, `scripts/release-news.test.mjs`, `scripts/cloudfront-router.test.mjs`, `scripts/manage-release.test.mjs`, `scripts/verify-redirect-coverage.test.mjs`, plus new tests for `scripts/cleanup-preview.mjs`, `scripts/redirect-object-key.mjs`, `scripts/page-records.mjs`, `scripts/build-redirects.mjs` and `functions/viewer-response.js` (`scripts/cloudfront-response.test.mjs`). `scripts/load-redirects.test.mjs` is updated by task 2.4 (its `--no-overwrite` assertion) and deleted by task 7.5.
- Operations: after merge, one Terraform apply, one `npm run deploy -- prod` (its redirect build is the first, with the owner answering each unresolved page), a one-time deletion of every `r:` key in both stores, and a one-time deletion of preview pointers that are neither `current:main` nor `current:pr-<N>` (task 4.4).
