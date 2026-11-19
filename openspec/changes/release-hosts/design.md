## Context

The deploy model this change builds on is described in `openspec/changes/atomic-sha-deploys/design.md` ("Current deploy model"). The parts that matter here:

- Two CloudFront distributions run the same router source, `infrastructure/bootstrap-policeconduct/functions/router.js`, rendered by `local.shared_router_code` in `main.tf`.
  - `aws_cloudfront_distribution.site` (production) has the aliases `local.distribution_aliases` (apex and `www`), the certificate `aws_acm_certificate.site`, the function `aws_cloudfront_function.index_rewrite`, and the KVS `aws_cloudfront_key_value_store.site_redirects`.
  - `aws_cloudfront_distribution.preview` has the aliases `preview.<domain>` and `*.preview.<domain>`, its own certificate (`preview-entrypoints.tf`), the function `preview_router`, the KVS `preview_redirects`, and `noindex.js` on viewer-response.
- The router picks a release ID from a KVS pointer: `current` for the apex and `www`, `current:main` for bare `preview.<domain>`, `current:<label>` for `<label>.preview.<domain>`. It answers 301 from `r:<release-id>:` keys, serves `<release-id>/override/<path>` when `o:<release-id>:<path>` exists, and otherwise rewrites the request to `<release-id>/build/<path>`.
- Before host routing, the router answers `/robots.txt` with `User-agent: *` / `Disallow: /` on every host except the apex and `www` (`router.js`, "only the production hosts may be crawled").
- `scripts/deploy.sh prod` builds on `main`, then `scripts/upload-release.sh` uploads to the production buckets. For `prod` it first runs itself again with namespace `main` against the preview buckets and store (the `current:main` mirror), then runs `scripts/promote.sh`, which loads `r:<release-id>:`, copies `404.html` to the bucket root, moves `current`, and invalidates `/*`.
- The release ID is the full commit today (`scripts/build-release.mjs`). `atomic-sha-deploys` changes it to `<full commit>-<version>` (owner Q4). Production release folders named by a bare commit already exist and are kept (owner Q7). The production bucket also holds the migration folder `prod-temp`.
- CloudFront Functions can read the KVS only with `get` and `exists` on one key at a time. One KVS store holds at most 5 MB of keys and values. Keys are at most 512 bytes and values at most 1 KB.

## Goals / Non-Goals

**Goals:**

- Serve each release at `<commit>.release.<domain>`, by full or short SHA.
- Pick one release when a commit has several versions, and say which.
- Redirect bare `release.<domain>` and bare `preview.<domain>` to `www`.
- Keep release hosts and bare hosts out of search engines with the existing robots rule.
- Keep production certificate changes safe for the live site.

**Non-Goals:**

- A host for a specific version (`<commit>-<n>.release`). See Open Questions.
- Release hosts for previews or for non-commit folders such as `prod-temp`.
- Changing the forms API, analytics, or Sentry for release hosts. See Open Questions.
- Changing preview hosts, `noindex.js`, or the preview certificate.
- Slug changes or redirect maps for slugs.
- Any approval gate.

## Decisions

### 1. Release hosts are aliases of the production distribution

Every release folder lives in the production site bucket, and every release's `r:` redirects and `o:` override markers live in the production KVS. The production distribution is the only one that can serve them. Its aliases become apex, `www`, `release.<domain>`, and `*.release.<domain>`.

Caching stays correct across hosts. The viewer-request function rewrites the URI to `/<release-id>/build/<path>` (or `/override/`) before the cache lookup, so the cache key holds the release ID. `www` and a release host share cached objects only when they serve the same release, which is the same content. Responses the function generates (301, 404, robots) are not cached.

Alternative: a third distribution for release hosts. Rejected: it would need its own copy of the bucket policy, KVS, certificate, and function, and the release keys would have to live in a store beside the `r:` and `o:` keys they work with.

### 2. Router branches

Order in `handler`, with the new steps marked:

