# CloudFront Functions (`functions/`)

## Overview

Source for the two CloudFront Functions (runtime `cloudfront-js-2.0`) that the
bootstrap Terraform root attaches to the site and preview distributions.

- `router.js` is the shared viewer-request router. Terraform renders it with
  `templatefile` (`shared_router_code` in `../main.tf`) and deploys the result as
  both `aws_cloudfront_function.index_rewrite` and
  `aws_cloudfront_function.preview_router`; each function associates its own
  CloudFront KeyValueStore.
- `noindex.js` is a viewer-response function deployed as
  `aws_cloudfront_function.preview_noindex` (loaded with `file(...)` in
  `../main.tf`) on the preview distribution only.

Neither file is an ES module consumed by Node code in production. Callers:
`../main.tf` (deployment) and the repo root test `scripts/cloudfront-router.test.mjs`
(run by `npm run test:redirects`), which loads `router.js` as text.

## Interface

### `router.js` (viewer-request)

- Template placeholders that Terraform must supply before the code is valid:
  `${domain_name}` (assigned to `apexHost`) and `${canonical_host}` (assigned to
  `canonicalHost`). [router.js:const apexHost = "${domain_name}"]
- Entry point: `async function handler(event)`, registered on the runtime global
  rather than exported. Input is a CloudFront viewer-request event; it returns
  either the (mutated) `event.request` or a response object. [router.js:globalThis.handler = handler]
- KeyValueStore handle: `cf.kvs()` from the `cloudfront` runtime module, i.e. the
  store associated with the function in Terraform. [router.js:const kvs = cf.kvs()]
- KeyValueStore key contract read by the router:
  - `current`: release id served on the apex and canonical hosts. [router.js:kvs.get("current")]
  - `current:main`: release id served on `preview.<apex>`. [router.js:"current:main"]
  - `current:<label>`: release id served on `<label>.preview.<apex>`. [router.js:"current:" + labels[0]]
  - `r:<releaseId>:<uri>` and `r:<releaseId>:<path prefix>/*`: redirect target
    for an exact URI or a terminal wildcard prefix. [router.js:"r:" + namespace + ":"]
  - `o:<releaseId>:<path>`: marks that an override object exists for an `.html`
    path. [router.js:"o:" + releaseId + ":" + path]
- Host matching uses the `Host` header lower-cased; a request without a `Host`
  header is treated as an empty host. [router.js:request.headers.host.value.toLowerCase()]
- Host routing:
  - Apex host that differs from the canonical host: 301 to
    `https://<canonical host><uri>` with the query string preserved. [router.js:apexHost !== canonicalHost]
  - `/robots.txt` on any host other than the apex and canonical hosts: a
    generated `200 OK` response with `content-type: text/plain; charset=utf-8`,
    `cache-control: no-store` and the deny-all body
    `User-agent: *` / `Disallow: /`. The build's own `robots.txt` is not
    served on those hosts. [router.js:uri === "/robots.txt"]
  - Apex or canonical host: release id from `current`. [router.js:host === apexHost || host === canonicalHost]
  - `preview.<apex>`: release id from `current:main`; 404 if the key is absent. [router.js:host === "preview." + apexHost]
  - `<label>.preview.<apex>` where the label matches `^[a-z0-9-]+$`: release id
    from `current:<label>`; 404 if the key is absent. [router.js:labels[1] === "preview"]
  - Any other host, including `<label>.builds.<apex>`: 404. [router.js:labels.slice(2).join(".") !== apexHost]
- Redirect lookup `mappedTarget(namespace, uri)`: exact key first, then terminal
  `/*` patterns probed from the longest path prefix to the shortest; returns the
  stored target or `null`. A hit produces a 301 to the target with the query
  string appended. [router.js:async function mappedTarget]
- `redirect(to, querystring)`: builds a `301 Moved Permanently` response with a
  `location` header. [router.js:statusDescription: "Moved Permanently"]
- `querySuffix(querystring)`: serialises the CloudFront query-string object
  (including `multiValue` entries) back to `?k=v&...`, or an empty string. [router.js:function querySuffix]
