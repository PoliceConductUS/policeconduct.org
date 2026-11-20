# Verification

## Fixes

CodeQL on PR #3 (https://github.com/PoliceConductUS/policeconduct.org/pull/3) reported three findings. Two were script execution through the jump controls in `src/lib/client/site.js` and `mockups/civic-index-redesign/app.js`. Those were PR-only alerts. The third was `js/incomplete-hostname-regexp` in `scripts/audit-seo.mjs` (alert #2).

- **Jump controls.** `tests/e2e/jump-navigation.spec.ts` ran the injected `javascript:` option before the fix. After the fix it passes, including navigation to `/`. The test opens `/tx/`, so it needs a local server with the intake database (`npm run test:e2e`). No GitHub workflow runs it. In CI, only CodeQL covers this fix.
- **Robots sitemap check.** On 46732fc the hostname was escaped into a dynamic RegExp, and CodeQL still flagged it. 7f9f22f removes the RegExp. It parses each `Sitemap:` line and compares the URL, lowercased, with `https://www.policeconduct.org/sitemap-index.xml`. [Task 2.1: name the test file and its result, or say "The six cases were run by hand and are not in the repo."]

## Workflows

- Copilot Setup Steps installs Node 26.13.1, runs `npm ci`, and installs the Playwright browsers. The invalid `npx run build` step was removed. GitHub describes setup steps as tool preparation: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment
- c7b954e deleted `.github/workflows/deploy-preview.yml`. CI has no database or intake data, and previews are published with `npm run deploy -- preview` (`scripts/deploy.sh`). `.github/workflows/cleanup-preview.yml` stays (see `design.md`).

## Close-out evidence (task 3)

- PR and final head SHA:
- CodeQL run and conclusion; alert #2 state:
- Personal Data Scan and Code Coverage runs and conclusions:
- Copilot Setup Steps `workflow_dispatch` run and conclusion:
- `mise exec -- npm run validate` against a built and served Pagefind index: exit code, counts for each suite, skips:
