# Plan

## Done

1. Reproduce and fix the jump-control script execution (`src/lib/client/site.js`, `mockups/civic-index-redesign/app.js`, `tests/e2e/jump-navigation.spec.ts`). Task 1.1.
2. Replace the robots RegExp with a URL comparison (`scripts/audit-seo.mjs`). Task 1.2.
3. Remove `npx run build` from `.github/workflows/copilot-setup-steps.yml`. Task 1.3.
4. Delete `.github/workflows/deploy-preview.yml`. Task 1.4.
5. `atomic-sha-deploys/tasks.md` no longer names `deploy-preview.yml`; its CI publication items stay under "Deferred until a change adds CI publication" (2026-11-19 rewrite). Task 2.3.

## Remaining

6. Follow-ups 2.1, 2.2, 2.4 and 2.5, with the files and pass criteria named in `tasks.md`:
   - 2.1 `scripts/audit-seo-checks.mjs`, `scripts/audit-seo-checks.test.mjs`, `scripts/audit-seo.mjs`, `package.json` (`test:audit`), `scripts/EGM.md`.
   - 2.2 `.github/workflows/cleanup-preview.yml` comment.
   - 2.4 `infrastructure/README.md` lines 117-119.
   - 2.5 `openspec/changes/atomic-sha-deploys/tasks.md` task 4.1 Files list (`main.tf:331` comment check).
7. Close out with tasks 3.1-3.8. The test plan is task 3.5 (full validate with a served Pagefind index), the workflow check in task 3.6, and `scripts/audit-seo-checks.test.mjs` from task 2.1.
