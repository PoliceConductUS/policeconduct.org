# Release Hosts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve each release at `<commit>.release.policeconduct.org` (full or 7–40 character short SHA), and send bare `release.` and `preview.` to `www`. Let release hosts submit forms to the production forms API, keep preview origins on the preview forms API only, and turn off analytics and Sentry on release hosts.

**Architecture:** The shared CloudFront router (`functions/router.js`) gets a release-host branch that resolves a SHA label through `release:<prefix>` keys in the production KVS, and a 301 for both bare hosts. A new script, `scripts/load-release-hosts.mjs`, writes those keys after each production promotion. Terraform adds the release names to the production certificate, aliases and DNS, and gives each forms API Lambda a `FORMS_ORIGIN_ENVIRONMENT`. The forms API picks its allowed origins from that setting. `sentry.client.config.ts` skips Sentry on release hosts. The production deploy stops mirroring to the preview host, and the old mirror copies are deleted once by hand.

**Tech Stack:** CloudFront Functions (`cloudfront-js-2.0`) with KeyValueStore, Node `node:test`, Playwright, Bash, AWS CLI, Terraform.

**Spec:** `openspec/changes/release-hosts/specs/deploy-hosting/spec.md`, with `design.md` (Decisions 1–9) in the same folder. Read both.

## Global Constraints

- Release ID pattern: `^[0-9a-f]{40}$`. The release ID is the full commit; a rebuild of the same commit goes to the same folder.
- Release host label pattern: `^[0-9a-f]{7,40}$` (the `Host` header is already lower-cased).
- KVS key: `release:<prefix>`; value: a release ID or the literal `ambiguous`.
- KVS limits: 5 MB per store, key ≤ 512 bytes, value ≤ 1 KB, `update-keys` batches ≤ 50 changes.
- `router.js` is a Terraform template: no `${...}` except `${domain_name}` and `${canonical_host}`.
- Router handler stays a global (`globalThis.handler`), not an export.
- Only the apex and `www` may be crawled; `/robots.txt` deny-all runs before the bare-host 301.
- No inline secrets, no absolute home paths, no new dependencies. Conventional Commits. After each commit run `git town sync` from the task branch folder.
- No approval gate. Terraform is applied from `main` after merge.

## Review Focus

- A label longer than the unique prefix whose later characters differ from the release (for example `abcdef12` when the release is `abcdef13…`) must return 404, not the neighbour's release → Task 1 test "label differing after the found prefix returns 404".
- A `release:` value that is not a release ID (for example `prod-temp`, or a hand-edited key) must return 404, not rewrite into an arbitrary folder → Task 1 test "non-release value returns 404".
- A production deploy whose key write fails must be resumable with `--skip-build` and write the same keys → Task 2 test "rerun writes nothing" plus Task 3 ordering test.
- `/robots.txt` on bare hosts must be deny-all, not a 301 to the crawlable `www` file → Task 1 test "robots.txt on bare hosts is deny-all".
- A forms API with a missing or misspelled `FORMS_ORIGIN_ENVIRONMENT` must allow no origin, not fall back to either set → Task 5 test "unknown environment allows no origin".
- A release-host pattern must not be satisfiable by a suffix or a second label (`abc1234.release.policeconduct.org.evil.example`, `a.b.release.policeconduct.org`) → Task 5 look-alike tests.
- The release data bucket keeps noncurrent versions forever, so the cleanup must delete by version ID there, or the copies stay billed → Task 8 Step 5.

---

### Task 1: Router release hosts and bare-host redirects

**Files:**

- Modify: `infrastructure/bootstrap-policeconduct/functions/router.js` (handler host chain, lines ~57–108)
- Modify: `scripts/cloudfront-router.test.mjs` (add tests; remove "bare preview selects latest main and accepts a named folder")
- Modify: `infrastructure/bootstrap-policeconduct/functions/EGM.md`

**Interfaces:**

- Consumes: KVS keys `release:<prefix>` written by Task 2.
- Produces: `async function releaseForCommit(label: string): Promise<string | null>` inside `router.js` (design.md, Decision 2 has the body).

