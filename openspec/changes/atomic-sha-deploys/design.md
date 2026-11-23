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
- Move the route coverage rule into `shared-redirects`, checked against the redirect build's output.
- Serve redirects from redirect files in their own `redirect/<commit>/` folder instead of KVS `r:` keys, derived each time by a separate redirect build that compares the `www` sitemap with a target release or open-PR preview.

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
- `promote.sh` checks `builds/<id>/build/release.json` (task 2.7). The release API routing needs no change. Redirects move to their own folder (see "Redirect build").
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
- Release folders uploaded before this change have `builds/<commit>/data/dynamic.json` and no `release.json`. They are left out (owner decision, 2026-11-22). They cannot be promoted, and they get no release host. Nothing deletes or rewrites their files, and nothing writes a `release.json` for them. A redirect build can still run for them, but they cannot be promoted.

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
- When a PR closes, `scripts/cleanup-preview.mjs` deletes `current:pr-<N>` from the preview store. Then it lists every key starting with `current` in the preview store and deletes every release folder `<release-id>/` and every redirect folder `redirect/<release-id>/` in the preview site bucket, and every `builds/<release-id>/` in the preview release data bucket, whose release ID no remaining pointer names (owner decision, 2026-11-22). `redirect/` and `404.html` at the bucket root are not release folders: the sweep reads the release IDs under `redirect/` and never deletes `redirect/` as a whole. This removes the closed PR's folder, the folders of its earlier pushes, and superseded `current:main` mirror copies. The folder `current:main` names is kept. Mirror copies stop when `openspec/changes/release-hosts/` stops the mirror and deletes its copies once. The daily job publishes only to production, so this deletes no daily output. The sweep holds no state, so a failed delete is retried by rerunning the cleanup.
- `.github/workflows/cleanup-preview.yml` runs as the `github_actions` role. Task 4.1 grants it `s3:ListBucket` on the preview release data bucket and `s3:GetObject` and `s3:DeleteObject` on its `builds/*`, and nothing on the production release data bucket. Terraform exports the bucket name to the `preview` GitHub environment as `RELEASE_DATA_BUCKET_PREVIEW`, like `KVS_ARN_PREVIEW`.
- KVS keys are removed by hand. `npm run deploy:delete -- <release-id>` removes `o:<release-id>:` keys from the preview store, and refuses when any preview pointer names the release.
- Preview pointers from before this change that are neither `current:main` nor `current:pr-<N>` return 404 after the router change. Task 4.4 deletes them once, so the sweep can remove their folders.

## Route coverage

The shipped rule says every prior URL exists in the new build, redirects to a current route, or is listed in `route-absences.json`. With redirects derived every time (see "Redirect build"), the redirect build gives every missing `www` sitemap path a disposition itself: a redirect file, or no file (404) with a reason it records.

`route-absences.json` stays, with its existing entries `{ "path", "reason" }` of exact paths, and becomes the list of redirect exclusions (owner decision, 2026-11-22): old URLs that may return 404. The redirect build creates no redirect for a listed path and does not carry forward a redirect from it. The path gets no file and is recorded with the entry's reason. Its current entries (the empty state pages and the personnel URLs of the 2026-09-20 reconciliation) stay. To retire a redirect production serves, add its old path with a reason in a commit; it returns 404 from the next redirect build on. To end an exclusion, delete its entry; the next redirect build treats the path like any other. The file stays small: a path needs an entry only when the redirect build would otherwise create or carry a redirect for it.

An intake gap (a record intake has not loaded yet) is a path with no target, recorded with the reason "No page in the target shows the record this page showed."; no return date or retirement is inferred. `docs/route-coverage.md` is rewritten to say this.

`npm run validate:redirects` (`scripts/verify-redirect-coverage.mjs`) keeps the invariant and checks the redirect build's output for one target commit (see "Coverage check"). It no longer runs in `npm run deploy` before the upload, because redirects are no longer part of the release build. `PRIOR_SITEMAP` is removed: the prior sitemap is always `www`.

## Redirect build

Owner decision, 2026-11-22 ("Redirect layer", `.egm-reviews/owner-decisions-round1.md`), which supersedes the committed `redirects.json` list and the redirect files written into `<commit>/build/`:

