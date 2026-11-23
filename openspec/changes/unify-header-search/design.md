## Context

The masthead search (`src/components/MastheadSearch.astro`, enhanced by
`src/lib/client/site.js`) is a `role="search"` GET form that submits to
`/find-records/`. With JavaScript, it lazily loads the Pagefind index built by
the `build:search-index` script (`npx pagefind --site dist`) and shows up to 8
results (`MAX_SEARCH_RESULTS`). It calls `pagefindApi.search(term)` with no
filters.

`PageShell` (`src/layouts/PageShell.astro`) marks `<main>` with
`data-pagefind-body` unless a page passes `searchable={false}`. Person profiles
(`src/pages/personnel/[slug]/index.astro`) and their topic pages
(`src/pages/personnel/[slug]/[topic]/index.astro`) already pass
`searchable={false}`. `/personnel/` (`src/pages/personnel/index.astro`) does
not, so it is indexed today. Roster pages are indexed through
`AgencyTopicPage` and `CivicAgencyHierarchyPage`.

`/find-records/` runs its own finder over `/find-records/data.json`. It sends
`search_results` and `search_result_selected` with
`search_source: "record_finder"`, and `coverage_search_no_results` without
`search_source`. The masthead sends `search_results` and
`search_result_selected` with `search_source: "masthead"`. No event carries
the query text, and the e2e tests assert that.

The owner's answers (Q44-Q47) are in `brainstorm.md`.

## Goals / Non-Goals

**Goals:**

- No page about a person is in the search index.
- The masthead search has one "State" filter. "All states" shows everything;
  a chosen state shows only pages of that state.
- Every search event carries the result count, and every masthead event
  carries the chosen state. No event carries the query text.

**Non-Goals:**

- Folding, retiring or changing `/find-records/` beyond its analytics events
  (Q44).
- Hiding names inside civil-case or report pages (Q45).
- Roster pages, including `/page/{n}/` and `/federal/{slug}/personnel/`. They
  leave the index in `paginate-long-lists` (owner Q48;
  [`paginate-long-lists/design.md`](../paginate-long-lists/design.md), D5).
- Place or agency filters, or a page-type filter.
- Custom ranking or `data-pagefind-weight`.
- Remembering the chosen state (no URL parameter, no `localStorage`).
- Registering new GA custom dimensions. The existing search parameters are not
  registered in `config/analytics.json`; this change adds none.

## Decisions

### D1. Remove `/personnel/` from the index

`src/pages/personnel/index.astro` passes `searchable={false}` to `PageShell`,
like the profile pages. `/personnel/new/` and `/personnel/suggest-edit/` are
forms, not pages about a person, and are unchanged.

`getSearchResultCategory` in `site.js` classifies results with URL rules and
regular expressions. AGENTS.md ("The Site Is A View Of The Database") forbids
that, and the owner's 2026-11-22 answer removes such rules now. Delete the
function. Masthead `search_result_selected` no longer sends `result_category`.
If a database column later holds a page category, it can come back through
`data-pagefind-meta`. The finder's `result_category` is the group of its own
data file (`src/pages/find-records/index.astro`), not a URL rule, and stays.

### D2. Where a page's state comes from

A page's state filter value is the `display_name` of the `location_path` row
with `level = 'state'` that is the page record's own `location_path` row or
one of its ancestors (through `parent_location_path_id`). The value never
comes from parsing the URL, the breadcrumbs, or `build_page_payload.path`
(AGENTS.md, Data + Routing Conventions).

- **Loader:** a new `src/lib/data/search-states.ts` exports
  `loadSearchStateNames(locationPathIds: readonly string[]): Promise<string[]>`.
  It returns the distinct `display_name` values, in stored form, of the
  `location_path` rows with `level = 'state'` that are an ancestor of, or the
  same row as, each given id. It reads `public.location_path_closure` (the
  build projection written by `scripts/refresh-build-projections.mjs` from
  `parent_location_path_id`, already read by `civic-topic-records.ts`) joined
  to `public.location_path`. It loads the whole id-to-state map once per build
  and memoizes it. An id that is not in `public.location_path` throws. An id
  with no `state` ancestor adds no value.
- **PageShell:** a new optional prop `searchLocationPathIds` (a list of
  `location_path_id` values). When the page is searchable and the list is not
  empty, `PageShell` loads the state names and renders one empty element per
  distinct name inside `<main>`, with `data-pagefind-filter="state:<name>"`.
  It renders no visible text and no inline CSS.