- [ ] **Step 1: Write the failing tests** in `scripts/cloudfront-router.test.mjs`, using the existing `router(entries)` helper. Let `A = "abcdef1" + "0".repeat(33)` and `B = "abcdef1" + "1" + "0".repeat(32)`.

```js
test("full SHA serves its release", async () => {
  const run = router({ "release:abcdef1": A });
  assert.equal(
    (await run(A + ".release.example.org", "/")).uri,
    `/${A}/build/index.html`,
  );
});
test("unique short SHA serves its release", async () => {
  const run = router({ "release:abcdef1": A });
  assert.equal(
    (await run("abcdef1.release.example.org", "/x/")).uri,
    `/${A}/build/x/index.html`,
  );
});
test("prefix ambiguous at 7 resolves at 8", async () => {
  const run = router({
    "release:abcdef1": "ambiguous",
    "release:abcdef10": A,
    "release:abcdef11": B,
  });
  assert.equal(
    (await run("abcdef11.release.example.org", "/")).uri,
    `/${B}/build/index.html`,
  );
});
test("ambiguous short SHA returns 404", async () => {
  const run = router({
    "release:abcdef1": "ambiguous",
    "release:abcdef10": A,
    "release:abcdef11": B,
  });
  assert.equal((await run("abcdef1.release.example.org", "/")).statusCode, 404);
});
test("unknown commit returns 404", async () => {
  assert.equal(
    (await router()("1234567.release.example.org", "/")).statusCode,
    404,
  );
});
test("label differing after the found prefix returns 404", async () => {
  const run = router({ "release:abcdef1": A });
  assert.equal(
    (await run("abcdef1f.release.example.org", "/")).statusCode,
    404,
  );
});
test("non-release value returns 404", async () => {
  const run = router({ "release:abcdef1": "prod-temp" });
  assert.equal((await run("abcdef1.release.example.org", "/")).statusCode, 404);
});
```