- Origin path rewrite when no redirect matches: a URI ending in `/` gets
  `index.html` appended; a URI whose last segment has no `.` gets `/index.html`
  appended; then `request.uri` becomes
  `/<encodeURIComponent(releaseId)>/override<path>` when the path ends in `.html`
  and the `o:` key exists, otherwise `/<encodeURIComponent(releaseId)>/build<path>`. [router.js:(hasOverride ? "/override" : "/build")]

### `noindex.js` (viewer-response)

- Entry point: `function handler(event)`, registered on the runtime global. It
  sets the response header `x-robots-tag` to `noindex, nofollow` and returns
  `event.response`. [noindex.js:"noindex, nofollow"]

## Invariants

- The handler must stay a global, not a module export: CloudFront invokes it
  outside the module. [router.js:globalThis.handler = handler] [noindex.js:globalThis.handler = handler]
- `router.js` is a Terraform template. Any literal `${...}` sequence in the file
  is interpolated by `templatefile`, so only `${domain_name}` and
  `${canonical_host}` may appear. [router.js:const canonicalHost = "${canonical_host}"]
- Requests are answered `404 Not Found` (never forwarded to the origin) when the
  decoded URI:
  - cannot be decoded with `decodeURIComponent`; [router.js:pathForValidation = decodeURIComponent(uri)]
  - starts with a reserved top-level prefix `builds`, `data`, `evidence`,
    `news-discovery` or `com/serpapi/landing-page-search`; [router.js:builds|data|evidence|news-discovery|com\/serpapi\/landing-page-search]
  - has `build` or `override` as its second path segment (direct access to
    release storage paths); [router.js:(build|override)(\/|$)]
  - contains a `.` or `..` path segment, a backslash, or a `%` after decoding. [router.js:[\\%]]
- The apex-to-canonical redirect runs before path validation and before any
  KeyValueStore read. [router.js:apexHost !== canonicalHost]
- Only the production hosts (apex and canonical) may be crawled. The
  `/robots.txt` deny-all answer is decided after the apex redirect and before
  path validation, host matching and any KeyValueStore read, so it also applies
  to hosts the router would otherwise answer with 404. [router.js:only the production hosts may be crawled]
- A release id is rejected with 404 unless it is a non-empty string, is not `.`
  or `..`, contains no `/` or `\`, and contains no control characters (code
  below 32, or 127). [router.js:character.charCodeAt(0) === 127]
- Preview pointers are checked with `kvs.exists` before `kvs.get`, so a missing
  pointer yields 404 instead of a thrown KeyValueStore error; the production
  `current` key is read without an existence check. [router.js:kvs.exists("current:main")]
- Redirect targets are namespaced by release id, so a redirect map belongs to
  exactly one release. [router.js:mappedTarget(releaseId, uri)]
- Overrides apply only to paths ending in `.html`. [router.js:path.endsWith(".html")]
- `noindex.js` must be attached only to the preview distribution; the same HTML
  also serves the canonical apex on the production distribution, which must stay
  indexable. [noindex.js:PREVIEW]

## Side Effects

- `router.js` reads the associated CloudFront KeyValueStore (`kvs.exists` and
  `kvs.get`) on every request that is not answered earlier by the apex
  redirect, the `/robots.txt` deny-all response, path validation or an
  unmatched host; it never writes to it. [router.js:await kvs.exists(keyPrefix + uri)] [router.js:return missing;]
- `router.js` mutates `request.uri` in place before returning the request to
  CloudFront, which changes the S3 origin key that is fetched. [router.js:request.uri =]
- `router.js` short-circuits with generated 200 (`/robots.txt` on
  non-production hosts), 301 and 404 responses that never reach the origin. [router.js:const missing = { statusCode: 404, statusDescription: "Not Found" }]
- `noindex.js` mutates `event.response.headers` by adding `x-robots-tag`. [noindex.js:response.headers["x-robots-tag"]]
- Neither function makes network calls, writes logs, or touches disk. [router.js:import cf from "cloudfront"]

## Verification

- Run: `npm run test:redirects` (includes `scripts/cloudfront-router.test.mjs`,
  which exercises `router.js`).
- Run: `npm test` for the full chain.
