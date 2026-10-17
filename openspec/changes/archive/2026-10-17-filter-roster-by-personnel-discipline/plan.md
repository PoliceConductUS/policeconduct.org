# Personnel discipline filter implementation plan

**Goal:** Find roster personnel with any discipline record.

**Architecture:** Add a grouped direct-person count in agency-detail.ts and a separate required personnelDisciplineCount employee field. The roster uses it only for filtering; existing agency-linked counts retain their meaning.

**Tech Stack:** Astro, PostgreSQL, TypeScript, Playwright.

## Task 1: Loader and roster filter

1. Extend rollback-only real-loader fixtures to assert person counts include unlinked records independently of agency counts. Extend browser fixtures with different direct and agency-linked counts, including a person with zero agency-linked records. Run to demonstrate failures.
2. Implement grouped direct counts and filter wiring; update all affected fixtures. Run focused tests.
3. Change current-agency-and-discipline-filter/specs/agency-browsing/spec.md checkbox requirement to direct-person semantics with reference to this approved superseding change.
4. Run aggregate validation and inspect Minneapolis via local server. Review diff before completion. No commit, push or deployment is requested.
