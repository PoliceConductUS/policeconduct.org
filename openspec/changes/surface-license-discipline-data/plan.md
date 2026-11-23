# Task 6.2a slice: agency discipline counts implementation plan

Scope approved October 5, 2026: add agency-specific roster counts linking to the personnel discipline section, omit zero roster labels, and show a distinct-record agency total. The separate agency record list is deferred to a separate change.

- [x] Verify failing tests for agency attribution and roster links.
- [x] In `src/lib/data/agency-detail.ts`, count distinct linked records per person within the agency and count distinct records for the agency total.
- [x] In `AgencyPersonnelList.astro`, append linked counts to existing context lines; add the target `discipline` section ID on personnel profiles.
- [x] On the agency page, show the positive discipline total linking to its personnel roster using existing shared styling.
- [x] Run focused data/UI tests and `npm run validate`; record results and limits.

No schema, routing identity, discipline record fields, or attribution rules change. Tests use rollback-only fixtures for data verification and rendered component fixtures for visible counts.

Superseded: owner decision Q29 changed the roster count to any source; see task 4.6 below.

## Review round 1 follow-up work

These steps come from the owner decisions of 2026-11-18/19. Each matches a task in `tasks.md`, which holds the file paths and pass criteria.

- [ ] Task 4.2: show license values as stored (no trimming, no `?? ""` fallbacks); id tie-breakers; throw on an unparseable `action_date`.
- [x] Task 4.3a: the site regexes and the "Adverse action" flag are deleted (site-decisions code change).
- [ ] Task 4.3b (Phase 2, blocked on intake `supply-site-display-data` tasks 3.1-3.3): read the action type through `license_action.license_action_type_id`; show its name and category under "License Action"; emphasize the `discipline` category.
- [ ] Task 4.5 / 6.1: load each roster row's license from its own `agency_personnel.license_id`; show none when it is null; fail on a dangling link.
- [ ] Task 4.6: render the roster label from the any-source count the filter reads; drop the link-based roster count; fail on a roster row with no `personnel` row; update `tests/e2e/agency-discipline.spec.ts` and `tests/e2e/personnel-post-data.spec.ts`.
- [ ] Task 4.7 (Phase 2, blocked on intake `supply-site-display-data` task 6.3a): read both discipline counts from `site_personnel_count` and `site_agency_count`; delete the loader count queries.
- [ ] Task 4.8: agency total label reads "tied to jobs at this agency".
- [ ] Task 5.5a: neutral license status pill; green moves to the unused `.personnel-status-pill--active` modifier; add the rule to `DESIGN.md`.
- [ ] Task 5.5b (Phase 2, blocked on an intake fact not yet proposed): apply the active modifier from intake data.
- [ ] Task 7.4: add `tests/e2e/personnel-licensing.spec.ts`.
- [ ] Tasks 7.2 and 7.3: build, check subjects chosen by query, run `npm run audit:a11y`, and record the evidence in `verify.md`.
