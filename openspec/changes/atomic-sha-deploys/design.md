# Design sketch — atomic sha deploys + incremental build

> Sketches for review. Nothing here is wired into `infrastructure/` yet.

## Phasing (prod and build routing stay separate)

Prod and preview are already two distributions: `aws_cloudfront_distribution.site`
(apex + www + `index_rewrite`, deploys to bucket root) and
`aws_cloudfront_distribution.preview` (`*.preview.<domain>` + `preview_router` →
`/<label>/`). This work keeps them separate and lands in phases:

- **Phase A — preview builds + per-build redirects + noindex (do now; prod
  UNTOUCHED).** Extend only the preview distribution's function with per-build
  redirects from a KeyValueStore (`r:<label>:<path>`), add a viewer-response
  `noindex` on it, and load each preview build's `redirects.json` at deploy.
  The apex/www distribution, `index_rewrite`, and the root-bucket deploy are not
  changed. Folder layout stays the existing `/<label>/`.
- **Phase B — prod atomic promotion (deferred).** Only if/when prod moves to
  immutable `builds/<sha>/` folders with a KVS `current` pointer and
  `scripts/promote.sh`. This is the part that touches apex routing; it is not in
  Phase A.
- **Phase C — incremental rendering + sharded CI (deferred).** Build-speed work
  (§4–§6 below); orthogonal to routing.

Sections below describe the full end state; the router/noindex under
`infrastructure/.../functions/` are written to the **Phase A** shape
(host label → `/<label>/` + redirects; no apex/KVS-pointer branch).

## 1. Routing: one bucket, one distribution, ONE folder namespace

Every build — PR or prod — lands in the same namespace, `builds/<id>/`, where
`<id>` is a PR label (`pr-<n>`) or a merge-commit sha. There is no separate
`previews/` tree.

```
s3://site/
  builds/<id>/…                  # <id> = pr-<n>  OR  <sha>
  builds/<id>/_manifest.json     # { "<clean-path>": "<content_hash>", … }
  builds/<id>/redirects.json     # this build's redirect map (source of truth)
```

Routing is uniform (the `builds` subdomain zone mirrors the `builds/` prefix):

- **Any build by id**: the first DNS label IS the folder — `pr-123.builds.<domain>`
  → `builds/pr-123/`, `<sha>.builds.<domain>` → `builds/<sha>/` (free pre-promote
  smoke test).
- **Prod apex**: KVS `current` pointer → `builds/<sha>/`.

One CloudFront Function (viewer-request, `cloudfront-js-2.0`) with an associated
KeyValueStore resolves the folder and does the index rewrite. Because it writes
the folder into `request.uri`, **the resolved build id is part of the cache key**
— flipping the pointer needs **no invalidation**, and builds coexist in cache.

```js
import cf from "cloudfront";
const kvs = cf.kvs(); // { current: <sha>, r:/old = /new, … }

async function handler(event) {
  const req = event.request;
  const host = req.headers.host.value;
  const uri = req.uri;

  // 1) folder selection — first DNS label for *.builds.<domain>, pointer for apex
  let id;
  const label = host.split(".")[0];
  if (host.includes(".builds.") && /^[a-z0-9-]+$/.test(label)) {
    id = label; // validated: no '.', '/', traversal
  } else {
    id = await kvs.get("current"); // apex = prod pointer (a sha)
  }
  const prefix = `/builds/${id}`;

  // 2) redirects — PER-BUILD, ALL HOSTS. Keys namespaced by id: r:<id>:<path>.
  //    Applies on apex and every *.builds subdomain so no host 404s on legacy URLs.
  try {
    const to = await kvs.get("r:" + id + ":" + uri);
    if (to)
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: { location: { value: to } },
      };
  } catch (_) {
    /* no redirect for this path in this build */
  }

  // 3) index rewrite: "/x/" -> "/x/index.html", "/x" -> "/x/index.html", "/" -> "/index.html"
  let p = uri;
  if (p.endsWith("/")) p += "index.html";
  else if (!p.split("/").pop().includes(".")) p += "/index.html";

  req.uri = prefix + p; // e.g. /builds/<sha>/tx/index.html  -> also the cache key
  return req;
}
```

Notes:

- Prefix PR folders `pr-<n>` so PR ids (decimal) and shas (12-hex) never collide.
- The label regex `^[a-z0-9-]+$` is a security gate: without it a crafted host
  could aim the origin at an arbitrary S3 prefix.
- Viewer URL stays clean (`/tx/`); only the origin/cache-key URI carries the folder.

### Non-canonical hosts: `noindex` at the edge (build-once)

