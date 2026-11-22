## Context

The deploy model this change builds on is described in `openspec/changes/atomic-sha-deploys/design.md` ("Current deploy model"). The parts that matter here:

- Two CloudFront distributions run the same router source, `infrastructure/bootstrap-policeconduct/functions/router.js`, rendered by `local.shared_router_code` in `main.tf`.
  - `aws_cloudfront_distribution.site` (production) has the aliases `local.distribution_aliases` (apex and `www`), the certificate `aws_acm_certificate.site`, the function `aws_cloudfront_function.index_rewrite`, the viewer-response function `site_response` (`atomic-sha-deploys`), and the KVS `aws_cloudfront_key_value_store.site_redirects`.
  - `aws_cloudfront_distribution.preview` has the aliases `preview.<domain>` and `*.preview.<domain>`, its own certificate (`preview-entrypoints.tf`), the function `preview_router`, the KVS `preview_redirects`, and the viewer-response function `preview_response`, which adds `X-Robots-Tag: noindex, nofollow` (`atomic-sha-deploys` replaces `noindex.js` with it).
- The router picks a release ID from a KVS pointer: `current` for the apex and `www`, `current:main` for bare `preview.<domain>`, `current:<label>` for `<label>.preview.<domain>`. It serves `<release-id>/override/<path>` when `o:<release-id>:<path>` exists, and otherwise rewrites the request to `<release-id>/build/<path>`. Redirects are redirect files in the release folder; the viewer-response function turns a file that carries `x-amz-meta-redirect-location` into a 301 (`atomic-sha-deploys`, "Redirect files"). The KVS holds no redirect keys.
- Before host routing, the router answers `/robots.txt` with `User-agent: *` / `Disallow: /` on every host except the apex and `www` (`router.js`, "only the production hosts may be crawled").
- `scripts/deploy.sh prod` builds on `main`, then `scripts/upload-release.sh` uploads to the production buckets. For `prod` it first runs itself again with namespace `main` against the preview buckets and store (the `current:main` mirror), then runs `scripts/promote.sh`, which copies `404.html` to the bucket root, moves `current`, and invalidates `/*`.
- The release ID is the full 40-character commit (`scripts/build-release.mjs`). A rebuild of the same commit against newer data goes to the same folder and records the data version it read (`atomic-sha-deploys`, owner, 2026-11-20). Production release folders already exist and are kept (owner Q7). The production bucket also holds the migration folder `prod-temp`. Folders uploaded before the `atomic-sha-deploys` storage split have no `builds/<id>/build/release.json`. They are left out: they cannot be promoted and get no release host (owner decision, 2026-11-22).
- CloudFront Functions can read the KVS only with `get` and `exists` on one key at a time. One KVS store holds at most 5 MB of keys and values. Keys are at most 512 bytes and values at most 1 KB.

## Goals / Non-Goals

**Goals:**

- Serve each release at `<commit>.release.<domain>`, by full or short SHA.
- Redirect bare `release.<domain>` and bare `preview.<domain>` to `www`.
- Keep release hosts and bare hosts out of search engines with the existing robots rule.
- Keep production certificate changes safe for the live site.
- Accept form submissions from release hosts on the production forms API, and split the allowed origins between the production and preview forms APIs.
- Turn off analytics and Sentry on release hosts.
- Delete the copies of production releases that the `current:main` mirror left in the preview buckets.

**Non-Goals:**

- Release hosts for previews or for non-commit folders such as `prod-temp`.
- Changing preview hosts, the preview viewer-response function, or the preview certificate.
- Release hosts for folders uploaded before the `atomic-sha-deploys` storage split.
- Slug changes or redirect maps for slugs.
- Any approval gate.

## Decisions

### 1. Release hosts are aliases of the production distribution

Every release folder, with its redirect files, lives in the production site bucket, and every release's `o:` override markers live in the production KVS. The production distribution is the only one that can serve them. Its aliases become apex, `www`, `release.<domain>`, and `*.release.<domain>`.

Caching stays correct across hosts. The viewer-request function rewrites the URI to `/<release-id>/build/<path>` (or `/override/`) before the cache lookup, so the cache key holds the release ID. `www` and a release host share cached objects only when they serve the same release, which is the same content. Responses the function generates (301, 404, robots) are not cached. A redirect file is cached like a page, under its release ID; the viewer-response function `site_response` turns it into a 301 on every response, cache hits included. So each release host answers with its own release's redirects.