- A separate redirect build compares the `www` sitemap (current production) with a target release commit and derives the full redirect set every time. Nothing is committed.
- It writes only redirect files, to their own folder `redirect/<commit>/` in the site bucket of its target: the production site bucket for a release, the preview site bucket for an open-PR preview (owner decision, 2026-11-22).
- CloudFront serves them through an origin group, on both distributions: a 404 or 403 from the release path is retried under `redirect/`, where the redirect file answers 301.
- The release build (`<commit>/build/`), the overrides (`<commit>/override/`, daily job) and the redirects (`redirect/<commit>/`, redirect build) are three independent folders. None of the three writers touches another's folder.
- KVS `r:` keys and the router's redirect lookup go away. Overrides keep their `o:` keys.

Today `scripts/generate-redirect-map.mjs` (inside `npm run build:site`) writes `dist/_redirect-map.json` from the database and the intake workspace `redirects.json` (`scripts/workspace-redirects.mjs`). `scripts/promote.sh` loads it into the KVS `r:<release-id>:` namespace with `scripts/load-redirects.mjs`. The router answers 301 from `r:` keys, including `/*` wildcard keys found through a prefix list (`mappedTarget`). A real build's map has about 25,668 redirects, about 3 MB of keys. The 5 MB store fits one release, and releases are kept forever.

### Why not Astro `redirects`

For static output, Astro writes each redirect as an HTML page with a meta refresh, served with status 200. It sends no `Location` header and no 301 (`node_modules/astro/dist/core/build/generate.js` warns: "A static build sends no `Location` header"). An S3 object with a redirect target in its metadata, turned into a 301 at the edge, gives a real 301.

### Records in pages

Owner decision, 2026-11-22: each page names the record it shows, by kind and id, in its ld+json, where it is easy to find. Intake's page views (owner decision "Page-shaped views", 2026-11-22) give each page one kind and one id. Task 7.13 adds them:

- A page rendered from a page view carries one ld+json `WebPage` entry with its canonical `url` and `"identifier": { "@type": "PropertyValue", "propertyID": "policeconduct.org/<kind>", "value": "<id>" }`, with the kind and id exactly as the page view gives them.
- The first page of a paginated list carries the list's own identifier. Every page of the list, the first included, also carries an `ItemList` whose `itemListElement` entries name, in page order, each listed record with the same `identifier` shape. A `/page/<n>/` page carries no identifier of its own.
- A page not rendered from a page view (for example the FAQ) carries no identifier.