Also add: labels `abcdef` (6), 41 hex characters, `abcdefg`, and a label containing `-` (`abcdef1-1`) return 404 with a `kvs.exists` spy showing no `release:` key read; `ABCDEF1.release.example.org` serves the release (the router lower-cases the `Host` header); `r:<A>:/old/` gives a 301 and `o:<A>:/index.html` gives `/<A>/override/index.html` on a release host; for hosts `release.example.org` and `preview.example.org`, `run(host, "/x/", { y: { value: "1", multiValue: [{ value: "1" }, { value: "2" }] } })` returns 301 with location `https://www.example.org/x/?y=1&y=2` and no KVS read; "robots.txt on bare hosts is deny-all" (add both bare hosts and `abcdef1.release.example.org` to the existing robots host loop). Delete the "bare preview selects latest main" test.

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/cloudfront-router.test.mjs`
Expected: the new tests FAIL (release hosts return 404; bare preview reads `current:main`).

- [ ] **Step 3: Implement in `router.js`**

After the robots block, add the bare-host 301: `if (host === "preview." + apexHost || host === "release." + apexHost) return redirect("https://" + canonicalHost + uri, request.querystring);`. Delete the `current:main` `else if`. Add `releaseIdPattern` and `releaseForCommit` from design.md Decision 2, and in the labels branch add `else if (labels[1] === "release" && /^[0-9a-f]{7,40}$/.test(labels[0])) { releaseId = await releaseForCommit(labels[0]); if (releaseId === null) return missing; }`.

- [ ] **Step 4: Run to verify pass**

Run: `node --test scripts/cloudfront-router.test.mjs`
Expected: all PASS.

- [ ] **Step 5: Update `functions/EGM.md`**: add `release:<prefix>` to the key contract; replace the `preview.<apex>` routing line with the bare-host 301 (both hosts, after robots, before path validation, no KVS read); add the `<label>.release.<apex>` rule and the lookup bound (one `exists`/`get` pair per character from 7 to the label length); remove `current:main` from the `kvs.exists` invariant. Keep `[file:text]` citations verbatim.

- [ ] **Step 6: Commit**

```bash
git add infrastructure/bootstrap-policeconduct/functions/router.js infrastructure/bootstrap-policeconduct/functions/EGM.md scripts/cloudfront-router.test.mjs
git commit -m "feat: serve releases at commit release hosts and redirect bare hosts to www"
```

### Task 2: Release lookup key writer

**Files:**

- Create: `scripts/load-release-hosts.mjs`
- Create: `scripts/load-release-hosts.test.mjs`
- Modify: `package.json` (`test:redirects` adds `scripts/load-release-hosts.test.mjs`)

**Interfaces:**

- Consumes: nothing from Task 1 at runtime; produces the keys Task 1 reads.
- Produces: CLI `node scripts/load-release-hosts.mjs <kvs-arn> <release-id>...`, env `S3_BUCKET`, `RELEASE_DATA_BUCKET` required. Exported pure function `releaseHostKeys(releaseIds: string[]): Map<string, string>` (key → value) for the key set. Exit non-zero with a thrown error on any refusal; success prints `release hosts: removed <n>, updated <m>`.

- [ ] **Step 1: Write the failing tests.** Unit tests for `releaseHostKeys` and CLI tests with the fake `aws` from `scripts/load-redirects.test.mjs` (copy its harness; extend the fake to answer `s3api head-object` from a `present` list in the state file, failing when absent).

```js
assert.deepEqual([...releaseHostKeys([A])], [["release:abcdef1", A]]);
assert.deepEqual(
  new Map(releaseHostKeys([A, B])),
  new Map([
    ["release:abcdef1", "ambiguous"],
    ["release:abcdef10", A],
    ["release:abcdef11", B],
  ]),
);
assert.deepEqual([...releaseHostKeys([A, A])], [["release:abcdef1", A]]);
```

CLI tests: "first release writes one key"; "shared prefix rewrites the older chain" (initial store holds `release:abcdef1 = A`, run with `B`, store ends as the map above); "malformed ID stops" (`prod-temp`, `A-1`, 39 hex, 41 hex → error, no `update-keys`); "incomplete release stops" (missing `builds/<id>/build/release.json` → error, no `update-keys`); "old marker only stops" (only `builds/<id>/data/dynamic.json` present → error, no `update-keys`); "daily data is not read" (no `head-object` or `get-object` call names `builds/<id>/data/`); "store over 5 MB stops" (initial items near 5 MB → error mentioning 5 MB, no `update-keys`); "rerun writes nothing"; "only release: keys change" (`current`, `r:…`, `o:…` items untouched); "stale ETag fails" (fake bumps ETag between `describe` and `update-keys` → non-zero exit).

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/load-release-hosts.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `scripts/load-release-hosts.mjs`** following design.md Decision 3, steps 1–7. Reuse the `aws` JSON wrapper, paged `list-keys`, byte counting, delete-then-put order and 50-change batches from `scripts/load-redirects.mjs`; take the ETag with `describe-key-value-store` before `list-keys` and use it for the first batch. Guard the CLI entry with an `import.meta.url` main check so tests can import `releaseHostKeys`.

- [ ] **Step 4: Run to verify pass**

Run: `node --test scripts/load-release-hosts.test.mjs`
Expected: all PASS.

- [ ] **Step 5: Add the test to `test:redirects` in `package.json`; run `npm run test:redirects`.** Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/load-release-hosts.mjs scripts/load-release-hosts.test.mjs package.json
git commit -m "feat: write release host lookup keys"
```

### Task 3: Production deploy writes keys and drops the preview mirror

**Files:**

- Modify: `scripts/upload-release.sh` (lines 22–27, 50–54)
- Modify: `scripts/deploy.sh` (lines 44–52)
- Modify: `scripts/deploy-release-guard.test.mjs`
- Modify: `scripts/EGM.md`, `README.md` (deploy section, line ~475)

**Interfaces:**

- Consumes: `node scripts/load-release-hosts.mjs <kvs-arn> <release-id>` with `S3_BUCKET`, `RELEASE_DATA_BUCKET` (Task 2).
- Produces: `npm run deploy -- prod` that needs only `S3_BUCKET`, `RELEASE_DATA_BUCKET`, `KVS_ARN`, `CLOUDFRONT_DIST_ID`.

- [ ] **Step 1: Update tests in `scripts/deploy-release-guard.test.mjs`.** Remove the `_PREVIEW` fixture values from the production case and assert from the recorded call log: (a) no call names `fixture-preview` or `fixture-preview-kvs`; (b) the `load-release-hosts.mjs` call carries the production store and the release ID and comes after the `promote.sh` pointer `update-keys`; (c) a preview upload (`pr-42`) makes no `load-release-hosts.mjs` call; (d) `--dry-run` for `prod` prints a line naming the release host keys and makes no AWS write.

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/deploy-release-guard.test.mjs`
Expected: FAIL (mirror calls present; no key write).

- [ ] **Step 3: Implement.** In `upload-release.sh`, delete the four `_PREVIEW` checks and the nested `upload-release.sh main` call; after `promote.sh`, when namespace is `prod`, run `S3_BUCKET="${bucket}" RELEASE_DATA_BUCKET="${private_bucket}" node scripts/load-release-hosts.mjs "${store}" "${release_id}"`; extend the `--dry-run` message with `and write release host keys for ${release_id}` for `prod`. In `deploy.sh`, set `names=("${site_var}" "${data_var}" "${store_var}" "${dist_var}")` for every environment and delete the mirror comment.

- [ ] **Step 4: Run to verify pass**

Run: `node --test scripts/deploy-release-guard.test.mjs scripts/manage-release.test.mjs`
Expected: all PASS.

- [ ] **Step 5: Update docs.** `scripts/EGM.md`: add `load-release-hosts.mjs` to the "Release upload and selection" row and its interface entry; replace the `_PREVIEW` statements for `prod` in the `deploy.sh` and `upload-release.sh` entries; replace the line "For namespace `prod`, the same release is uploaded and selected on the preview host…" with the new order (upload, promote, release host keys). `README.md`: replace "Main uploads also select `current:main` in the preview store" with release hosts at `<commit>.release.policeconduct.org` and the bare-host redirects.

- [ ] **Step 6: Commit**

```bash
git add scripts/upload-release.sh scripts/deploy.sh scripts/deploy-release-guard.test.mjs scripts/EGM.md README.md
git commit -m "feat: write release host keys on production deploy and drop the preview mirror"
```

### Task 4: Terraform certificate, aliases and DNS

**Files:**

- Modify: `infrastructure/bootstrap-policeconduct/main.tf` (locals ~lines 36–61; DNS records after `preview_wildcard_aaaa`)
- Modify: `infrastructure/bootstrap-policeconduct/EGM.md` (certificate, aliases, records)

**Interfaces:**

- Consumes: Task 1 router (deployed by the same apply through `local.shared_router_code`).
- Produces: `local.release_domain`, `local.release_wildcard_domain`, `local.release_domains`; `aws_route53_record.release_root["A"|"AAAA"]`, `aws_route53_record.release_wildcard["A"|"AAAA"]`.

- [ ] **Step 1: Edit locals** per design.md Decision 6: add the three locals; `distribution_aliases` and `certificate_san_names` concat `local.release_domains` in both `include_www` branches; `acm_validation_domains` concat `[local.release_wildcard_domain]`; `unmanaged_acm_validation_domains` adds `&& domain != local.release_domain`.

- [ ] **Step 2: Add the two record resources**, each `for_each = toset(["A", "AAAA"])`, `allow_overwrite = false`, `type = each.value`, alias to `aws_cloudfront_distribution.site.domain_name` with `local.cloudfront_hosted_zone_id`, names `local.release_domain` and `local.release_wildcard_domain`.

- [ ] **Step 2a: Forms API environment.** In the `environment.variables` of `aws_lambda_function.forms_api_prod` add `FORMS_ORIGIN_ENVIRONMENT = "production"`; in `aws_lambda_function.forms_api_preview` add `FORMS_ORIGIN_ENVIRONMENT = "preview"` (design.md, Decision 8). This ships with Task 5's code in the same apply.

- [ ] **Step 3: Verify**

Run: `terraform -chdir=infrastructure/bootstrap-policeconduct fmt -check && terraform -chdir=infrastructure/bootstrap-policeconduct validate`
Expected: no output from `fmt`; `Success! The configuration is valid.`

- [ ] **Step 4: Read-only plan** (after Task 5, so the Lambda code hash is final). Run `terraform -chdir=infrastructure/bootstrap-policeconduct plan -out=<scratch>/tfplan`, then `terraform show -json <scratch>/tfplan | jq '[.resource_changes[] | select(.change.actions != ["no-op"]) | {address, actions: .change.actions}]'`. Expected exactly: replace `aws_acm_certificate.site`, `aws_acm_certificate_validation.site`; create `aws_route53_record.acm_validation["*.release.policeconduct.org"]` and the four release records; update `aws_cloudfront_distribution.site`, `aws_cloudfront_function.index_rewrite`, `aws_cloudfront_function.preview_router`, `aws_lambda_function.forms_api_prod`, `aws_lambda_function.forms_api_preview`. Anything else: stop and report. Keep the plan file outside the repo and delete it.

- [ ] **Step 5: Update `infrastructure/bootstrap-policeconduct/EGM.md`**: the site certificate now covers the release names; production aliases; `release_root` and `release_wildcard` in the record list; the shared validation record for the release names; the production certificate still lists no preview name; `FORMS_ORIGIN_ENVIRONMENT` on both forms API Lambdas.

- [ ] **Step 6: Commit**

```bash
git add infrastructure/bootstrap-policeconduct/main.tf infrastructure/bootstrap-policeconduct/EGM.md
git commit -m "feat: add release host certificate names, aliases and DNS"
```

### Task 5: Forms API origins per environment

**Files:**

- Modify: `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs` (`PREVIEW_ORIGIN_HOST_RE`, `isAllowedOrigin`)
- Modify: `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.test.mjs`
- Modify: `infrastructure/bootstrap-policeconduct/lambdas/forms-api/EGM.md` ("Allowed origins")

**Interfaces:**

- Consumes: `FORMS_ORIGIN_ENVIRONMENT` set by Task 4 Step 2a.
- Produces: `isAllowedOrigin(origin)` that throws `Missing or unknown FORMS_ORIGIN_ENVIRONMENT` unless the variable is `production` or `preview`.

- [ ] **Step 1: Write the failing tests** in `index.test.mjs`. Add a helper that sets `FORMS_ORIGIN_ENVIRONMENT` for one test and restores it with `t.after`. Reuse `apiEvent`, `WRITE_ROUTES` and `UNTRUSTED_ORIGINS`.

```js
const RELEASE_ORIGIN = "https://abc1234.release.policeconduct.org";
const PREVIEW_ORIGIN = "https://pr-42.preview.policeconduct.org";
const ALLOWED = {
  production: [
    "https://policeconduct.org",
    "https://www.policeconduct.org",
    RELEASE_ORIGIN,
    `https://${"a".repeat(40)}.release.policeconduct.org`,
    "https://ABC1234.RELEASE.POLICECONDUCT.ORG",
  ],
  preview: [PREVIEW_ORIGIN],
};
const REFUSED = {
  production: [PREVIEW_ORIGIN],
  preview: [
    "https://policeconduct.org",
    "https://www.policeconduct.org",
    RELEASE_ORIGIN,
  ],
};
const LOOK_ALIKES = [
  "https://release.policeconduct.org",
  "https://preview.policeconduct.org",
  "https://a.b.release.policeconduct.org",
  "https://abc1234.release.policeconduct.org.evil.example",
  "http://abc1234.release.policeconduct.org",
];
```

Tests: for each environment, every `ALLOWED` origin gets 204 on `OPTIONS` with `access-control-allow-origin` equal to the origin (normalised by `URL.origin`), and reaches the submit handler (400, as in "an allowed origin still reaches the submit handler"); every `REFUSED`, `LOOK_ALIKES` and `UNTRUSTED_ORIGINS` entry gets 403 `Origin not allowed.` with no `access-control-allow-origin` on `OPTIONS` and on every `WRITE_ROUTES` path. "unknown environment allows no origin": with the variable deleted, and with it set to `prod`, `handler` rejects with `/Missing or unknown FORMS_ORIGIN_ENVIRONMENT/` for `https://www.policeconduct.org`. Set `FORMS_ORIGIN_ENVIRONMENT = "production"` at the top of the file beside the other variables, and in the release-ID test that loops over buckets set it to `production` for `prod-roster` rows and `preview` for `preview-roster` rows.

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:lambda`
Expected: FAIL (release origins refused on production; preview origin allowed on production; no throw for a missing variable).

- [ ] **Step 3: Implement.** Replace `PREVIEW_ORIGIN_HOST_RE` with:

```js
const ORIGIN_HOST_RULES = {
  production: (host) =>
    host === "policeconduct.org" ||
    host === "www.policeconduct.org" ||
    /^[a-z0-9-]+\.release\.policeconduct\.org$/.test(host),
  preview: (host) => /^[a-z0-9-]+\.preview\.policeconduct\.org$/.test(host),
};

