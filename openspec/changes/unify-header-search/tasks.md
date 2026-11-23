## 1. Baseline

- [ ] 1.1 On the `ddl-openspec` commit just before this change's first
      implementation commit, run `npm run build:site` and record the Pagefind
      "Indexed N pages" line and the total size of `dist/pagefind`
      (`du -sk dist/pagefind`). Pass: both numbers and the commit SHA are
      written down for `verify.md`.
- [ ] 1.2 Modify `openspec/changes/paginate-long-lists/design.md` D5: add "and
      the federal roster `/federal/{slug}/personnel/` (`CivicAgencyHierarchyPage`),
      which passes `searchable={false}` for its personnel list route". Add a
      task to `openspec/changes/paginate-long-lists/tasks.md` group 10 ("Roster
      pages leave the search index") that names
      `src/pages/federal/[slug]/personnel/index.astro` and
      `src/components/CivicAgencyHierarchyPage.astro`, with the pass line "the
      built `/federal/{slug}/personnel/` pages have no `data-pagefind-body`".
      Then delete the Open Question in this change's `design.md`. Pass:
      `npx openspec validate paginate-long-lists` passes and D5 names every
      roster route (owner Q48). Do not edit roster routes in this change.

## 2. No pages about people in the index

- [ ] 2.1 Modify `src/pages/personnel/index.astro`: pass `searchable={false}`
      to `PageShell` (design D1). Pass: the built `/personnel/` page has
      `data-pagefind-ignore="all"` on `<main>`.
- [ ] 2.2 Modify `src/lib/client/site.js`: delete `getSearchResultCategory` and
      the `result_category` field from masthead `search_result_selected`
      (design D1). Pass: `site.js` has no URL-based classification.

## 3. State filter values on indexed pages

- [ ] 3.1 Create `src/lib/data/search-states.ts` with
      `loadSearchStateNames(locationPathIds: readonly string[]): Promise<string[]>`
      (design D2): one memoized query over `public.location_path_closure`
      joined to `public.location_path`; throws for an unknown id; returns the
      distinct stored `display_name` values of the `level = 'state'` rows.
      Create the unit test `src/lib/data/search-states.test.mjs` and add it to
      the `test:data` script in `package.json`. The test finds its rows by
      exact `location_path.path` queries (a state row, a place under it, a row
      with no state ancestor). The unknown-id case uses an id that a query
      confirms is absent. No hard-coded row IDs. Record the stored `level` of
      each top-level `location_path` row (including DC and the territories) in
      `verify.md`. Pass: `npm run test:data` passes with the four cases.
- [ ] 3.2 Modify `src/layouts/PageShell.astro`: add the optional
      `searchLocationPathIds` prop; when searchable and not empty, render one
      empty `data-pagefind-filter="state:<name>"` element per distinct name
      inside `<main>`. No inline CSS. Pass: `npm run validate:no-inline-css`
      passes.
- [ ] 3.3 Location pages. Modify `src/lib/data/build-payloads.ts`
      (`loadLocationBuildPayloads` returns `entity_id` with the payload),
      `src/lib/data/civic-index.ts` (`CivicIndexModel.locationPathId`) and
      `src/lib/data/civic-scoped-routes.ts` (scoped-route models carry
      `locationPathId`). Modify `src/components/CivicIndexPage.astro`,
      `src/components/CivicScopedIndexPage.astro`,
      `src/components/CivicScopedOverviewPage.astro` and
      `src/components/CivicChildIndexPage.astro` to pass it to `PageShell`.
      Route files: `src/pages/[category]/index.astro`,
      `src/pages/[category]/[administrativeArea]/index.astro`,
      `src/pages/[category]/[administrativeArea]/[place]/index.astro`, the
      `budget`, `civil-cases`, `fatal-force-incidents`, `liability-costs` and
      `outcomes-by-income` `index.astro` routes under `src/pages/[category]/`,
      `src/pages/[category]/[administrativeArea]/` and
      `src/pages/[category]/[administrativeArea]/[place]/`,
      `src/pages/[category]/counties/index.astro`,
      `src/pages/[category]/counties/page/[...page].astro`,
      `src/pages/[category]/[administrativeArea]/places/index.astro`,
      `src/pages/[category]/[administrativeArea]/places/page/[...page].astro`,
      `src/pages/[category]/[administrativeArea]/[place]/agencies/index.astro`
      and
      `src/pages/[category]/[administrativeArea]/[place]/agencies/page/[...page].astro`.
      `src/pages/federal/index.astro` passes nothing. Pass: each built page
      of these routes has one state filter element with the stored state
      name.
- [ ] 3.4 Agency pages. Modify `src/lib/data/agency-detail.ts` (select
      `agency.location_path_id`), `src/components/AgencyTopicPage.astro`
      (`data` type and pass-through), and the routes
      `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`,
      `.../[agencySlug]/civil-cases/index.astro`,
      `.../[agencySlug]/civil-cases/page/[...page].astro`,
      `.../[agencySlug]/reports/index.astro` and
      `.../[agencySlug]/reports/page/[...page].astro` (through
      `AgencyCivilCasesPage.astro` and `AgencyReportsPage.astro`). The roster
      route `.../[agencySlug]/personnel/index.astro` is `paginate-long-lists`
      work and is not edited. Pass: each built agency page and agency topic
      page has the agency's state filter element.
- [ ] 3.5 Report pages. Modify `scripts/refresh-build-projections.mjs` (add the
      report row's `location_path_id` to the report summary payload),
      `ReportSummaryPayload` in `src/lib/data/build-payloads.ts`, and
      `src/pages/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/index.astro`.
      Pass: each built report page has its state filter element.
- [ ] 3.6 Report lists. Modify `src/lib/data/report-archives.ts` (load the
      scope location's `location_path_id` by exact path),
      `src/components/ReportArchivePage.astro` (new `locationPathId` prop), and
      `src/pages/[category]/reports/[...parts].astro`,
      `src/pages/[category]/[administrativeArea]/reports/[...parts].astro`,
      `src/pages/[category]/[administrativeArea]/[place]/reports/[...parts].astro`.
      Pass: each built report list page has its state filter element.
- [ ] 3.7 Licensing-authority pages. Modify `src/lib/data/licensing-authority.ts`
      (add `la.location_path_id` to `authoritySelect`),
      `src/pages/[category]/licensing-authority/index.astro` and
      `src/pages/[category]/licensing-authority/data-annotations/[...parts].astro`.
      Pass: each built licensing-authority page has its state filter element.
- [ ] 3.8 Civil-case pages. Modify `src/lib/data/civil-litigation-detail.ts`:
      add a query that returns the distinct `agency.location_path_id` of every
      agency linked through `civil_case_personnel -> agency_personnel ->
agency`, with no `build_page_payload` join. Modify
      `src/pages/civil-cases/[slug]/index.astro` to pass those ids. Do not use
      `civil_cases.location_path_id`. Pass: a case linked to agencies in two
      states has two state filter elements, and a linked agency with no agency
      page still adds its state.
- [ ] 3.9 Watch pages. Modify `src/components/WatchPage.astro` (new
      `searchLocationPathIds` prop passed through to `PageShell`),
      `src/pages/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/watch/[videoId].astro`
      (the report's `location_path_id`) and
      `src/pages/civil-cases/[slug]/watch/[videoId].astro` (the linked
      agencies' ids, from the 3.8 query). Pass: each built watch page has the
      same state filter elements as its parent record.
- [ ] 3.10 List in `verify.md` every file that renders `PageShell`
      (`grep -rl PageShell src`), with the id it passes or the reason it
      passes none. Pass: the list is complete.
- [ ] 3.11 Add the state check to `scripts/validate-search-filters.mjs`
      (created with the personnel check in 6.3, which `plan.md` Task 2 does
      first). It reads the `path`
      of every `location_path` row with `level = 'state'` once, and fails for
      every indexed page (has `data-pagefind-body`) in `dist/` whose URL
      starts with one of those paths and has no
      `data-pagefind-filter="state:..."` element. It also fails for every
      indexed `dist/civil-cases/<slug>/` page whose case has a linked agency
      under a state row, found by a database query, and has no state element.
      Pass: the check passes on the built site and fails when the prop is
      removed from one caller.

## 4. Masthead state filter

- [ ] 4.1 Modify `src/components/MastheadSearch.astro`: add the state control,
      one wrapper with a visible `<label>` "State" and a native
      `<select name="state">` with the option "All states" (empty value),
      after the input and rendered `hidden` (design D3). Add a
      `[hidden] { display: none; }` rule for the wrapper. Styles in the
      component stylesheet with `DESIGN.md` tokens: same row as the input on
      desktop, below it in the mobile column layout; the results panel stays
      anchored below the whole form row. Change the header comment to name
      the `build:search-index` script. Pass: the no-JS render shows neither
      the label nor the select; the form still submits to `/find-records/`;
      the panel opens below the form at desktop and mobile widths.
- [ ] 4.2 Modify `src/lib/client/site.js`: start loading Pagefind on input
      focus; unhide the state control only after a guarded `filters()` call
      (only if `pagefindApi.filters` is a function) returns at least one
      state; keep it hidden on load failure; fill options sorted with
      `Intl.Collator`; pass `{ filters: { state } }` to `pagefindApi.search`
      when a state is chosen; rerun the current query on change and update
      `data-site-search-status` with the total match count. Change the comment
      that names `npx pagefind --site dist` to name the `build:search-index`
      script. Pass: tests in 6.1.
- [ ] 4.3 Add a safelist entry in `scripts/purge-built-css.mjs` for any class
      `site.js` adds, and run `scripts/validate-critical-css.mjs`. Pass: both
      CSS checks pass and the built select is styled.

## 5. Analytics events

- [ ] 5.1 Modify `src/lib/client/site.js`: add `search_state` (state name, or
      `all`) to masthead `search_results` and `search_result_selected`; add
      `result_count` (total Pagefind matches) to `search_result_selected`;
      send `coverage_search_no_results` once per settled masthead search with
      no results, with `search_source`, `page_path`, `query_length`,
      `result_count: 0` and `search_state` (design D4). Key `completedSearch`
      and `lastReportedTerm` on (term, state). Pass: tests in 6.2.
- [ ] 5.2 Modify `src/pages/find-records/index.astro`: add `result_count` to
      `search_result_selected` and `search_source: "record_finder"` to
      `coverage_search_no_results`. Pass: tests in 6.2.
- [ ] 5.3 Update EGM.md files: `src/lib/client/EGM.md` (including the
      `search_results` de-duplication rule, line 128),
      `src/pages/find-records/EGM.md`, `src/layouts/EGM.md`,
      `src/components/EGM.md`, `src/pages/personnel/EGM.md`,
      `src/pages/civil-cases/[slug]/EGM.md`,
      `src/pages/civil-cases/[slug]/watch/EGM.md`, the report `watch/EGM.md`,
      `src/lib/data/EGM.md`, `scripts/EGM.md`, and the EGM.md beside each
      route file changed in 3.3-3.9. Pass: each documented field and rule
      matches the code.

## 6. Tests

- [ ] 6.1 Modify `tests/e2e/site-search.spec.ts`: build the test index with
      `createIndex` from real built pages. Copy the HTML from `dist/` of the
      pages chosen by exact database path queries in a fixture helper: a Texas
      agency, an agency outside Texas, a federal agency, a civil case linked to
      a Texas agency, and a person profile. Run the tests against the served
      `/pagefind/`. No hard-coded database row IDs. Add tests: (1) Texas
      chosen, the outside agency is absent; (2) "All states", both agencies
      present; (3) Texas chosen, the federal page is absent; (4) Texas chosen,
      the civil-case page is present; (5) the person's name returns no
      results; (6) Texas chosen with a query that matches only outside Texas
      shows the no-results message and status; (7) Tab from the input reaches
      the state select, choosing a state updates `data-site-search-status`;
      (8) with JavaScript disabled the state control is hidden and submit
      lands on `/find-records/`; (9) when the Pagefind module fails to load,
      the state control stays hidden and plain submit still works. Pass: all
      pass against the built and served Pagefind index.
- [ ] 6.2 Modify `tests/e2e/analytics.spec.mjs`: change the masthead fixtures
      from `/personnel/fixture-*` URLs to agency URLs; assert the payloads in
      design D4 for masthead and finder events, with and without a state;
      keep the assertion that no command contains the query text. Delete the
      masthead classification tests (the `for` table at ~318-339 and its test
      body); `result_category` is no longer sent by the masthead (design
      D1/D4). In the selection test (~436-464), remove the
      `result_category: "personnel"` expectation and assert `search_state`.
      Change the stub Pagefind modules to also export `filters`; the client
      guards a missing `filters` (design D3). Add: same term, state changed
      after the search settled: exactly one new `search_results` event with
      the new `search_state`; same term and state again: no new event. Pass:
      all pass.
- [ ] 6.3 Create `scripts/validate-search-filters.mjs`, exposed as
      `npm run validate:search-filters`, and run it in `build:site` right
      after `npm run build:search-index` (`package.json`). It fails when
      `dist/personnel/index.html`, or any HTML file under
      `dist/personnel/<slug>/`, has `data-pagefind-body`.
      `dist/personnel/new/` and `dist/personnel/suggest-edit/` are excluded
      by name. Pass: it passes on the built site and fails if 2.1 is
      reverted.

## 7. Verification

- [ ] 7.1 Repeat 1.1 on this change's head and record both measurements and
      the difference (and the bytes added per indexed page) in `verify.md`.
      Pass: the numbers are recorded.
- [ ] 7.2 Run the full `npm run validate` on the final head and record the
      results in `verify.md` as AGENTS.md requires. Pass: exit 0, no
      unexplained warnings or skips.
