## Why

Builds already land in per-commit folders and go live when a CloudFront KeyValueStore (KVS) pointer moves (see design.md "Current deploy model"). The OpenSpec record still describes an older plan (`builds/<id>/` folders, `<id>.builds.<domain>` hosts, one distribution) and does not use the project's terms. Four gaps remain:

- Redeploying a commit against newer data uploads nothing new. The release ID is the bare commit, uploads use `--no-overwrite`, and promotion only checks that the completion marker exists.
- Preview hosts accept any label (`PREVIEW_NAME`), but a preview is a build of an open PR only.
- `npm run deploy:delete` can delete a production release folder, but release folders are kept forever. Closing a PR removes only its pointer, not its preview folder.
- The route coverage rule shipped under this change has no home in `shared-redirects`.

## Terms

- **Preview**: a build of an open PR, served at `pr-<N>.preview.policeconduct.org`. A preview is not a release.
- **Release**: a published build of a commit on `main`. Not every `main` commit is released. A release is a folder in the production site bucket.
- **Promote**: move the `current` pointer so `www` and the apex serve a chosen release. Promoting an earlier release is how a release is rolled back.

## What Changes

**Rebuilding a commit replaces its folder**

- From: the release ID is the full commit. A second deploy of the same commit against newer data silently keeps the old pages, because uploads use `--no-overwrite`.
- To: the release ID is still the full commit. A rebuild of the same commit uploads into the same folder and replaces its files; files the new build no longer produces are removed. `dynamic.json` is still uploaded last. The build records the data version it read in `.release/source.json` and in the uploaded release record `builds/<commit>/source.json`.

**Previews are PR builds only**

- From: `npm run deploy -- preview` takes `PR_NUMBER` or `PREVIEW_NAME`, and the router serves any `<label>.preview.<domain>` host that has a pointer.
- To: a preview requires `PR_NUMBER` and is served only at `pr-<N>.preview.<domain>`.

**Keep every release; remove previews when the PR closes**

- From: `npm run deploy:delete` deletes a production release folder, its release data and its KVS keys. `cleanup-preview.mjs` deletes only the closed PR's pointer.
- To: release folders are never deleted. When a PR closes, its preview pointer and (when no other preview pointer names it) its preview folder and release data are deleted. The removed preview's `r:` and `o:` keys are removed by hand with `npm run deploy:delete -- <release-id>`, which then works on the preview store only.

**Overrides stay with their release**

- Records current behavior: a page the release API publishes into `<release>/override/` serves only while that release is promoted. A new release starts with no overrides; promoting an earlier release brings back its own.

**Route coverage moves to `shared-redirects`**

- The shipped rule that every prior URL exists, redirects to a current route, or is listed in `route-absences.json` becomes an ADDED requirement on `shared-redirects`, stated for the single `npm run deploy -- <environment>` command.

## Out of scope

- Release hosts (`<commit>.release.policeconduct.org`) and redirecting bare `preview.` and `release.` hosts to `www`. A separate proposal (PR #58) covers them. This change does not specify them.
- Incremental rendering. Removed for now.
- Moving builds or deploys into CI. Builds and deploys run locally through `npm run deploy -- <environment>`. The CI publication items stay deferred until a change adds CI publication (see `fix-pr-checks`).
- The intake database handoff. That is intake's work.
- Slug-change redirects. Published slugs never change, so no bulk redirect design is needed.

## Capabilities

### New Capabilities

- `deploy-hosting`: release folders and IDs, promotion, how the router picks a release per host, overrides, indexing, and folder lifecycle. It is the one release capability; `publish-release-news` keeps no separate release-folder rules (owner decision Q13). Redirect semantics stay in `shared-redirects`.

### Modified Capabilities

- `shared-redirects`: adds the prior-URL coverage requirement and the deploy coverage gate.

## Impact

- `scripts/build-release.mjs`, `scripts/upload-release.sh`: record the data version and replace the folder's files on a rebuild.
- `scripts/deploy.sh`, `infrastructure/bootstrap-policeconduct/functions/router.js`: PR-only preview labels.
- `scripts/manage-release.mjs`, `scripts/cleanup-preview.mjs`, `.github/workflows/cleanup-preview.yml`, `package.json` (`deploy:delete`): lifecycle.
- `README.md` deploy section, `infrastructure/bootstrap-policeconduct/functions/noindex.js` header comment: documentation.
- Tests: `scripts/deploy-release-guard.test.mjs`, `scripts/cloudfront-router.test.mjs`, `scripts/manage-release.test.mjs`, plus a new test for `scripts/cleanup-preview.mjs`.
