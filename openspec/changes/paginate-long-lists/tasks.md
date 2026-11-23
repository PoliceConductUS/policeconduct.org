## 1. Prerequisites

- [ ] 1.1 In a task branch created as a child of the current stack leaf (on 2026-11-22 the leaf is `ddl-openspec`, the PR #58 branch), confirm: `src/lib/alpha-navigation.ts` is absent; `AgencyCivilCasesPage.astro` pages at `PAGE_SIZE`; `src/pages/[category]/counties/page/[...page].astro` has no `paginate(`; the site-decisions removal is committed (`AgencyPersonnelList.astro` does not import `getAssignmentStatus`, and `agency-detail.ts` has no primary-license query); and `surface-license-discipline-data` tasks 4.5 and 4.6 are merged into the stack. Pass: all five hold.
- [ ] 1.2 Confirm the owner's dated approval of this change is recorded in `design.md` Open Questions. Pass: approval line present; otherwise stop.

## 2. Before-measurements

- [ ] 2.1 On a local build of the unchanged branch, record in `verify.md`: build time, peak build memory, `dist` size, Pagefind indexed page count and index size, and the largest roster HTML size. Pass: every value recorded with date and commit.
- [ ] 2.2 Re-measure the design Context table lists with read-only queries against the local database (area civil cases, area report archives, federal lists, personnel topic pages, rosters, agency civil cases, global civil cases) and record them in `verify.md`. Pass: each matches or is below the design's figure, or the difference is reported in `verify.md`.

## 3. Deterministic sorts

- [ ] 3.1 End every paged civil-case `order by` with `c.id` (or the table's primary key) in `src/lib/data/civil-cases.ts`, `src/lib/data/civic-topic-records.ts` and the agency civil-case query in `src/lib/data/agency-detail.ts`, and end the JS comparator in `src/lib/data/agency-civil-case-rows.ts` with `id`. Pass: each paged query's and comparator's last key is the primary key; a unit test that pages a fixture list shows every row appears once.

## 4. Page size and absences

- [ ] 4.1 Remove `CIVIL_CASES_PAGE_SIZE` from `src/lib/data/civil-cases.ts`; use `PAGE_SIZE` from `src/lib/pagination.ts` in `src/pages/civil-cases/index.astro` and `src/pages/civil-cases/page/[...page].astro`. Pass: `grep -rn CIVIL_CASES_PAGE_SIZE src` returns nothing; the build passes.
- [ ] 4.2 From the sitemap of the production release live at build time, list every `/civil-cases/page/{n}/` URL above the new last page and add one `route-absences.json` entry for each (404, no redirect). Pass: `npm run test:redirects` and `scripts/verify-redirect-coverage.mjs` pass.
- [ ] 4.3 Delete every `route-absences.json` entry whose route this change builds again. Pass: no absence entry names a built route.
- [ ] 4.4 Recheck the `/tx/harris-county/houston/harris-co-sheriff-s-office-0a08ad/civil-cases/page/2/` entry against the agency's current case count and any other agency civil-case `/page/{n}/` URL in the production sitemap that the build no longer generates. Pass: every such URL has exactly one correct entry.

## 5. Area civil cases and "Page N"

- [ ] 5.1 In `src/lib/data/civic-topic-records.ts`, drop `limit 200` and cache the loader result per location path for a production build; `getStaticPaths()` uses that cached result. Pass: build log shows one full load per location.
- [ ] 5.2 Give `CivicScopedIndexPage.astro` and `CivicScopedOverviewPage.astro` `currentPage?: number`, defaulting to 1 as `AgencyTopicPage` does; build `pagePath` and the canonical URL from it; add "Page N" to title and breadcrumb for page 2+. `CivicScopedIndexPage` validates `currentPage`, slices `records.rows` with `PAGE_SIZE`, throws past the last page, and passes `{ kind, rows: pageRows, totalCount, currentPage, lastPage, basePath }` to `CivicScopedRowsTable.astro`, which renders the rows and `<Pagination>` and drops its `slice(0, 50)` and the "50 most recent" sentence. Pass: no boolean prop added; no caller outside the three civil-case routes changes; `npm run validate:types` passes.
- [ ] 5.3 Create params-only `page/[...page].astro` routes under `src/pages/[category]/civil-cases/`, `src/pages/[category]/[administrativeArea]/civil-cases/` and `src/pages/[category]/[administrativeArea]/[place]/civil-cases/`, following `src/pages/[category]/counties/page/[...page].astro`. Pass: page 2+ built only for lists over 50 rows; past-last page throws.
- [ ] 5.4 Check that each preview excerpt (personnel profile `src/pages/personnel/[slug]/index.astro`, agency overview `index.astro`) links to the page with the complete list. Pass: each link listed in `verify.md`; any preview without one is reported to the owner, not fixed silently.
- [ ] 5.5 In `src/components/AgencyTopicPage.astro` and `src/components/CivicChildIndexPage.astro`, append "Page {currentPage}" to the `<title>` and the breadcrumb when `currentPage > 1`. Pass: built `/tx/counties/page/2/` and an agency `civil-cases/page/2/` have "Page 2" in title and breadcrumb.

## 6. Global civil cases and news to params-only routes

- [ ] 6.1 Rewrite `src/pages/civil-cases/page/[...page].astro` to the params-only pattern (no `paginate()`): reload the list, slice in the route and throw past the last page, as `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/reports/page/[...page].astro` does. Pass: no `paginate(` in the file; page 2+ self-canonical with "Page N".
- [ ] 6.2 Rewrite `src/pages/news/page/[...page].astro` the same way: reload `loadNewsArticles()`, slice in the route, throw past the last page, keep the "Newer News"/"Older News" links (no `Pagination`). Pass: `grep -rn "paginate(" src/pages` returns nothing.

## 7. Roster row model and roster routes

- [ ] 7.1 Create `src/lib/data/agency-roster.ts` with `buildAgencyRoster(detail)` (display-order `rows` of type `AgencyRosterRow`, `letterPages`) and the JSON entry type from design D4; move row building out of `AgencyPersonnelList.astro` frontmatter; add no status, label fallback or totals. Write `src/lib/data/agency-roster.test.mjs` in this task. Pass: `src/lib/data/agency-roster.test.mjs` passes under `npm run test:data`.
- [ ] 7.2 Change `AgencyPersonnelList.astro` to take `roster: { kind: 'single'; rows; counts } | { kind: 'paged'; rows; counts; currentPage; letterPages; dataPath }`; for `kind: 'paged'` it validates `currentPage`, slices, throws past the last page and renders `Pagination`. Update its header comment. Pass: no boolean prop; `npm run validate:types` passes.
- [ ] 7.3 Update `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/index.astro` and create `personnel/page/[...page].astro` (params-only, enumeration from the cached agency detail and `buildAgencyRoster`, reload by `loadAgencyDetailByRouteParams`, `currentPage` to `AgencyRosterPage`). Pass: page 2+ built only for rosters over 50 rows; unique "Page N" title.

## 8. Roster data endpoint

- [ ] 8.1 Create `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/roster.json.ts` modeled on `src/pages/data-annotations/[...parts]/data.csv.ts`: params-only, only for rosters over 50 rows, fails when the agency is missing or has 50 or fewer rows, not in the sitemap; emits `{ dataVersion, entries }` with `dataVersion` from the same source as the page's `data-data-version`. Pass: build emits one file per roster over 50 rows and none for smaller rosters.
- [ ] 8.2 Each `roster.json` entry's `href` comes from the same `buildAgencyRoster` row as the server row. Pass: a unit test in `agency-roster.test.mjs` checks every entry's `href` equals its row's `href`.

## 9. Roster client script

- [ ] 9.1 Implement the D4 client behavior in `AgencyPersonnelList.astro`: fetch on first filter use (name or "With discipline actions"), keep after first success, loading state, "Try again", input kept while loading, the `dataVersion` mismatch state, 50 per view with "Previous results"/"Next results", summary wording "Showing {a}–{b} of {N} matching entries ({TOTAL} entries on this roster)", A–Z while filtering, dimmed letters, server pager hidden while filtering, letter-group headings kept. Pass: the harness e2e cases for each behavior pass.
- [ ] 9.2 Create `src/components/AgencyRosterRow.astro`; render every server row and one hidden `<template>` row from it; fill clones with `textContent` and `href` only; one filter function over row records. Rebuild the summary from DOM nodes (`<strong>` plus text nodes set with `textContent`), replacing the `innerHTML` save and restore. Pass: no `innerHTML` anywhere in the roster script; the existing small-roster assertion in `agency-discipline.spec.ts` still passes.
- [ ] 9.3 Focus moves to the "Matching personnel" heading (`<h2 tabindex="-1" data-roster-results-heading>`, shared H2 class, rendered only while a filter is active) after Previous, Next or an A–Z jump; one `aria-live="polite"` region only. Pass: e2e keyboard case passes.

## 10. Roster pages leave the search index

- [ ] 10.1 Create `src/components/AgencyRosterPage.astro` (composes `PageShell` with `searchable={false}`) and use it in both roster routes; move the `PageShell` props `AgencyTopicPage` builds into `src/lib/agency-topic-shell.ts` for both to call. Move the body of `CivicAgencyHierarchyPage.astro` into `src/components/CivicAgencyHierarchyContent.astro`, and have `src/pages/federal/[slug]/personnel/index.astro` compose `PageShell` with `searchable={false}` around it. Pass: built roster HTML and `/federal/{slug}/personnel/` HTML have no `data-pagefind-body`; other agency topic pages and other federal pages still have it; `AgencyTopicPage` and `CivicAgencyHierarchyPage` have no new prop.

## 11. EGM contracts

- [ ] 11.1 Update `src/EGM.md`, `src/lib/data/EGM.md` (including the old sort orders and a new entry for `agency-roster.ts`), `src/components/EGM.md` (including new entries for `AgencyRosterRow.astro`, `AgencyRosterPage.astro` and `CivicAgencyHierarchyContent.astro`), `src/pages/civil-cases/EGM.md`, `src/pages/civil-cases/page/EGM.md`, `src/pages/news/EGM.md`, `src/pages/news/page/EGM.md`, `src/pages/federal/[slug]/personnel/EGM.md`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/EGM.md` (also documenting `roster.json.ts`) and the three area civil-case route `EGM.md` files to the new behavior. Pass: no contract states 25 per page, `limit 200`, `slice(0, 50)` or Astro `paginate`.
- [ ] 11.2 Add an `EGM.md` for each new route folder. Pass: each new folder has one.

## 12. DESIGN.md and AGENTS.md

- [ ] 12.1 Add a `Lists` section in `DESIGN.md`'s plain-label style, after the section on components (or at the end if none fits), with the exact text in design D8. Pass: text matches.
- [ ] 12.2 Add the D8 sentence to `AGENTS.md` after the "Pagination URLs use /page/{number}/" bullet. Pass: text matches.

## 13. Tests

- [ ] 13.1 Add `src/lib/data/agency-roster.test.mjs` to the `test:data` script in `package.json`. The test registers the `node:module` `registerHooks` resolver from `scripts/report-detail.test.mjs` (for `#src/*` and `.js`→`.ts`) before importing `agency-roster.ts`. Cases: row order and letter groups, `letterPages`, page counts at 50, 51 and 101 rows, every row on exactly one page, JSON entry shape, each entry's `href` equals its row's `href`. Pass: `npm run test:data` passes.
- [ ] 13.2 Update `tests/e2e/agency-discipline.spec.ts` and add the design "Testing" e2e cases, split into harness cases (in-test fixtures; `resolvePath` maps `AgencyRosterRow.astro`; `roster.json` served with `page.route` after `page.goto` to a test origin) and dev-server cases (targets chosen by read-only query at test time; no hard-coded row IDs). Each case is written in the task it verifies; this task runs the full set. Pass: `npm run test:e2e` passes with no skipped case.

## 14. After-measurements and validation

- [ ] 14.1 Repeat 2.1 on the changed branch and record before/after in `verify.md`, plus the largest `roster.json` raw and compressed size. Pass: every value recorded.
- [ ] 14.2 Run `npm run validate` on the final head. Pass: exit 0, every warning and skip accounted for in `verify.md`.
