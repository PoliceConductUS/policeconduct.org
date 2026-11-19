## 1. Shipped baseline (recorded, not new work)

The deploy model in design.md "Current deploy model" shipped with earlier work, including `publish-release-news`. Previews are published by hand with `npm run deploy -- preview`. `.github/workflows/cleanup-preview.yml` deletes the closed PR's `current:pr-<N>` pointer only (`scripts/cleanup-preview.mjs`); it does not delete folders or redirect keys.

- [x] 1.1 Router (`infrastructure/bootstrap-policeconduct/functions/router.js`, rendered by `local.shared_router_code` into both distributions): canonical host uses `current`; `preview.<domain>` uses `current:main`; `<label>.preview.<domain>` uses `current:<label>` with label `^[a-z0-9-]+$`; per-release redirects `r:<release>:<path>` plus `/*` prefix keys; override selection by `o:<release>:<path>`; 404 for reserved paths, traversal, unknown hosts and missing pointers. Tests: `scripts/cloudfront-router.test.mjs`.
- [x] 1.2 `functions/noindex.js` (viewer-response, preview distribution only) sets `X-Robots-Tag: noindex, nofollow` on every preview response; the router answers `/robots.txt` with deny-all on every non-production host.
- [x] 1.3 `scripts/promote.sh <release-id> [label]`: checks `builds/<id>/data/dynamic.json` in the release data bucket and `<id>/build/index.html` in the site bucket; loads `<id>/build/_redirect-map.json` into `r:<id>:`; copies `<id>/build/404.html` to the bucket root; updates `current` or `current:<label>` with the ETag guard; invalidates `/*`. Promoting an earlier release is `npm run deploy:promote` (`scripts/manage-release.mjs promote`) with that release ID.
- [x] 1.4 Redirects: `scripts/generate-redirect-map.mjs` writes `dist/_redirect-map.json` from the database and the intake workspace redirects (tests: `scripts/generate-redirect-map.test.mjs`); `promote.sh` loads it into `r:<id>:`.
- [x] 1.5 KVS size guard: `scripts/load-redirects.mjs` rejects keys over 512 B, values over 1 KB, and a store total over 5 MB including other namespaces.
- [x] 1.6 Redirect-coverage guard (`scripts/verify-redirect-coverage.mjs`, `npm run validate:redirects`), run by `npm run deploy -- <environment>` (with or without `--skip-build` and `--dry-run`): every URL in the prior sitemap must be a route in this build, redirect to a route that is not itself a redirect source, or have an exact path and reason in `route-absences.json`. Fails closed for unaccounted gaps. Runs after the build (when built) and before `scripts/upload-release.sh` checks the output and writes to S3. `PRIOR_SITEMAP=skip` bypasses it for a first deploy. Tests: `scripts/verify-redirect-coverage.test.mjs`, `scripts/deploy-release-guard.test.mjs`.

## 2. Versioned release IDs

- [ ] 2.1 `scripts/build-release.mjs`: before the build, list `<commit>-*` folders in every site bucket the deploy writes (production and preview site buckets for `prod`; the preview site bucket otherwise) and pick the next unused version, starting at `1`. Set `RELEASE_ID=<commit>-<version>`, write it to `.release/id`, and add `version` to `.release/source.json`. Replace the "folder must equal the current commit hash" check with "commit part must equal the current commit". Files: Modify `scripts/build-release.mjs`. Tests: add cases to `scripts/deploy-release-guard.test.mjs` for "first release gets `-1`", "existing `-1` and `-2` give `-3`", and "a release ID with another commit is rejected". Pass: the three cases pass.
- [ ] 2.2 `scripts/release-files.mjs --verify`: accept the release ID only when its commit part equals the current commit and its version equals `.release/source.json` `version`. Files: Modify `scripts/release-files.mjs`. Tests: add a mismatch case to `scripts/deploy-release-guard.test.mjs`. Pass: a mismatched version stops the upload before any AWS call.
- [ ] 2.3 `scripts/upload-release.sh`: before any sync, write `<release-id>/release.json` (the contents of `.release/source.json`) with a create-only S3 write (`aws s3api put-object --if-none-match '*'`). If it already exists, read it; stop when it differs, continue when it matches. Do this for every bucket the deploy writes. Files: Modify `scripts/upload-release.sh`. Tests: add cases to `scripts/deploy-release-guard.test.mjs` with the fake AWS command for "claim taken by another build stops before any sync" and "matching claim resumes". Pass: both cases pass.
- [ ] 2.4 Checkpoint: run `npm run test:redirects`; record command, commit and exit code in `verify.md`.

## 3. Previews are PR builds only

