## 1. Baseline

- [ ] 1.1 On the parent branch head, run `npm run build:site` and record the
      Pagefind "Indexed N pages" line and the total size of `dist/pagefind`
      (`du -sk dist/pagefind`). Pass: both numbers and the commit SHA are
      written down for `verify.md`.
- [ ] 1.2 Read `openspec/changes/paginate-long-lists/design.md` and confirm it
      removes every roster page from the index, including `/page/{n}/` and
      `/federal/{slug}/personnel/` (owner Q48). Pass: confirmed, or the gap is
      reported to the owner. Do not edit roster routes in this change.

## 2. No pages about people in the index

- [ ] 2.1 Modify `src/pages/personnel/index.astro`: pass `searchable={false}`
      to `PageShell` (design D1). Pass: the built `/personnel/` page has
      `data-pagefind-ignore="all"` on `<main>`.
- [ ] 2.2 Modify `src/lib/client/site.js`: remove the `personnel` branch from
      `getSearchResultCategory` (design D1). Pass: no code path returns
      `personnel`.

## 3. State filter values on indexed pages

- [ ] 3.1 Create `src/lib/data/search-states.ts` with
      `loadSearchStateNames(locationPathIds)` (design D2): one memoized
      recursive query over `public.location_path`; throws for an unknown id;
      returns the `display_name` of the `level = 'state'` row. Pass: unit
      test covers a state row, a place under a state, an id with no state
      ancestor, and an unknown id (throws).
- [ ] 3.2 Modify `src/layouts/PageShell.astro`: add the optional
      `searchLocationPathIds` prop; when searchable and not empty, render one
      empty `data-pagefind-filter="state:<name>"` element per distinct name
      inside `<main>`. No inline CSS. Pass: `npm run validate:no-inline-css`
      passes.
- [ ] 3.3 Pass `searchLocationPathIds` from every searchable `PageShell` caller
      whose record has a `location_path_id` (design D2): state, area and place
      pages (`CivicIndexPage`, `CivicScopedOverviewPage`,
      `CivicChildIndexPage` callers), the agency page
      `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`,
      `AgencyTopicPage.astro`, report pages
      `src/pages/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/index.astro`,
      `ReportArchivePage.astro`, `WatchPage.astro` if its record has a
      location, and `src/pages/[category]/licensing-authority/index.astro`.
      Read each of the 60 `PageShell` callers and list in `verify.md` which
      pass ids and why the others do not. Pass: the list is complete.
- [ ] 3.4 Modify `src/pages/civil-cases/[slug]/index.astro` (and its loader in
      `src/lib/data/civil-litigation-detail.ts` if it does not already load
      them) to pass the `location_path_id` of every agency linked through
      `civil_case_personnel -> agency_personnel -> agency`. Do not use
      `civil_cases.location_path_id`. Pass: a case linked to agencies in two
      states has two state filter elements.
- [ ] 3.5 Add a check script under `scripts/` that reads the built `dist/`
      and fails when an indexed page (has `data-pagefind-body`) under a state
      URL has no state filter element. Wire it into the build check chain in
      `package.json`. Pass: the check passes on the built site and fails when
      the prop is removed from one caller.

## 4. Masthead state filter

- [ ] 4.1 Modify `src/components/MastheadSearch.astro`: add a hidden native
      `<select name="state">` after the input with a visible `<label>`
      "State" and the option "All states" (empty value) (design D3). Styles in
      the component stylesheet with `DESIGN.md` tokens, mobile column layout
      included. Change the header comment to name the `build:search-index`
      script. Pass: no-JS render shows no select; the form still submits to
      `/find-records/`.
- [ ] 4.2 Modify `src/lib/client/site.js`: unhide the select on enhance; fill
      options from `pagefindApi.filters()` sorted with `Intl.Collator`; start
      loading Pagefind on select focus; pass `{ filters: { state } }` to
      `pagefindApi.search` when a state is chosen; rerun the current query on
      change and update `data-site-search-status`. Change the comment that
      names `npx pagefind --site dist` to name the `build:search-index`
      script. Pass: tests in 6.1.
- [ ] 4.3 Add a safelist entry in `scripts/purge-built-css.mjs` for any class
      `site.js` adds, and run `scripts/validate-critical-css.mjs`. Pass: both
      CSS checks pass and the built select is styled.

## 5. Analytics events

- [ ] 5.1 Modify `src/lib/client/site.js`: add `search_state` (state name, or
      `all`) to masthead `search_results` and `search_result_selected`; add
      `result_count` to `search_result_selected`; send
      `coverage_search_no_results` once per settled masthead search with no
      results, with `search_source`, `page_path`, `query_length`,
      `result_count: 0` and `search_state` (design D4). Pass: tests in 6.2.
- [ ] 5.2 Modify `src/pages/find-records/index.astro`: add `result_count` to
      `search_result_selected` and `search_source: "record_finder"` to
      `coverage_search_no_results`. Pass: tests in 6.2.
- [ ] 5.3 Update `src/lib/client/EGM.md` and `src/pages/find-records/EGM.md`
      to match the new events. Pass: each documented field matches the code.

## 6. Tests

- [ ] 6.1 Modify `tests/e2e/site-search.spec.ts`: extend the `createIndex`
      fixture to a multi-page index with a Texas agency page, an agency page
      outside Texas, a federal agency page (no state), a civil-case page with
      a Texas filter value, and a person profile page with a fixture person's
      name. No hard-coded database row IDs. Add tests: (1) Texas chosen, the
      outside agency is absent; (2) "All states", both agencies present; (3)
      Texas chosen, the federal page is absent; (4) Texas chosen, the
      civil-case page is present; (5) the person's name returns no results;
      (6) Texas chosen with a query that matches only outside Texas shows the
      no-results message and status; (7) Tab from the input reaches the state
      select, choosing a state updates `data-site-search-status`; (8) with
      JavaScript disabled the select is hidden and submit lands on
      `/find-records/`. Pass: all pass against the built and served Pagefind
      index.
- [ ] 6.2 Modify `tests/e2e/analytics.spec.mjs`: change the masthead fixtures
      from `/personnel/fixture-*` URLs to agency URLs; assert the payloads in
      design D4 for masthead and finder events, with and without a state;
      keep the assertion that no command contains the query text. Pass: all
      pass.
- [ ] 6.3 Extend the check script from 3.5: fail when any built page under
      `dist/personnel/` has `data-pagefind-body`, and when the
      `build:search-index` output lists a `/personnel/` URL. Pass: it passes
      on the built site and fails if 2.1 is reverted.

## 7. Verification

- [ ] 7.1 Repeat 1.1 on this change's head. Pass: the size of `dist/pagefind`
      is no larger than the baseline; if it is larger, stop and report to the
      owner.
- [ ] 7.2 Run the full `npm run validate` on the final head and record the
      results in `verify.md` as AGENTS.md requires. Pass: exit 0, no
      unexplained warnings or skips.
