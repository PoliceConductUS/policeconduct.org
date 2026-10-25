# Dataset Search Types Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Parent dispatches implementation and independent review.

**Goal:** Correct the three Dataset object-type warnings.

**Architecture:** Preserve shared organization @id references and metadata. Change only the two object type values.

**Tech Stack:** Astro, JavaScript, Playwright.

**Spec:** specs/dataset-search-types/spec.md and design.md.

## Global Constraints

Use the authorized existing worktree. No database, route, dependency, or visible copy changes.

## Review Focus

Resolve creator and publisher against the actual emitted page entries; preserve nonprofitStatus and United States geography. Google acceptance remains a live verification step.

### Task 1: Correct supported types

Files: src/lib/structured-data.js; tests/e2e/dataset-structured-data.spec.ts.

- [x] Add two home-page regression tests asserting organization reference resolution/type/nonprofitStatus and spatialCoverage Place/United States.
- [x] Run npm run test:e2e -- tests/e2e/dataset-structured-data.spec.ts and observe failures for NonprofitOrganization and Country.
- [x] Replace publisher type with Organization and coverage type with Place; update the publisher doc comment.
- [x] Run focused tests, npm test, and npm run validate. Report any baseline or environment failures.
- [x] Commit scoped edits using a Conventional Commit. Parent handles independent review, live verification, and release.
