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
`node --test` for units (Node 26 strips types; tests resolve `#src/*` and `.js`
specifiers with the `registerHooks` resolver from
`scripts/report-detail.test.mjs`), Playwright through `npm run test:e2e`,
Pagefind.

**Spec:** `specs/list-pagination/spec.md`, `specs/agency-browsing/spec.md`, with
`design.md` and `brainstorm.md` in this folder.

## Global Constraints

- Work in a task branch that is a child of the current stack leaf
  (`ddl-openspec` on 2026-11-22), in its own folder
  `~/dev/PoliceConductUS/policeconduct.org/<branch-name>/`. Runtime: Node from
  `mise.toml`; prefix commands with `mise exec --`.
- The local database on `127.0.0.1:54322` is shared. Every query in this plan
  is read-only. Do not run `data reset`, `supabase db reset` or `supabase stop`.
- Never write a database row ID into a committed file, test or doc.
- Page size is `PAGE_SIZE` (50) from `src/lib/pagination.ts`. No route uses
  Astro `paginate()` or passes rows or identity through props.
- No boolean props on components; use the discriminated unions in design D4.
- The site adds no status, label fallback, totals or other derived value to the
  roster (AGENTS.md "The Site Is A View Of The Database").
- No inline CSS, no `style` attributes; reuse existing roster and pager classes.
- Public copy at an 8th-grade level; no claim of verification.
- Each commit builds. After each task: Conventional Commit, then
  `git town sync` from this worktree. No rebase.

## Key Snippets

Roster prop (design D4):

```ts
type AgencyRosterRow = {
  label: string;
  href: string | null;
  context: string;
  disciplineCount: number;
  letter: string;
  search: string;
};
type RosterProp =
  | { kind: "single"; rows: AgencyRosterRow[]; counts: StaffCounts }
  | {
      kind: "paged";
      rows: AgencyRosterRow[];
      counts: StaffCounts;
      currentPage: number;
      letterPages: { letter: string; href: string }[];
      dataPath: string;
    };
```

`roster.json` shape:

```ts
type RosterFile = {
  dataVersion: string;
  entries: {
    label: string;
    href: string | null;
    context: string;
    disciplineCount: number;
    letter: string;
  }[];
};
```

Params-only route skeleton (from `src/pages/[category]/counties/page/[...page].astro`):

```astro
---
export async function getStaticPaths() {
  const pages = [];
  for (const path of await loadPaths()) {
    const lastPage = Math.ceil((await loadRows(path)).length / PAGE_SIZE);
    for (let n = 2; n <= lastPage; n += 1) {
      pages.push({ params: { ...path.params, page: String(n) } });
    }
  }
  return pages;
}
const currentPage = Number(Astro.params.page);
if (String(currentPage) !== Astro.params.page || currentPage < 2) {
  throw new Error(`Invalid page number ${Astro.params.page}.`);
}
// reload the entity by its exact path, then pass currentPage to the component
---
```

Template fill (no `innerHTML`):

```ts
const node = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
const link = node.querySelector<HTMLAnchorElement>("[data-roster-link]")!;
link.textContent = entry.label;
if (entry.href) link.href = entry.href;
node.querySelector("[data-roster-context]")!.textContent = entry.context;
```

---

## Task 1: Prerequisites (tasks.md 1)

- [ ] **Step 1:** Confirm `src/lib/alpha-navigation.ts` is absent,
      `src/components/AgencyCivilCasesPage.astro` imports `PAGE_SIZE`,
      `src/pages/[category]/counties/page/[...page].astro` has no `paginate(`,
      `AgencyPersonnelList.astro` does not import `getAssignmentStatus`,
      `agency-detail.ts` has no primary-license query, and
      `surface-license-discipline-data` tasks 4.5 and 4.6 are merged.
- [ ] **Step 2:** Confirm `design.md` Open Questions records the owner's dated
      approval. Stop if any check fails.

## Task 2: Before-measurements (tasks.md 2)