Alternative: a third distribution for release hosts. Rejected: it would need its own copy of the bucket policy, KVS, certificate, and function, and the release keys would have to live in a store beside the `o:` keys they work with.

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
6. Release ID validation, the retired prefix rewrite, override and build rewrite (unchanged from `atomic-sha-deploys`).

The `Host` header is already lower-cased, so an upper-case SHA in the URL works.

```js
const releaseIdPattern = /^[0-9a-f]{40}$/;

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

**Key format.** `release:<prefix>`, where `<prefix>` is 7 to 40 lowercase hex characters. The value is a release ID, or the literal marker `ambiguous`. `ambiguous` can never be a release ID, so the router cannot mistake it for one. The `release:` namespace does not overlap `current`, `current:` or `o:`.

**Key set.** The keys are a pure function of the set of released commits. Each commit has one release, whose ID is the commit:

```text
for each released commit C, with release ID id(C):
  for k = 7 .. 40:
    p = first k characters of C
    if another released commit starts with p: release:p = "ambiguous"
    else: release:p = id(C); stop
```

Each commit's keys end in exactly one key that holds its release ID, at its shortest unique prefix. A full 40-character SHA is always unique, so every chain ends. Most commits get one key, `release:<first 7>`.

**Router lookup.** The router reads `release:<first 7 of label>`. While the value is `ambiguous`, it reads one more character, up to the label's length. A label shorter than the unique prefix of its commit ends on `ambiguous` and returns 404, as the owner asked. A missing key returns 404 (unknown commit).

**Rebuilds.** `<commit>.release` serves the `<commit>` folder, whatever its latest build is. A rebuild of the same commit replaces the folder's files and does not change any `release:` key. Promotion does not change which release a release host serves.

**Writer.** A new script, `scripts/load-release-hosts.mjs <kvs-arn> <release-id>...`, requires `S3_BUCKET` and `RELEASE_DATA_BUCKET`. It:

1. validates every argument against `^[0-9a-f]{40}$` and stops on the first bad one;
2. checks each release is complete, with the same two objects `promote.sh` checks (`builds/<id>/build/release.json` and `<id>/build/index.html`; `atomic-sha-deploys` task 2.7), and stops if not. It never reads `builds/<id>/data/`, which belongs to the daily job;
3. reads the store ETag, then lists every key (paged, like `scripts/manage-release.mjs`);
4. rebuilds the known releases from the values of the existing `release:` keys that are release IDs (every commit's chain ends in its ID, so none is lost), and adds the arguments;
5. computes the desired `release:` key set, and diffs it against the existing `release:` keys;
6. stops before writing when the whole store after the change would exceed 5 MB;
7. writes the deletes, then the puts, in batches of 50, with the ETag from step 3 on the first batch and a fresh ETag on later batches. A concurrent writer makes the first batch fail; the deploy is rerun. A rerun with nothing to change writes nothing.

The script writes only `release:` keys and never reads or changes `current` or `o:` keys.

**When it runs.**

- `scripts/upload-release.sh`, namespace `prod` only, after `scripts/promote.sh` succeeds: `node scripts/load-release-hosts.mjs "${store}" "${release_id}"`. The release's redirect files are uploaded before `release.json`, so they exist before its release host can serve. If this step fails, `npm run deploy -- prod --skip-build` resumes: uploads send only files that differ, promotion is repeatable, and the key writer is idempotent.
- Once, by hand, for the release folders that already exist (backfill, see Migration Plan).
- Not from `promote.sh` or `manage-release.mjs`: promotion changes which release `www` serves, not which releases exist.

**Size.** One key is `release:` (8 bytes) plus the prefix (usually 7) plus a value of 40 to about 44 bytes: about 60 bytes per release. 1,000 releases use about 60 KB, about 1.2% of the 5 MB store. Ambiguity adds about 60 bytes per extra shared character, and is rare at 7 hex characters (268 million values). The store holds no redirect keys (`atomic-sha-deploys`, "Redirect files"), only the `current*` pointers, `o:` keys and these `release:` keys.

**Lookups per request.** One `exists` and one `get` for almost every release-host request. A label of an ambiguous prefix adds one pair per extra character, at most 34 pairs for a 40-character label.

Alternatives: see brainstorm.md (a key for every prefix length; a Lambda@Edge bucket listing).

### 4. Bare hosts redirect to `www`

`release.<domain>` is an alias of the production distribution, and `preview.<domain>` stays an alias of the preview distribution. The shared router answers both with the same 301 (Decision 2, step 3), so each distribution handles its own bare host. `aws_route53_record.preview_root`, the preview certificate and the preview aliases do not change.

`preview_response` still runs on the preview distribution, so the bare preview 301 carries `X-Robots-Tag: noindex, nofollow`. The bare release 301 does not. Neither page has content to index.

### 5. Production deploys no longer mirror to the preview host

Production deploys no longer mirror to preview. Bare `preview.` no longer serves `current:main`, so the copy has no reader. `scripts/upload-release.sh` drops the nested call with namespace `main` and the four `_PREVIEW` checks for `prod`. `scripts/deploy.sh` stops resolving `S3_BUCKET_PREVIEW`, `RELEASE_DATA_BUCKET_PREVIEW`, `KVS_ARN_PREVIEW` and `CLOUDFRONT_DIST_PREVIEW` for `prod`. A production deploy then needs only production outputs, which `scripts/terraform-outputs.mjs` already provides. The `current:main` key is deleted from the preview store by hand after the router no longer reads it.

**Deleting the old copies.** Each earlier production deploy uploaded its release to the preview site bucket (`<release-id>/build/`) and the preview release data bucket (`builds/<release-id>/`). The daily job publishes only to production, so the preview release data bucket holds no daily output. After this change nothing serves or reads them, and the owner asked to delete them (2026-11-19). The cleanup is a one-time set of documented commands, run by hand from `main` after `current:main` is deleted (Migration Plan step 6). No script is added to the repo for a task that runs once.

A preview-bucket folder is a mirror copy when all of these hold:

- its name matches the release ID pattern `^[0-9a-f]{40}$`;
- the production site bucket has a folder with the same name (the mirror uploaded exactly the production release ID);
- no `current:<label>` key in the preview store names it (an open PR whose head commit is also a released commit keeps its folder).

Both preview buckets are versioned, and they differ in how old versions go away:

- Preview site bucket: `aws_s3_bucket_lifecycle_configuration.preview` expires noncurrent versions after 7 days. An `aws s3 rm` leaves a delete marker, so a mistaken delete can be undone for 7 days, and then the space is freed.
- Preview release data bucket: `aws_s3_bucket_versioning.release_data` is enabled and no lifecycle rule expires noncurrent versions. An `aws s3 rm` would hide the copy but keep every version forever. The cleanup therefore deletes every object version and delete marker under `builds/<release-id>/`, by version ID. These deletes are final.

The commands write the candidate list to a file outside the repo and print every object that will be deleted, with a count per bucket: `aws s3 ls --recursive --summarize` for each site-bucket prefix and every `key` and `versionId` under each release-data prefix. The dry run is `aws s3 rm --recursive --dryrun` for each site-bucket prefix and the exact `aws s3api delete-object --version-id` commands printed, not run, for the release data bucket. Only after the operator reads that output do the same commands run for real. They never touch the production buckets or any KVS key. The operator records the candidate count, object counts and the dry-run and delete exit codes in `verify.md`. The list holds only commit SHAs, so it may be recorded. The commands are in plan.md, Task 8 Step 5.

Interaction with `atomic-sha-deploys`: its design has `upload-release.sh` replace folder files in every bucket a `prod` deploy writes, including the preview buckets, and it keeps preview folders the `current:main` mirror uploaded. Whichever change merges second updates those lines: with no mirror, and with the mirror copies deleted, a production deploy writes only the production buckets.

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
- update in place `aws_cloudfront_distribution.site` (aliases and certificate ARN), `aws_cloudfront_function.index_rewrite` and `aws_cloudfront_function.preview_router` (router code);
- update in place `aws_lambda_function.forms_api_prod` and `aws_lambda_function.forms_api_preview` (new `FORMS_ORIGIN_ENVIRONMENT` variable and new code hash, Decision 8).

Any other destroy or replace means an input is wrong. The wrapper stops, and the operator does not widen the list to get past it.

### 8. Forms API origins per environment

The owner's rule (2026-11-19): the production forms API accepts only the apex, `www` and `*.release.policeconduct.org` origins. The preview forms API accepts only `*.preview.policeconduct.org` origins.

Today both Lambdas run the same `lambdas/forms-api/index.mjs`, and `isAllowedOrigin` accepts the same set in both: `https` with host `policeconduct.org`, `www.policeconduct.org`, or `PREVIEW_ORIGIN_HOST_RE` (`pr-<digits>.preview.policeconduct.org`). Nothing in the Lambda says which environment it serves; `main.tf` sets no origin setting. A release host is an alias of the production distribution, whose `/api/*` behavior goes to `forms_api_prod`, so today a form on a release host gets 403.

Change:

- `main.tf` adds `FORMS_ORIGIN_ENVIRONMENT = "production"` to `aws_lambda_function.forms_api_prod` and `FORMS_ORIGIN_ENVIRONMENT = "preview"` to `aws_lambda_function.forms_api_preview`.
- `isAllowedOrigin` reads `FORMS_ORIGIN_ENVIRONMENT` on each call, like the Lambda's other settings, and keeps the `https`-only rule and the hostname lower-casing:
  - `production`: host is `policeconduct.org`, `www.policeconduct.org`, or matches `^[a-z0-9-]+\.release\.policeconduct\.org$`;
  - `preview`: host matches `^[a-z0-9-]+\.preview\.policeconduct\.org$`.
- A missing or other value throws `Missing or unknown FORMS_ORIGIN_ENVIRONMENT`, as `verificationConfig` throws for a missing `SUBMISSIONS_BUCKET`. There is no default rule set; a misconfigured Lambda fails every request instead of accepting the wrong origins.
- `PREVIEW_ORIGIN_HOST_RE` is replaced by the two patterns above.

`*` is one DNS label, as in the certificate wildcards. The bare `release.` and `preview.` hosts match neither pattern; they only redirect (Decision 4), so no form runs there. A suffix such as `x.release.policeconduct.org.evil.example` matches neither, because both patterns are anchored.

What changes for visitors:

- Release hosts can submit forms to the production forms API. The submission carries the release ID of the page, and the Lambda's release check finds `builds/<release-id>/build/release.json` in the production release data bucket (`publish-release-news` task 7.11). The email confirmation link uses the request origin (`${origin}/verify/`), so a visitor who submits on a release host gets a link back to that release host, which calls the same production forms API.
- The production forms API stops accepting `pr-<N>.preview` origins. Preview pages never call it: the preview distribution sends `/api/*` to `forms_api_preview`.
- The preview forms API stops accepting the apex and `www`. Production pages never call it.
- The preview forms API accepts any one-label `*.preview` host, not only `pr-<N>`. `atomic-sha-deploys` narrows which preview hosts the router serves; the forms rule follows the owner's wording.

Alternative: one shared allow-list in both Lambdas with the release names added. Rejected: the owner asked for separate sets, and a shared list lets a preview page write to production storage.

### 9. Analytics and Sentry are off on release hosts

The owner's rule (2026-11-19): analytics and Sentry are off on release hosts, decided by the host name at runtime in the browser. Release hosts serve the production build, so the build cannot tell them apart from `www`.

Analytics: `src/lib/client/analytics.js` already loads Google Analytics only when `isProduction()` is true, which requires `https:` and a host of exactly `policeconduct.org` or `www.policeconduct.org`. `initializeAnalytics` and `trackAnalytics` both check it. A release host fails that check, so no code change is needed. An e2e test pins it (tasks.md 6.4).

Sentry: `sentry.client.config.ts` calls `Sentry.init` on every host, and sets `window.__IPC_SENTRY_FEEDBACK__`. Change: when `window.location.hostname` ends with `.release.policeconduct.org`, the file returns before `Sentry.init` and does not set `window.__IPC_SENTRY_FEEDBACK__`. Every other host keeps today's behavior, including `www`, the apex, previews and local builds. The host check is a small exported function in a new file, `src/lib/client/release-host.js` (`isReleaseHost(hostname)`), so it can be unit tested without loading Sentry.

The "Report a site issue" links in `SiteLayout.astro` already fall back: when `window.__IPC_SENTRY_FEEDBACK__` is missing, the click handler does not call `preventDefault`, and the link opens its `href`, `/about/contact/`. No layout change is needed.

The forms client (`src/lib/client/forms.ts`) calls `Sentry.captureException`. With no `Sentry.init`, the SDK has no client and the call sends nothing; it does not throw. A test checks that a form error on a release host sends no Sentry request.

## Risks / Trade-offs

- [The new router publishes on apply, before keys exist] → Backfill the keys before the apply (Migration Plan step 2). Until then release hosts return 404, which is safe.
- [Bare `preview.` stops showing the latest release] → `www` shows the same release; a specific release is at `<commit>.release`.
- [A missing page on a release host shows the current release's `404.html`] → Known limitation. The production distribution's error page is the single `/404.html` at the bucket root, which `promote.sh` copies from the promoted release. The preview bucket has the same limitation today.
- [An old release host must keep its redirects] → Each release serves its own redirect files from its folder, so old release hosts keep their redirects. Folders uploaded before the `atomic-sha-deploys` storage split get no release host.
- [A key write fails after promotion] → `www` already serves the new release. Rerun `npm run deploy -- prod --skip-build`; every step repeats safely.
- [Concurrent production deploys race on `release:` keys] → The first batch uses the ETag read before listing, so the second writer fails and is rerun.
- [The certificate replacement fails validation] → `create_before_destroy` keeps the old certificate on the distribution until the new one is issued. The apply stops with the site unchanged.
- [Release hosts serve production builds, which would send production analytics and Sentry events] → Analytics already loads only on the apex and `www`; Sentry skips `init` on release hosts (Decision 9).
- [Errors on release hosts are not reported] → Accepted by the owner. A visitor can still use "Report a site issue", which opens `/about/contact/`.
- [The forms API Lambda is applied without `FORMS_ORIGIN_ENVIRONMENT`] → It throws on every request instead of accepting the wrong origins. The variable and the code ship in the same apply.
- [A preview-bucket cleanup deletes a folder that is still used] → The candidate list excludes every folder a `current:<label>` key names, and a dry run with a full listing runs first. Only preview buckets are touched.

## Migration Plan

1. Merge the PR. Work from the `main` folder.
2. Backfill: list the folders in the production site bucket whose names match `^[0-9a-f]{40}$`, and run `node scripts/load-release-hosts.mjs "$KVS_ARN" <id>...` with `S3_BUCKET` and `RELEASE_DATA_BUCKET` set. The script skips nothing silently: it stops on an incomplete folder, and the operator leaves that folder out and records why. A folder uploaded before the `atomic-sha-deploys` storage split has no `builds/<id>/build/release.json`. It is left out: not promotable, no release host (owner decision, 2026-11-22). Nothing writes a `release.json` for it. The old router never reads `release:` keys, so this is safe before the apply.
3. Apply Terraform (Decision 7).
4. Check: `https://<7-char commit>.release.policeconduct.org/` serves that release, and a retired path of that release returns 301; `https://<full commit>.release.policeconduct.org/robots.txt` is deny-all; an unknown commit returns 404; `https://release.policeconduct.org/x?y=1` and `https://preview.policeconduct.org/x?y=1` return 301 to `https://www.policeconduct.org/x?y=1`; `www` still serves `current`. Forms: an `OPTIONS` request to `https://www.policeconduct.org/api/forms/submit` with `Origin: https://<7-char commit>.release.policeconduct.org` returns 204, and with `Origin: https://pr-<N>.preview.policeconduct.org` returns 403; the same request to `https://pr-<N>.preview.policeconduct.org/api/forms/submit` returns 204 for its own origin and 403 for `https://www.policeconduct.org`.
5. Delete `current:main` from the preview store (`aws cloudfront-keyvaluestore update-keys` with the store ETag).
6. Delete the mirror copies from the preview buckets (Decision 5): build the candidate list, print the listing, run the dry run, read it, then delete. Record the counts and exit codes in `verify.md`.
7. The next `npm run deploy -- prod` writes its own key.

Rollback: revert the PR and apply again. The old router ignores `release:` keys, so they can stay. Reverting restores the `current:main` branch, so `current:main` must be put back (pointing at the current production release, after a production deploy re-mirrors it) before bare `preview.` serves again. The deleted preview-bucket copies are not restored; the next production deploy after the revert mirrors its own release again. Reverting also restores the shared forms origin list.

## Open Questions

None. The preview-store `r:` keys the mirror loaded are deleted with every other `r:` key by the `atomic-sha-deploys` redirect cutover (its plan.md, "Redirect cutover").
