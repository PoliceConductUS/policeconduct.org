# Design

## Terms

- **Preview**: a build of an open PR, served at `pr-<N>.preview.<domain>`. Not a release.
- **Release**: a published build of a commit on `main`, stored as a folder in the production site bucket. Not every `main` commit is released.
- **Promote**: move the `current` pointer so `www` and the apex serve a chosen release.
- **Release data bucket**: the private bucket that holds `builds/<release-id>/data/` (the roster and page records for that release).
- **Override**: a page the release API publishes into `<release-id>/override/` after the release is promoted.

## Current deploy model (baseline, shipped)

This change starts from the deploy model already in the repository:

- `npm run deploy -- <environment> [--skip-build] [--dry-run]` (`scripts/deploy.sh`) builds the current commit, runs `npm run validate:redirects`, and calls `scripts/upload-release.sh`.
- The release ID is the full current commit of a clean working tree (`scripts/build-release.mjs`). Site files go to `<site bucket>/<release-id>/build/`. Release data goes to `<release data bucket>/builds/<release-id>/data/`, with `dynamic.json` uploaded last as the completion marker. Uploads use `--no-overwrite`.
- `scripts/promote.sh <release-id> [label]` checks the completion marker and `<release-id>/build/index.html`, loads `<release-id>/build/_redirect-map.json` into the `r:<release-id>:` namespace (`scripts/load-redirects.mjs`), copies the release's `404.html` to the bucket root, moves the pointer with the KVS ETag guard, and invalidates `/*`.
- Pointers: `current` (production), `current:main` (bare `preview.<domain>`), `current:<label>` (`<label>.preview.<domain>`). A production deploy also uploads the release to the preview bucket and points `current:main` at it.
- Two CloudFront distributions (`site`, `preview`), each with its own site bucket, release data bucket and KVS (`site_redirects`, `preview_redirects`). Both run the same router source (`infrastructure/bootstrap-policeconduct/functions/router.js`, rendered by `local.shared_router_code` in `infrastructure/bootstrap-policeconduct/main.tf`). The preview distribution also runs `functions/noindex.js` on viewer-response.
- The release API writes `<release-id>/override/*` objects and `o:<release-id>:<path>` keys; the router serves the override when its key exists for the promoted release.
- Every `npm run deploy -- <environment>` promotes the build it uploads. There is no approval gate and no separate promote step. Production deploys run from `main` after the PR merges. Promoting an earlier release uses `npm run deploy:promote -- <release-id>`.

Router behavior is tested in `scripts/cloudfront-router.test.mjs`; deploy ordering in `scripts/deploy-release-guard.test.mjs`.

Immutability covers `<release-id>/build/` only. `<release-id>/override/` and `o:<release-id>:` keys are a per-release overlay that the release API changes after promotion. Promotion invalidates `/*` because the error page and overrides change outside the cache key. Known limitation: each bucket has one root `404.html`, so in the preview bucket the most recently promoted label sets the error page for every preview host.

