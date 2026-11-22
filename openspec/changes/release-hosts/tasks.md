## 1. Router

- [ ] 1.1 Add router tests in `scripts/cloudfront-router.test.mjs` first: full SHA, unique short SHA, ambiguous at 7 resolved at 8, ambiguous at the label's full length (404), unknown commit (404), key value whose commit does not start with the label (404), non-release value such as `prod-temp` (404), labels of 6 and 41 characters, non-hex labels, including a label containing `-` such as `<commit>-1` (404, no `release:` read), upper-case host, redirects and overrides in the release's namespace, `/robots.txt` deny-all on a release host and both bare hosts, 301 with path and repeated query values for bare `release.` and bare `preview.` with no KVS read. Remove the test "bare preview selects latest main and accepts a named folder".
- [ ] 1.2 In `infrastructure/bootstrap-policeconduct/functions/router.js`, add the bare-host 301 after the robots answer, remove the `current:main` branch, and add `releaseForCommit` and the `<label>.release.<apex>` branch (design.md, Decision 2). Keep the file free of `${...}` other than the two template placeholders.
- [ ] 1.3 Run `node --test scripts/cloudfront-router.test.mjs`.

## 2. Release lookup keys

- [ ] 2.1 Write `scripts/load-release-hosts.test.mjs` first, with a fake `aws` on `PATH` as in `scripts/load-redirects.test.mjs`: first release, shared 7-character prefix (both chains rewritten), rerun for a rebuilt commit changes no key, malformed ID (including `<commit>-1`) stops, incomplete release stops when `builds/<id>/build/release.json` or `<id>/build/index.html` is missing (no `update-keys` call), a release with only the old `builds/<id>/data/dynamic.json` stops, no call reads `builds/<id>/data/`, store over 5 MB stops, rerun writes nothing, only `release:` keys change, stale ETag fails.
- [ ] 2.2 Write `scripts/load-release-hosts.mjs` (design.md, Decision 3). Its completeness check uses the same marker as `scripts/promote.sh` after `atomic-sha-deploys` task 2.7: `builds/<id>/build/release.json`.
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
- [ ] 4.3 Add `FORMS_ORIGIN_ENVIRONMENT = "production"` to `aws_lambda_function.forms_api_prod` and `FORMS_ORIGIN_ENVIRONMENT = "preview"` to `aws_lambda_function.forms_api_preview` (design.md, Decision 8).
- [ ] 4.4 Run `terraform -chdir=infrastructure/bootstrap-policeconduct fmt -check` and `terraform -chdir=infrastructure/bootstrap-policeconduct validate`.
- [ ] 4.5 After section 5, so the Lambda code is final, run a read-only `terraform plan` and record that its only destroys are the two certificate replacements, that it adds the five DNS records, and that it updates in place the production distribution, both CloudFront functions, and both forms API Lambdas.

## 5. Forms API origins

- [ ] 5.1 Update `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.test.mjs` first. Set `FORMS_ORIGIN_ENVIRONMENT` per test and restore it after. Pass criteria, each checked for `OPTIONS` and for every route in `WRITE_ROUTES`:
  - `production` allows `https://policeconduct.org`, `https://www.policeconduct.org`, `https://abc1234.release.policeconduct.org` and a 40-character `https://<sha>.release.policeconduct.org` (204 for `OPTIONS` with `access-control-allow-origin` echoing the origin; the submit route is reached, as in "an allowed origin still reaches the submit handler");
  - `production` refuses `https://pr-42.preview.policeconduct.org` with 403 `Origin not allowed.` and no `access-control-allow-origin`;
  - `preview` allows `https://pr-42.preview.policeconduct.org`;
  - `preview` refuses `https://policeconduct.org`, `https://www.policeconduct.org` and `https://abc1234.release.policeconduct.org` with 403 and no CORS headers;
  - both refuse `https://release.policeconduct.org`, `https://preview.policeconduct.org`, `https://a.b.release.policeconduct.org`, `https://abc1234.release.policeconduct.org.evil.example`, `http://abc1234.release.policeconduct.org`, and every entry of `UNTRUSTED_ORIGINS`;
  - an upper-case origin host (`https://ABC1234.RELEASE.POLICECONDUCT.ORG`) is allowed on `production`, as today's lower-casing allows `WWW.`;
  - with `FORMS_ORIGIN_ENVIRONMENT` unset, and with it set to `prod`, the handler rejects (throws) with `Missing or unknown FORMS_ORIGIN_ENVIRONMENT` and returns no CORS headers;
  - the release-ID test that pairs buckets with origins ("prod-roster" with `www`, "preview-roster" with `pr-42.preview`) sets `FORMS_ORIGIN_ENVIRONMENT` to match each bucket and keeps its expected status codes.
- [ ] 5.2 Run `npm run test:lambda` and confirm the new tests fail before the change.
- [ ] 5.3 In `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`, replace `PREVIEW_ORIGIN_HOST_RE` with the production and preview host rules and make `isAllowedOrigin` read `FORMS_ORIGIN_ENVIRONMENT` on each call (design.md, Decision 8). Keep the `https`-only rule and the anchored patterns.
- [ ] 5.4 Run `npm run test:lambda`. Pass: every test passes with none skipped, and the c8 report shows every new line of `isAllowedOrigin` covered.
- [ ] 5.5 Update `infrastructure/bootstrap-policeconduct/lambdas/forms-api/EGM.md` ("Allowed origins"): the two environment rules, `FORMS_ORIGIN_ENVIRONMENT`, and the throw on a missing or unknown value. Keep `[file:text]` citations matching the code.

