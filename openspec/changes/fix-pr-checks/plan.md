# Plan

## Done (PR #3)

1. Reproduce and fix the jump-control script execution (`src/lib/client/site.js`, `mockups/civic-index-redesign/app.js`, `tests/e2e/jump-navigation.spec.ts`). Task 1.1.
2. Replace the robots RegExp with a URL comparison (`scripts/audit-seo.mjs`). Task 1.2.
3. Remove `npx run build` from `.github/workflows/copilot-setup-steps.yml`. Task 1.3.
4. Delete `.github/workflows/deploy-preview.yml`. Task 1.4.

## Remaining

5. Follow-ups 2.1-2.4, with the files and pass criteria named in `tasks.md`:
   - 2.1 `scripts/robots-sitemap.mjs`, `scripts/robots-sitemap.test.mjs`, `scripts/audit-seo.mjs`, `package.json` (`test:audit`).
   - 2.2 `.github/workflows/cleanup-preview.yml` comment.
   - 2.3 `openspec/changes/atomic-sha-deploys/tasks.md` Phase A text; sections 4 and 7 stay deferred.
   - 2.4 `infrastructure/README.md` line 117.
6. Close out with tasks 3.1-3.8. The test plan is task 3.5 (full validate with a served Pagefind index) plus `scripts/robots-sitemap.test.mjs` from task 2.1.
