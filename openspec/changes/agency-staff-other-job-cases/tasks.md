## 1. Data

- [ ] 1.1 Add the other-jobs links query (one row per case/person/case agency link) to `loadAgencyRows` in `src/lib/data/agency-detail.ts`, built from the shared `staffOtherJobCaseLinkSql` fragment, with left joins to `personnel`, the case `agency` and its `location_path`; case agency URL from `location_path` + slug; link only when the case agency has an agency page; each person's assignments at this agency returned for `getAssignmentStatus`
- [ ] 1.2 Group links into one row per case and order them in a pure builder in `agency-civil-case-rows.ts`, with unit tests in `agency-civil-case-rows.test.mjs` added to `test:data` (status current/former/unknown from `getAssignmentStatus`; missing joined rows, `slug`, `title` or `filed_date` throw)
- [ ] 1.3 Make civil-cases page eligibility and page counts consider both lists in `loadAgencyLocationStaticPathsForTopic("civil-cases")` and the page routes, using the same SQL fragment as the loader
- [ ] 1.4 Run the query read-only once for one agency selected by the e2e selection SQL (not committed), with `EXPLAIN (ANALYZE, BUFFERS)`; run each e2e selection query and record counts only; an empty selection stops the work
- [ ] 1.5 Include other-jobs cases in the agency lastmod in `src/lib/sitemap-lastmod.js` (pass: an other-jobs case's `civil_cases.updated_at` moves the agency profile and civil-cases page lastmod)

## 2. Agency profile page

- [ ] 2.1 Add the separate "Cases from staff members' other jobs" block to `[agencySlug]/index.astro` with its own heading, explanation sentence, count and at most 6 rows, hidden at 0, with a "View all" link to `civil-cases/#staff-other-job-cases`; leave the Civil Cases tile and own list unchanged
- [ ] 2.2 Follow DESIGN.md tokens and the existing `recent-list` pattern; no inline CSS; 8th-grade copy

## 3. Agency civil-cases page

- [ ] 3.1 Render the own table under the H2 "Cases tied to this agency's personnel records" and the second section in new `AgencyStaffOtherJobCases.astro` (anchor `#staff-other-job-cases`) with its own table and count; one shared `Pagination` for both lists; a list with rows but none on page N shows its heading and "No more cases in this list."; move the date formatter to `src/lib/format.js` as `formatCivilCaseDate`
- [ ] 3.2 Update `civil-cases/index.astro` and `civil-cases/page/[...page].astro` so page N shows page N of each list, params only from `getStaticPaths`, render reloads by params and throws past the last page

## 4. Tests and contracts

- [ ] 4.1 e2e: an agency whose staff have other-job cases shows the section with rows and count matching SQL (oracle uses only `civil_case_personnel` and `agency_personnel`); the own tile count is unchanged; no combined total appears; the heading, explanation and count text contain no verification, accuracy, fault, misconduct or party claim
- [ ] 4.2 e2e: a shared case appears once and names every linked staff member; no row containing "(current staff)" follows a row without it
- [ ] 4.3 e2e: an agency with only other-jobs cases has a civil-cases page that states "0 civil cases tied to this agency's personnel records.", shows no own-cases table, and lists its other-jobs cases
- [ ] 4.4 Update the EGM.md contracts for every changed directory (including `src/EGM.md`, `src/components/EGM.md`, `src/lib/data/EGM.md`, and `civil-cases/EGM.md`, whose invariant "A person's cases from other agencies are not listed." is replaced) and run the citation check over every EGM.md that cites a changed file
- [ ] 4.5 Run `npm run validate` on the final head
- [ ] 4.6 e2e: a page past both lists is not built
- [ ] 4.7 Edit `AGENTS.md`, the civil-case Agency bullet under "Data + Routing Conventions": append "These cases may appear only in the separate 'Cases from staff members' other jobs' section, with its own count, never summed." (pass: the bullet and `openspec/specs/civil-case-content` after archive say the same thing)
- [ ] 4.8 Build the affected pages with `npx astro build` and run `npm run validate:no-inline-css` (pass: exit 0, no inline CSS); do not run `npm run build` or `build:site`
