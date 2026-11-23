# Fix PR checks

## Why

[PR #3](https://github.com/PoliceConductUS/policeconduct.org/pull/3) ran an automatic preview deployment workflow, but CI has no database or intake data (the records the separate intake system loads into the site database; see AGENTS.md "Database Expectations") and previews are published locally. Copilot Setup Steps ran the invalid command `npx run build`. CodeQL reported script execution through the jump controls and `js/incomplete-hostname-regexp` in `scripts/audit-seo.mjs`.

## What Changes

- Restrict jump-control navigation to `http:` and `https:` URLs in the site and the mockup.
- Compare each robots `Sitemap:` URL, ignoring letter case, with `https://www.policeconduct.org/sitemap-index.xml`, without building a RegExp from the host.
- Delete `.github/workflows/deploy-preview.yml`; publish previews with `npm run deploy -- preview`.
- Make Copilot's dependency and browser setup complete without running a database-backed build.
- Move the robots sitemap check into a new `scripts/audit-seo-checks.mjs`, tested by `scripts/audit-seo-checks.test.mjs` in `npm run test:audit`.

## Capabilities

### New Capabilities

- `ci-checks`: GitHub workflows do not build or publish previews or releases, and Copilot Setup Steps only prepares tools.

### Modified Capabilities

- `civic-index-pages`: adds the requirement that jump navigation opens only `http:` and `https:` URLs.
- `production-canonical-urls`: adds the requirement that `robots.txt` names the production sitemap.

## Impact

Valid jump destinations still open, and the production sitemap URL still passes the robots check. Preview builds still need real intake data, and the schema contract checks (`scripts/validate-schema-contract.mjs`) stay strict. Previews and releases are published locally with `npm run deploy -- <environment>` (`scripts/deploy.sh`, with `PR_NUMBER` for previews; it calls `scripts/upload-release.sh`). GitHub needs no database dump.

GitHub workflows do not build or publish previews or releases until a change adds CI publication (owner decision Q35). The CI publication items in `atomic-sha-deploys/tasks.md`, under "Deferred until a change adds CI publication", stay deferred; this change does not remove them. The stale `deploy-preview.yml` text in `atomic-sha-deploys` was removed by its 2026-11-19 rewrite (task 2.3).
