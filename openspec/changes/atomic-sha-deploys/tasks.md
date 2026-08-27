## 0. Phasing (prod and build routing stay separate)

- **Phase A (DONE — prod UNTOUCHED):** preview builds + per-build redirects +
  noindex on the existing preview distribution only. Implemented and validated:
  the redirect-aware `router.js` and `noindex.js` are wired into
  `aws_cloudfront_distribution.preview` via a new `aws_cloudfront_key_value_store`
  (`terraform validate` passes); `scripts/load-preview-redirects.mjs` +
  `deploy-preview.sh` load each build's `redirects.json` into the KVS namespace
  `r:pr-<N>:<from>`. The apex/www `site` distribution, `index_rewrite`, and
  root-bucket deploy are not changed; folder layout stays the existing
  `/<label>/`. Remaining to run in AWS: `terraform apply` + one preview deploy to
  confirm 301s and `X-Robots-Tag` on a `*.preview` host.
- **Phase B (deferred — touches apex):** unify prod onto `builds/<sha>/` with a
  KVS `current` pointer and `scripts/promote.sh` — tasks 1.2, 1.3, 1.4, 2.1.
- **Phase C (deferred — build speed):** incremental rendering + sharded CI —
  sections 3, 4 (non-preview parts), 6.3.

Router/noindex under `infrastructure/.../functions/` are written to the Phase A
shape. Phase A still needs Terraform on the **preview** distribution (KVS +
attach the redirect-aware router and the noindex function) and a preview deploy
that loads `redirects.json` into the KVS — see design.md.

## 1. CloudFront router function + KeyValueStore

- [x] 1.1 Create `infrastructure/.../functions/router.js` (cloudfront-js-2.0): one folder namespace `builds/<id>/`; folder selection = KVS `current` for apex, first DNS label (`<id>.builds.<domain>`) otherwise; validate the label `^[a-z0-9-]+$` (traversal/arbitrary-prefix gate); per-build redirect application from KVS (`r:<id>:<path>`) on ALL hosts; index rewrite. See design.md §1.
- [ ] 1.2 Terraform: add `aws_cloudfront_key_value_store` and `aws_cloudfront_function.router` with the KVS association; attach as viewer-request on the default behavior; retire `index_rewrite` and `preview_router`.
- [ ] 1.3 Confirm the rewritten URI (with folder prefix) is the cache key so a pointer flip needs no invalidation; keep the default cache policy.
- [ ] 1.4 One bucket, one namespace `builds/<id>/` for both PR (`pr-<n>`) and prod (`<sha>`) builds; prefix PR ids `pr-<n>` so decimal PR numbers and hex shas never collide; fold the separate preview bucket/distribution into the single distribution; update origin/OAC + bucket policy.
- [x] 1.5 Add a `viewer-response` CloudFront Function `noindex.js` that sets `X-Robots-Tag: noindex, nofollow` when the host is `*.builds.<domain>` (apex stays indexable); build-once means this cannot live in the HTML. See design.md §1.

## 2. Promotion + redirects

- [x] 2.1 Add `scripts/promote.sh <sha>`: verify `builds/<sha>/index.html` exists, then `cloudfront-keyvaluestore update-keys` `current=<sha>` with the ETag if-match. Rollback = promote previous sha.
- [x] 2.2 Redirects (chosen): `builds/<id>/redirects.json` is the per-build source of truth; at each build publish load its entries into the KVS under a per-build namespace `r:<id>:<from> = <to>` (batched); the router applies them on ALL hosts (apex + `*.builds.`). Prune a build's namespace when it is expired.
- [ ] 2.3 KVS size guard: fail publish if total keys would exceed KVS limits (≤5 MB total, value ≤1 KB, key ≤512 B) — small/stable map × retained builds stays well under. If it ever exceeds, switch to the Lambda@Edge fallback reading the per-build `redirects.json` (edge-memory cached), per design.md §1.

## 3. Incremental rendering

- [ ] 3.1 Extend `refresh-build-projections.mjs` to project EVERY page type into `build_page_payload` with a `content_hash` — critically the personnel pages (153k) that currently render from live DB queries — plus any other page type not yet projected.
- [ ] 3.2 Emit a full `_manifest.json` ({clean-path: content_hash}) into `dist/` on every build; upload it into `builds/<sha>/`.
- [ ] 3.3 Build orchestration: fetch `builds/<prev-sha>/_manifest.json`, diff to produce the changed-path set (changed hash, new, deleted); write `changed-paths.json`.
- [ ] 3.4 Teach each `getStaticPaths` to filter to the changed set when `BUILD_CHANGED_PATHS` is set; full build when unset (first build / forced).
- [ ] 3.5 Publish step: `s3 sync builds/<prev-sha>/ builds/<sha>/`, overlay changed pages, apply deletions, write the new manifest, then promote.
- [ ] 3.6 Correctness guard: periodic (nightly/weekly) forced full build to detect drift; verify a full build and an incremental build of the same commit produce identical output.

## 4. Sharded + cached CI (GitHub Actions)

- [ ] 4.1 Add a build workflow with a matrix over a shard key (`hash(canonicalPath) % N`); each shard runs `astro build` for its slice and uploads to `builds/<sha>/`.
- [ ] 4.2 A final job writes `_manifest.json`, loads redirects, and (on main) calls `promote.sh`; PR builds sync to `builds/pr-<N>/` and comment the `pr-<N>.builds.<domain>` URL.
- [ ] 4.3 Cache `~/.npm` + `node_modules` (lockfile key) and the Vite/Astro build cache across runs; use a larger runner class for the render jobs.
- [ ] 4.4 Combine §3 + §4: on incremental runs, shards carry only the changed set; cold/full builds fan out across all shards.
- [ ] 4.5 Scope AWS creds so only the promote job can write the KVS `current` pointer.

## 5. Lifecycle + cleanup

- [ ] 5.1 S3 lifecycle: keep the last N promoted `builds/<sha>/` for rollback and expire older ones; expire `builds/pr-*` on PR close/merge.
- [ ] 5.2 Deployment docs: promote/rollback runbook; how the pointer, folders, and redirects relate.

## 6. Verify

- [ ] 6.1 Apex serves the pointed-to build; flipping `current` serves the new build with no invalidation and no stale HTML.
- [ ] 6.2 `pr-<N>.builds.policeconduct.org` serves `builds/pr-<N>/`; a bad host label is rejected; per-build redirects resolve to 301s on apex AND `*.builds.` hosts (no legacy-URL 404s); `*.builds.` responses carry `X-Robots-Tag: noindex` while apex does not; index rewrite works for `/`, `/x/`, `/x`.
- [ ] 6.3 Incremental build of a small data change re-renders only affected pages and matches a full build byte-for-byte on the changed set; wall-clock is minutes.
- [ ] 6.4 Rollback (promote previous sha) is instant and correct.
