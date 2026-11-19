## Why

The site has two search entry points with different coverage: the header
search (a Pagefind index of the built pages) and `/find-records/` (its own data
file, `/find-records/data.json`, built by `src/pages/find-records/data.json.ts`,
of places and agencies). The header search cannot narrow results to one state,
and it can still return a page about individual people (`/personnel/`). This
is a backlog item, recorded on 2026-11-18 during `paginate-long-lists`.

## What Changes

Decisions the user made on 2026-11-18 (recorded in
[`paginate-long-lists/brainstorm.md`](../paginate-long-lists/brainstorm.md), "A
site-wide header search is a separate backlog change") and on 2026-11-19 (owner
answers Q44-Q47 to the round-1 review, recorded in `brainstorm.md`):

- The masthead search and `/find-records/` both stay (Q44). Without JavaScript,
  the masthead form still submits to `/find-records/`.
- The masthead search finds no people: no page about a person is in the search
  index (Q45). This change removes `/personnel/` from the index. Person profile
  pages (`/personnel/{slug}/`) and their topic pages are already out of it.
- The masthead search gets one state filter. Place and agency filters are not
  part of it. When a state is chosen, pages that have no state are hidden (Q46).
- Every search event is sent with its result count and the chosen state. The
  query text is never sent (Q47).
- Roster pages (`/{category}/{administrativeArea}/{place}/{agencySlug}/personnel/`,
  its `/page/{n}/` pages, and `/federal/{slug}/personnel/`) leave the index in
  the `paginate-long-lists` change, which owns that work (owner Q48; its
  design D5). This change does not edit roster routes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-search`: the masthead search finds no pages about people, offers a
  state filter, and sends its result count and chosen state with every search
  event.

## Impact

- Search UI and client: `src/components/MastheadSearch.astro`,
  `src/lib/client/site.js` (search call, state filter, result categories,
  analytics events).
- Index scope: `src/layouts/PageShell.astro` (state filter values), the
  `PageShell` callers that render a record with a `location_path_id`, and
  `src/pages/personnel/index.astro`.
- A new loader for each page's state: `src/lib/data/search-states.ts`.
- `/find-records/` analytics events in `src/pages/find-records/index.astro`
  (result count on every event). The page and its data file otherwise stay as
  they are.
- Build: the `build:search-index` script and the size of `dist/pagefind`; CSS
  safelists in `scripts/purge-built-css.mjs`.
- Tests: `tests/e2e/site-search.spec.ts`, `tests/e2e/analytics.spec.mjs`.
- Specs: `openspec/specs/site-search/spec.md`.
