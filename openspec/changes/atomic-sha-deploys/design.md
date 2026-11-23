# Design

## Terms

- **Preview**: a build of an open PR, served at `pr-<N>.preview.<domain>`. Not a release.
- **Release**: a published build of a commit on `main`, stored as a folder in the production site bucket. Not every `main` commit is released.
- **Promote**: move the `current` pointer so `www` and the apex serve a chosen release. A preview deploy does not promote; it points `current:pr-<N>` at its build with the same steps.
- **Release ID**: the folder name of any uploaded build, preview or release: its full 40-character commit. The name comes from the code (`.release/id`, `RELEASE_ID`); a preview's release ID does not make it a release.
- **Release data bucket**: the private bucket that holds `builds/<release-id>/build/` (build-owned: the completion marker `release.json` and any build artifacts for the daily job) and `builds/<release-id>/data/` (daily job only). There is one per distribution; the preview one holds only preview builds' files.
- **Override**: a page the release API publishes into `<release-id>/override/` after the release is promoted.
- **Release API**: the `release_api` Lambda (`infrastructure/bootstrap-policeconduct/lambdas/release-api/`, defined in `release.tf`), with operations `release-snapshot` and `publish-page`. The daily job calls it.
- **Intake**: the separate data-import application that loads the site's database. The **daily job** is intake's daily news job (`.github/workflows/discover-news.yml` in the intake repository). It writes `builds/<release-id>/data/` and publishes overrides through the release API.

These terms are the owner's (Terms, `.egm-reviews/owner-decisions-round1.md`).

## Current deploy model (baseline, shipped)

This change starts from the deploy model already in the repository:

- `npm run deploy -- <environment> [--skip-build] [--dry-run]` (`scripts/deploy.sh`) builds the current commit, runs `npm run validate:redirects`, and calls `scripts/upload-release.sh`.
- The release ID is the full current commit of a clean working tree (`scripts/build-release.mjs`). Site files go to `<site bucket>/<release-id>/build/`. Today the build also uploads its page data, roster and aliases to `<release data bucket>/builds/<release-id>/data/`, with `dynamic.json` uploaded last as the completion marker, and uploads use `--no-overwrite`. This change replaces that (see "Build and daily storage").
- `scripts/promote.sh <release-id> [label]` checks the completion marker (today `builds/<release-id>/data/dynamic.json`; `builds/<release-id>/build/release.json` after task 2.7) and `<release-id>/build/index.html`, loads `<release-id>/build/_redirect-map.json` into the `r:<release-id>:` namespace (`scripts/load-redirects.mjs`), copies the release's `404.html` to the bucket root, moves the pointer with the KVS ETag guard, and invalidates `/*`.
- Pointers: `current` (production), `current:main` (bare `preview.<domain>`), `current:<label>` (`<label>.preview.<domain>`). A production deploy also uploads the release to the preview bucket and points `current:main` at it.
- Two CloudFront distributions (`site`, `preview`), each with its own site bucket, release data bucket and KVS (`site_redirects`, `preview_redirects`). Both run the same router source (`infrastructure/bootstrap-policeconduct/functions/router.js`, rendered by `local.shared_router_code` in `infrastructure/bootstrap-policeconduct/main.tf`). The preview distribution also runs `functions/noindex.js` on viewer-response.
- The release API writes `<release-id>/override/*` objects and `o:<release-id>:<path>` keys; the router serves the override when its key exists for the promoted release.
- `npm run deploy -- prod` promotes the release it uploads; a preview deploy points `current:pr-<N>` at its build with the same steps. There is no approval gate (owner Terms, `.egm-reviews/owner-decisions-round1.md`) and no separate promote step. Production deploys run from `main` after the PR merges. Promoting an earlier release uses `npm run deploy:promote -- <release-id>`.

Router behavior is tested in `scripts/cloudfront-router.test.mjs`; deploy ordering in `scripts/deploy-release-guard.test.mjs`.