- **Which pages pass it**, with the id source for each caller family:
  - Location pages (state, administrative-area, place; `CivicIndexPage`,
    `CivicScopedOverviewPage` through `CivicScopedIndexPage`, and
    `CivicChildIndexPage` callers): the `build_page_payload.entity_id` of the
    location row. `loadLocationBuildPayloads`
    (`src/lib/data/build-payloads.ts`) returns it with the payload.
    `CivicIndexModel` (`src/lib/data/civic-index.ts`) and the scoped-route
    models (`src/lib/data/civic-scoped-routes.ts`) carry it as
    `locationPathId`.
  - Agency page and agency topic pages: `agency.location_path_id`, added to
    the agency detail select in `src/lib/data/agency-detail.ts` and to
    `AgencyTopicPage`'s `data` type.
  - Report pages and report watch pages: the report row's `location_path_id`,
    added to the report summary payload in
    `scripts/refresh-build-projections.mjs` and to `ReportSummaryPayload`
    (`build-payloads.ts`).
  - Report lists (`ReportArchivePage`): the `location_path_id` of the
    archive's own scope location, loaded by exact path in
    `src/lib/data/report-archives.ts`, with a new `locationPathId` prop.
  - Licensing-authority pages, including
    `src/pages/[category]/licensing-authority/data-annotations/[...parts].astro`:
    `la.location_path_id`, added to `authoritySelect` in
    `src/lib/data/licensing-authority.ts`.
  - Civil-case pages and civil-case watch pages: see the next two bullets.
  - Federal agency pages, news, about, legal and other site pages pass nothing
    and have no state.
- **Civil-case pages** pass the `location_path_id` of every agency linked to
  the case through `civil_case_personnel -> agency_personnel -> agency`, read
  with no `build_page_payload` join, so a linked agency with no agency page
  still adds its state. This matches the state-page rule in
  `openspec/specs/civil-case-content/spec.md`, which counts cases by linked
  agencies, not by incident location. Pagefind accepts more than one value per
  filter, so a case linked to agencies in two states appears under both.
- **Watch pages** (`WatchPage.astro`) pass the same ids as their parent
  record: a report watch page passes the report's `location_path_id`, and a
  civil-case watch page passes the linked agencies' `location_path_id`
  values, loaded the same way as the case page.
- DC and the territories get a state value only if the database stores them
  as `level = 'state'` rows. The site adds no special case. Task 3.1 records
  the stored `level` of each top-level `location_path` row in `verify.md`.

Alternatives considered:

- A boolean or string prop computed by each page from its URL: rejected; it
  derives location identity from the path, which AGENTS.md forbids.
- Each page loads the state name itself: rejected; it repeats the same query
  in many pages.
- Each caller passes a state name it already loads: rejected. Several of
  those names came from path splitting (`split_part`) or the hard-coded
  `STATE_NAMES` fallback. AGENTS.md ("The Site Is A View Of The Database")
  forbids those rules, and they are being removed.
- A recursive query over `parent_location_path_id`: rejected in favor of the
  existing `location_path_closure` projection, which records the same
  ancestry.

### D3. The state filter control

- A native `<select name="state">` inside the existing `role="search"` form,
  after the search input in DOM and tab order, with a visible `<label>`
  "State". Its first option is "All states" (empty value, the default). The
  `<label>` and the `<select>` sit in one wrapper element, the "state
  control".
- The state control is rendered `hidden`. The component stylesheet has a
  `[hidden] { display: none; }` rule for it, so no `display` rule overrides
  `hidden`. `site.js` starts loading Pagefind when the search input gets
  focus. After Pagefind loads, it calls `pagefindApi.filters` only if that is
  a function, fills the options, and removes `hidden` only when there is at
  least one state. If the load fails, or there are no states, the control
  stays hidden and the search works without it. Visitors without JavaScript
  never see the control. Their form still submits to `/find-records/`, which
  ignores the `state` parameter.
- The state options come from `pagefindApi.filters()`. This lists exactly the
  states that have indexed pages, with no database query in the masthead.
  Options are sorted with `Intl.Collator`.
- On desktop, the state control sits on the same row as the input, after it.
  In the existing mobile column layout, it sits below the input. In both
  layouts, the results panel stays anchored below the whole form row,
  including the state control, so results never open under the select.
