# Task 6.2a slice: agency discipline counts implementation plan

Scope approved October 5, 2026: add agency-specific roster counts linking to the personnel discipline section, omit zero roster labels, and show a distinct-record agency total. The separate agency record list is deferred to a separate change.

- [x] Verify failing tests for agency attribution and roster links.
- [x] In `src/lib/data/agency-detail.ts`, count distinct linked records per person within the agency and count distinct records for the agency total.
- [x] In `AgencyPersonnelList.astro`, append linked counts to existing context lines; add the target `discipline` section ID on personnel profiles.
- [x] On the agency page, show the positive discipline total linking to its personnel roster using existing shared styling.
- [x] Run focused data/UI tests and `npm run validate`; record results and limits.

No schema, routing identity, discipline record fields, or attribution rules change. Tests use rollback-only fixtures for data verification and rendered component fixtures for visible counts.

## Review round 1 follow-up work

These steps come from the owner decisions of 2026-11-18/19. Each matches a task in `tasks.md`, which holds the file paths and pass criteria.

- [ ] Task 4.3: after the intake change adds the explicit license-action table, read emphasis from it, fail the build on an unclassified value, label emphasized entries "License Action", and delete the site regexes.
- [ ] Task 4.5 / 6.1: load each roster row's license from its own `agency_personnel.license_id`; show none when it is null.
- [ ] Task 4.6: count roster discipline by `discipline.personnel_id` (any source); keep the agency total on explicit links; update `tests/e2e/agency-discipline.spec.ts`.
- [ ] Task 5.5: green status pill only for "Active", neutral for every other status; add the rule to `DESIGN.md`.
- [ ] Task 7.4: add the licensing unit and fixture tests.
- [ ] Tasks 7.2 and 7.3: build, check subjects chosen by query, run `npm run audit:a11y`, and record the evidence in `verify.md`.