The site is built once and the same HTML serves the canonical apex and every
`*.builds.<domain>` host, so `noindex` cannot live in the source (it would apply
everywhere). Apply it at the CDN, keyed on host: a second CloudFront Function on
**viewer-response** adds `X-Robots-Tag: noindex, nofollow` when the host is a
`*.builds.` subdomain, leaving the apex indexable. The build's canonical tags
already point at the apex; this makes it definitive.

```js
// noindex.js — viewer-response
function handler(event) {
  const host = event.request.headers.host.value;
  if (host.includes(".builds.")) {
    event.response.headers["x-robots-tag"] = { value: "noindex, nofollow" };
  }
  return event.response;
}
```

### Redirects — per-build, on every host (`redirects.json` is the source of truth)

Requirement: redirects must 301 (not 404) on the apex **and** on every
`<id>.builds.<domain>` subdomain, per build, so crawlers/backlinks never hit a
404 regardless of which build serves. A CloudFront Function has **no I/O — it
cannot read `redirects.json`**; only the KVS is edge-readable.

- **(CHOSEN) CF Function + KVS, per-build namespaced keys `r:<id>:<path>`.** The
  redirect set is small and stable (confirmed: already at its maximum size), so
  storing it per retained build stays far under the KVS caps (≤5 MB total, ≤1 KB
  value, ≤512 B key). The router already resolves `<id>` from the host, so one
  `kvs.get('r:'+id+':'+uri)` serves per-build 301s on all hosts — one cheap
  component, no Lambda, no cold starts. `builds/<id>/redirects.json` stays the
  source of truth; publish loads that build's entries into its namespace and
  build-expiry prunes them.
- **(fallback) Lambda@Edge reading `builds/<id>/redirects.json`.** Only if the
  map ever outgrows the KVS: an origin-request (cache-miss-only) Lambda reads the
  per-build file, caches it in edge memory keyed by the immutable `<id>`, and
  301s. More latency/cost/complexity; unnecessary at the current map size.
- **(alt) S3 website endpoint + `x-amz-website-redirect-location` metadata** —
  redirects travel as object metadata with no KVS/Lambda, but website endpoints
  are public HTTP with no OAC. Only if that security trade is acceptable.
- Not recommended: meta-refresh HTML objects (200 + client redirect, bad SEO).

## 2. Terraform (additions, sketch)

```hcl
resource "aws_cloudfront_key_value_store" "router" {
  name = "${var.project_name}-router"
}

resource "aws_cloudfront_function" "router" {
  name    = "${var.project_name}-router"
  runtime = "cloudfront-js-2.0"
  publish = true
  key_value_store_associations = [aws_cloudfront_key_value_store.router.arn]
  code    = file("${path.module}/functions/router.js")
}

# attach aws_cloudfront_function.router as viewer-request on the default cache
# behavior; retire index_rewrite + preview_router (folded into router.js).
# Default cache policy is fine — cache key = (rewritten) URI already includes the folder.
```

## 3. promote.sh (prod pointer flip)

```bash
#!/usr/bin/env bash
set -euo pipefail
SHA="${1:?usage: promote.sh <sha>}"
KVS_ARN="${KVS_ARN:?}"
aws s3api head-object --bucket "$S3_BUCKET" --key "builds/$SHA/index.html" >/dev/null \
  || { echo "build builds/$SHA not found"; exit 1; }
ETAG=$(aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn "$KVS_ARN" --query ETag --output text)
aws cloudfront-keyvaluestore update-keys --kvs-arn "$KVS_ARN" --if-match "$ETAG" \
  --puts "Key=current,Value=$SHA"
echo "promoted $SHA (no invalidation needed)"
# rollback = promote.sh <previous-sha>
```

Redirect map load (at build publish, before promote): read `dist/_redirect-map.json`,
`update-keys --puts Key=r:<from>,Value=<to>` for each entry (batched).

## 4. Incremental rendering (the hour-killer)

Precondition: extend `refresh-build-projections.mjs` so **every** page type —
including the 153k personnel pages, which today render from live DB queries —
gets a `build_page_payload` row with a `content_hash`. Then:

```
1. prev = kvs.get('current')                      # last promoted sha
2. aws s3 cp s3://site/builds/$prev/_manifest.json prev-manifest.json   # {path: hash}
3. refresh-build-projections                       # recompute payloads + hashes
4. changed = paths where hash != prev-manifest[path]  OR  new  (deletions tracked too)
5. write changed set to build/changed-paths.json
6. astro build   # each getStaticPaths filters to changed set when BUILD_CHANGED_PATHS is set
7. aws s3 sync s3://site/builds/$prev/ s3://site/builds/$sha/   # copy prior build
8. aws s3 sync dist/ s3://site/builds/$sha/ --delete-removed-of-changed  # overlay changed
9. write builds/$sha/_manifest.json (full current hash map)
10. promote.sh $sha
```