1. Apex 301 to the canonical host (unchanged).
2. `/robots.txt` deny-all on every host except the apex and canonical host (unchanged). It runs before step 3, so bare hosts and release hosts answer robots with deny-all, not with a redirect to the crawlable `www` file.
3. **New:** when the host is `preview.<apex>` or `release.<apex>`, return a 301 to `https://<canonical host><uri>` with the query string, through the existing `redirect()` helper. This replaces the `current:main` branch.
4. Path validation (unchanged).
5. Host routing:
   - apex or canonical host: `current` (unchanged);
   - `<label>.preview.<apex>`: `current:<label>` (unchanged here; `atomic-sha-deploys` narrows the label to `pr-<N>`);
   - **new:** `<label>.release.<apex>` where the label matches `^[0-9a-f]{7,40}$`: the release ID from `releaseForCommit(label)`; 404 when it returns `null`;
   - anything else: 404.
6. Release ID validation, redirects, override and build rewrite (unchanged).

The `Host` header is already lower-cased, so an upper-case SHA in the URL works.

```js
const releaseIdPattern = /^[0-9a-f]{40}(-[1-9][0-9]*)?$/;

async function releaseForCommit(label) {
  for (let length = 7; length <= label.length; length += 1) {
    const key = "release:" + label.substring(0, length);
    if (!(await kvs.exists(key))) return null;
    const value = await kvs.get(key);
    if (value !== "ambiguous") {
      return releaseIdPattern.test(value) && value.startsWith(label)
        ? value
        : null;
    }
  }
  return null;
}
```

`value.startsWith(label)` checks the whole label, not only the prefix that found the key. A label that shares 7 characters with a release but differs after that returns 404.

### 3. Short SHAs: the release lookup keys

A CloudFront Function cannot list keys, so the deploy writes the answer for every prefix the router may ask about.

**Key format.** `release:<prefix>`, where `<prefix>` is 7 to 40 lowercase hex characters. The value is a release ID, or the literal marker `ambiguous`. `ambiguous` can never be a release ID, so the router cannot mistake it for one. The `release:` namespace does not overlap `current`, `current:`, `r:` or `o:`.

**Key set.** The keys are a pure function of the set of known releases, one release per commit:

```text
for each released commit C, with release ID id(C):
  for k = 7 .. 40:
    p = first k characters of C
    if another released commit starts with p: release:p = "ambiguous"
    else: release:p = id(C); stop
```

Each commit's keys end in exactly one key that holds its release ID, at its shortest unique prefix. A full 40-character SHA is always unique, so every chain ends. Most commits get one key, `release:<first 7>`.

**Router lookup.** The router reads `release:<first 7 of label>`. While the value is `ambiguous`, it reads one more character, up to the label's length. A label shorter than the unique prefix of its commit ends on `ambiguous` and returns 404, as the owner asked. A missing key returns 404 (unknown commit).

**Which version.** For each commit, the known release is the one with the highest version. A bare-commit release ID counts as version 0, so `<commit>-1` replaces it. Promotion does not change this: promoting an earlier release to `www` with `npm run deploy:promote` leaves `<commit>.release` on the highest version. The release host always shows the newest build of that commit, whichever release `www` shows.

**Writer.** A new script, `scripts/load-release-hosts.mjs <kvs-arn> <release-id>...`, requires `S3_BUCKET` and `RELEASE_DATA_BUCKET`. It:

1. validates every argument against `^[0-9a-f]{40}(-[1-9][0-9]*)?$` and stops on the first bad one;
2. checks each release is complete, with the same two objects `promote.sh` checks (`builds/<id>/data/dynamic.json` and `<id>/build/index.html`), and stops if not;
3. reads the store ETag, then lists every key (paged, like `scripts/load-redirects.mjs`);
4. rebuilds the known releases from the values of the existing `release:` keys that are release IDs (every commit's chain ends in its ID, so none is lost), adds the arguments, and keeps the highest version per commit;
5. computes the desired `release:` key set, and diffs it against the existing `release:` keys;
6. stops before writing when the whole store after the change would exceed 5 MB;
7. writes the deletes, then the puts, in batches of 50, with the ETag from step 3 on the first batch and a fresh ETag on later batches. A concurrent writer makes the first batch fail; the deploy is rerun. A rerun with nothing to change writes nothing.

The script writes only `release:` keys and never reads or changes `current`, `r:` or `o:` keys.

**When it runs.**

- `scripts/upload-release.sh`, namespace `prod` only, after `scripts/promote.sh` succeeds: `node scripts/load-release-hosts.mjs "${store}" "${release_id}"`. Running after promotion means the release's `r:` redirects are loaded before its release host can serve. If this step fails, `npm run deploy -- prod --skip-build` resumes: uploads skip existing files, promotion is repeatable, and the key writer is idempotent.
- Once, by hand, for the release folders that already exist (backfill, see Migration Plan).
- Not from `promote.sh` or `manage-release.mjs`: promotion changes which release `www` serves, not which releases exist.

**Size.** One key is `release:` (8 bytes) plus the prefix (usually 7) plus a value of 40 to about 44 bytes: about 60 bytes per release. 1,000 releases use about 60 KB, about 1.2% of the 5 MB store. Ambiguity adds about 60 bytes per extra shared character, and is rare at 7 hex characters (268 million values). The store stays dominated by the `r:<release-id>:` namespaces, which `atomic-sha-deploys` ("Capacity") already accounts for.

**Lookups per request.** One `exists` and one `get` for almost every release-host request. A label of an ambiguous prefix adds one pair per extra character, at most 34 pairs for a 40-character label.

Alternatives: see brainstorm.md (a key for every prefix length; a Lambda@Edge bucket listing).

### 4. Bare hosts redirect to `www`

`release.<domain>` is an alias of the production distribution, and `preview.<domain>` stays an alias of the preview distribution. The shared router answers both with the same 301 (Decision 2, step 3), so each distribution handles its own bare host. `aws_route53_record.preview_root`, the preview certificate and the preview aliases do not change.

`noindex.js` still runs on the preview distribution, so the bare preview 301 carries `X-Robots-Tag: noindex, nofollow`. The bare release 301 does not. Neither page has content to index.

### 5. Production deploys stop copying to the preview host

Bare `preview.` no longer serves `current:main`, so the copy has no reader. `scripts/upload-release.sh` drops the nested call with namespace `main` and the four `_PREVIEW` checks for `prod`. `scripts/deploy.sh` stops resolving `S3_BUCKET_PREVIEW`, `RELEASE_DATA_BUCKET_PREVIEW`, `KVS_ARN_PREVIEW` and `CLOUDFRONT_DIST_PREVIEW` for `prod`. A production deploy then needs only production outputs, which `scripts/terraform-outputs.mjs` already provides. The `current:main` key is deleted from the preview store by hand after the router no longer reads it.

Interaction with `atomic-sha-deploys`: its design has `build-release.mjs` list `<commit>-*` folders in both site buckets for `prod`, and it keeps preview folders the `current:main` mirror uploaded. Whichever change merges second updates those lines: with no mirror, a production build lists only the production site bucket.

### 6. Certificate and DNS (`main.tf`)

New locals:

```hcl
release_domain          = "release.${var.domain_name}"
release_wildcard_domain = "*.release.${var.domain_name}"
release_domains         = [local.release_domain, local.release_wildcard_domain]
```

- `distribution_aliases`: append `local.release_domains`.
- `certificate_san_names`: append `local.release_domains`. `aws_acm_certificate.site` must be replaced to change its SANs. It already has `create_before_destroy = true`, so Terraform creates and validates the new certificate, moves the production distribution to it, and only then deletes the old one. The live site keeps a valid certificate throughout.
- `acm_validation_domains`: append `local.release_wildcard_domain` only. ACM gives `release.<domain>` and `*.release.<domain>` one validation record (the same pattern `preview-entrypoints.tf` documents). Listing both would create two `aws_route53_record.acm_validation` resources with one name, and `allow_overwrite = false` would fail.
- `unmanaged_acm_validation_domains`: also exclude `local.release_domain`, so `output.acm_validation_records_unmanaged` does not report a record that Terraform does manage.
- The apex and `www` validation records keep their keys and values (ACM derives them from the domain name and the account), so the plan does not touch them.
- New `aws_route53_record.release_root` and `aws_route53_record.release_wildcard`, each `for_each = toset(["A", "AAAA"])`, `allow_overwrite = false`, with an alias to `aws_cloudfront_distribution.site`. This follows `preview_root`.

The production certificate still lists no preview name.

### 7. Terraform apply

No approval gate. After the PR merges, the operator runs the stack's existing wrapper from the `main` folder: `bash infrastructure/bootstrap-policeconduct/scripts/apply.sh`. That wrapper refuses a plan that destroys or replaces a resource not named in `TERRAFORM_APPROVED_DESTROYS`. The certificate replacement is expected, so the operator sets:

```text
TERRAFORM_APPROVED_DESTROYS='aws_acm_certificate.site
aws_acm_certificate_validation.site'
```

The expected plan:

- replace `aws_acm_certificate.site` and `aws_acm_certificate_validation.site` (create before destroy);
- create one `aws_route53_record.acm_validation` entry (`*.release.<domain>`) and four release DNS records;
- update in place `aws_cloudfront_distribution.site` (aliases and certificate ARN), `aws_cloudfront_function.index_rewrite` and `aws_cloudfront_function.preview_router` (router code).

Any other destroy or replace means an input is wrong. The wrapper stops, and the operator does not widen the list to get past it.

## Risks / Trade-offs

- [The new router publishes on apply, before keys exist] → Backfill the keys before the apply (Migration Plan step 2). Until then release hosts return 404, which is safe.
- [Bare `preview.` stops showing the latest release] → `www` shows the same release; a specific release is at `<commit>.release`.
- [A missing page on a release host shows the current release's `404.html`] → Known limitation. The production distribution's error page is the single `/404.html` at the bucket root, which `promote.sh` copies from the promoted release. The preview bucket has the same limitation today.
- [An old release whose `r:<release-id>:` keys were removed serves no redirects on its release host] → Promoting it again reloads its map. Releases from now on keep their keys (`atomic-sha-deploys`, "Capacity").
- [A key write fails after promotion] → `www` already serves the new release. Rerun `npm run deploy -- prod --skip-build`; every step repeats safely.
- [Concurrent production deploys race on `release:` keys] → The first batch uses the ETag read before listing, so the second writer fails and is rerun.
- [The certificate replacement fails validation] → `create_before_destroy` keeps the old certificate on the distribution until the new one is issued. The apply stops with the site unchanged.
- [Release hosts serve production builds, which send production analytics and Sentry events] → See Open Questions.

## Migration Plan

1. Merge the PR. Work from the `main` folder.
2. Backfill: list the folders in the production site bucket whose names match `^[0-9a-f]{40}(-[1-9][0-9]*)?$`, and run `node scripts/load-release-hosts.mjs "$KVS_ARN" <id>...` with `S3_BUCKET` and `RELEASE_DATA_BUCKET` set. The script skips nothing silently: it stops on an incomplete folder, and the operator leaves that folder out and records why. The old router never reads `release:` keys, so this is safe before the apply.
3. Apply Terraform (Decision 7).
4. Check: `https://<7-char commit>.release.policeconduct.org/` serves that release; `https://<full commit>.release.policeconduct.org/robots.txt` is deny-all; an unknown commit returns 404; `https://release.policeconduct.org/x?y=1` and `https://preview.policeconduct.org/x?y=1` return 301 to `https://www.policeconduct.org/x?y=1`; `www` still serves `current`.
5. Delete `current:main` from the preview store (`aws cloudfront-keyvaluestore update-keys` with the store ETag).
6. The next `npm run deploy -- prod` writes its own key.

Rollback: revert the PR and apply again. The old router ignores `release:` keys, so they can stay. Reverting restores the `current:main` branch, so `current:main` must be put back (pointing at the current production release, after a production deploy re-mirrors it) before bare `preview.` serves again.

## Open Questions

1. **Forms on release hosts.** The production forms API accepts only the apex, `www` and `pr-<N>.preview` origins (`lambdas/forms-api/index.mjs`, `isAllowedOrigin`). As designed, a form submitted from a release host is refused. Should release hosts accept submissions (owner Q12 saves forms from older releases), or stay refused?
2. **Analytics and Sentry.** A release host serves the production build, with the production GA measurement ID and Sentry DSN. Visits to release hosts would count in production analytics. Is that acceptable, or should those events be filtered by hostname?
3. **Version hosts.** Should a specific version be reachable, for example `<commit>-2.release.policeconduct.org`? The design serves only the highest version.
4. **Preview-bucket copies of releases.** The `current:main` mirror left one copy of each production release in the preview site and release data buckets. They are not releases and no host serves them after this change. Keep them, or delete them once `current:main` is gone?
