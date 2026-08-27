# Design sketch — atomic sha deploys + incremental build

> Sketches for review. Nothing here is wired into `infrastructure/` yet.

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
import cf from 'cloudfront';
const kvs = cf.kvs();                       // { current: <sha>, r:/old = /new, … }

async function handler(event) {
  const req  = event.request;
  const host = req.headers.host.value;
  const uri  = req.uri;

  // 1) folder selection — first DNS label for *.builds.<domain>, pointer for apex
  let id;
  const label = host.split('.')[0];
  if (host.includes('.builds.') && /^[a-z0-9-]+$/.test(label)) {
    id = label;                              // validated: no '.', '/', traversal
  } else {
    id = await kvs.get('current');           // apex = prod pointer (a sha)
  }
  const prefix = `/builds/${id}`;

  // 2) redirects — PER-BUILD, ALL HOSTS. Keys namespaced by id: r:<id>:<path>.
  //    Applies on apex and every *.builds subdomain so no host 404s on legacy URLs.
  try {
    const to = await kvs.get('r:' + id + ':' + uri);
    if (to) return { statusCode: 301, statusDescription: 'Moved Permanently',
                     headers: { location: { value: to } } };
  } catch (_) { /* no redirect for this path in this build */ }

  // 3) index rewrite: "/x/" -> "/x/index.html", "/x" -> "/x/index.html", "/" -> "/index.html"
  let p = uri;
  if (p.endsWith('/'))        p += 'index.html';
  else if (!p.split('/').pop().includes('.')) p += '/index.html';

  req.uri = prefix + p;       // e.g. /builds/<sha>/tx/index.html  -> also the cache key
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
  if (host.includes('.builds.')) {
    event.response.headers['x-robots-tag'] = { value: 'noindex, nofollow' };
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
  : null;               // null => full build (first build / forced)
return allPaths.filter(p => !changed || changed.has(canonicalPathFor(p)));
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
