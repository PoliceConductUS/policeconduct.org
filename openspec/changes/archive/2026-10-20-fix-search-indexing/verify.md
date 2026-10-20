# Verification: fix-search-indexing

## Scope and implementation

Both spec requirements are implemented: src/lib/structured-data.js emits Organization for the shared publisher and Place for Dataset coverage. Organization @id, nonprofitStatus, other metadata, and United States name remain intact. tests/e2e/dataset-structured-data.spec.ts reads actual rendered home-page JSON-LD and resolves both Dataset references to that organization.

Independent review by the parent agent reported no findings on 2026-10-20.

## Checks

- Preflight: npm run doctor exited 1 for missing Brewfile dependencies; Docker, Node, npm dependencies, OpenSpec and GitHub authentication were available. No automatic dependency installation performed.
- OpenSpec schemas and change status inspected; validate:openspec passed all 23 items before archive.
- TDD red: both focused tests failed on the exact old NonprofitOrganization and Country values.
- TDD green: both focused tests passed after the two type replacements.
- Aggregate non-test gates passed: formatting, ESLint, SQL lint, Astro type checking, shell syntax, schema contract (28 public tables), and OpenSpec. Astro reported 0 errors, 0 warnings, 3 existing hints.
- Both full runs passed 84 redirect tests, 3 media tests, and 10 Lambda tests.
- npm test: 147 browser tests passed, 1 skipped, 2 failed (licensing-authority.spec.ts:17 identity timeout; report-new.spec.ts:313 required-name focus).
- npm run validate: 148 browser tests passed, 1 skipped, 1 failed (the same authority test).
- Those full test runs mistakenly overlapped, sharing test-results paths. Both reported missing Playwright artifact paths. They are not clean aggregate passes.
- Isolated rerun with one worker passed both failing tests (authority 52.5 seconds; report-new 5.9 seconds; 58.9 seconds total). No assertion or product change was required. The scoped change is verified with the full-run collision limitation retained.

## Live evidence and limits

Parent's authenticated Search Console audit on 2026-10-20 found the sitemap successfully read that day with 190,979 discovered URLs. Dataset report showed one valid item, zero invalid items, and the three object-type warnings. One sampled crawled-not-indexed personnel URL was already indexed in URL Inspection. This supports keeping code scope to the reported types; it does not establish that every unindexed URL is eligible or indexed.

Production build/deployment, Google recrawl, and warning clearance are not established by this implementation verification. Parent owns release and live checks. No unrelated routing or indexing policy changes were made.
