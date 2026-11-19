# Fix PR checks

## Why

PR #3 (https://github.com/PoliceConductUS/policeconduct.org/pull/3) ran an automatic preview deployment workflow, but CI has no database or intake data and previews are published locally. Copilot Setup Steps ran the invalid command `npx run build`. CodeQL reported script execution through the jump controls and `js/incomplete-hostname-regexp` in `scripts/audit-seo.mjs`.

## What Changes

- Restrict jump-control navigation to `http:` and `https:` URLs in the site and the mockup.
- Compare each robots `Sitemap:` URL, ignoring letter case, with `https://www.policeconduct.org/sitemap-index.xml`, without building a RegExp from the host.
- Delete `.github/workflows/deploy-preview.yml`; publish previews with `npm run deploy -- preview`.
- Make Copilot's dependency and browser setup complete without running a database-backed build.

## Impact

Valid jump destinations still open, and the production sitemap URL still passes the robots check. Preview builds still need real intake data, and the schema contract checks (`scripts/validate-schema-contract.mjs`) stay strict. Previews and releases are published locally with `npm run deploy -- <environment>` (`scripts/deploy.sh`, with `PR_NUMBER` or `PREVIEW_NAME` for previews; it calls `scripts/upload-release.sh`). GitHub needs no database dump.

GitHub workflows do not build or publish previews or releases until a change adds CI publication. The CI publication tasks in `atomic-sha-deploys` (sections 4 and 7) stay deferred; this change does not remove them. Only that change's stale Phase A text, which names the deleted `deploy-preview.yml`, is corrected (task 2.3).