- [ ] **Step 1:** Create `verify.md` with a "Before" table.
- [ ] **Step 2:** Run a local build with `/usr/bin/time -l`; record build time,
      peak memory, `du -sh dist`, `dist/pagefind` size and indexed page count,
      and the largest `dist/**/personnel/index.html` size.
- [ ] **Step 3:** Re-run read-only count queries for every Context table list;
      record each maximum and location, and report any difference from the
      design's figure.

## Task 3: Deterministic sorts (tasks.md 3)

- [ ] **Step 1:** Write a unit test that pages a fixture list and checks every
      row appears once.
- [ ] **Step 2:** Append the primary key to each paged `order by` in
      `civil-cases.ts`, `civic-topic-records.ts` and `agency-detail.ts`, and end
      the comparator in `agency-civil-case-rows.ts` with `id`.
- [ ] **Step 3:** Run `npm run test:data`; commit.

## Task 4: Page size and absences (tasks.md 4)

- [ ] **Step 1:** Remove `CIVIL_CASES_PAGE_SIZE`; use `PAGE_SIZE` in
      `src/pages/civil-cases/index.astro` and
      `src/pages/civil-cases/page/[...page].astro`.
- [ ] **Step 2:** Fetch the live production sitemap list of
      `/civil-cases/page/{n}/` URLs; add a `route-absences.json` entry per URL
      above the new last page.
- [ ] **Step 3:** Remove entries for routes this change builds again; recheck
      the Harris County agency civil-case entry.
- [ ] **Step 4:** Run `npm run test:redirects`; commit.

## Task 5a: Area civil-case loader (tasks.md 5.1)

- [ ] **Step 1:** Write a unit test that the area loader returns every case for
      a location and loads once per location path in a production build.
- [ ] **Step 2:** Drop `limit 200`; add the per-path cache.
- [ ] **Step 3:** Run `npm run test:data`; commit.

## Task 5b: Area civil-case components (tasks.md 5.2, 5.5)

- [ ] **Step 1:** Add optional `currentPage` (default 1) to
      `CivicScopedIndexPage` and `CivicScopedOverviewPage`; existing callers
      unchanged.
- [ ] **Step 2:** In `CivicScopedIndexPage`, validate `currentPage`, slice with
      `PAGE_SIZE`, throw past the last page, and pass
      `{ kind, rows: pageRows, totalCount, currentPage, lastPage, basePath }` to
      `CivicScopedRowsTable`.
- [ ] **Step 3:** In `CivicScopedRowsTable`, remove `slice(0, 50)` and the "50
      most recent" sentence; render `<Pagination basePath currentPage lastPage>`.
- [ ] **Step 4:** Add "Page N" to title and breadcrumb in `AgencyTopicPage`,
      `CivicChildIndexPage` and the D6 components for page 2+.
- [ ] **Step 5:** Run `npm run validate:types`; commit.

## Task 5c: Area civil-case routes (tasks.md 5.3, 5.4)

- [ ] **Step 1:** Write the dev-server e2e case: a target area chosen by
      read-only query has page 2, and a page past the last returns 404.
- [ ] **Step 2:** Create the three `civil-cases/page/[...page].astro` routes from
      the skeleton above.
- [ ] **Step 3:** Check preview links; record in `verify.md`.
- [ ] **Step 4:** Run the e2e case; commit.

## Task 6: Global civil cases and news (tasks.md 6)

- [ ] **Step 1:** Write the dev-server e2e case: a global civil-case page past
      the last returns 404.
- [ ] **Step 2:** Rewrite `src/pages/civil-cases/page/[...page].astro` to
      params-only, slicing in the route and throwing past the last page, with
      "Page N" title and `canonicalUrl` for the `/page/{n}/` URL.
- [ ] **Step 3:** Rewrite `src/pages/news/page/[...page].astro` the same way,
      reloading `loadNewsArticles()` and keeping "Newer News"/"Older News".
- [ ] **Step 4:** `grep -rn "paginate(" src/pages` returns nothing; commit.

## Task 7: Roster row model and routes (tasks.md 7)

- [ ] **Step 1:** Write `src/lib/data/agency-roster.test.mjs` (task 13.1 cases)
      with the `registerHooks` resolver and add it to `test:data`; run it and
      see it fail.
