## Why

The site has two separate search tools: the header search (Pagefind over about
12,000 built pages) and `/find-records/` (its own data file of places and
agencies). Visitors have to know which one to use. The user wants one search
system in the header for the whole site. This is a backlog item, recorded on
2026-11-18 during `paginate-long-lists`, and not yet designed.

## What Changes

Decisions the user made on 2026-11-18:

- One header search covers the whole site.
- It finds no people for now.
- It has a state filter only. Place and agency filters are not part of it.

Still to design, through the brainstorm and design steps of this change:

- Whether `/find-records/` and its data file are folded into the header
  search, kept, or retired.
- How the state filter is presented and stored (for example, a Pagefind filter
  on each indexed page derived from its location path).
- What leaves the index so that people are not found. Agency roster pages
  (`<agency>/personnel/`) are in the index today, so names on them can be found
  with the header search.

## Capabilities

### New Capabilities

### Modified Capabilities

- `site-search`: the header search becomes the single site search, finds no
  people, and offers a state filter.

## Impact

- `src/components/MastheadSearch.astro`, `src/layouts/PageShell.astro` and the
  pages that set `searchable`.
- `/find-records/` and `src/pages/find-records/data.json.ts`.
- The `npx pagefind --site dist` step in `build:site`, and the size of
  `dist/pagefind`.
- Search e2e tests and analytics events (`search_results`,
  `coverage_search_no_results`).
