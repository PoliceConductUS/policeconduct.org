# Masthead search state filter implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development
> to implement this plan task-by-task.

**Goal:** The masthead search finds no pages about people, filters by state,
and sends result count and chosen state (never query text) with every search
event.

**Architecture:** `PageShell` renders Pagefind `state` filter values loaded
from each page's own `location_path` record by a new memoized loader. The
masthead gets a JavaScript-only "State" select whose options come from
Pagefind's filter list. Analytics fields are added in `site.js` and
`/find-records/`. See `design.md`.

**Tech Stack:** Astro, TypeScript, PostgreSQL, Pagefind, Playwright.

**Spec:** `specs/site-search/spec.md`

## Global constraints

- `/find-records/` stays; only its analytics events change (Q44).
- Do not edit roster routes; `paginate-long-lists` owns them (Q48).
- State values come only from `public.location_path` through
  `location_path_id`; never from URLs, breadcrumbs or
  `build_page_payload.path`.
- No query text in any analytics event.
- No inline CSS, no boolean flags, no hard-coded database row IDs, no new
  dependencies.

## Files

- Create: `src/lib/data/search-states.ts`, its unit test, and a built-site
  check script under `scripts/`.
- Modify: `src/layouts/PageShell.astro`, `src/components/MastheadSearch.astro`,
  `src/lib/client/site.js`, `src/pages/personnel/index.astro`,
  `src/pages/find-records/index.astro`, `src/pages/civil-cases/[slug]/index.astro`,
  `src/lib/data/civil-litigation-detail.ts` (if needed), the location-backed
  `PageShell` callers listed in `tasks.md` 3.3, `scripts/purge-built-css.mjs`,
  `package.json` (check wiring), `src/lib/client/EGM.md`,
  `src/pages/find-records/EGM.md`, `tests/e2e/site-search.spec.ts`,
  `tests/e2e/analytics.spec.mjs`.

## Task 1: Baseline (tasks.md 1)

- [ ] **Step 1:** On the parent branch head, run `npm run build:site`; record
      the Pagefind "Indexed N pages" line, `du -sk dist/pagefind` and the SHA.
- [ ] **Step 2:** Confirm `paginate-long-lists` covers every roster route.

## Task 2: Person pages out of the index (tasks.md 2)

- [ ] **Step 1:** Write the failing part of the built-site check (tasks.md
      6.3) for `dist/personnel/index.html`.
- [ ] **Step 2:** Pass `searchable={false}` in `src/pages/personnel/index.astro`.
- [ ] **Step 3:** Remove the `personnel` branch from `getSearchResultCategory`.
- [ ] **Step 4:** Run the check; commit `feat: keep the personnel index out of site search`.

## Task 3: State loader (tasks.md 3.1)

- [ ] **Step 1:** Write unit tests for `loadSearchStateNames`: state row, place
      under a state, no state ancestor, unknown id throws.
- [ ] **Step 2:** Implement one recursive query over `public.location_path`
      (`parent_location_path_id`, `level = 'state'`, `display_name`), memoized.
- [ ] **Step 3:** Run the tests; commit `feat: load page state names for search`.

## Task 4: Filter values in PageShell and callers (tasks.md 3.2-3.5)

- [ ] **Step 1:** Write the built-site check for indexed pages under state URLs
      without a state filter element; see it fail.
- [ ] **Step 2:** Add `searchLocationPathIds` to `PageShell`; render one empty
      `data-pagefind-filter="state:<name>"` element per distinct name.
- [ ] **Step 3:** Pass the ids from each location-backed caller (tasks.md 3.3)
      and from civil-case pages through linked agencies (tasks.md 3.4).
- [ ] **Step 4:** Build; run the check and `npm run validate:no-inline-css`.
- [ ] **Step 5:** Commit `feat: add state filter values to the search index`.

## Task 5: Masthead select (tasks.md 4)

- [ ] **Step 1:** Write e2e tests 6.1 (1)-(8) against a multi-page fixture
      index; see them fail.
- [ ] **Step 2:** Add the hidden `<select name="state">` and "State" label to
      `MastheadSearch.astro` with token-based styles.
- [ ] **Step 3:** In `site.js`, unhide on enhance, fill from
      `pagefindApi.filters()`, search with `{ filters: { state } }`, rerun on
      change and update the status region.
- [ ] **Step 4:** Update the two code comments to name `build:search-index`;
      add safelist entries; run the CSS checks.
- [ ] **Step 5:** Run the tests; commit `feat: add a state filter to the masthead search`.

## Task 6: Analytics (tasks.md 5, 6.2)

- [ ] **Step 1:** Update `tests/e2e/analytics.spec.mjs` fixtures to agency URLs
      and assert the design D4 payloads; keep the no-query-text assertion; see
      them fail.
- [ ] **Step 2:** Add the fields in `site.js` and `find-records/index.astro`;
      add the masthead `coverage_search_no_results` event.
- [ ] **Step 3:** Update the two `EGM.md` files.
- [ ] **Step 4:** Run the tests; commit `feat: send result count and state with search events`.

## Task 7: Verification (tasks.md 7)

- [ ] **Step 1:** Repeat the baseline measurement; stop and report if
      `dist/pagefind` is larger.
- [ ] **Step 2:** Run `npm run validate` on the final head; write `verify.md`.