- [ ] **Step 2:** Create `src/lib/data/agency-roster.ts`; move row building out
      of `AgencyPersonnelList.astro`; run the tests to green.
- [ ] **Step 3:** Change `AgencyPersonnelList` to the `roster` union prop; for
      `kind: 'paged'` validate, slice, throw past the last page and render
      `Pagination`.
- [ ] **Step 4:** Update `personnel/index.astro`; create
      `personnel/page/[...page].astro`, enumerating from the cached agency
      detail and `buildAgencyRoster`.
- [ ] **Step 5:** Run `npm run validate:types`; commit.

## Task 8: Roster data endpoint (tasks.md 8)

- [ ] **Step 1:** Write the unit test that each JSON entry's `href` equals its
      row's `href`.
- [ ] **Step 2:** Create `personnel/roster.json.ts`, params-only, more than 50
      rows only, failing loudly otherwise, emitting `{ dataVersion, entries }`.
- [ ] **Step 3:** Take `href` from the row model; run the test.
- [ ] **Step 4:** Build one agency locally and check the file; commit.

## Task 9: Roster client script (tasks.md 9)

Each step starts with its harness e2e case in `tests/e2e/agency-discipline.spec.ts`
(fixture `roster.json` served with `page.route`), sees it fail, then implements
the behavior.

- [ ] **Step 1:** Create `AgencyRosterRow.astro`; render server rows and the
      hidden `<template>` from it; map it in the harness `resolvePath`.
- [ ] **Step 2:** Rebuild the summary from DOM nodes; remove `innerHTML`; the
      small-roster "Showing X of Y" case still passes.
- [ ] **Step 3:** Fetch on first filter use and keep after first success (case:
      a filter finds a row from page 2; a 50-row roster requests no file).
- [ ] **Step 4:** Loading state (case: the summary says the full roster is
      loading).
- [ ] **Step 5:** "Try again" (case: load failure keeps server rows).
- [ ] **Step 6:** Queued input (case: input typed while loading applies on
      arrival).
- [ ] **Step 7:** Data-version mismatch (case: reload message, server rows kept).
- [ ] **Step 8:** 50 per view with "Previous results"/"Next results" and the
      "entries" summary wording.
- [ ] **Step 9:** A–Z while filtering moves the view (case).
- [ ] **Step 10:** Letter dimming (case).
- [ ] **Step 11:** Server pager hidden while filtering, restored on clear (case).
- [ ] **Step 12:** Focus on the "Matching personnel" heading and one live region
      (keyboard case).
- [ ] **Step 13:** A filtered row matches its server row (case); commit.

## Task 10: Search index (tasks.md 10)

- [ ] **Step 1:** Write the dev-server e2e case: roster pages and
      `/federal/{slug}/personnel/` carry no `data-pagefind-body`.
- [ ] **Step 2:** Move `AgencyTopicPage`'s `PageShell` props into
      `src/lib/agency-topic-shell.ts`; create `AgencyRosterPage.astro` and
      switch both roster routes to it.
- [ ] **Step 3:** Move the body of `CivicAgencyHierarchyPage` into
      `CivicAgencyHierarchyContent.astro`; compose `PageShell` with
      `searchable={false}` in the federal personnel route.
- [ ] **Step 4:** Build and run the case; commit.

## Task 11: EGM contracts (tasks.md 11)

- [ ] **Step 1:** Update each listed `EGM.md`; add one per new folder; commit.

## Task 12: DESIGN.md and AGENTS.md (tasks.md 12)

- [ ] **Step 1:** Add the D8 text to both files; commit.

## Task 13: Tests (tasks.md 13)

- [ ] **Step 1:** Run `npm run test:data` and `npm run test:e2e`; account for
      every skip; commit.

## Task 14: After-measurements and validation (tasks.md 14)

- [ ] **Step 1:** Repeat Task 2 Step 2 and record "After" in `verify.md`, plus
      the largest `roster.json` raw and gzip size.
- [ ] **Step 2:** Run `npm run validate` on the final head; record exit code,
      stage results, test counts and warning dispositions; commit and sync.
