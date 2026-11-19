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
`search_results`, `search_result_selected` and `coverage_search_no_results`
with `search_source: "record_finder"`. The masthead sends `search_results` and
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
  D5 names the agency rosters and their `/page/{n}/` pages but not
  `/federal/{slug}/personnel/`; `tasks.md` 1.2 confirms that gap with the
  owner instead of editing that route here.
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

Because no person page is indexed, `getSearchResultCategory` in `site.js` can
no longer return `personnel`. Remove that branch. The roster `personnel`
segment in the "other" list is left for `paginate-long-lists`.

### D2. Where a page's state comes from

A page's state filter value is the `display_name` of the `location_path` row
with `level = 'state'` that is the page record's own `location_path` row or
one of its ancestors (through `parent_location_path_id`). The value never
comes from parsing the URL, the breadcrumbs, or `build_page_payload.path`
(AGENTS.md, Data + Routing Conventions).

- **Loader:** a new `src/lib/data/search-states.ts` exports
  `loadSearchStateNames(locationPathIds)`. It loads the id-to-state-name map
  once per build with one recursive query over `public.location_path` and
  memoizes it. An id that is not in `public.location_path` throws. An id whose
  ancestors have no `state` row maps to no value.
- **PageShell:** a new optional prop `searchLocationPathIds` (a list of
  `location_path_id` values). When the page is searchable and the list is not
  empty, `PageShell` loads the state names and renders one empty element per
  distinct name inside `<main>`, with `data-pagefind-filter="state:<name>"`.
  It renders no visible text and no inline CSS.
- **Which pages pass it:** every searchable `PageShell` caller whose record has
  a `location_path_id`: state, administrative-area and place pages; agency
  pages and agency topic pages (`agency.location_path_id`); report pages and
  report lists (the stored incident location path); licensing-authority pages
  (`licensing_authority.location_path_id`). Federal agency pages, news, about,
  legal and other site pages pass nothing and have no state.
- **Civil-case pages** pass the `location_path_id` of every agency linked to
  the case through `civil_case_personnel -> agency_personnel -> agency`. This
  matches the state-page rule in `openspec/specs/civil-case-content/spec.md`,
  which counts cases by linked agencies, not by incident location. Pagefind
  accepts more than one value per filter, so a case linked to agencies in two
  states appears under both.

Alternatives considered:

- A boolean or string prop computed by each page from its URL: rejected; it
  derives location identity from the path, which AGENTS.md forbids.
- Each page loads the state name itself: rejected; it repeats the same query
  in many pages.

### D3. The state filter control

- A native `<select name="state">` inside the existing `role="search"` form,
  after the search input in DOM and tab order, with a visible `<label>`
  "State". Its first option is "All states" (empty value, the default).
- The select is rendered with the `hidden` attribute. `site.js` removes
  `hidden` when it enhances the form, so visitors without JavaScript never see
  a control that cannot work. Their form still submits to `/find-records/`,
  which ignores the `state` parameter.
- The state options come from `pagefindApi.filters()` once Pagefind loads.
  This lists exactly the states that have indexed pages, with no database
  query in the masthead. Options are sorted with `Intl.Collator`. Focusing the
  select also starts loading Pagefind.
- Changing the select reruns the current query with
  `pagefindApi.search(term, { filters: { state } })` (or no filter for "All
  states") and updates the existing `data-site-search-status` live region with
  the new count.
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
| `search_result_selected`     | masthead      | `search_source`, `result_category`, `result_count`, `search_state`               |
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

### D5. Ranking

No ranking change. The masthead keeps Pagefind's default relevance order, and
`/find-records/` stays the place for name-first place and agency lookup (Q44).

## Risks / Trade-offs

- [The filter data makes the index larger] → Measure the Pagefind "Indexed N
  pages" line and the size of `dist/pagefind` on the parent branch head and on
  this change's head. If this change's index is larger, stop and report to the
  owner before merge.
- [A page with a `location_path_id` does not pass `searchLocationPathIds`, so
  it disappears when a state is chosen] → A check over the built site finds
  every indexed page under a state URL (`/{state}/...`) with no
  `data-pagefind-filter="state:..."` element and fails. The check reads URLs
  only to find pages to inspect; filter values still come from the database.
- [Federal agencies vanish when a state is chosen] → Accepted by the owner
  (Q46). "All states" shows them.
- [The two changes disagree about rosters] → `paginate-long-lists` owns
  roster index scope (Q48). This change does not edit roster routes, so merge
  order does not matter. Its "person's name returns no results" test passes
  for rosters only after `paginate-long-lists` is in the branch.
- [The masthead no-JavaScript path lands on a finder that needs JavaScript]
  → Existing behavior (`src/pages/find-records/index.astro` runs its finder in
  an inline script), not changed by this change (Q44).

## Migration Plan

Static site change. It ships with a normal release. Rollback is promoting the
previous release.

## Open Questions

None.
