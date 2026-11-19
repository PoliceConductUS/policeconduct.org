# Paginate Long Lists Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

> **Approval gate:** Do not start Task 1 until the owner approves this change
> (`proposal.md`, `design.md`, both specs, `tasks.md`, this plan). AGENTS.md:
> "Do not implement until the user approves."

**Goal:** Every server-rendered list page of more than 50 rows shows 50 rows per
page with a pager, agency roster filters work across the whole roster, and
roster pages leave the site search index.

**Architecture:** Every paged route follows the params-only pattern of
`src/pages/[category]/counties/page/[...page].astro` and passes `currentPage` to
a component that slices rows from one loader. Rosters get one row model
(`src/lib/data/agency-roster.ts`) used by the server pages and a static
`roster.json` per roster of more than 50 rows, which the roster script loads on
first filter use.

**Tech Stack:** Astro static pages, TypeScript, PostgreSQL through `withDb`,
`node --test` for units (Node 26 imports `.ts` directly), Playwright through
`npm run test:e2e`, Pagefind.

**Spec:** `specs/list-pagination/spec.md`, `specs/agency-browsing/spec.md`, with
`design.md` and `brainstorm.md` in this folder.

## Global Constraints

- Work only in the worktree for branch `afk-2026-11-17`. Runtime: Node from
  `mise.toml`; prefix commands with `mise exec --`.
- The local database on `127.0.0.1:54322` is shared. Every query in this plan
  is read-only. Do not run `data reset`, `supabase db reset` or `supabase stop`.
- Never write a database row ID into a committed file, test or doc.
- Page size is `PAGE_SIZE` (50) from `src/lib/pagination.ts`. No route uses
  Astro `paginate()` or passes rows or identity through props.
- No boolean props on components; use the discriminated unions in design D4.
- No inline CSS, no `style` attributes; reuse existing roster and pager classes.
- Public copy at an 8th-grade level; no claim of verification.
- After each task: Conventional Commit, then `git town sync` from this
  worktree. No rebase.

---

## Task 1: Prerequisites (tasks.md 1)

- [ ] **Step 1:** Run `git log --oneline -5` and confirm `b097b2f` (or a later
      sync) is in history.
- [ ] **Step 2:** Confirm `src/lib/alpha-navigation.ts` is absent,
      `src/components/AgencyCivilCasesPage.astro` imports `PAGE_SIZE`, and
      `src/pages/[category]/counties/page/[...page].astro` has no `paginate(`.
- [ ] **Step 3:** Confirm `design.md` Open Questions records the owner's dated
      approval. Stop if any check fails.

## Task 2: Before-measurements (tasks.md 2)

- [ ] **Step 1:** Create `verify.md` with a "Before" table.
- [ ] **Step 2:** Run a local build with `/usr/bin/time -l`; record build time,
      peak memory, `du -sh dist`, `dist/pagefind` size and indexed page count,
      and the largest `dist/**/personnel/index.html` size.
- [ ] **Step 3:** Run read-only count queries for every Context table list;
      record maximum and location.
- [ ] **Step 4:** For any list above 50 rows not named in D2, stop and report.

## Task 3: Deterministic sorts (tasks.md 3)

- [ ] **Step 1:** Write a failing unit test that pages a fixture list with tied
      rows and checks the union has no duplicates.
- [ ] **Step 2:** Append the primary key to each paged `order by` in
      `civil-cases.ts`, `civic-topic-records.ts` and `agency-detail.ts`.
- [ ] **Step 3:** Run `npm run test:data`; commit.

## Task 4: Page size and absences (tasks.md 4)

- [ ] **Step 1:** Remove `CIVIL_CASES_PAGE_SIZE`; use `PAGE_SIZE` in
      `src/pages/civil-cases/index.astro`.
- [ ] **Step 2:** Fetch the live production sitemap list of
      `/civil-cases/page/{n}/` URLs; add a `route-absences.json` entry per URL
      above the new last page.
