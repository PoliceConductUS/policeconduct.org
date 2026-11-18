## 1. Data

- [ ] 1.1 Add the other-jobs query to `src/lib/data/agency-detail.ts` (distinct cases, people grouped per case, case agency URL from `location_path` + slug, link only when the case agency has an agency page, current/former from `currentAssignmentSql`)
- [ ] 1.2 Build ordered other-jobs rows (current-staff rows first, then `filed_date desc, title asc`) next to `buildAgencyCivilCaseRows`
- [ ] 1.3 Make civil-cases page eligibility and page counts consider both lists in `loadAgencyLocationStaticPathsForTopic("civil-cases")` and the page routes
- [ ] 1.4 Write a read-only SQL check that, for sample agencies, matches the loader's other-jobs case ids and confirms no case also tied to the agency appears

## 2. Agency profile page

- [ ] 2.1 Add the separate "Cases from staff members' other jobs" block to `[agencySlug]/index.astro` with its own heading, explanation sentence, count and recent rows, linking to the civil-cases page; leave the Civil Cases tile and own list unchanged
- [ ] 2.2 Follow DESIGN.md tokens and existing table patterns; no inline CSS; 8th-grade copy

## 3. Agency civil-cases page

- [ ] 3.1 Render the second section in `AgencyCivilCasesPage.astro` (or a sibling component) with its own table, count and pagination
- [ ] 3.2 Update `civil-cases/index.astro` and `civil-cases/page/[...page].astro` so page N shows page N of each list, params only from `getStaticPaths`, render reloads by params and throws past the last page

## 4. Tests and contracts

- [ ] 4.1 e2e: an agency whose staff have other-job cases shows the section with rows and count matching SQL; the own tile count is unchanged; no combined total appears
- [ ] 4.2 e2e: a shared case appears once and names every linked staff member; current-staff rows come first
- [ ] 4.3 e2e: an agency with only other-jobs cases has a civil-cases page with the own-cases empty state
- [ ] 4.4 Update the EGM.md contracts for every changed directory and run the citation check
- [ ] 4.5 Run `npm run validate` on the final head