A build folder `<release-id>/build/` changes only when the same commit is rebuilt and uploaded again (see Rebuilding a commit). After promotion, two things change a release outside a deploy: the release API writes `<release-id>/override/` objects and `o:<release-id>:` keys (a per-release overlay), and the daily job writes `builds/<release-id>/data/` in the production release data bucket (through the `intake_news` role in `infrastructure/bootstrap-policeconduct/release.tf`). Promotion invalidates `/*` because the error page and overrides change outside the cache key. Known limitation: each bucket has one root `404.html`, so in the preview bucket the most recently promoted label sets the error page for every preview host.

The bare `preview.<domain>` host and the `current:main` mirror are baseline behavior. `openspec/changes/release-hosts/` (PR #58) sits above this change in the stack, so it lands and archives after this one. It replaces the bare host with a redirect to `www`, adds `<commit>.release.<domain>` hosts, and stops production deploys from writing preview resources. When it lands, these statements here no longer hold: the "Bare preview host", "Production deploy mirrors to bare preview" and "Only a main build selects `current:main`" scenarios, the mirror sentences in Lifecycle, and the "Preview store failure" and "Partial deploy" risks. `release-hosts` must state them as MODIFIED or REMOVED requirements of `deploy-hosting`. Both changes edit `router.js`, `scripts/deploy.sh` and `scripts/upload-release.sh`; `release-hosts` rebases on this change's edits. This change does not specify release hosts.

## Goals

- Record the shipped deploy model as the baseline, in the project's terms.
- Let a commit be redeployed against newer data into its same release folder, and record the data version the build read.
- Serve previews only for open PRs.
- Keep every release folder; remove a preview folder when its PR closes.
- Document that overrides stay with their release.
- Move the route coverage rule into `shared-redirects`.
- Serve redirects from redirect files in each release folder instead of KVS `r:` keys.

## Non-Goals

- One distribution or `<id>.builds.<domain>` hosts.
- Release hosts and bare-host redirects (PR #58).
- Incremental rendering (removed for now).
- Moving builds or deploys into CI. The CI items stay deferred until a change adds CI publication (`fix-pr-checks`).
- The intake database handoff (intake's work).
- Redirects for changed slugs. Published slugs never change.

## Rebuilding a commit against newer data

The release ID stays the full 40-character commit. A rebuild of the same commit against newer data goes to the same folder.

- The build records the data version it read (see "Data version" below). Every page carries it, and `.release/source.json` records it as `dataVersion`, beside `commit`, `branch` and `pr`. `scripts/build-release.mjs` writes the same four values to `.release/build/release.json`, which is uploaded last as the completion marker (see "Build and daily storage").
- `scripts/upload-release.sh` replaces the build-owned files instead of skipping existing ones. It syncs `dist/` to `<commit>/build/` and `.release/build/` to `builds/<commit>/build/` without `--no-overwrite` and with `--delete`, so changed files are replaced and files the new build no longer produces are removed. Those two prefixes then equal the latest build.
- `--delete` applies only to those two build-owned prefixes. No deploy command names `<commit>/override/` or `builds/<commit>/data/`.
- `release.json` is uploaded last. The `.release/build/` sync excludes it, so `--delete` does not remove it; the last step replaces it.
- A rerun with `--skip-build` resumes an interrupted upload: sync uploads only files that differ.
- The same rules apply to every bucket the deploy writes (for `prod`, the production and the preview site and release data buckets).
- `scripts/release-files.mjs --verify` keeps its check that the release ID and `.release/source.json` `commit` equal the current commit. Its completion inventory covers `dist/` and `.release/build/`.
- `promote.sh` checks `builds/<id>/build/release.json` (task 2.7). The release API routing needs no change. Redirects move to files (see "Redirect files").
- Existing release folders are already named by the bare commit. Nothing is migrated.

## Build and daily storage

Owner decision, 2026-11-22: a rebuild of a commit cannot and will not overwrite anything the daily job generated. The build does not upload the data it used; the daily job has no access to it and rebuilds pages from the original page.

| Bucket       | Prefix                   | Owner     | Rebuild                        |
| ------------ | ------------------------ | --------- | ------------------------------ |
| site         | `<commit>/build/`        | build     | replaced, `--delete`           |
| site         | `<commit>/override/`     | daily job | never written, deleted or read |
| release data | `builds/<commit>/build/` | build     | replaced, `--delete`           |
| release data | `builds/<commit>/data/`  | daily job | never written, deleted or read |

- `builds/<commit>/build/` holds only build-specific artifacts meant for the daily job, plus `release.json`. Today `release.json` is the only file. A later change may add artifacts such as templates there.
- `release.json` is `{commit, branch, pr, dataVersion}`. It is uploaded last. Its presence marks a complete release for `promote.sh`, the Forms API release check (`publish-release-news` task 7.11) and `scripts/load-release-hosts.mjs` (`release-hosts`).
- The build writes no page data, roster or aliases anywhere. `scripts/write-release-news.mjs` is deleted (task 2.6). If the daily job needs a roster or page list, it derives it from the original pages (`publish-release-news` task 7.13). The site adds no substitute.
- Release folders uploaded before this change have `builds/<commit>/data/dynamic.json` and no `release.json`. They are left out (owner decision, 2026-11-22). They cannot be promoted, and they get no release host. Nothing deletes or rewrites their files, and nothing writes a `release.json` for them. They also have no redirect files.

## Data version

Owner decision, 2026-11-20 to 2026-11-22 ("Later decisions", `.egm-reviews/owner-decisions-round1.md`): the data version of a build is the `version` of the newest row in intake's data-mutation ledger, `public.data_mutation_applied`. Values look like `000015`. Intake does not change; the build reads what is already there.

- The newest row is the chain head. Intake's ledger (`supabase/migrations/20260905000000_data_mutation_ledger.sql` in the intake repository, ADR 0033) gives each row a `previous_version` that references its parent's `version`, with `unique (previous_version)`, and applies an entry only after its parent is in the ledger. So the one row whose `version` no row names as `previous_version` is the newest row applied.
- `src/lib/data-version.js` exports two functions. `headVersion(rows)` is pure: it returns the `version` of the one row that no row names as `previous_version`, and throws on zero or more than one. `readDataVersion()` is async: it imports `./db.js` dynamically, runs `SELECT version, previous_version FROM public.data_mutation_applied`, and returns `headVersion(rows)`. Importing the module opens no connection (`src/lib/db.js` builds its pool at import and loads `.env`).
- Exactly one head is expected. Zero rows (including an empty ledger) or more than one head stops the build with an error. A missing table stops the build through the query error. There is no fallback value. `scripts/validate-schema-contract.mjs` lists the table in `requiredTables`.
- The build reads the data version once. `scripts/build-release.mjs` always calls `readDataVersion()` before `npm run build:site` and ignores any inherited `DATA_VERSION` (for example from `.env`). It writes the value to `.release/source.json` and `.release/build/release.json` as `dataVersion`, and passes it to the site build as `DATA_VERSION`, the same way it passes `RELEASE_ID`.
- `src/layouts/SiteLayout.astro` uses `process.env.DATA_VERSION` when set, and otherwise awaits `readDataVersion()` once per build process (memoized at module level). That covers `npm run build:site`, `npm run dev` and the e2e dev server. `npm run dev` and `npm run test:e2e` therefore need a local `public.data_mutation_applied` with one chain head; the shared local database loaded by intake has one.
- `SiteLayout.astro` renders `data-data-version="<version>"` on `<html>`, next to `data-release-id`. Every built page carries both.
- The version is read at build time. It is never written into code or config.
- A database reset empties the ledger and replays the same chain (ADR 0033), so the head returns to the same version for the same data. If intake starts a new chain lineage (intake ADR 0034: the chain and the intake cache are one lineage), a version can name different data than before. A data version then identifies data only together with the build time. The owner accepted this for simplicity.

## Previews are PR builds only

`scripts/deploy.sh` requires `PR_NUMBER` matching `^[1-9][0-9]*$` for every environment other than `prod` (checked in `deploy.sh`, so it also applies with `--skip-build`) and drops `PREVIEW_NAME`. The router serves `<label>.preview.<domain>` only when the label matches `^pr-[1-9][0-9]*$`; any other label returns 404.

## Overrides stay with their release

The router looks up `o:<release-id>:<path>` for the promoted release only. A new release starts with no overrides; its build renders the same content from data, and the release API publishes new overrides to it. Promoting an earlier release serves that release's own overrides. Promotion does not copy overrides between releases (owner decision Q6, `.egm-reviews/owner-decisions-round1.md`).

A rebuild of the same commit keeps that release's overrides. Each override keeps the `data-data-version` of the build it was rendered from until the daily job publishes that page again from the rebuilt original (owner, 2026-11-20 to 2026-11-22: override pages keep their release's data version).

## Lifecycle

- Release folders in the production site bucket and their production release data (`builds/<release-id>/build/` and `builds/<release-id>/data/`) are kept forever (owner decision Q7, `.egm-reviews/owner-decisions-round1.md`). `scripts/manage-release.mjs` no longer deletes a production release folder.
- When a PR closes, `scripts/cleanup-preview.mjs` deletes `current:pr-<N>` from the preview store. Then it lists every key starting with `current` in the preview store and deletes every folder in the preview site bucket, and every `builds/<release-id>/` in the preview release data bucket, whose release ID no remaining pointer names (owner decision, 2026-11-22). This removes the closed PR's folder, the folders of its earlier pushes, and superseded `current:main` mirror copies. The folder `current:main` names is kept. Mirror copies stop when `openspec/changes/release-hosts/` stops the mirror and deletes its copies once. The daily job publishes only to production, so this deletes no daily output. The sweep holds no state, so a failed delete is retried by rerunning the cleanup.
- `.github/workflows/cleanup-preview.yml` runs as the `github_actions` role. Task 4.1 grants it `s3:ListBucket` on the preview release data bucket and `s3:GetObject` and `s3:DeleteObject` on its `builds/*`, and nothing on the production release data bucket. Terraform exports the bucket name to the `preview` GitHub environment as `RELEASE_DATA_BUCKET_PREVIEW`, like `KVS_ARN_PREVIEW`.
- KVS keys are removed by hand. `npm run deploy:delete -- <release-id>` removes `o:<release-id>:` keys from the preview store, and refuses when any preview pointer names the release.
- Preview pointers from before this change that are neither `current:main` nor `current:pr-<N>` return 404 after the router change. Task 4.4 deletes them once, so the sweep can remove their folders.

## Route absence accounting

The coverage checker reads the required repository-root `route-absences.json` array of `{ path, reason }` entries. Exact paths only; no wildcard exemptions. Existing routes and redirects take precedence; otherwise a listed missing route counts as an accounted-for 404. The list does not generate content or change HTTP routing. Missing or malformed lists fail validation. An intake gap (a prior URL whose record intake has not loaded yet) has no assumed end date and does not imply retirement. See `docs/route-coverage.md`.

`PRIOR_SITEMAP=skip` bypasses the check for a first deploy (`scripts/verify-redirect-coverage.mjs`).

## Redirect files

Owner decision, 2026-11-22: redirect files, not KVS redirect keys. Writing them is a separate build step after the full site build. They live in the build's own folder. Pruning redirect keys is dropped.

Today `scripts/generate-redirect-map.mjs` (inside `npm run build:site`) writes `dist/_redirect-map.json`. `scripts/promote.sh` loads it into the KVS `r:<release-id>:` namespace with `scripts/load-redirects.mjs`. The router answers 301 from `r:` keys, including `/*` wildcard keys. A real build's map has about 25,668 redirects, about 3 MB of keys. The 5 MB store fits one release, and releases are kept forever.

### Why not Astro `redirects`

For static output, Astro writes each redirect as an HTML page with a meta refresh, served with status 200. It sends no `Location` header and no 301 (`node_modules/astro/dist/core/build/generate.js` warns: "A static build sends no `Location` header"). An S3 object with a redirect target in its metadata, turned into a 301 at the edge, gives a real 301.

### Object key

A redirect object sits at the exact key the router requests for its source path, under `<commit>/build/`. `scripts/redirect-object-key.mjs` exports `redirectObjectKey(path)`, which applies the router's index rule:

- `/a/b/` becomes `a/b/index.html`;
- `/a/b` (no `.` in the last segment) becomes `a/b/index.html`;
- `/a/b.xml` stays `a/b.xml`.

The writer and the coverage check both use this function. A router test checks that the router's rewrite equals it.

### Wildcards

The map has `/*` entries that no list of exact paths can replace: `/videos/*` and `/video/*` match old URLs nobody listed, and the pagination entries match page numbers beyond today's counts. Expanding them from database counts would drop URLs that redirect today.

Choice: the router keeps a short fixed list of retired prefix patterns. The list lives in `infrastructure/bootstrap-policeconduct/functions/redirect-prefixes.json`, as regular expression strings, and Terraform renders it into `router.js`:

- `^/videos/`, `^/video/`;
- `^/report/[^/]+/page/`, `^/personnel/[^/]+/page/`, `^/civil-litigation/[^/]+/page/`, `^/law-enforcement-agency/[^/]+/page/`.

These are route shapes, not data. When a decoded request path matches a pattern, the router requests the object for the matched prefix (`<prefix>index.html`) instead of the full path. If that object does not exist, the request gets the normal 404.

The writer folds every map source under a pattern into that one prefix object: a `<prefix>*` wildcard, and every exact path under the prefix. All sources folded into one object must have the same target. Today's map already meets this: exact pagination entries go to the same index as their wildcard.

Effect: every URL that redirects today still redirects to the same target. A prefix that has exact page entries but no wildcard now redirects every page number under it, not only the listed pages, to the same target.

### The writer

`scripts/write-redirect-files.mjs` runs from `scripts/build-release.mjs` right after `npm run build:site`, so every `npm run build` runs it. It reads `dist/_redirect-map.json` and writes:

- `.release/redirects/<key>`: one file per redirect object. The body is a short HTML page with `<meta name="robots" content="noindex">` and a link to the target, so a reader who somehow gets the 200 can still go on. No inline CSS.
- `.release/redirects.json`: `{ redirects: [{ key, location, sources }] }`, sorted by key, where `sources` lists the map entries folded into that object.

It removes `.release/redirects/` and `.release/redirects.json` first. It stops with an error, before writing anything, when:

- a source or target fails the path rules `load-redirects.mjs` used (starts with one `/`, no whitespace, `?`, `#`, `\` or control characters), or a status is not 301;
- a `/*` source matches no retired prefix pattern;
- two sources for one key have different targets;
- a key equals a file in `dist/`, or a file in `dist/` lies under a retired prefix pattern (a redirect would hide a page);
- a target holds a character S3 user metadata cannot carry (anything outside printable ASCII).

`scripts/release-files.mjs` adds `.release/redirects/` and `.release/redirects.json` to the completion inventory.

### Upload

`aws s3 sync` applies one set of metadata to every file in a call, so it cannot give each object its own target. `scripts/upload-redirects.mjs <bucket> <release-id>` reads `.release/redirects.json` and runs, for each object:

```text
aws s3api put-object --bucket <bucket> --key <release-id>/build/<key> \
  --body .release/redirects/<key> --content-type "text/html; charset=utf-8" \
  --cache-control no-cache \
  --metadata '{"redirect-location":"<target>","build-commit":"<release-id>","build-dirty":"0"}'
```

It runs 16 puts at a time and retries each failed put up to 5 times. Any put that still fails makes it exit non-zero, and the deploy stops before `release.json`.

`scripts/upload-release.sh` order: sync `dist/` to `<commit>/build/` with `--delete`; run `upload-redirects.mjs`; sync `.release/build/`; upload `release.json` last. The `dist/` sync removes the previous build's redirect objects, because they are not in `dist/`. The uploader puts the new set back right after, so a redirect the new build no longer has is gone. `--skip-build` reruns put every redirect object again.

### Viewer-response function

`infrastructure/bootstrap-policeconduct/functions/viewer-response.js` (runtime `cloudfront-js-2.0`) is rendered by `templatefile` with one variable, `extra_headers`, a map of header names to values. Its handler:

1. When the response has the header `x-amz-meta-redirect-location`, it sets status 301 ("Moved Permanently"), sets `location` to the header value plus the request query string (the same `querySuffix` as the router, so repeated values are kept), and deletes `x-amz-meta-redirect-location`.
2. It adds every header in `extra_headers`.

Two functions use this source. CloudFront allows one function per event type per cache behavior, so the preview function replaces `noindex.js`:

| Function                                   | Name                                   | `extra_headers`                          | Associated with                                                          |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `aws_cloudfront_function.site_response`    | `${var.project_name}-site-response`    | `{}`                                     | `aws_cloudfront_distribution.site`, default behavior, viewer-response    |
| `aws_cloudfront_function.preview_response` | `${var.project_name}-preview-response` | `{"x-robots-tag" = "noindex, nofollow"}` | `aws_cloudfront_distribution.preview`, default behavior, viewer-response |

`aws_cloudfront_function.preview_noindex` and `functions/noindex.js` are deleted. Every preview response still carries `X-Robots-Tag: noindex, nofollow`, a redirect included. The router's deny-all `robots.txt` on non-production hosts does not change. Release hosts are on the production distribution, so they get no `noindex` header, as before; they keep the deny-all `robots.txt`.

CloudFront runs viewer-response functions on cache hits too, so a cached redirect object still returns 301. Responses the router makes itself (apex 301, robots, 404) and S3 errors carry no redirect header and pass through unchanged.

### Router and promotion

- The router drops `mappedTarget` and every `r:` read. It adds the retired prefix rewrite before the index rule. It still reads `current*`, `o:` and (with `release-hosts`) `release:` keys.
- `scripts/promote.sh` no longer downloads `_redirect-map.json` or runs `load-redirects.mjs`. `scripts/load-redirects.mjs`, its test and its KVS size checks are deleted.
- `scripts/generate-redirect-map.mjs` keeps writing `dist/_redirect-map.json` as the writer's input. Only its `note` text changes.

### Coverage check

`npm run validate:redirects` (`scripts/verify-redirect-coverage.mjs`) reads `.release/redirects.json` instead of `dist/_redirect-map.json`. It resolves each prior URL the way the router does: retired prefix first, then `redirectObjectKey`. A target must be a route in this build, and the target's own key must not be a redirect object (no chains). `route-absences.json` and `PRIOR_SITEMAP=skip` do not change. A missing or malformed `.release/redirects.json` fails the check.

### Release hosts

Each release has its own redirect objects in `<commit>/build/`. A release host serves the redirects of the release it serves, so old release hosts keep their redirects.

### KVS contents

Each store keeps only the `current*` pointers, `o:` override keys and, in production, the `release:` keys from `release-hosts`. After the cutover, every `r:` key in both stores is deleted once by hand (plan.md, "Redirect cutover").

### Cutover

After merge, the Terraform apply publishes the router without `r:` reads. The release that `current` names was uploaded before this change, so it has no redirect files, and its redirects stop. The next `npm run deploy -- prod`, run right after the apply, promotes a release with redirect files. Then the `r:` keys are deleted.

## Alternatives considered

- One distribution vs two: two kept. Previews need their own certificate, bucket, KVS and `noindex` header.
- Pointer promotion vs overwriting the bucket root: pointer kept. Rolling back is promoting an earlier release.
- A new folder per rebuild (a version or data version in the release ID) vs the same folder: same folder chosen (owner decision Q4, corrected 2026-11-20, `.egm-reviews/owner-decisions-round1.md`). A folder per rebuild would give an atomic switch and keep the earlier build for rollback. It would change the release-ID contract in `scripts/build-release.mjs`, `scripts/release-files.mjs`, the Forms API release check and `<commit>.release` hosts. The same folder keeps the release ID equal to the commit, and the build records the data version it read.
- Upload to a staging prefix, then switch: not chosen. The switch would need a second pointer per release, or a copy of the whole folder (about 7.6 GB per build), and Q4 keeps one folder per commit.
- Newest row by `applied_at` vs the chain head: chain head chosen. `applied_at` defaults to the transaction start time (`now()`), so entries applied in one transaction share a timestamp. The chain is the order intake enforces.
- Preview cleanup that deletes only the closed PR's last folder, or deletes the previous folder each time a pointer moves: not chosen. The owner chose a sweep at PR close of every preview folder no pointer names (2026-11-22).
- Copying overrides on promotion: not done. Each release renders its own content from data.
- Redirects in the KVS (`r:` keys) vs redirect files: files chosen (owner decision, 2026-11-22). One release's keys fill most of the 5 MB store.
- Astro `redirects` vs redirect files: Astro writes meta-refresh pages with status 200, not 301.
- Expanding `/*` entries from database counts vs retired prefix patterns in the router: patterns chosen; expansion drops URLs that redirect today.

## Risks and mitigations

- KVS propagation: a pointer change reaches edge locations over time; the `/*` invalidation follows it.
- Partial deploy: a production deploy can stop after the preview mirror is promoted but before production is. Rerunning with `--skip-build` resumes, because sync uploads only files that differ.
- Rewriting a served folder is not atomic: when a commit that `www` serves is rebuilt, the upload rewrites the folder `www` is reading. Visitors can see a mix of old and new files during the upload, and cached pages stay old until the `/*` invalidation after promotion. Mitigation: promotion invalidates `/*` once the upload is complete.
- Preview store failure: a full or failing preview store stops a production deploy, because `upload-release.sh` promotes the preview mirror first. The deploy fails loudly; fix the preview store and rerun.
- Daily output on a rebuild: a rebuild never touches `<commit>/override/` or `builds/<commit>/data/`. An override built from the old original stays served for its path until the daily job republishes it from the new original.
- Concurrent deploys: two deploys of the same commit write the same folder, and it can hold a mix of both builds until the last one finishes. Run one deploy of a commit at a time; rerun the deploy to make the folder equal one build. Pointer updates use the KVS ETag; the second writer fails and must rerun.
- Redirect cutover gap: between the Terraform apply and the next production deploy, the promoted release serves no redirects. Run the deploy right after the apply.
- Redirect upload time: about 25,668 `put-object` calls, 16 at a time, run on every deploy. A failed put stops the deploy before `release.json`; rerun with `--skip-build`.
- Redirect gap on a rebuild: the `dist/` sync removes a served commit's redirect objects before the uploader puts them back. Requests in that window get 404. This is part of the rebuild risk above.
- Completion marker on a rebuild: `release.json` from the earlier build stays in place until the rebuild's last step. An interrupted rebuild leaves a folder that mixes both builds and still passes the `promote.sh` marker check, so `npm run deploy:promote` would accept it. The marker is not deleted first, because the Forms API release check and `release-hosts` read it while the folder serves. Accepted (the owner accepts breakage that is fixed later). Recovery: rerun `npm run deploy -- <environment> --skip-build` with the same build.
- A rebuild replaces the earlier build of that commit. Nothing keeps the earlier build. If a rebuild of the live commit uses bad data, rollback means promoting an earlier release (older code) or rebuilding the commit again after the data is fixed.
- Data changing during a build: the data version is read once, before `npm run build:site`. If intake applies a data mutation to the shared local database while the build runs, some pages reflect newer data than the recorded version. AGENTS.md "Database Expectations" forbids loading data into a database that has a rebuild in progress. Pause intake for the build.
- Shared preview folder: two PRs at the same commit, or a PR and the `current:main` mirror, use the same folder in the preview site bucket. Their builds differ in `SITE_URL` and Sentry settings (`scripts/deploy.sh`). The last deploy replaces the folder, so the other label then serves pages built for a different host. Accepted. Redeploy the label that needs its own build.
- Cleanup race: the sweep at PR close deletes every preview folder no pointer names at that moment. A preview deploy whose upload is in progress, and whose pointer has not moved yet, loses its folder. Accepted (owner, 2026-11-22). Rerun that deploy.
- CI gains delete rights on preview release data: the `github_actions` role can delete `builds/*` in the preview release data bucket. It gets no right on the production release data bucket.
- Storage: one build is about 7.6 GB of site files (local build, 2026-11-15, 188,094 files in `dist/`). A rebuild re-uploads every file, because a fresh build changes every file's modification time, and that leaves a full set of noncurrent versions in the versioned buckets. In the preview buckets, noncurrent versions expire after 7 days (INS-106; `aws_s3_bucket_lifecycle_configuration.preview` in `main.tf`, and the new rule for the preview release data bucket in task 4.1). The production site and release data buckets have no expiry rule, so each production rebuild adds about 7.6 GB of noncurrent versions that stay billed. This change does not add a production rule.
- Prefix list drift: a new `/*` entry in the generator needs a new pattern in `redirect-prefixes.json`. The writer stops when a `/*` source matches no pattern, so drift fails the build.