function originHostRule() {
  const rule = Object.hasOwn(
    ORIGIN_HOST_RULES,
    process.env.FORMS_ORIGIN_ENVIRONMENT ?? "",
  )
    ? ORIGIN_HOST_RULES[process.env.FORMS_ORIGIN_ENVIRONMENT]
    : null;
  if (!rule) throw new Error("Missing or unknown FORMS_ORIGIN_ENVIRONMENT");
  return rule;
}
```

In `isAllowedOrigin`, call `originHostRule()` first, outside the `try`, so the error is not swallowed by the `URL` parse `catch`; then keep the `https` check and lower-casing and return `rule(hostname)`.

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:lambda`
Expected: all PASS, none skipped; the c8 text report shows the new lines of `isAllowedOrigin` and `originHostRule` covered.

- [ ] **Step 5: Update `lambdas/forms-api/EGM.md`** "Allowed origins": the two rules, `FORMS_ORIGIN_ENVIRONMENT`, and the throw. Update the `[index.mjs:PREVIEW_ORIGIN_HOST_RE]` citation to the new names.

- [ ] **Step 6: Commit**

```bash
git add infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.test.mjs infrastructure/bootstrap-policeconduct/lambdas/forms-api/EGM.md
git commit -m "feat: split forms API origins between production with release hosts and preview"
```

