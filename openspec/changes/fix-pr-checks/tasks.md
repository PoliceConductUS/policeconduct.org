# Tasks

## 1. Fixes (merged to main in PR #3, https://github.com/PoliceConductUS/policeconduct.org/pull/3)

- [x] 1.1 Jump controls in `src/lib/client/site.js` and `mockups/civic-index-redesign/app.js` open only `http:`/`https:` destinations; `tests/e2e/jump-navigation.spec.ts` covers both (46732fc).
- [x] 1.2 `scripts/audit-seo.mjs` compares each robots `Sitemap:` URL with the production sitemap URL, with no dynamic RegExp (7f9f22f).
- [x] 1.3 `.github/workflows/copilot-setup-steps.yml` drops the `npx run build` step (46732fc).
- [x] 1.4 Delete `.github/workflows/deploy-preview.yml`; preview publication stays `npm run deploy -- preview` (`scripts/deploy.sh`) (c7b954e).

## 2. Follow-ups found in review

- [ ] 2.1 Robots sitemap regression test. Move the robots `Sitemap:` check from `ensureRobotsAndSitemap` in `scripts/audit-seo.mjs` into a new `scripts/robots-sitemap.mjs`. That module exports `robotsSitemapErrors(robotsText)`, which returns an array of error strings, and has no side effects on import. `audit-seo.mjs` imports it and passes each error to `addError`. Add `scripts/robots-sitemap.test.mjs` (`node:test`) with these cases: canonical URL passes; mixed-case label and CRLF line endings pass; several `Sitemap:` lines with one canonical pass; `https://wwwXpoliceconductYorg/sitemap-index.xml` fails; `https://www.policeconduct.org.example.com/sitemap-index.xml` fails; a line with the URL but no `Sitemap:` label fails. Append `scripts/robots-sitemap.test.mjs` to `test:audit` in `package.json`. Pass: `npm run test:audit` runs all six cases and they pass.
- [ ] 2.2 `.github/workflows/cleanup-preview.yml` lines 36-37: replace `# Pinned, as in deploy-preview.yml. CloudFront and ACM are us-east-1` / `# only (...)` with `# Pinned: CloudFront and ACM are us-east-1 only` / `# (infrastructure/bootstrap-policeconduct/providers.tf).` Pass: no file under `.github/` mentions `deploy-preview.yml`.
- [x] 2.3 `openspec/changes/atomic-sha-deploys/tasks.md`: remove the stale CI preview workflow text and keep CI publication deferred. Done 2026-11-19 by the round-1 rewrite of `atomic-sha-deploys`: its tasks name neither `deploy-preview.yml` nor `deploy-preview.sh`, and CI publication sits under "Deferred until a change adds CI publication". `npx openspec validate atomic-sha-deploys` passes.
- [ ] 2.4 `infrastructure/README.md` line 117: replace the text that names `deploy.yml`, `preview.yml`, and `preview-cleanup.yml` with: "2. Then content is published locally with `npm run deploy -- <environment>`, which assumes the infrastructure exists. The only deploy-related workflow is `.github/workflows/cleanup-preview.yml`, which removes a closed PR's preview selection." Pass: `infrastructure/README.md` names no workflow file that does not exist under `.github/workflows/`.

## 3. Close out

- [ ] 3.1 Open a PR to `main` that carries tasks 2.x. Record its number, URL, and final head SHA in `verify.md`.
- [ ] 3.2 On that head, record the CodeQL run URL and conclusion. Confirm that no open alert has an instance in `src/lib/client/site.js`, `mockups/civic-index-redesign/app.js`, or `scripts/audit-seo.mjs`. Record the state of alert #2 (`js/incomplete-hostname-regexp`). If it is still `open`, report it to the owner. Do not dismiss it without the owner's decision.
- [ ] 3.3 Record the run URL and conclusion for Personal Data Scan (`scan`) and Code Coverage (`coverage-javascript`, `upload-coverage-javascript`) on that head.
- [ ] 3.4 Start Copilot Setup Steps with `workflow_dispatch` on the PR branch. Record the run URL and a successful conclusion.
- [ ] 3.5 Run the full `mise exec -- npm run validate` on that head against a built and served Pagefind index (README "End-to-End Form Tests"). Record the exit code, counts for each suite, and every skip. Zero skips are expected. Any skip needs a linked human decision.
- [ ] 3.6 Rewrite `verify.md` with the evidence from 3.1-3.5.
- [ ] 3.7 Write `retrospective.md` with `/opsx:continue fix-pr-checks`.
- [ ] 3.8 Run `/opsx:archive fix-pr-checks`.