The bare `preview.<domain>` host and the `current:main` mirror are baseline behavior. The release-hosts proposal (PR #58) replaces them with `<commit>.release.<domain>` hosts and redirects bare `preview.` and `release.` to `www`. This change does not specify release hosts.

## Goals

- Record the shipped deploy model as the baseline, in the project's terms.
- Let a commit be redeployed against newer data (versioned release ID).
- Serve previews only for open PRs.
- Keep every release folder; remove a preview folder when its PR closes.
- Document that overrides stay with their release.
- Move the route coverage rule into `shared-redirects`.

## Non-Goals

- One distribution or `<id>.builds.<domain>` hosts.
- Release hosts and bare-host redirects (PR #58).
- Incremental rendering (removed for now).
- Moving builds or deploys into CI. The CI items stay deferred until a change adds CI publication (`fix-pr-checks`).
- The intake database handoff (intake's work).
- Redirects for changed slugs. Published slugs never change.

## Versioned release IDs

The release ID is `<full commit>-<version>`, where `<version>` is a positive whole number.

- `scripts/build-release.mjs` picks the version before the build starts, because every page embeds the release ID (`data-release-id` in `src/layouts/SiteLayout.astro`). It lists `<commit>-*` folders in every site bucket the deploy writes (for `prod`, the production and preview site buckets) and takes the next unused number, starting at `1`. It writes the ID to `.release/id` and records `commit` and `version` in `.release/source.json`.
- `scripts/release-files.mjs --verify` accepts the ID only when its commit part equals the current commit and its version matches `.release/source.json`.
- `scripts/upload-release.sh` claims the folder before any other write: it writes `<release-id>/release.json` (the contents of `.release/source.json`) with a create-only S3 write. If the object already exists with different contents, the upload stops. If it matches, the upload resumes, so `npm run deploy -- <environment> --skip-build` can finish an interrupted upload.
- Release folders named by a bare commit already exist. They are kept (see Lifecycle) and stay promotable; the router and `promote.sh` accept any single-segment folder name.
- The router, `promote.sh`, `load-redirects.mjs`, and the release API need no change: they already treat the release ID as an opaque folder name.

## Previews are PR builds only

`scripts/deploy.sh` requires `PR_NUMBER` for every environment other than `prod` and drops `PREVIEW_NAME`. The router serves `<label>.preview.<domain>` only when the label matches `^pr-[1-9][0-9]*$`; any other label returns 404.

## Overrides stay with their release

The router looks up `o:<release-id>:<path>` for the promoted release only. A new release starts with no overrides; its build renders the same content from data, and the release API publishes new overrides to it. Promoting an earlier release serves that release's own overrides. Promotion does not copy overrides between releases.

## Lifecycle

- Release folders in the production site bucket and their release data are kept forever. `scripts/manage-release.mjs` no longer deletes a production release folder.
- When a PR closes, `scripts/cleanup-preview.mjs` deletes `current:pr-<N>` from the preview store. Then, if no other preview pointer names that release ID, it deletes `<release-id>/` from the preview site bucket and `builds/<release-id>/` from the preview release data bucket. A preview folder that a production release also uploaded (the `current:main` mirror) is kept while any pointer names it.
- KVS keys are removed by hand. `npm run deploy:delete -- <release-id>` removes `r:<release-id>:` and `o:<release-id>:` keys from the preview store, and refuses when any preview pointer names the release.

## Capacity

Each KVS store holds at most 5 MB of keys and values: the `current*` pointers, `o:` override keys, and one `r:<release-id>:` namespace per promoted release. Published slugs never change, so the redirect map holds only legacy route redirects. Production `r:` namespaces stay in the store because releases are kept. `scripts/load-redirects.mjs` counts every namespace toward the 5 MB limit and stops the deploy before the pointer moves if the store would overflow. Removing the `r:` keys of a release that no pointer names is safe: promoting it again reloads its map. Removing its `o:` keys would drop its overrides.

## Alternatives considered

- One distribution vs two: two kept. Previews need their own certificate, bucket, KVS and `noindex.js`.
- Pointer promotion vs overwriting the bucket root: pointer kept. Rolling back is promoting an earlier release.
- Data version in the release ID (a hash of the data inputs) vs a counter: counter chosen. The build has no single data version to hash, and a counter keeps the ID short and ordered.
- Copying overrides on promotion: not done. Each release renders its own content from data.

## Risks and mitigations

- KVS propagation: a pointer change reaches edge locations over time; the `/*` invalidation follows it.
- Partial deploy: a production deploy can stop after the preview mirror is promoted but before production is. Rerunning with `--skip-build` resumes, because the folder claim matches and uploads skip existing files.
- Preview store failure: a full or failing preview store stops a production deploy, because `upload-release.sh` promotes the preview mirror first. The deploy fails loudly; fix the preview store and rerun.
- Concurrent deploys: two builds of the same commit can pick the same version; the folder claim lets only one upload. Pointer updates use the KVS ETag; the second writer fails and must rerun.
- KVS capacity: see Capacity.

## Route absence accounting

The coverage checker reads the required repository-root `route-absences.json` array of `{ path, reason }` entries. Exact paths only; no wildcard exemptions. Existing routes and redirects take precedence; otherwise a listed missing route counts as an accounted-for 404. The list does not generate content or change HTTP routing. Missing or malformed lists fail validation. An intake gap (a prior URL whose record intake has not loaded yet) has no assumed end date and does not imply retirement. See `docs/route-coverage.md`.

`PRIOR_SITEMAP=skip` bypasses the check for a first deploy (`scripts/verify-redirect-coverage.mjs`).