### Task 6: Analytics and Sentry off on release hosts

**Files:**

- Create: `src/lib/client/release-host.js`
- Create: `scripts/release-host.test.mjs`
- Modify: `package.json` (`test:client` adds `scripts/release-host.test.mjs`)
- Modify: `sentry.client.config.ts`
- Modify: `tests/e2e/analytics.spec.mjs`, `tests/e2e/forms-submit.spec.mjs`
- Modify: `src/lib/client/EGM.md`, `src/layouts/EGM.md`

**Interfaces:**

- Produces: `export const isReleaseHost = (hostname) => boolean` in `src/lib/client/release-host.js`.

- [ ] **Step 1: Write the failing unit test** `scripts/release-host.test.mjs`: `isReleaseHost` is `true` for `abc1234.release.policeconduct.org`, `ABC1234.RELEASE.POLICECONDUCT.ORG` and a 40-character label; `false` for `policeconduct.org`, `www.policeconduct.org`, `release.policeconduct.org`, `pr-42.preview.policeconduct.org`, `localhost` and `abc1234.release.policeconduct.org.evil.example`. Add it to `test:client`.

- [ ] **Step 2: Write the failing e2e tests.**
  - `tests/e2e/analytics.spec.mjs`: add `https://abc1234.release.policeconduct.org` to the "does not collect or load Google" origin loop, and add `requested.hostname.endsWith(".release.policeconduct.org")` to the hostnames the route handler forwards to the dev server. This test may already pass (analytics is host-gated today); it pins the behavior.
  - `tests/e2e/forms-submit.spec.mjs`: "feedback › release host has no Sentry": load `https://abc1234.release.policeconduct.org/about/contact/` through the same forwarding; record requests whose host is the host of `PUBLIC_SENTRY_DSN`; assert `window.__IPC_SENTRY_FEEDBACK__` is undefined; submit the contact form with the forms API route answering 500 so the forms client calls `Sentry.captureException`; assert no Sentry request was recorded; click "Report a site issue" (last link) and assert the URL is `https://abc1234.release.policeconduct.org/about/contact/`. "feedback › www keeps Sentry": on `https://www.policeconduct.org/about/contact/`, `window.__IPC_SENTRY_FEEDBACK__` is defined.