Each `getStaticPaths` gains:

```js
const changed = process.env.BUILD_CHANGED_PATHS
  ? new Set(JSON.parse(fs.readFileSync(process.env.BUILD_CHANGED_PATHS)))
  : null; // null => full build (first build / forced)
return allPaths.filter((p) => !changed || changed.has(canonicalPathFor(p)));
```

Result: a typical data delta re-renders hundreds of pages, not 165k → minutes.
First build (no prior manifest) is a full build; use sharding (§5) for that.

## 5. Sharding (quick win, stacks with §4)

GitHub Actions matrix over a slug/state key; each shard builds its slice and
uploads to the same `builds/<sha>/` prefix:

```yaml
strategy: { matrix: { shard: [0,1,2,3,4,5,6,7] } }
env: { BUILD_SHARD: ${{ matrix.shard }}, BUILD_SHARD_COUNT: 8 }
# getStaticPaths also filters: hash(canonicalPath) % SHARD_COUNT === SHARD
# each shard: astro build (its slice) -> aws s3 sync dist/ s3://site/builds/$sha/
# a final job writes _manifest.json and calls promote.sh
```

165k / 8 ≈ ~11 min wall-clock for a full build; combine with §4 so shards only
carry the changed set on incremental runs.

## 6. Build cache (GitHub Actions)

- `actions/cache` on `~/.npm` + `node_modules` (key = hash of lockfile).
- Cache Vite/Astro build cache dir across runs.
- The prior `builds/<prev-sha>/` in S3 is the incremental base (pulled in §4).

## 7. Cross-repo build pipeline (intake → website)

Schema **and** data both live in the intake repo (migrations under `supabase/`,
ingestion under `src/` + `sources/`). The website is a pure renderer of whatever
DB intake produces. The handoff is a **versioned DB dump in S3 behind a mutable
`latest.yaml` pointer**, dereferenced and pinned once per website build so the
build is deterministic.

**Intake first, always.** Every schema/data change originates in intake and ships
as a new dump; the website only ever reacts to what intake published — it never
leads. This is safe because of the immutable-build + pinned-`db_version` model:
when intake publishes a dump whose schema the current website doesn't yet handle,
the website's build against it fails in CI/preview, but **prod is untouched** (it
keeps serving the last _promoted_ build; `repository_dispatch` triggers a build,
never an auto-promote). You then update the website to the new shape, its build
against the already-published dump goes green, and you promote. During the gap you
can keep building/rolling back the website against the prior `db_version`. Never
change the website first to "tolerate both shapes."

**Intake CI** (on a migrations/sources change) — "spin up DB → migrate → mutate":

```
1. provision Postgres; apply migrations; run ingestion
2. pg_dump  -> s3://<db-bucket>/dumps/db-<version>.dump        (immutable)
              version = hash(migrations + sources)
3. write    -> s3://<db-bucket>/latest.yaml                    (mutable pointer)
              version: <version>
              dump: dumps/db-<version>.dump
              published_at: <iso8601>
              migrations_sha: <intake sha>
              sources_sha: <intake sha / sources hash>
4. repository_dispatch -> website build
```

**Website CI** (on website push OR a new dump) — "build → copy to folder":

```
1. read latest.yaml ONCE at job start; resolve <version> + dump key; echo/record it.
   (optional `db_version` input pins/rolls back; default = latest.)  <-- determinism
2. pg_restore the pinned dump into a fresh Postgres
3. astro build
4. publish to builds/<build-id>/  and write build-info.json {website_sha, db_version}
```

Determinism & robustness:

- **build-id = short_hash(website_sha + db_version)** — a data-only change (intake
  re-ingests, code unchanged) still yields a new immutable `builds/<build-id>/`.
- Pinning `latest` at read time means a concurrent intake publish never perturbs an
  in-flight build; the recorded `<version>` makes the build reproducible.
- Dumps are immutable and retained (lifecycle keeps the last N; never expire the
  one `latest.yaml` currently points to). Rebuild/rollback = re-run with the same
  `website_sha` + `db_version` → identical output.
- The website build is thus a pure function of `(website_sha, db_version)`; neither
  repo's CI needs the other's toolchain (restore is minutes; re-ingesting is slow).
- **Bootstrap / missing dump:** the site is data-driven, so with no published dump
  the website build cannot proceed. It fails early and actionably — it checks that
  `latest.yaml` (and the dump it points to) exist before restoring, rather than
  crashing mid-build. Intake must publish the first dump to bootstrap; after that a
  missing/malformed `latest.yaml` is a clear, fixable error, not a silent empty site.
