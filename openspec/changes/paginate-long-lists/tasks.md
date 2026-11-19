## 1. Prerequisites

- [ ] 1.1 Confirm `afk-2026-11-17` contains the `ddl-openspec` sync (`b097b2f` or later) and that `src/lib/alpha-navigation.ts` is absent, `AgencyCivilCasesPage.astro` pages at `PAGE_SIZE`, and `src/pages/[category]/counties/page/[...page].astro` is params-only. Pass: all three hold; otherwise stop and report.
- [ ] 1.2 Confirm the owner's dated approval of this change is recorded in `design.md` Open Questions. Pass: approval line present; otherwise stop.

## 2. Before-measurements

- [ ] 2.1 On a local build of the unchanged branch, record in `verify.md`: build time, peak build memory, `dist` size, Pagefind indexed page count and index size, and the largest roster HTML size. Pass: every value recorded with date and commit.
- [ ] 2.2 With read-only queries against the local database, record in `verify.md` the maximum row count of every list in the design Context table (area civil cases after the sync's scope rule, area report archives, federal lists, personnel topic pages, fatal-force incident lists, rosters, global civil cases). Pass: each list has a dated maximum and its location.
- [ ] 2.3 For each list measured above 50 rows that `design.md` D2 does not already name, stop and report it with its count before writing code for it; add it to D2, `proposal.md` Impact and this file once the owner agrees. Pass: no list over 50 rows is left unlisted.

## 3. Deterministic sorts

- [ ] 3.1 End every paged civil-case `order by` with `c.id` (or the table's primary key): `src/lib/data/civil-cases.ts`, `src/lib/data/civic-topic-records.ts`, and the agency civil-case query in `src/lib/data/agency-detail.ts`. Pass: each paged query's last sort key is the primary key.

## 4. Page size and absences

- [ ] 4.1 Remove `CIVIL_CASES_PAGE_SIZE` from `src/lib/data/civil-cases.ts`; use `PAGE_SIZE` from `src/lib/pagination.ts` in `src/pages/civil-cases/index.astro` and its paged route. Pass: `grep -rn CIVIL_CASES_PAGE_SIZE src` returns nothing.
- [ ] 4.2 From the sitemap of the production release live at build time, list every `/civil-cases/page/{n}/` URL above the new last page and add one `route-absences.json` entry for each (404, no redirect). Pass: `npm run test:redirects` and `scripts/verify-redirect-coverage.mjs` pass.
- [ ] 4.3 Delete every `route-absences.json` entry whose route this change builds again. Pass: no absence entry names a built route.
- [ ] 4.4 Recheck the `/tx/harris-county/houston/harris-co-sheriff-s-office-0a08ad/civil-cases/page/2/` entry against the agency's current case count and any other agency civil-case `/page/{n}/` URL in the production sitemap that the build no longer generates. Pass: every such URL has exactly one correct entry.

## 5. Area civil cases

- [ ] 5.1 In `src/lib/data/civic-topic-records.ts`, drop `limit 200`, add a count-only query for `getStaticPaths()`, and cache the loader result per location path for a production build. Pass: unit or build log shows one full load per location.
- [ ] 5.2 Give `CivicScopedIndexPage.astro` and `CivicScopedOverviewPage.astro` a required `currentPage: number` (1 for every existing caller), build `pagePath` and the canonical URL from it, add "Page N" to title and breadcrumb for page 2+, and pass sliced rows to `CivicScopedRowsTable.astro`; drop its `slice(0, 50)` and the "50 most recent" note. Pass: no boolean prop added; `npm run validate:types` passes.
- [ ] 5.3 Create params-only `page/[...page].astro` routes under `src/pages/[category]/civil-cases/`, `src/pages/[category]/[administrativeArea]/civil-cases/` and `src/pages/[category]/[administrativeArea]/[place]/civil-cases/`, following `src/pages/[category]/counties/page/[...page].astro`. Pass: page 2+ built only for lists over 50 rows; past-last page throws.
- [ ] 5.4 Check that each preview excerpt (personnel profile `src/pages/personnel/[slug]/index.astro`, agency overview `index.astro`) links to the page with the complete list. Pass: each link listed in `verify.md`; any preview without one is reported to the owner, not fixed silently.

## 6. Global civil cases and news to params-only routes

- [ ] 6.1 Rewrite `src/pages/civil-cases/page/[...page].astro` to the params-only pattern (no `paginate()`), reloading the list and passing `currentPage`. Pass: no `paginate(` in the file; page 2+ self-canonical with "Page N".
- [ ] 6.2 Rewrite `src/pages/news/page/[...page].astro` the same way. Pass: `grep -rn "paginate(" src/pages` returns nothing.

## 7. Roster row model and roster routes

- [ ] 7.1 Create `src/lib/data/agency-roster.ts` with `buildAgencyRoster(detail)` (display-order rows, whole-roster totals, `letterPages`) and the JSON entry type from design D4; move row building out of `AgencyPersonnelList.astro` frontmatter. Pass: unit tests in 13.1 pass.
- [ ] 7.2 Change `AgencyPersonnelList.astro` to take `roster: { kind: 'single'; … } | { kind: 'paged'; … }` and update its header comment. Pass: no boolean prop; `npm run validate:types` passes.
- [ ] 7.3 Update `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/index.astro` and create `personnel/page/[...page].astro` (params-only, count-only enumeration, reload by `loadAgencyDetailByRouteParams`, `currentPage` to `AgencyTopicPage`). Pass: page 2+ built only for rosters over 50 rows; unique "Page N" title.

## 8. Roster data endpoint

- [ ] 8.1 Create `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/roster.json.ts` modeled on `src/pages/data-annotations/[...parts]/data.csv.ts`: params-only, only for rosters over 50 rows, fails when the agency is missing or has 50 or fewer rows, not in the sitemap. Pass: build emits one file per roster over 50 rows and none for smaller rosters.
- [ ] 8.2 Under `NO_PERSONNEL`, build the data file exactly when its roster page is built, with `href` following the roster page's link rule. Pass: test in 13.2 passes.

## 9. Roster client script

- [ ] 9.1 Implement the D4 client behavior in `AgencyPersonnelList.astro`: fetch on first filter use, keep after first success, loading state, "Try again", input kept while loading, 50 per view with "Previous results"/"Next results", existing summary wording "Showing {a}–{b} of {N} matching people ({TOTAL} on this roster)", A–Z while filtering, dimmed letters, server pager hidden while filtering, letter-group headings kept. Pass: e2e cases in 13.2 pass.
- [ ] 9.2 Render one hidden `<template>` row from the same Astro partial as server rows; fill clones with `textContent` and `href` only; one filter function over row records. Pass: no `innerHTML` in the roster script.
- [ ] 9.3 Focus moves to the results heading after Previous, Next or an A–Z jump; one `aria-live="polite"` region only. Pass: e2e keyboard case passes.

## 10. Roster pages leave the search index

- [ ] 10.1 Render every roster page (base and `/page/{n}/`) with `PageShell`'s `searchable` setting off, per design D5 (or the alternative the owner picks in Open Questions); other agency topics unchanged. Pass: built roster HTML has no `data-pagefind-body`; other agency topic pages still have it.

## 11. EGM contracts

- [ ] 11.1 Update `src/EGM.md`, `src/lib/data/EGM.md`, `src/components/EGM.md`, `src/pages/civil-cases/EGM.md`, `src/pages/civil-cases/page/EGM.md`, `src/pages/news/page/EGM.md`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/EGM.md` and the three area civil-case route `EGM.md` files to the new behavior. Pass: no contract states 25 per page, `limit 200`, `slice(0, 50)` or `paginate`.
- [ ] 11.2 Add an `EGM.md` for each new route folder and for the roster data endpoint. Pass: each new folder has one.

## 12. DESIGN.md and AGENTS.md

- [ ] 12.1 Add the `## Lists` section to `DESIGN.md` with the exact text in design D8. Pass: text matches.
- [ ] 12.2 Add the D8 sentence to `AGENTS.md` after the "Pagination URLs use /page/{number}/" bullet. Pass: text matches.

## 13. Tests

- [ ] 13.1 Create `src/lib/data/agency-roster.test.mjs` and add it to the `test:data` script in `package.json`: row order and letter groups, `letterPages`, page counts at 50, 51 and 101 rows, union of pages equals the list with no duplicates (including ties), JSON entry shape. Pass: `npm run test:data` passes.
- [ ] 13.2 Update `tests/e2e/agency-discipline.spec.ts` and add e2e cases from design "Testing" with fixtures generated in the test (no shared database rows, no hard-coded row IDs). Pass: `npm run test:e2e` passes with no skipped case.

## 14. After-measurements and validation

- [ ] 14.1 Repeat 2.1 on the changed branch and record before/after in `verify.md`, plus the largest `roster.json` raw and compressed size. Pass: every value recorded.
- [ ] 14.2 Run `npm run validate` on the final head. Pass: exit 0, every warning and skip accounted for in `verify.md`.