The sitemap does not carry the identifier. The redirect build reads it from the pages. `scripts/page-records.mjs` exports `pageRecord(html)` (the page's `identifier` as `{ kind, id }`, or `null`) and `listedRecords(html)` (the `ItemList` records in page order). The redirect build uses the same functions for old pages and target pages.

### `npm run redirects:build` and `npm run redirects:build:preview`

One script, `scripts/build-redirects.mjs`, with a switch for the target, exposed as two npm scripts (owner decision, 2026-11-22):

- `npm run redirects:build -- [<commit>]` (`node scripts/build-redirects.mjs [<commit>]`) targets a release. `<commit>` is a full 40-character commit. The default is the tip of `main`: `git rev-parse origin/main` after `git fetch origin main`. It writes `redirect/<commit>/` in the production site bucket (`S3_BUCKET`) and its result to `.release/redirect-build/<commit>.json`.
- `npm run redirects:build:preview -- <pr-number>` (`node scripts/build-redirects.mjs --preview <pr-number>`) targets the open-PR preview `pr-<N>.preview.policeconduct.org`. `<pr-number>` must match `^[1-9][0-9]*$`. The target release ID is the `data-release-id` on `<html>` of `https://pr-<N>.preview.policeconduct.org/`, the build `current:pr-<N>` names; a request that fails after 3 tries stops the command before it writes. It writes `redirect/<release-id>/` in the preview site bucket (`S3_BUCKET_PREVIEW`) and its result to `.release/redirect-build/preview/<release-id>.json`. It never writes the production site bucket.

Both resolve bucket and distribution names from Terraform outputs (`scripts/terraform-outputs.mjs`: `S3_BUCKET`, `CLOUDFRONT_DIST_ID`, and for a preview `S3_BUCKET_PREVIEW`, `CLOUDFRONT_DIST_PREVIEW`) as `scripts/upload-release.sh` does, with the AWS credentials a production deploy uses, which reach both site buckets. Everything else below (what it reads from `www`, the carried redirects, the exclusions, the mapping and the checks) is the same for both.

It reads:

- **Production.** `https://www.policeconduct.org/sitemap-index.xml` and its child sitemaps, the old pages it must resolve, and the `data-release-id` on `<html>` of `https://www.policeconduct.org/` (the commit `www` serves). `www` is the only source of production pages; the command never reads another host for them. `--www <origin>` replaces the `www` origin for tests only.
- **Target pages.** A local build of the target commit when one is present: `dist/` with a `.release/source.json` whose `commit` is the target. Otherwise the target's host: for a release, its release host `https://<commit>.release.policeconduct.org` (`openspec/changes/release-hosts/`; until that change lands, a local build is required, and without one the command stops); for a preview, `https://pr-<N>.preview.policeconduct.org`. `--release-origin <origin>` replaces the target host's origin (release or preview) for tests only. From the target it takes every route (the target sitemap's URLs and, for a local build, every generated HTML route), an index from each record (kind and id) to the path of the page whose `identifier` names it, and each paginated list's `ItemList` entries. From a target host this reads every page in the target sitemap (one request each, 16 at a time); a local build avoids those requests. From a target host, a carried redirect's target that is not in the target sitemap (a generated page left out of the sitemap, such as a form) counts as a route when a request for it answers 200. Two target pages that name the same record stop the command.
- **Production's current redirects.** Both targets carry forward production's redirects (owner decision "Redirect generation", 2026-11-22: production's existing redirects are carried forward, re-pointed to current URLs). They are found by listing the redirect folder of the commit `www` serves, `redirect/<www commit>/` in the production site bucket: `aws s3api list-objects-v2 --prefix redirect/<www commit>/build/`, following continuation tokens, then `head-object` for each key to read `redirect-location`. `oldPathForKey(key)` (see "Redirect files") turns each key back into its old path. Listing needs `s3:ListBucket` on the production site bucket for the CLI user that runs the command, not for CloudFront. The deploy credentials already have it, because `aws s3 sync --delete` in `scripts/upload-release.sh` lists the bucket; CloudFront still gets no `s3:ListBucket` (see "403, not 404, for a missing key"). No manifest file is written beside the redirect files (owner decision, 2026-11-22, allowed one; listing is chosen): the redirect files stay the one record of a release's redirects, so no second record can drift from them, and the coverage check already lists the same folder. A listing or `head-object` failure stops the command before it writes.
- **Redirect exclusions.** `route-absences.json` at the root of the checkout the command runs in (`git rev-parse --show-toplevel`). Each entry is an exact path that follows the path rules in "Redirect files", with a nonempty reason; a path listed twice, a malformed entry or a missing file stops the command before it writes. `npm run deploy -- prod` runs it from the `main` folder, and a preview run uses the PR's own folder, so a PR can try an exclusion on its preview.

Steps:

1. Read `www`. When any `www` request fails after 3 tries (a network error, a timeout, a status other than 200, or for an old page a status other than 200 or 404), the command prints that `www` is unreachable, writes nothing, and exits non-zero. It writes to the bucket only in step 5, so a failed run changes nothing.
2. The old paths are the `www` sitemap paths that are not routes in the target, plus every carried redirect's old path that is not a route in the target.
3. Each `www` sitemap old path gets a target or no target:
   - **Excluded path**: a path listed in `route-absences.json`. No target and no page read; the reason is the entry's reason.
   - **Video page**: a path that starts with `/videos/` or `/video/`, or ends in `/watch/<segment>/`. No target and no page read (owner: old video URLs are ignored).
   - **Pagination page** `<list>page/<n>/`: read the old page's first listed record from its `ItemList`. The target is the page of list `<list>` in the target whose `ItemList` names that record (`<list>` itself when it is on the first page). No listed record, or no page lists it: no target.
   - **Any other page**: read the record from the old page's `identifier`, and take the path of the target page that names it. The old page returns 404 on `www`, or its record has no page in the target: no target. An old page with no `identifier` is resolved as in "Pages without identifiers".
4. Each carried redirect `old -> T` gets no file when `old` is listed in `route-absences.json` (recorded with the entry's reason). Otherwise it gets `old -> T` when `T` is a route in the target, `old -> T'` when `T` is a `www` sitemap old path whose target is `T'` (so chains collapse), and no file otherwise. A carried old path that is a route in the target gets no file. A carried redirect whose `T` is an excluded path therefore gets no file too, because an excluded path has no target.
5. Write (see "Redirect files"), then run the coverage check (see "Coverage check").

The command prints the number of redirect files written, carried, re-pointed and removed, and of paths with no target by reason. Each run reports every old URL with no target and why. It writes its result to its result file (git-ignored): the target (`release`, or `preview` with the PR number), the `www` commit, the `www` sitemap paths, the target routes, the exclusions it read, every redirect `{ from, to }`, every path with no target `{ path, reason }`, and every unresolved path. The reasons are: the entry's reason from `route-absences.json`, "Old video page; old video URLs are not redirected.", "The old page was missing on www.", "No page in the target shows the record this page showed.", "No page in the target lists the first record of this old page." and "Owner: no current page shows this record.".

It never reads or writes the database, the intake workspace, or `<commit>/build/` or `<commit>/override/` in either bucket.

### Pages without identifiers (one-time fallback)

The live site today was built before task 7.13, so its pages carry no `identifier`. Until a release built with task 7.13 is promoted, `www` pages lack one.

- **Starting list.** When `redirect/<www commit>/` holds no objects (the release `www` serves predates this change), the command reads `https://www.policeconduct.org/_redirect-map.json`, the map today's live build publishes, and takes its exact entries (a `from` without `*`) as the carried redirects. Its `/*` entries are dropped. This carries production's existing redirects, including the approved duplicate agency URLs from the workspace file, once.
- **Derived record.** When an old page has no `identifier`, the command derives its record from the route shape of the URL and its last segment (the slug), the page's other ld+json (`@type`, `name`, `url`) and its content (the `<h1>` text), matched against the target's records. Exactly one matching record gives the target. Each derived target, with the clues that matched, is written to `.release/redirect-build/<commit>.derived.json` for spot checks.
- **Unresolved pages.** Zero or several matches leave the old path unresolved. The command skips it. After every other path is resolved, it opens each unresolved page in the owner's default browser (`open <url>` on macOS) and asks in the terminal for the path of the target page that shows the same record, or Enter for none. An answer must be a target route; otherwise it asks again. A path answer becomes a redirect; "none" gives no file, with the reason "Owner: no current page shows this record.". At end of input the rest stay unresolved and get no file; the coverage check then fails for them, and a later run asks again. Answers apply to that run. A later run against an unchanged `www` asks again; once a release with identifiers is promoted, `www` pages carry identifiers and nothing is asked.

### Redirect files

A redirect file is an empty S3 object in the site bucket whose user metadata `redirect-location` holds the target path. Its key is `redirect/` followed by the exact key the router requests from the release folder for the old path: `redirect/<commit>/build/<redirectObjectKey(old path)>`. The `build` segment is part of the router's rewritten request path, which CloudFront retries unchanged under `redirect/`; it is not the release build folder, and nothing is written to `<commit>/build/`.

`scripts/redirect-object-key.mjs` exports `redirectObjectKey(path)`, which applies the router's index rule:

- `/a/b/` becomes `a/b/index.html`;
- `/a/b` (no `.` in the last segment) becomes `a/b/index.html`;
- `/a/b.xml` stays `a/b.xml`.

The same module exports `oldPathForKey(key)`, its inverse, which the carry-forward uses: `a/b/index.html` becomes `/a/b/`, and `a/b.xml` becomes `/a/b.xml`. The path rules below make the two functions exact inverses for every valid old path.

The redirect build and the coverage check use these functions. A router test checks that the router's rewrite equals `/<commit>/build/` plus it.

Paths start with one `/`, end in `/` unless the last segment holds a `.`, and hold no whitespace, `?`, `#`, `\`, control characters or characters outside printable ASCII (S3 user metadata cannot carry them). Every target is a route in the target and is not itself an old path. A path that breaks a rule, or two old paths with one key, stop the command before it writes anything.

`aws s3 sync` applies one set of metadata to every file in a call, so it cannot give each object its own target. For each redirect the command runs:

```text
aws s3api put-object --bucket <target site bucket> --key redirect/<commit>/build/<key> \
  --content-type "text/html; charset=utf-8" --cache-control no-cache \
  --metadata '{"redirect-location":"<target>"}'
```

It runs 16 puts at a time and retries each failed put up to 5 times. Then it deletes every object under `redirect/<commit>/` that the new set does not hold, so a rerun leaves the folder equal to the latest run. Any put or delete that still fails makes it exit non-zero. The command writes and deletes only under `redirect/<commit>/` in its target site bucket.

For a release, when the target commit is the one `www` serves, the command then invalidates `/*` on the production distribution, so cached 404s and old redirects clear. Otherwise the promotion that follows invalidates `/*`. For a preview, the command always invalidates `/*` on the preview distribution, because `current:pr-<N>` already names the target.

A release run writes only to the production site bucket, and a preview run only to the preview site bucket. Both distributions serve redirect files through the same origin group design (see below).

### Serving: origin group and failover

Both distributions get a second S3 origin and an origin group. The production distribution (`aws_cloudfront_distribution.site`, which also serves the apex and, with `release-hosts`, every `<commit>.release` host):

- Origin `local.origin_id` (unchanged): the site bucket, through `aws_cloudfront_origin_access_control.site`.
- Origin `local.redirect_origin_id` (new, `"s3-${local.site_bucket_name}-redirect"`): the same bucket, the same origin access control, `origin_path = "/redirect"`.
- `origin_group` `local.site_origin_group_id` (new): primary member `local.origin_id`, failover member `local.redirect_origin_id`, `failover_criteria { status_codes = [403, 404] }`.
- `default_cache_behavior.target_origin_id` becomes `local.site_origin_group_id`. The behavior already allows only `GET` and `HEAD`, which origin groups require. The `/api/*` behavior is unchanged.

The preview distribution (`aws_cloudfront_distribution.preview`, which serves `pr-<N>.preview` hosts), the same way (owner decision, 2026-11-22):

- Origin `local.preview_origin_id` (unchanged): the preview bucket, through `aws_cloudfront_origin_access_control.site`, as today.
- Origin `local.preview_redirect_origin_id` (new, `"s3-${local.preview_bucket_name}-redirect"`): the preview bucket, the same origin access control, `origin_path = "/redirect"`.
- `origin_group` `local.preview_origin_group_id` (new, `"s3-${local.preview_bucket_name}-group"`): primary member `local.preview_origin_id`, failover member `local.preview_redirect_origin_id`, `failover_criteria { status_codes = [403, 404] }`.
- Its `default_cache_behavior.target_origin_id` becomes `local.preview_origin_group_id`. Its `/api/*` behavior is unchanged.

The router is unchanged in how it rewrites: `/<commit>/build/<key>`, or `/<commit>/override/<key>` when an `o:` key exists. When that object is missing, CloudFront sends the same rewritten path to the failover origin, which reads `redirect/<commit>/build/<key>`. A redirect file there answers 200 with `x-amz-meta-redirect-location`, and the viewer-response function turns it into a 301. When the failover object is missing too, the existing `custom_error_response` entries (403 and 404 to `/404.html`, status 404) apply as today. A page in the release folder always wins over a redirect file, because the primary origin answers first.

**403, not 404, for a missing key.** The site bucket policy (`data.aws_iam_policy_document.site_bucket_policy` in `infrastructure/bootstrap-policeconduct/main.tf`) grants the CloudFront service principal only `s3:GetObject`, on `*/build/*`, `*/override/*` and `404.html`, and grants no `s3:ListBucket`. `preview_bucket_policy` grants the same on the preview bucket. Without `s3:ListBucket`, S3 answers a request for a missing key with 403 AccessDenied, not 404. So the failover criteria include 403, and a request for a missing page today reaches the viewer through the 403 `custom_error_response`. 404 stays in the criteria so failover still works if the policy later grants `s3:ListBucket`. `release.tf` does not change the site bucket policies (its policies are on the release data buckets).

**Bucket policies.** `site_bucket_policy` adds `"${aws_s3_bucket.site.arn}/redirect/*"` and `preview_bucket_policy` adds `"${aws_s3_bucket.preview.arn}/redirect/*"` to the resources of their one statement, with the same `AWS:SourceArn` and `AWS:SourceAccount` conditions. Neither grants `s3:ListBucket`.

The viewer cannot request a redirect file directly: every viewer path is rewritten under `/<commit>/build/` or `/<commit>/override/`, so a request for `/redirect/x/` is looked up as `<commit>/build/redirect/x/index.html` and then `redirect/<commit>/build/redirect/x/index.html`.

### Viewer-response function

`infrastructure/bootstrap-policeconduct/functions/viewer-response.js` (runtime `cloudfront-js-2.0`) is rendered by `templatefile` with one variable, `extra_headers`, a map of header names to values. Its handler:

1. When the response has the header `x-amz-meta-redirect-location`, it sets status 301 ("Moved Permanently"), sets `location` to the header value plus the request query string (the same `querySuffix` as the router, so repeated values are kept), and deletes `x-amz-meta-redirect-location`.
2. It adds every header in `extra_headers`.

Two functions use this source. CloudFront allows one function per event type per cache behavior, so the preview function replaces `noindex.js`:

| Function                                   | Name                                   | `extra_headers`                          | Associated with                                                          |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `aws_cloudfront_function.site_response`    | `${var.project_name}-site-response`    | `{}`                                     | `aws_cloudfront_distribution.site`, default behavior, viewer-response    |
| `aws_cloudfront_function.preview_response` | `${var.project_name}-preview-response` | `{"x-robots-tag" = "noindex, nofollow"}` | `aws_cloudfront_distribution.preview`, default behavior, viewer-response |

`aws_cloudfront_function.preview_noindex` and `functions/noindex.js` are deleted. Every preview response still carries `X-Robots-Tag: noindex, nofollow`. The router's deny-all `robots.txt` on non-production hosts does not change. Release hosts are on the production distribution, so they get no `noindex` header, as before; they keep the deny-all `robots.txt`.

CloudFront runs viewer-response functions on cache hits too, so a cached redirect file still returns 301. Responses the router makes itself (apex 301, robots, 404) and S3 errors carry no redirect header and pass through unchanged.

### Router and removed code

- The router drops `mappedTarget`, the wildcard prefix list and every `r:` read. A path with no object in the release folder or in `redirect/` returns the normal 404. It still reads `current*`, `o:` and (with `release-hosts`) `release:` keys.
- `scripts/promote.sh` no longer downloads `_redirect-map.json` or runs `load-redirects.mjs`. `scripts/load-redirects.mjs`, its test and its KVS size checks are deleted.
- `scripts/generate-redirect-map.mjs`, `scripts/workspace-redirects.mjs` and their tests are deleted, and `npm run build:site` no longer runs the generator. `dist/_redirect-map.json` is no longer written. Nothing reads the intake workspace `redirects.json` any more.
- Nothing writes redirect files into `<commit>/build/`. `route-absences.json` stays, as the list of redirect exclusions (see "Route coverage").

### Coverage check

`npm run validate:redirects -- <commit> [--preview]` (`scripts/verify-redirect-coverage.mjs`) checks the redirect build's output for one target. The redirect build runs it as its last step. It reads `.release/redirect-build/<commit>.json` and the keys under `redirect/<commit>/` in the production site bucket, or with `--preview` `.release/redirect-build/preview/<commit>.json` and the keys under `redirect/<commit>/` in the preview site bucket, and `route-absences.json`. It fails unless:

- every `www` sitemap path is a target route, has exactly one redirect, or has exactly one no-target entry with a nonempty reason;
- every redirect's target is a target route and is not itself a redirect source (no chains);
- no path is unresolved;
- no redirect's `from` is listed in `route-absences.json`, and every listed path that is a `www` sitemap old path or a carried old path has a no-target entry with that entry's reason;
- the keys under `redirect/<commit>/` equal `redirect/<commit>/build/<redirectObjectKey(from)>` for exactly the redirects in the result.

A failure names the unaccounted paths and the command to rerun: `npm run redirects:build -- <commit>`, or for a preview `npm run redirects:build:preview -- <pr-number>` with the PR number from the result file. A missing or malformed result file fails the check.

### Promotion order

Run the redirect build for a commit before promoting it. No approval gate.

- `npm run deploy -- prod` runs, in order: build, upload (`scripts/upload-release.sh` up to `release.json`), `npm run redirects:build -- <release-id>` against the local build just made, then promotion. A failed redirect build stops the deploy before promotion; rerun with `--skip-build`.
- Before `npm run deploy:promote -- <release-id>` (promoting an earlier release), run `npm run redirects:build -- <release-id>`. It reads the target from the release host, or from a local build of that commit. `deploy:promote` does not run it, so a release can still be promoted when `www` is down (for example, a rollback during an outage); that release then serves no new redirects until its redirect build runs.
- A preview deploy does not run the redirect build. After `npm run deploy -- preview` points `current:pr-<N>` at its build, run `npm run redirects:build:preview -- <N>`. Until it runs for that build, the preview serves 404 for moved URLs.

### Release hosts

A release host serves the release folder of its commit through the same origin group, so it serves `redirect/<commit>/` once that commit's redirect build has run. Each release keeps its own redirects: an earlier release host keeps the redirects of its last redirect build, computed against the `www` of that time.

### KVS contents

Each store keeps only the `current*` pointers, `o:` override keys and, in production, the `release:` keys from `release-hosts`. After the cutover, every `r:` key in both stores is deleted once by hand (plan.md, "Redirect cutover").

### Cutover

After merge, the Terraform apply publishes the router without `r:` reads, both origin groups and both bucket policies. The release that `current` names was uploaded before this change and has no `redirect/<commit>/` folder, so its redirects stop. The next `npm run deploy -- prod`, run right after the apply, runs the first redirect build (with the one-time fallback, the owner answering each unresolved page) and promotes a release with redirect files. Then the `r:` keys are deleted. Open previews serve redirects once `npm run redirects:build:preview -- <N>` runs for them.

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
- Expanding `/*` entries from database counts, or a retired prefix list in the router, vs no wildcards: no wildcards (owner decision, 2026-11-22, "wildcard patterns go away"). Old video URLs and old page numbers that no sitemap listed return 404.
- A page map (old URL to record) vs reading the record from the old page: the old page (owner decision, 2026-11-22, "no page map").
- A redirect list committed in this repository and updated by a separate command, or redirect files written into `<commit>/build/` by the release build, vs a separate redirect build that derives the full set each time into its own `redirect/<commit>/` folder: the redirect build (owner decision "Redirect layer", 2026-11-22). The release build, the overrides and the redirects stay three independent folders, a rebuild of a commit never touches its redirects, and the release build never depends on `www`.
- Redirect lookup in the router (KVS keys or a HEAD per request) vs a CloudFront origin group that retries a miss under `redirect/`: origin group (same decision). The router stays unchanged in how it rewrites, and only misses pay for a second origin request.
- Failover on 404 only vs 403 and 404: both. The site bucket grants CloudFront no `s3:ListBucket`, so a missing key answers 403.
- Carry-forward from a manifest (for example `redirect/<commit>/.redirects.json`, every from URL and target, written by each redirect build) vs listing the redirect folder of the commit `www` serves: listing (owner decision, 2026-11-22, allowed either). A manifest would need one `get-object` instead of a listing and one `head-object` per file, but it is a second record of the same redirects that an interrupted run can leave different from the files. Listing needs `s3:ListBucket` only for the CLI user, which the deploy credentials already have; CloudFront's access does not change.
- Redirects on previews: served (owner decision, 2026-11-22), replacing the earlier "previews serve no redirects". A preview run compares `www` with the PR's build and writes the preview bucket, so a PR shows the redirects it would get as a release. The preview distribution gets the same origin group.
- A new committed file of retired URLs vs `route-absences.json`: `route-absences.json` (owner decision, 2026-11-22). It already holds exact paths with reasons for old URLs that may return 404, so it becomes the list of redirect exclusions instead of being deleted.

## Risks and mitigations

- KVS propagation: a pointer change reaches edge locations over time; the `/*` invalidation follows it.
- Partial deploy: a production deploy can stop after the preview mirror is promoted but before production is. Rerunning with `--skip-build` resumes, because sync uploads only files that differ.
- Rewriting a served folder is not atomic: when a commit that `www` serves is rebuilt, the upload rewrites the folder `www` is reading. Visitors can see a mix of old and new files during the upload, and cached pages stay old until the `/*` invalidation after promotion. Mitigation: promotion invalidates `/*` once the upload is complete.
- Preview store failure: a full or failing preview store stops a production deploy, because `upload-release.sh` promotes the preview mirror first. The deploy fails loudly; fix the preview store and rerun.
- Daily output on a rebuild: a rebuild never touches `<commit>/override/` or `builds/<commit>/data/`. An override built from the old original stays served for its path until the daily job republishes it from the new original.
- Concurrent deploys: two deploys of the same commit write the same folder, and it can hold a mix of both builds until the last one finishes. Run one deploy of a commit at a time; rerun the deploy to make the folder equal one build. Pointer updates use the KVS ETag; the second writer fails and must rerun.
- Redirect cutover gap: between the Terraform apply and the next production deploy, the promoted release serves no redirects. Run the deploy right after the apply.
- Preview redirect build not yet run: a preview serves 404 for moved URLs until `npm run redirects:build:preview -- <N>` runs for its current build. A new push to the PR changes the build `current:pr-<N>` names; rerun the command after each preview deploy.
- Shared preview redirect folder: two PRs at the same commit share `redirect/<release-id>/` in the preview bucket. Their results are the same unless their checkouts' `route-absences.json` differ; the last run wins. Accepted, like the shared preview folder.
- Exclusion hides a move: a path listed in `route-absences.json` gets no redirect even when its record has a page in the target. Delete the entry, and the next redirect build redirects it.
- Exclusions come from the checkout: the command reads `route-absences.json` from the folder it runs in, not from the target commit. Run release redirect builds from the `main` folder; `npm run deploy -- prod` does.
- Redirect build not yet run for a promoted commit: a release promoted without its redirect build (for example with `npm run deploy:promote` while `www` is down) serves 404 for every moved URL until `npm run redirects:build -- <commit>` runs for it. `npm run deploy -- prod` runs the redirect build before promotion, so this happens only when a release is promoted another way.
- `www` down: the redirect build fails, writes nothing and changes nothing; the existing `redirect/<commit>/` folder stays as it was. `npm run deploy -- prod` then stops before promotion. Rerun when `www` answers.
- Failover latency: a request whose object is missing from the release folder makes a second origin request, to `redirect/`. Only misses pay this (redirects and 404s); pages found in the release folder are served from the primary origin as before. Missing-object answers stay cached for 60 seconds (`error_caching_min_ttl`).
- Redirect build time: about 25,000 `put-object` calls (16 at a time) and, for carried redirects, a paged listing of `redirect/<www commit>/` and one `head-object` each. Reading a target from a release host adds one request per target page (about 188,000); a local build avoids it.
- Old page missing on `www`: a sitemap path whose page returns 404 gets no file, with the reason "The old page was missing on www.", and returns 404.
- Wrong record on an old page: the redirect build trusts the `identifier` in the old page. A wrong identifier gives a wrong redirect, which the coverage check cannot detect (the target is a real route). Fix the page view in intake, rebuild, and rerun the redirect build.
- Wrong derived record in the one-time fallback: a derived target needs exactly one matching record, and every derived target is listed with its clues in `.release/redirect-build/<commit>.derived.json` for spot checks. A wrong one is corrected by rerunning after the page data is fixed; the fallback ends once `www` pages carry identifiers.
- Manual review in the one-time fallback: every unresolved page is opened in the browser and needs an answer, in every run until a release with identifiers is promoted. The count is unknown until the first run. Stopping early leaves the rest unresolved and the coverage check fails, so `npm run deploy -- prod` stops before promotion.
- Lost wildcards: `/videos/*`, `/video/*` and the pagination wildcards are dropped. Old URLs they matched that no sitemap listed return 404 from the first release served with this change.
- Completion marker on a rebuild: `release.json` from the earlier build stays in place until the rebuild's last step. An interrupted rebuild leaves a folder that mixes both builds and still passes the `promote.sh` marker check, so `npm run deploy:promote` would accept it. The marker is not deleted first, because the Forms API release check and `release-hosts` read it while the folder serves. Accepted (the owner accepts breakage that is fixed later). Recovery: rerun `npm run deploy -- <environment> --skip-build` with the same build.
- A rebuild replaces the earlier build of that commit. Nothing keeps the earlier build. If a rebuild of the live commit uses bad data, rollback means promoting an earlier release (older code) or rebuilding the commit again after the data is fixed.
- Data changing during a build: the data version is read once, before `npm run build:site`. If intake applies a data mutation to the shared local database while the build runs, some pages reflect newer data than the recorded version. AGENTS.md "Database Expectations" forbids loading data into a database that has a rebuild in progress. Pause intake for the build.
- Shared preview folder: two PRs at the same commit, or a PR and the `current:main` mirror, use the same folder in the preview site bucket. Their builds differ in `SITE_URL` and Sentry settings (`scripts/deploy.sh`). The last deploy replaces the folder, so the other label then serves pages built for a different host. Accepted. Redeploy the label that needs its own build.
- Cleanup race: the sweep at PR close deletes every preview folder no pointer names at that moment. A preview deploy whose upload is in progress, and whose pointer has not moved yet, loses its folder. Accepted (owner, 2026-11-22). Rerun that deploy.
- CI gains delete rights on preview release data: the `github_actions` role can delete `builds/*` in the preview release data bucket. It gets no right on the production release data bucket.
- Storage: one build is about 7.6 GB of site files (local build, 2026-11-15, 188,094 files in `dist/`). A rebuild re-uploads every file, because a fresh build changes every file's modification time, and that leaves a full set of noncurrent versions in the versioned buckets. In the preview buckets, noncurrent versions expire after 7 days (INS-106; `aws_s3_bucket_lifecycle_configuration.preview` in `main.tf`, and the new rule for the preview release data bucket in task 4.1). The production site and release data buckets have no expiry rule, so each production rebuild adds about 7.6 GB of noncurrent versions that stay billed. This change does not add a production rule.