- [ ] **Step 3: Run to verify failure**

Run: `npm run test:client && npx playwright test tests/e2e/analytics.spec.mjs tests/e2e/forms-submit.spec.mjs`
Expected: `release-host.test.mjs` fails (module not found); "release host has no Sentry" fails (feedback is set).

- [ ] **Step 4: Implement.** `src/lib/client/release-host.js`: `export const isReleaseHost = (hostname) => String(hostname).toLowerCase().endsWith(".release.policeconduct.org");`. In `sentry.client.config.ts`, wrap the `Sentry.init(...)` call and the `window.__IPC_SENTRY_FEEDBACK__` assignment in `if (!isReleaseHost(window.location.hostname)) { ... }`. Leave `SiteLayout.astro` and `analytics.js` unchanged.

- [ ] **Step 5: Run to verify pass.** Same command as Step 3. Expected: all PASS, none skipped.

- [ ] **Step 6: Update docs.** `src/lib/client/EGM.md`: `release-host.js`, and that Sentry does not start on release hosts. `src/layouts/EGM.md`: on release hosts "Report a site issue" opens `/about/contact/` because no feedback widget exists.

- [ ] **Step 7: Commit**

```bash
git add src/lib/client/release-host.js scripts/release-host.test.mjs package.json sentry.client.config.ts tests/e2e/analytics.spec.mjs tests/e2e/forms-submit.spec.mjs src/lib/client/EGM.md src/layouts/EGM.md
git commit -m "feat: turn off Sentry on release hosts and pin analytics off there"
```

### Task 7: Final validation

- [ ] **Step 1:** Run `npm run scan:personal-data`. Expected: exit 0.
- [ ] **Step 2:** Run the full `npm run validate` on the final head with the `mise.toml` Node and `npm ci`. Expected: exit 0 with no warnings; resolve every finding.
- [ ] **Step 3:** Record SHA, commands, exit codes, test counts and skip accounting in `openspec/changes/release-hosts/verify.md`; commit and `git town sync`.

### Task 8: Rollout (from `main` after the PR merges)

- [ ] **Step 1: Backfill.** With `KVS_ARN`, `S3_BUCKET`, `RELEASE_DATA_BUCKET` from `node scripts/terraform-outputs.mjs KVS_ARN S3_BUCKET RELEASE_DATA_BUCKET`, list top-level prefixes of the production site bucket (`aws s3api list-objects-v2 --delimiter / --query 'CommonPrefixes[].Prefix'`), keep names matching the release ID pattern, and run `node scripts/load-release-hosts.mjs "$KVS_ARN" <ids...>`. If it stops on an incomplete folder, rerun without that ID and record the folder and reason in `verify.md`. A folder with no `builds/<id>/build/release.json` (uploaded before `atomic-sha-deploys` task 2.6) is incomplete; record it with that reason.
- [ ] **Step 2: Apply.** `TERRAFORM_APPROVED_DESTROYS=$'aws_acm_certificate.site\naws_acm_certificate_validation.site' bash infrastructure/bootstrap-policeconduct/scripts/apply.sh`. Expected: plan matches Task 4 Step 4; apply succeeds. If the wrapper refuses another destroy, stop.
- [ ] **Step 3: Check live** with `curl -sI`: `https://<7-char>.release.policeconduct.org/` 200; `https://<full>.release.policeconduct.org/robots.txt` deny-all body; `https://0000000.release.policeconduct.org/` 404; `https://release.policeconduct.org/x/?y=1` and `https://preview.policeconduct.org/x/?y=1` 301 to `https://www.policeconduct.org/x/?y=1`; `www` and an open `pr-<N>.preview` unchanged. Forms: `curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "Origin: <origin>" <api>/api/forms/submit` gives 204 for `https://<7-char>.release.policeconduct.org` and `https://www.policeconduct.org` on `https://www.policeconduct.org`, 403 for `https://pr-<N>.preview.policeconduct.org` there; on `https://pr-<N>.preview.policeconduct.org` it gives 204 for its own origin and 403 for `https://www.policeconduct.org`. In a browser on a release host, the network panel shows no `googletagmanager.com` and no Sentry request.
- [ ] **Step 4:** Delete `current:main` from the preview store (`update-keys --if-match <etag> --deletes '[{"Key":"current:main"}]'`).
- [ ] **Step 5: Delete the mirror copies from the preview buckets** (design.md, Decision 5). Run from the `main` folder in Bash. Every file goes in a temporary folder outside the repo.