- Changing the select reruns the current query with
  `pagefindApi.search(term, { filters: { state } })` (or no filter for "All
  states") and updates the existing `data-site-search-status` live region with
  the new total match count (the same number sent as `result_count`).
- The placeholder stays "Search places, agencies, or cases…". The no-results
  text and its `/find-records/` link stay as they are.
- Styles live in the `MastheadSearch.astro` stylesheet with `DESIGN.md`
  tokens and fit the existing mobile column layout. Any class that `site.js`
  adds gets a safelist entry in `scripts/purge-built-css.mjs`, and
  `scripts/validate-critical-css.mjs` must still pass.

Alternative considered: render the options at build time from the database.
Rejected: the masthead is on every page, and the select is only useful with
JavaScript, which already has the filter list from Pagefind.

### D4. Analytics events

The query text is not sent because Google's terms forbid sending personal
data, and visitors type people's names into search. Only the result count and
the chosen state are added.

| Event                        | Source        | Fields                                                                           |
| ---------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `search_results`             | masthead      | `search_source`, `result_count`, `search_state`                                  |
| `search_result_selected`     | masthead      | `search_source`, `result_count`, `search_state`                                  |
| `coverage_search_no_results` | masthead      | `search_source`, `page_path`, `query_length`, `result_count` (0), `search_state` |
| `search_results`             | record_finder | `search_source`, `result_count` (unchanged)                                      |
| `search_result_selected`     | record_finder | `search_source`, `result_category`, `result_count`                               |
| `coverage_search_no_results` | record_finder | `search_source`, `page_path`, `query_length`, `result_count` (0)                 |

- `search_state` is the chosen state's filter value (the state name), or
  `all` when "All states" is chosen.
- The masthead now sends `coverage_search_no_results` once per settled search
  with no results, so both sources report searches that found nothing.
  `search_source` is added to that event so the two sources can be told
  apart.
- `/find-records/` has no state filter, so its events carry no
  `search_state`.
- `query_length` is a number, not text, and is already sent today.
- The two sources stay comparable through `search_source` on every event.

A settled masthead search is the pair (term, chosen state). It settles
`SEARCH_MEASUREMENT_DELAY_MS` after the last change to either one, or just
before a result is selected. `search_results` is sent at most once for each
consecutive distinct pair. A state change with the same term is a new pair.
`coverage_search_no_results` follows the same rule. `result_count` is the
total number of Pagefind matches (`search(...).results.length`), not the
number shown (at most `MAX_SEARCH_RESULTS`).

### D5. Ranking

No ranking change. The masthead keeps Pagefind's default relevance order, and
`/find-records/` stays the place for name-first place and agency lookup (Q44).

## Risks / Trade-offs

- [The filter data makes the index larger] → Record the Pagefind "Indexed N
  pages" line and `du -sk dist/pagefind` on the `ddl-openspec` commit just
  before this change's first implementation commit and on this change's head,
  in `verify.md`, with the bytes added per indexed page. The growth is
  recorded, not a merge condition.
- [A page with a `location_path_id` does not pass `searchLocationPathIds`, so
  it disappears when a state is chosen] → `scripts/validate-search-filters.mjs`
  reads the `path` of every `location_path` row with `level = 'state'` once.
  It fails for every indexed page in `dist/` whose URL starts with one of
  those paths and has no `data-pagefind-filter="state:..."` element. It also
  fails for every indexed `dist/civil-cases/<slug>/` page whose case has a
  linked agency under a state row, as found by a database query, and has no
  state element. The check reads URLs only to find pages to inspect. Filter
  values come from the database.
- [Federal agencies vanish when a state is chosen] → Accepted by the owner
  (Q46). "All states" shows them.
- [The two changes disagree about rosters] → `paginate-long-lists` owns
  roster index scope (Q48). This change does not edit roster routes, so merge
  order does not matter. This change's tests use a person profile, not a
  roster. Roster coverage is tested in `paginate-long-lists`.
- [The masthead no-JavaScript path lands on a finder that needs JavaScript]
  → Existing behavior (`src/pages/find-records/index.astro` runs its finder in
  an inline script), not changed by this change (Q44).

## Migration Plan

Static site change. It ships with a normal release. Rollback is promoting the
previous release.

## Open Questions

- `paginate-long-lists` D5 must name `/federal/{slug}/personnel/` (Q48).
  `tasks.md` 1.2 makes that edit.