- [ ] **Step 3:** Remove entries for routes this change builds again; recheck
      the Harris County agency civil-case entry.
- [ ] **Step 4:** Run `npm run test:redirects`; commit.

## Task 5: Area civil cases (tasks.md 5)

- [ ] **Step 1:** Drop `limit 200`; add the count-only query and per-path cache.
- [ ] **Step 2:** Add required `currentPage` to `CivicScopedIndexPage` and
      `CivicScopedOverviewPage`; pass `1` from every existing caller.
- [ ] **Step 3:** Remove `slice(0, 50)` and the "50 most recent" note from
      `CivicScopedRowsTable`.
- [ ] **Step 4:** Create the three `civil-cases/page/[...page].astro` routes.
- [ ] **Step 5:** Check preview links; record in `verify.md`.
- [ ] **Step 6:** Run `npm run validate:types`; commit.

## Task 6: Global civil cases and news (tasks.md 6)

- [ ] **Step 1:** Rewrite `src/pages/civil-cases/page/[...page].astro` to
      params-only with `currentPage`, "Page N" title and self-canonical path.
- [ ] **Step 2:** Rewrite `src/pages/news/page/[...page].astro` the same way.
- [ ] **Step 3:** `grep -rn "paginate(" src/pages` returns nothing; commit.

## Task 7: Roster row model and routes (tasks.md 7)

- [ ] **Step 1:** Write `src/lib/data/agency-roster.test.mjs` (task 13.1 cases)
      and add it to `test:data`; run it and see it fail.
- [ ] **Step 2:** Create `src/lib/data/agency-roster.ts`; move row building out
      of `AgencyPersonnelList.astro`; run the tests to green.
- [ ] **Step 3:** Change `AgencyPersonnelList` to the `roster` union prop.
- [ ] **Step 4:** Update `personnel/index.astro`; create
      `personnel/page/[...page].astro`.
- [ ] **Step 5:** Run `npm run validate:types`; commit.

## Task 8: Roster data endpoint (tasks.md 8)

- [ ] **Step 1:** Create `personnel/roster.json.ts`, params-only, more than 50
      rows only, failing loudly otherwise.
- [ ] **Step 2:** Apply the `NO_PERSONNEL` link rule to `href`.
- [ ] **Step 3:** Build one agency locally and check the file; commit.

## Task 9: Roster client script (tasks.md 9)

- [ ] **Step 1:** Add the hidden `<template>` row from the shared partial.
- [ ] **Step 2:** Write one filter function over row records (data attributes
      or `roster.json`).
- [ ] **Step 3:** Add fetch-once-on-success, loading, "Try again", queued input.
- [ ] **Step 4:** Add 50-per-view Previous/Next, summary wording, A–Z
      behavior, dimming, pager hiding, focus handling.
- [ ] **Step 5:** Commit.

## Task 10: Search index (tasks.md 10)

- [ ] **Step 1:** Render roster pages with `PageShell`'s `searchable` off, per
      the D5 choice the owner confirms.
- [ ] **Step 2:** Build and check roster HTML has no `data-pagefind-body`;
      commit.

## Task 11: EGM contracts (tasks.md 11)

- [ ] **Step 1:** Update each listed `EGM.md`; add one per new folder; commit.

## Task 12: DESIGN.md and AGENTS.md (tasks.md 12)

- [ ] **Step 1:** Add the D8 text to both files; commit.

## Task 13: Tests (tasks.md 13)

- [ ] **Step 1:** Update `tests/e2e/agency-discipline.spec.ts` to the `roster`
      prop and add the design "Testing" e2e cases with in-test fixtures.
- [ ] **Step 2:** Run `npm run test:e2e`; account for every skip; commit.

## Task 14: After-measurements and validation (tasks.md 14)

- [ ] **Step 1:** Repeat Task 2 Step 2 and record "After" in `verify.md`, plus
      the largest `roster.json` raw and gzip size.
- [ ] **Step 2:** Run `npm run validate` on the final head; record exit code,
      stage results, test counts and warning dispositions; commit and sync.
