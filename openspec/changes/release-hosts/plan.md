# Release Hosts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve each release at `<commit>.release.policeconduct.org` (full or 7–40 character short SHA), and send bare `release.` and `preview.` to `www`.

**Architecture:** The shared CloudFront router (`functions/router.js`) gets a release-host branch that resolves a SHA label through `release:<prefix>` keys in the production KVS, and a 301 for both bare hosts. A new script, `scripts/load-release-hosts.mjs`, writes those keys after each production promotion. Terraform adds the release names to the production certificate, aliases and DNS. The production deploy stops mirroring to the preview host.

**Tech Stack:** CloudFront Functions (`cloudfront-js-2.0`) with KeyValueStore, Node `node:test`, Bash, AWS CLI, Terraform.

**Spec:** `openspec/changes/release-hosts/specs/deploy-hosting/spec.md`, with `design.md` (Decisions 1–7) in the same folder. Read both.

## Global Constraints

- Release ID pattern: `^[0-9a-f]{40}(-[1-9][0-9]*)?$`. A bare 40-hex ID is version 0.
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
- Backfilling an older version after a newer one must not move the release host backwards → Task 2 test "older version does not replace newer".
- A production deploy whose key write fails must be resumable with `--skip-build` and write the same keys → Task 2 test "rerun writes nothing" plus Task 3 ordering test.
- `/robots.txt` on bare hosts must be deny-all, not a 301 to the crawlable `www` file → Task 1 test "robots.txt on bare hosts is deny-all".

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
  const run = router({ "release:abcdef1": A + "-2" });
  assert.equal(
    (await run(A + ".release.example.org", "/")).uri,
    `/${A}-2/build/index.html`,
  );
});
test("unique short SHA serves its release", async () => {
  const run = router({ "release:abcdef1": A + "-1" });
  assert.equal(
    (await run("abcdef1.release.example.org", "/x/")).uri,
    `/${A}-1/build/x/index.html`,
  );
});
test("prefix ambiguous at 7 resolves at 8", async () => {
  const run = router({
    "release:abcdef1": "ambiguous",
    "release:abcdef10": A + "-1",
    "release:abcdef11": B + "-1",
  });
  assert.equal(
    (await run("abcdef11.release.example.org", "/")).uri,
    `/${B}-1/build/index.html`,
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

Also add: labels `abcdef` (6), 41 hex characters, and `abcdefg` return 404 with a `kvs.exists` spy showing no `release:` key read; `ABCDEF1.release.example.org` serves the release (the router lower-cases the `Host` header); `r:<A>-1:/old/` gives a 301 and `o:<A>-1:/index.html` gives `/<A>-1/override/index.html` on a release host; for hosts `release.example.org` and `preview.example.org`, `run(host, "/x/", { y: { value: "1", multiValue: [{ value: "1" }, { value: "2" }] } })` returns 301 with location `https://www.example.org/x/?y=1&y=2` and no KVS read; "robots.txt on bare hosts is deny-all" (add both bare hosts and `abcdef1.release.example.org` to the existing robots host loop). Delete the "bare preview selects latest main" test.

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
assert.deepEqual(
  [...releaseHostKeys([A + "-1"])],
  [["release:abcdef1", A + "-1"]],
);
assert.deepEqual(
  new Map(releaseHostKeys([A + "-1", B + "-1"])),
  new Map([
    ["release:abcdef1", "ambiguous"],
    ["release:abcdef10", A + "-1"],
    ["release:abcdef11", B + "-1"],
  ]),
);
assert.equal(releaseHostKeys([A, A + "-1"]).get("release:abcdef1"), A + "-1"); // bare is version 0
assert.equal(
  releaseHostKeys([A + "-3", A + "-2"]).get("release:abcdef1"),
  A + "-3",
);
```

CLI tests: "first release writes one key"; "shared prefix rewrites the older chain" (initial store holds `release:abcdef1 = A-1`, run with `B-1`, store ends as the map above); "older version does not replace newer" (store holds `A-3`, run with `A-2`, no `update-keys` call); "malformed ID stops" (`prod-temp`, `A-0`, `A-01`, 39 hex → error, no `update-keys`); "incomplete release stops" (missing `builds/<id>/data/dynamic.json` → error, no `update-keys`); "store over 5 MB stops" (initial items near 5 MB → error mentioning 5 MB, no `update-keys`); "rerun writes nothing"; "only release: keys change" (`current`, `r:…`, `o:…` items untouched); "stale ETag fails" (fake bumps ETag between `describe` and `update-keys` → non-zero exit).

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

- [ ] **Step 3: Verify**

Run: `terraform -chdir=infrastructure/bootstrap-policeconduct fmt -check && terraform -chdir=infrastructure/bootstrap-policeconduct validate`
Expected: no output from `fmt`; `Success! The configuration is valid.`

- [ ] **Step 4: Read-only plan.** Run `terraform -chdir=infrastructure/bootstrap-policeconduct plan -out=<scratch>/tfplan`, then `terraform show -json <scratch>/tfplan | jq '[.resource_changes[] | select(.change.actions != ["no-op"]) | {address, actions: .change.actions}]'`. Expected exactly: replace `aws_acm_certificate.site`, `aws_acm_certificate_validation.site`; create `aws_route53_record.acm_validation["*.release.policeconduct.org"]` and the four release records; update `aws_cloudfront_distribution.site`, `aws_cloudfront_function.index_rewrite`, `aws_cloudfront_function.preview_router`. Anything else: stop and report. Keep the plan file outside the repo and delete it.

- [ ] **Step 5: Update `infrastructure/bootstrap-policeconduct/EGM.md`**: the site certificate now covers the release names; production aliases; `release_root` and `release_wildcard` in the record list; the shared validation record for the release names; the production certificate still lists no preview name.

- [ ] **Step 6: Commit**

```bash
git add infrastructure/bootstrap-policeconduct/main.tf infrastructure/bootstrap-policeconduct/EGM.md
git commit -m "feat: add release host certificate names, aliases and DNS"
```

### Task 5: Final validation

- [ ] **Step 1:** Run `npm run scan:personal-data`. Expected: exit 0.
- [ ] **Step 2:** Run the full `npm run validate` on the final head with the `mise.toml` Node and `npm ci`. Expected: exit 0 with no warnings; resolve every finding.
- [ ] **Step 3:** Record SHA, commands, exit codes, test counts and skip accounting in `openspec/changes/release-hosts/verify.md`; commit and `git town sync`.

### Task 6: Rollout (from `main` after the PR merges)

- [ ] **Step 1: Backfill.** With `KVS_ARN`, `S3_BUCKET`, `RELEASE_DATA_BUCKET` from `node scripts/terraform-outputs.mjs KVS_ARN S3_BUCKET RELEASE_DATA_BUCKET`, list top-level prefixes of the production site bucket (`aws s3api list-objects-v2 --delimiter / --query 'CommonPrefixes[].Prefix'`), keep names matching the release ID pattern, and run `node scripts/load-release-hosts.mjs "$KVS_ARN" <ids...>`. If it stops on an incomplete folder, rerun without that ID and record the folder and reason in `verify.md`.
- [ ] **Step 2: Apply.** `TERRAFORM_APPROVED_DESTROYS=$'aws_acm_certificate.site\naws_acm_certificate_validation.site' bash infrastructure/bootstrap-policeconduct/scripts/apply.sh`. Expected: plan matches Task 4 Step 4; apply succeeds. If the wrapper refuses another destroy, stop.
- [ ] **Step 3: Check live** with `curl -sI`: `https://<7-char>.release.policeconduct.org/` 200; `https://<full>.release.policeconduct.org/robots.txt` deny-all body; `https://0000000.release.policeconduct.org/` 404; `https://release.policeconduct.org/x/?y=1` and `https://preview.policeconduct.org/x/?y=1` 301 to `https://www.policeconduct.org/x/?y=1`; `www` and an open `pr-<N>.preview` unchanged.
- [ ] **Step 4:** Delete `current:main` from the preview store (`update-keys --if-match <etag> --deletes '[{"Key":"current:main"}]'`).
- [ ] **Step 5:** Record evidence in `verify.md`.