```bash
eval "$(node scripts/terraform-outputs.mjs S3_BUCKET S3_BUCKET_PREVIEW RELEASE_DATA_BUCKET_PREVIEW KVS_ARN_PREVIEW)"
work="$(mktemp -d)"
id_re='^[0-9a-f]{40}$'
folders() { # <bucket> <prefix>: release-ID folder names directly under <prefix>
  aws s3api list-objects-v2 --bucket "$1" --prefix "$2" --delimiter / \
    --query 'CommonPrefixes[].Prefix' --output text \
    | tr '\t' '\n' | sed "s#^$2##; s#/\$##" | grep -E "$id_re" | sort -u
}
folders "$S3_BUCKET" "" > "$work/prod"
folders "$S3_BUCKET_PREVIEW" "" > "$work/preview-site"
folders "$RELEASE_DATA_BUCKET_PREVIEW" "builds/" > "$work/preview-data"
aws cloudfront-keyvaluestore list-keys --kvs-arn "$KVS_ARN_PREVIEW" --output json \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const i of JSON.parse(s).Items)if(i.Key.startsWith("current:"))console.log(i.Value)})' \
  | sort -u > "$work/in-use"
sort -u "$work/preview-site" "$work/preview-data" | comm -12 - "$work/prod" | comm -23 - "$work/in-use" > "$work/candidates"
wc -l < "$work/candidates"
```

Check `$work/in-use` holds no `current:main` value (Step 4 deleted it) and only open-PR folders. Then list and dry-run:

```bash
versions() { # <bucket> <prefix>: "key<TAB>versionId" for every version and delete marker
  aws s3api list-object-versions --bucket "$1" --prefix "$2" --output json \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s||"{}");for(const v of [...(j.Versions||[]),...(j.DeleteMarkers||[])])console.log(v.Key+"\t"+v.VersionId)})'
}
while read -r id <&3; do
  aws s3 ls "s3://$S3_BUCKET_PREVIEW/$id/" --recursive --summarize
  versions "$RELEASE_DATA_BUCKET_PREVIEW" "builds/$id/"
done 3< "$work/candidates" | tee "$work/listing"
while read -r id <&3; do
  aws s3 rm "s3://$S3_BUCKET_PREVIEW/$id/" --recursive --dryrun
  versions "$RELEASE_DATA_BUCKET_PREVIEW" "builds/$id/" \
    | while IFS=$'\t' read -r key vid; do echo "would run: aws s3api delete-object --bucket $RELEASE_DATA_BUCKET_PREVIEW --key $key --version-id $vid"; done
done 3< "$work/candidates" | tee "$work/dryrun"
```

Read `$work/listing` and `$work/dryrun`. Every path must start with a candidate release ID (site bucket) or `builds/<candidate>/` (release data bucket). If any line names another path, stop. Then delete:

```bash
while read -r id <&3; do
  aws s3 rm "s3://$S3_BUCKET_PREVIEW/$id/" --recursive --only-show-errors
  versions "$RELEASE_DATA_BUCKET_PREVIEW" "builds/$id/" \
    | while IFS=$'\t' read -r key vid; do aws s3api delete-object --bucket "$RELEASE_DATA_BUCKET_PREVIEW" --key "$key" --version-id "$vid" >/dev/null; done
done 3< "$work/candidates"
```

Expected: every command exits 0; rerunning the candidate step prints `0`; `versions "$RELEASE_DATA_BUCKET_PREVIEW" "builds/<candidate>/"` prints nothing for each candidate; an open `pr-<N>.preview` still serves. Record the candidate count, the object and version counts from the listing, and each exit code in `verify.md`. Delete `$work`.

- [ ] **Step 6:** Record evidence in `verify.md`.