## 6. Analytics and Sentry on release hosts

- [ ] 6.1 Write `scripts/release-host.test.mjs` first, beside `scripts/google-analytics.test.mjs`, and add it to `test:client` in `package.json`. Pass: `true` for `abc1234.release.policeconduct.org` and a 40-character SHA label; `false` for `policeconduct.org`, `www.policeconduct.org`, `release.policeconduct.org`, `pr-42.preview.policeconduct.org`, `localhost`, and `abc1234.release.policeconduct.org.evil.example`.
- [ ] 6.2 Add `src/lib/client/release-host.js` with `isReleaseHost(hostname)` (true when the lower-cased host ends with `.release.policeconduct.org`).
- [ ] 6.3 In `sentry.client.config.ts`, when `isReleaseHost(window.location.hostname)` is true, skip `Sentry.init` and do not set `window.__IPC_SENTRY_FEEDBACK__`. Every other host keeps today's code path.
- [ ] 6.4 In `tests/e2e/analytics.spec.mjs`, add `https://abc1234.release.policeconduct.org` to the "does not collect or load Google" origin loop, and add the release host to the hostnames the route handler forwards to the dev server. Pass: no `www.googletagmanager.com` load and no `dataLayer` command.
- [ ] 6.5 Add e2e tests (in `tests/e2e/forms-submit.spec.mjs`, beside "feedback › footer report issue opens Sentry feedback") that load `/about/contact/` on `https://abc1234.release.policeconduct.org`. Pass: `window.__IPC_SENTRY_FEEDBACK__` is undefined; no request goes to the host of `PUBLIC_SENTRY_DSN`, including after a form submission that the test makes fail so the forms client calls `Sentry.captureException`; clicking "Report a site issue" navigates to `/about/contact/` on the release host. Add the matching `www` case: `window.__IPC_SENTRY_FEEDBACK__` is defined.
- [ ] 6.6 Run `npm run test:client` and `npx playwright test tests/e2e/analytics.spec.mjs tests/e2e/forms-submit.spec.mjs`. Pass: all tests pass with none skipped.
- [ ] 6.7 Update `src/lib/client/EGM.md` and `src/layouts/EGM.md`: Sentry is off on release hosts, and "Report a site issue" falls back to `/about/contact/` there.

## 7. Documentation

- [ ] 7.1 `infrastructure/bootstrap-policeconduct/functions/EGM.md`: the `release:` key contract, the release-host and bare-host routing, removal of `current:main`, and the lookup count invariant.
- [ ] 7.2 `scripts/EGM.md`: `load-release-hosts.mjs`, the new upload order, and the removed preview mirror and `_PREVIEW` names for `prod`.
- [ ] 7.3 `infrastructure/bootstrap-policeconduct/EGM.md`: certificate SANs, aliases, validation domains, the release DNS records, and `FORMS_ORIGIN_ENVIRONMENT` on both forms API Lambdas.
- [ ] 7.4 `README.md` deploy section: release hosts, bare-host redirects, the removed `current:main` selection, and that production deploys no longer mirror to preview.

## 8. Validation

- [ ] 8.1 Run `npm run scan:personal-data` and the full `npm run validate` on the final PR head; resolve every error and warning.

## 9. Rollout (from `main` after merge, no approval gate)

- [ ] 9.1 Backfill `release:` keys for every complete release folder in the production site bucket whose name matches `^[0-9a-f]{40}$` (complete = `builds/<id>/build/release.json` and `<id>/build/index.html` exist); record any folder left out and why, including folders uploaded before `atomic-sha-deploys` task 2.6 that have no `release.json`.
- [ ] 9.2 Apply with `bash infrastructure/bootstrap-policeconduct/scripts/apply.sh` and `TERRAFORM_APPROVED_DESTROYS` set to `aws_acm_certificate.site` and `aws_acm_certificate_validation.site`. Stop if the plan destroys anything else.
- [ ] 9.3 Check live: a short and a full SHA serve their release; an unknown SHA returns 404; `/robots.txt` on a release host is deny-all; bare `release.` and `preview.` return 301 to `www` with path and query; `www` and `pr-<N>.preview` are unchanged; the forms `OPTIONS` checks in design.md Migration Plan step 4 give 204 and 403 as listed; a release-host page loads no Google tag and makes no Sentry request.
- [ ] 9.4 Delete `current:main` from the preview store.
- [ ] 9.5 Delete the mirror copies from the preview buckets with the documented commands (design.md, Decision 5; plan.md, Task 8 Step 5): build the candidate list, print the listing with object counts and sizes, run the `--dryrun` deletes, read the output, then delete. Pass: a rerun of the candidate step finds no candidates; no production bucket object or KVS key changed.
- [ ] 9.6 Record the evidence in `verify.md`.
