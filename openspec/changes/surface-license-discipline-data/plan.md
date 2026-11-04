# Agency discipline count implementation plan

Scope approved October 5, 2026: add agency-specific roster counts linking to the personnel discipline section, omit zero roster labels, and show a distinct-record agency total. The separate agency record list remains unspecified and pending. Reuse the current branch and worktree.

- [x] Verify failing tests for agency attribution and roster links.
- [x] In `src/lib/data/agency-detail.ts`, count distinct linked records per person within the agency and count distinct records for the agency total.
- [x] In `AgencyPersonnelList.astro`, append linked counts to existing context lines; add the target `discipline` section ID on personnel profiles.
- [x] On the agency page, show the positive discipline total linking to its personnel roster using existing shared styling.
- [x] Run focused data/UI tests and `npm run validate`; record results and limits.

No schema, routing identity, discipline record fields, or attribution rules change. Tests use rollback-only fixtures for data verification and rendered component fixtures for visible counts.
