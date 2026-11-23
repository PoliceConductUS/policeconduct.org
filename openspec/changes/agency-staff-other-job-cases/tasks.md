## 1. Data

- [ ] 1.1 Add `src/lib/data/staff-other-job-case-sql.js` (exports `staffOtherJobCaseLinkSql(agencyIdExpr)`, no imports) and the other-jobs links query (one row per case/person/case agency link) to `loadAgencyRows` in `src/lib/data/agency-detail.ts`, built from that fragment, with left joins to `personnel`, the case `agency` and its `location_path`; case agency URL from `location_path` + slug; link only when the case agency has an agency page
- [ ] 1.2 Group links into one row per case and order them (filed date newest first, then title) in a pure builder in `agency-civil-case-rows.ts`, with unit tests in `agency-civil-case-rows.test.mjs` added to `test:data` (missing joined rows, `slug`, `title` or `filed_date` throw)
- [ ] 1.3 Make civil-cases page eligibility consider both lists in `agencyTopicWhereSql("civil-cases")` (shared fragment), and build pages 2+ up to the last page of the longer list
- [ ] 1.4 Run the query read-only once for one agency selected by the e2e selection SQL (not committed), with `EXPLAIN (ANALYZE, BUFFERS)` for the agency query, the eligibility query and the sitemap agency query; run each e2e selection query and record counts only; an empty selection stops the work
- [ ] 1.5 Add `max_staff_other_job_case_updated_at` to the agency query in `src/lib/sitemap-lastmod.js` (pass: for one agency from the e2e selection, the read-only lastmod query's `max_staff_other_job_case_updated_at` equals the oracle's max `updated_at` of its other-jobs cases, and only that agency's `canonical_path` key uses it)
- [ ] 1.6 `src/lib/data/agency-civil-case-rows.ts`: `getPersonnelRef` throws (naming the case and the missing field) instead of returning null; remove `isPersonnelRef` (pass: unit test `buildAgencyCivilCaseRows throws when a linked person has no slug` passes)

## 2. Agency profile page

- [ ] 2.1 Add the separate "Cases from staff members' other jobs" block to `[agencySlug]/index.astro` with its own heading, explanation sentence, count and at most 6 rows, hidden at 0, with a "View all" link to `civil-cases/#staff-other-job-cases`; leave the Civil Cases tile and own list unchanged
- [ ] 2.2 Follow DESIGN.md tokens and the existing `recent-list` pattern; no inline CSS; 8th-grade copy

## 3. Agency civil-cases page

- [ ] 3.1 Render the own table under the H2 "Cases tied to this agency's personnel records" and the second section in new `AgencyStaffOtherJobCases.astro` (anchor `#staff-other-job-cases`) with its own table and count, dates through `formatShortDate`; one shared `Pagination` for both lists with `PAGE_SIZE`; a list with rows but none on page N shows its heading and "No more cases in this list."
- [ ] 3.2 Update `civil-cases/index.astro` and `civil-cases/page/[...page].astro` so page N shows page N of each list, params only from `getStaticPaths`, render reloads by params and throws past the last page

## 4. Tests and contracts

- [ ] 4.1 e2e: an agency whose staff have other-job cases shows the section with rows and count matching SQL (oracle uses only `civil_case_personnel` and `agency_personnel` to compute case ids); the own tile count is unchanged; no combined total appears; the heading, explanation and count text contain no verification, accuracy, fault, misconduct or party claim
- [ ] 4.2 e2e: a shared case appears once and names every linked staff member
- [ ] 4.3 e2e: an agency with only other-jobs cases has a civil-cases page that states "0 civil cases tied to this agency's personnel records.", shows no own-cases table, and lists its other-jobs cases
- [ ] 4.4 Update the EGM.md contracts for every changed directory (including `src/EGM.md`, `src/lib/EGM.md`, `src/components/EGM.md`, `src/lib/data/EGM.md`, and `civil-cases/EGM.md`, whose invariant "A person's cases from other agencies are not listed." is replaced) and run the citation check over every EGM.md that cites a changed file
- [ ] 4.5 e2e: the page past the shorter list shows the ended list's heading and "No more cases in this list."; the page past both lists is not built
- [ ] 4.6 Edit `AGENTS.md`, the civil-case Agency bullet under "Data + Routing Conventions": append "These cases may appear only in the separate 'Cases from staff members' other jobs' section, with its own count, never summed." (pass: the bullet and `openspec/specs/civil-case-content` after archive say the same thing)
- [ ] 4.7 Build the affected pages with `npx astro build` and run `npm run validate:no-inline-css` (pass: exit 0, no inline CSS); do not run `npm run build` or `build:site`
- [ ] 4.8 Run `npm run validate` on the final head

## 5. Move the chain into the database (after intake ships the views)

- [ ] 5.1 When intake's view `site_agency_staff_other_civil_case` (intake change `supply-site-display-data`) exists, check that it excludes cases linked to any `agency_personnel` row at the agency itself (if not, report it to intake; do not filter in the site); then replace the `staffOtherJobCaseLinkSql` fragment in `loadAgencyRows`, `agencyTopicWhereSql` and `sitemap-lastmod.js` with reads of the view, delete `src/lib/data/staff-other-job-case-sql.js`, and add the view to `scripts/validate-schema-contract.mjs` (pass: the e2e tests from 4.1-4.5 still pass with the same SQL oracle)
- [ ] 5.2 When intake's view `site_topic_page` exists, check that its civil-cases row for an agency exists when the agency has own or other-jobs cases (if not, report it to intake); then read page 1 eligibility from the view (pass: the 4.3 e2e test still passes)