- [ ] 3.1 `scripts/deploy.sh`: for any environment other than `prod`, require `PR_NUMBER` and use label `pr-<PR_NUMBER>`; remove `PREVIEW_NAME`. Files: Modify `scripts/deploy.sh`. Tests: add a case to `scripts/deploy-release-guard.test.mjs` that `PREVIEW_NAME` alone stops the deploy. Pass: the case passes.
- [ ] 3.2 `infrastructure/bootstrap-policeconduct/functions/router.js`: serve `<label>.preview.<domain>` only when the label matches `^pr-[1-9][0-9]*$`. Files: Modify `router.js`. Tests: in `scripts/cloudfront-router.test.mjs`, add "a non-PR preview label returns 404 even with a pointer" and update any test that uses another label. Pass: `npm run test:redirects` passes.
- [ ] 3.3 Checkpoint: run `npm run test:redirects`; record command, commit and exit code in `verify.md`.

## 4. Lifecycle

- [ ] 4.1 `scripts/cleanup-preview.mjs`: after deleting `current:pr-<N>`, read the release ID it named; if no other key starting with `current` in the preview store names it, delete `<release-id>/` from the preview site bucket and `builds/<release-id>/` from the preview release data bucket. Do not delete KVS keys. Files: Modify `scripts/cleanup-preview.mjs`; Modify `.github/workflows/cleanup-preview.yml` to pass the preview bucket names. Tests: Create `scripts/cleanup-preview.test.mjs` with a fake AWS command for "unshared folder is deleted" and "folder named by another pointer is kept"; add it to `test:redirects` in `package.json`. Pass: both cases pass.
- [ ] 4.2 `scripts/manage-release.mjs delete` (`npm run deploy:delete -- <release-id>`): remove the production folder deletion. The operation works on the preview store only: it removes `r:<release-id>:` and `o:<release-id>:` keys and refuses when any `current*` key in the preview store names the release. It deletes no S3 objects. Files: Modify `scripts/manage-release.mjs`. Tests: update `scripts/manage-release.test.mjs` for "keys removed when no pointer names the release", "refuses when a pointer names it", and "no S3 delete is called". Pass: the cases pass.
- [ ] 4.3 Checkpoint: run `npm run test:redirects`; record command, commit and exit code in `verify.md`.

## 5. Documentation

- [ ] 5.1 `README.md` deploy section: replace `builds/<release-id>/static/` with `<release-id>/build/`; describe the versioned release ID, preview = open PR only, release folders kept forever, preview folders removed at PR close, and `npm run deploy:delete -- <release-id>` as preview-store key removal. Use the terms preview, release and promote. Pass: the README names no `static/` folder and no production folder deletion.
- [ ] 5.2 `infrastructure/bootstrap-policeconduct/functions/noindex.js` header comment: point to `openspec/specs/deploy-hosting/spec.md` instead of this change's `design.md`. Pass: the comment names no path under `openspec/changes/`.

## 6. Verify

- [ ] 6.1 Production serves the promoted release after promotion; the invalidation removes stale HTML.
- [ ] 6.2 `pr-<N>.preview.policeconduct.org` serves the release `current:pr-<N>` names; a non-PR label returns 404; redirects return 301 on the canonical and preview hosts; preview responses carry `X-Robots-Tag: noindex, nofollow` and the canonical host does not; the index rewrite works for `/`, `/x/`, `/x`.
- [ ] 6.3 Promoting an earlier release serves it, restores its 404 page, and serves its own overrides.
- [ ] 6.4 Deploying the same commit twice gives two release folders (`-1`, `-2`); the first is unchanged.
- [ ] 6.5 Closing a PR removes its pointer and its unshared preview folder; no production release folder is deleted.
- [ ] 6.6 Before archiving, confirm `publish-release-news` no longer states release-folder rules ("Named deployment folders"), so `deploy-hosting` is the one release capability (owner decision Q13).
- [ ] 6.7 Run `npm run validate` on the final head; record commit, command, exit code and test counts in `verify.md`.

## Deferred until a change adds CI publication

These items are not part of this change. They stay recorded here, unnumbered as work, per `fix-pr-checks`. Builds and deploys run locally today.

- 4.1 (deferred) A build workflow with a matrix over a shard key; each shard builds its slice.
- 4.2 (deferred) A final job loads redirects and runs `npm run deploy -- <environment> --skip-build`; on `main` it promotes the release.
- 4.3 (deferred) Cache `~/.npm`, `node_modules` and the Vite/Astro build cache across runs.
- 4.5 (deferred) Scope AWS credentials so only the deploy job can write KVS pointers.
- 7.x (deferred) The intake database handoff for CI builds. That is intake's work; a CI build would read the intake data the same way a local build does.
