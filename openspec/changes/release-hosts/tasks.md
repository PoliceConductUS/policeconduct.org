## 1. Router

- [ ] 1.1 Add router tests in `scripts/cloudfront-router.test.mjs` first: full SHA, unique short SHA, ambiguous at 7 resolved at 8, ambiguous at the label's full length (404), unknown commit (404), key value whose commit does not start with the label (404), non-release value such as `prod-temp` (404), labels of 6 and 41 characters and non-hex labels (404, no `release:` read), upper-case host, versioned release ID, redirects and overrides in the release's namespace, `/robots.txt` deny-all on a release host and both bare hosts, 301 with path and repeated query values for bare `release.` and bare `preview.` with no KVS read. Remove the test "bare preview selects latest main and accepts a named folder".
- [ ] 1.2 In `infrastructure/bootstrap-policeconduct/functions/router.js`, add the bare-host 301 after the robots answer, remove the `current:main` branch, and add `releaseForCommit` and the `<label>.release.<apex>` branch (design.md, Decision 2). Keep the file free of `${...}` other than the two template placeholders.
- [ ] 1.3 Run `node --test scripts/cloudfront-router.test.mjs`.

## 2. Release lookup keys

- [ ] 2.1 Write `scripts/load-release-hosts.test.mjs` first, with a fake `aws` on `PATH` as in `scripts/load-redirects.test.mjs`: first release, shared 7-character prefix (both chains rewritten), new version replaces the value, older version does not, bare-commit release replaced by `-1`, malformed ID stops, incomplete release stops (no `update-keys` call), store over 5 MB stops, rerun writes nothing, only `release:` keys change, stale ETag fails.
- [ ] 2.2 Write `scripts/load-release-hosts.mjs` (design.md, Decision 3).
- [ ] 2.3 Add the new test file to `test:redirects` in `package.json`.
- [ ] 2.4 Run `node --test scripts/load-release-hosts.test.mjs`.

## 3. Deploy

- [ ] 3.1 Update `scripts/deploy-release-guard.test.mjs` first: a production upload makes no call against the preview buckets or store and needs no `_PREVIEW` variable; it runs `load-release-hosts.mjs` with the production store after `promote.sh`; a preview upload never runs it; `--dry-run` prints the release-key step and writes nothing.
- [ ] 3.2 In `scripts/upload-release.sh`, remove the `_PREVIEW` checks and the nested `main` upload, and run `node scripts/load-release-hosts.mjs "${store}" "${release_id}"` after `promote.sh` for namespace `prod`, with `S3_BUCKET` and `RELEASE_DATA_BUCKET` set. Add the step to the `--dry-run` message.
- [ ] 3.3 In `scripts/deploy.sh`, stop resolving the four `_PREVIEW` names for `prod` and remove the mirror comment.
- [ ] 3.4 Run `node --test scripts/deploy-release-guard.test.mjs scripts/manage-release.test.mjs`.

## 4. Terraform

- [ ] 4.1 In `infrastructure/bootstrap-policeconduct/main.tf`, add `release_domain`, `release_wildcard_domain` and `release_domains`; append the release names to `distribution_aliases` and `certificate_san_names`; append only the wildcard to `acm_validation_domains`; exclude `release_domain` from `unmanaged_acm_validation_domains` (design.md, Decision 6).
- [ ] 4.2 Add `aws_route53_record.release_root` and `aws_route53_record.release_wildcard` (`A` and `AAAA`, `allow_overwrite = false`, alias to `aws_cloudfront_distribution.site`).
- [ ] 4.3 Run `terraform -chdir=infrastructure/bootstrap-policeconduct fmt -check` and `terraform -chdir=infrastructure/bootstrap-policeconduct validate`.
- [ ] 4.4 Run a read-only `terraform plan` and record that its only destroys are the two certificate replacements, that it adds the five DNS records, and that it updates the production distribution and both CloudFront functions in place.

## 5. Documentation

- [ ] 5.1 `infrastructure/bootstrap-policeconduct/functions/EGM.md`: the `release:` key contract, the release-host and bare-host routing, removal of `current:main`, and the lookup count invariant.
- [ ] 5.2 `scripts/EGM.md`: `load-release-hosts.mjs`, the new upload order, and the removed preview mirror and `_PREVIEW` names for `prod`.
- [ ] 5.3 `infrastructure/bootstrap-policeconduct/EGM.md`: certificate SANs, aliases, validation domains and the release DNS records.
- [ ] 5.4 `README.md` deploy section: release hosts, bare-host redirects, and the removed `current:main` selection.

## 6. Validation

- [ ] 6.1 Run `npm run scan:personal-data` and the full `npm run validate` on the final PR head; resolve every error and warning.

## 7. Rollout (from `main` after merge, no approval gate)

- [ ] 7.1 Backfill `release:` keys for every complete release folder in the production site bucket whose name matches `^[0-9a-f]{40}(-[1-9][0-9]*)?$`; record any folder left out and why.
- [ ] 7.2 Apply with `bash infrastructure/bootstrap-policeconduct/scripts/apply.sh` and `TERRAFORM_APPROVED_DESTROYS` set to `aws_acm_certificate.site` and `aws_acm_certificate_validation.site`. Stop if the plan destroys anything else.
- [ ] 7.3 Check live: a short and a full SHA serve their release; an unknown SHA returns 404; `/robots.txt` on a release host is deny-all; bare `release.` and `preview.` return 301 to `www` with path and query; `www` and `pr-<N>.preview` are unchanged.
- [ ] 7.4 Delete `current:main` from the preview store.
- [ ] 7.5 Record the evidence in `verify.md`.
