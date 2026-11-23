# Masthead search state filter implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development
> to implement this plan task-by-task.

**Goal:** The masthead search finds no pages about people, filters by state,
and sends result count and chosen state (never query text) with every search
event.

**Architecture:** `PageShell` renders Pagefind `state` filter values loaded
from each page's own `location_path` record, through the
`location_path_closure` build projection, by a new memoized loader. The
masthead gets a JavaScript-only "State" control whose options come from
Pagefind's filter list. Analytics fields are added in `site.js` and
`/find-records/`. See `design.md`.

**Tech Stack:** Astro, TypeScript, PostgreSQL, Pagefind, Playwright.

**Spec:** `specs/site-search/spec.md`

## Global constraints

- `/find-records/` stays; only its analytics events change (Q44).
- Do not edit roster routes; `paginate-long-lists` owns them (Q48).
- State values come only from `public.location_path` and
  `public.location_path_closure` through `location_path_id`; never from URLs,
  breadcrumbs or `build_page_payload.path`.
- No URL rules or regular expressions that classify pages.
- No query text in any analytics event.
- No inline CSS, no boolean flags, no hard-coded database row IDs, no new
  dependencies.

## Files

- Create: `src/lib/data/search-states.ts`,
  `src/lib/data/search-states.test.mjs`,
  `scripts/validate-search-filters.mjs`,
  `openspec/changes/unify-header-search/verify.md`.
- Modify (loaders and projections): `src/lib/data/build-payloads.ts`,
  `src/lib/data/civic-index.ts`, `src/lib/data/civic-scoped-routes.ts`,
  `src/lib/data/agency-detail.ts`, `src/lib/data/report-archives.ts`,
  `src/lib/data/licensing-authority.ts`,
  `src/lib/data/civil-litigation-detail.ts`,
  `scripts/refresh-build-projections.mjs`.
- Modify (layout and components): `src/layouts/PageShell.astro`,
  `src/components/MastheadSearch.astro`, `src/components/CivicIndexPage.astro`,
  `src/components/CivicScopedIndexPage.astro`,
  `src/components/CivicScopedOverviewPage.astro`,
  `src/components/CivicChildIndexPage.astro`,
  `src/components/AgencyTopicPage.astro`,
  `src/components/AgencyCivilCasesPage.astro`,
  `src/components/AgencyReportsPage.astro`,
  `src/components/ReportArchivePage.astro`, `src/components/WatchPage.astro`.
- Modify (routes): every route file named in `tasks.md` 3.3-3.9,
  `src/pages/personnel/index.astro`, `src/pages/find-records/index.astro`.
- Modify (client, build, tests): `src/lib/client/site.js`,
  `scripts/purge-built-css.mjs`, `package.json` (`test:data`, `build:site`,
  new `validate:search-filters`), `tests/e2e/site-search.spec.ts`,
  `tests/e2e/analytics.spec.mjs`.
- Modify (contracts): the EGM.md files listed in `tasks.md` 5.3.
- Modify (other change): `openspec/changes/paginate-long-lists/design.md` D5
  and `tasks.md` group 10 (`tasks.md` 1.2).
- Run, not changed: `scripts/validate-critical-css.mjs`.

## Task 1: Baseline (tasks.md 1)

- [ ] **Step 1:** On the `ddl-openspec` commit just before this change's first
      implementation commit, run `npm run build:site`; record the Pagefind
      "Indexed N pages" line, `du -sk dist/pagefind` and the SHA.
- [ ] **Step 2:** Edit `paginate-long-lists` D5 and its group 10 tasks to name
      `/federal/{slug}/personnel/` (tasks.md 1.2); delete this change's
      design Open Question.

## Task 2: Person pages out of the index (tasks.md 2, 6.3)

- [ ] **Step 1:** Create `scripts/validate-search-filters.mjs` with the
      personnel check (tasks.md 6.3) and wire it into `build:site`; see it
      fail.
- [ ] **Step 2:** Pass `searchable={false}` in `src/pages/personnel/index.astro`.
- [ ] **Step 3:** Delete `getSearchResultCategory` and masthead
      `result_category` from `site.js` (tasks.md 2.2).
- [ ] **Step 4:** Run the check; commit `feat: keep the personnel index out of site search`.

## Task 3: State loader (tasks.md 3.1)

- [ ] **Step 1:** Write `src/lib/data/search-states.test.mjs` for
      `loadSearchStateNames`: state row, place under a state, no state
      ancestor, unknown id throws; add it to `test:data`.
- [ ] **Step 2:** Implement one memoized query over
      `public.location_path_closure` joined to `public.location_path`
      (`level = 'state'`, `display_name`).
- [ ] **Step 3:** Record the stored `level` of each top-level `location_path`
      row in `verify.md`.
- [ ] **Step 4:** Run the tests; commit `feat: load page state names for search`.

## Task 4: Filter values in PageShell and callers (tasks.md 3.2-3.11)

- [ ] **Step 1:** Add the state-URL and civil-case checks to
      `scripts/validate-search-filters.mjs` (tasks.md 3.11); see them fail.
- [ ] **Step 2:** Add `searchLocationPathIds` to `PageShell`; render one empty
      `data-pagefind-filter="state:<name>"` element per distinct name.
- [ ] **Step 3:** Pass the ids from each caller family (tasks.md 3.3-3.9).
- [ ] **Step 4:** Write the `PageShell` caller list in `verify.md` (tasks.md
      3.10).
- [ ] **Step 5:** Build; run the check and `npm run validate:no-inline-css`.
- [ ] **Step 6:** Commit `feat: add state filter values to the search index`.

## Task 5: Masthead state control (tasks.md 4)

- [ ] **Step 1:** Write e2e tests 6.1 (1)-(9) against an index built from real
      built pages; see them fail.
- [ ] **Step 2:** Add the hidden state control (label and select in one
      wrapper, `[hidden]` rule) to `MastheadSearch.astro` with token-based
      styles and the desktop and mobile placement.
- [ ] **Step 3:** In `site.js`, load Pagefind on input focus, fill from a
      guarded `pagefindApi.filters()`, unhide only when there is at least one
      state, search with `{ filters: { state } }`, rerun on change and update
      the status region.
- [ ] **Step 4:** Update the two code comments to name `build:search-index`;
      add safelist entries; run the CSS checks.
- [ ] **Step 5:** Run the tests; commit `feat: add a state filter to the masthead search`.

## Task 6: Analytics (tasks.md 5, 6.2)

- [ ] **Step 1:** Update `tests/e2e/analytics.spec.mjs` as in tasks.md 6.2;
      see them fail.
- [ ] **Step 2:** Add the fields in `site.js` and `find-records/index.astro`;
      key de-duplication on (term, state); add the masthead
      `coverage_search_no_results` event.
- [ ] **Step 3:** Update the EGM.md files in tasks.md 5.3.
- [ ] **Step 4:** Run the tests; commit `feat: send result count and state with search events`.

## Task 7: Verification (tasks.md 7)

- [ ] **Step 1:** Repeat the baseline measurement on this change's head and
      record both measurements and the difference in `verify.md`.
- [ ] **Step 2:** Run `npm run validate` on the final head; write `verify.md`.
