# Cases From Staff Members' Other Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Approval gate:** Do not start Task 1 until the user approves this change (`proposal.md`, `design.md`, `specs/agency-staff-other-job-cases/spec.md`, `tasks.md`, this plan). AGENTS.md: "Do not implement until the user approves."

> **No commit steps.** The owner commits this work in PR #58. Do not run `git add`, `git commit`, `git push` or `git town sync` while running this plan.

**Goal:** Show, on the agency profile page and the agency civil-cases page, a separate "Cases from staff members' other jobs" list with its own count, without changing the agency's own civil-case count, tile or list.

**Architecture:** One new read-only query in `loadAgencyRows` (`src/lib/data/agency-detail.ts`) returns one row per (case, person, case agency) link. A pure builder in `src/lib/data/agency-civil-case-rows.ts` groups those links into one row per case, with every linked person, and orders the rows. The agency profile renders a recent-rows block; the civil-cases routes render a second section through a new component, with one shared page count.

**Tech Stack:** Astro static pages, TypeScript, PostgreSQL through `withDb` (`#src/lib/db.js`), `node --test` for pure units (Node 26 runs `.ts` imports directly), Playwright through `npm run test:e2e`.

**Spec:** `openspec/changes/agency-staff-other-job-cases/specs/agency-staff-other-job-cases/spec.md`, with `design.md` and `brainstorm.md` in the same folder.

## Global Constraints

- Work only in the worktree `~/dev/PoliceConductUS/policeconduct.org/ddl-openspec` (branch `ddl-openspec`). Run every command from that folder.
- Runtime: Node `26.13.1` from `mise.toml`; prefix commands with `mise exec --`.
- The local database on `127.0.0.1:54322` is shared. Every query in this plan is read-only. Do not run `data reset`, `supabase db reset` or `supabase stop`.
- Heading text, exactly: `Cases from staff members' other jobs` (straight apostrophe).
- Explanation sentence, exactly: `These cases are tied to a staff member's job at another agency, not to this agency.`
- Per person, exactly: `{Name} — while at {Agency}` followed by ` (current staff)` or ` (former staff)`.
- Count text: `{n} case` when n is 1, else `{n} cases`, with `n.toLocaleString("en-US")`.
- The agency's own count (`counts.civilCases`), the Civil Cases `StatCell`, the "Recent civil cases" block and the civil-cases page lede `{n} civil cases tied to this agency's personnel records.` do not change.
- No number that adds the own count and the other-jobs count appears anywhere.
- No copy that says or implies verification, fault, conduct, or that the agency was a party.
- Page size: `CIVIL_CASES_PAGE_SIZE = 25` from `src/lib/data/civil-cases.ts`.
- "Current staff" means at least one of the person's `agency_personnel` rows at this agency matches `currentAssignmentSql` (`src/lib/data/annotation-access.js`). Any other person is "former staff".
- Case agency URL = joined `location_path.path` + `agency.slug` + `/`. Link it only when a `build_page_payload` row with `page_type = 'agency'` exists for that agency; otherwise show the name as text.
- No inline CSS, no `style` attributes, no new CSS rules when an existing class fits (`civic-section`, `civic-section-head`, `recent-list`, `record-table`, `row-link`, `muted`, `civic-limit-note`). H2 for the new section heading, from shared tokens (DESIGN.md "Heading Rules").
- No new dependencies. Sort text with `Intl.Collator("en", { numeric: true, sensitivity: "base" })`.
- Required fields fail loudly: a link row with an empty personnel `id`, `slug` or name, or an empty case agency name or path, throws.

## Review Focus

1. **A person with a current and a former assignment at this agency.** Expected: shown as current staff once. Test: Task 2, `marks a person current when any link says current`.
2. **One person linked to one case through two other agencies.** Expected: the person appears once on the row, with both agencies after "while at", joined by `, `. Test: Task 2, `lists every case agency once per person`.
3. **A case with no filed date.** Expected: sorts after dated cases inside its group, then by title. Test: Task 2, `orders current-staff rows first, then newest filed date, then title`.
4. **Other-jobs list longer than the own list (or the reverse).** Expected: page N shows rows only for the lists that reach page N; pages past both lists are not built. Tests: Task 2 `lastAgencyCivilCasesPage`, Task 4 e2e `page past both lists is not built`.
5. **An agency with zero own cases but some other-jobs cases.** Expected: the civil-cases page exists, the own section shows its empty state, the Civil Cases tile still shows the empty value. Test: Task 4 e2e `agency with only other-jobs cases has a civil-cases page`.

## Decision to confirm at approval

- **Own-cases empty state on the civil-cases page.** The spec says "its own-cases section shows its empty state" but no empty state exists today (the table renders with no rows). This plan: when the own list is empty, keep the lede `0 civil cases tied to this agency's personnel records.` and do not render the empty own table. If the owner wants different text, change Task 4 Step 3 before running it.

## File Structure

- Modify `src/lib/data/agency-civil-case-rows.ts` — add link/row types, `buildStaffOtherJobCaseRows`, `lastAgencyCivilCasesPage`. Pure; no database.
- Create `src/lib/data/agency-civil-case-rows.test.mjs` — unit tests for the two new functions.
- Modify `package.json` — add the new test file to `test:data` so `npm run validate` runs it.
- Modify `src/lib/data/agency-detail.ts` — new query in `loadAgencyRows`, new fields in `buildAgencyDetail`, civil-cases eligibility in `agencyTopicWhereSql`.
- Modify `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro` — new profile block.
- Create `src/components/AgencyStaffOtherJobCases.astro` — the civil-cases page section (heading, explanation, count, table).
- Modify `src/components/AgencyCivilCasesPage.astro` — take `otherJobRows`, shared last page, render both sections.
- Modify `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/index.astro` and `.../civil-cases/page/[...page].astro` — pass `otherJobRows`, enumerate pages from both lists.
- Modify `tests/e2e/civil-cases.spec.ts` — new e2e tests.
- Modify EGM.md contracts: `src/lib/data/EGM.md`, `src/components/EGM.md`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`, `.../civil-cases/EGM.md`, `.../civil-cases/page/EGM.md`, `src/EGM.md` only if it states the civil-case page rule.

---

### Task 1: Load other-jobs links in the agency detail

**Files:**

- Modify: `src/lib/data/agency-detail.ts:104-152` (`agencyTopicWhereSql`), `:403-463` (`loadAgencyRows`), `:631-727` (`buildAgencyDetail`)
- Modify: `src/lib/data/agency-civil-case-rows.ts` (types only in this task)
- Test: the e2e tests in Tasks 3 and 4 (they need the database); this task is checked with `npx astro check` and a read-only SQL run.

**Interfaces:**

- Produces, in `agency-civil-case-rows.ts`:
  ```ts
  export type StaffOtherJobCaseLink = {
    civil_case_id: string;
    slug: string;
    title: string | null;
    cause_number: string | null;
    filed_date: string | null;
    date_terminated: string | null;
    court: string | null;
    outcome: string | null;
    personnel_id: string;
    personnel_slug: string;
    first_name: string | null;
    last_name: string | null;
    suffix: string | null;
    is_current_staff: boolean;
    case_agency_id: string;
    case_agency_name: string;
    case_agency_path: string;
    case_agency_has_page: boolean;
  };
  ```
- Produces, on `loadAgencyDetail` result: `staffOtherJobCaseLinks: StaffOtherJobCaseLink[]` (from `loadAgencyRows`), `staffOtherJobCivilCases: StaffOtherJobCaseRow[]` (Task 2 builder), `counts.staffOtherJobCivilCases: number` (= `staffOtherJobCivilCases.length`).
- Produces: `loadAgencyLocationStaticPathsForTopic("civil-cases")` returns agencies with own cases **or** other-jobs cases.

- [ ] **Step 1: Write the query and run it read-only against the shared database before wiring it in.** Save to the scratchpad, run with `psql "$DATABASE_URL" -v agency_id=<id>` for one agency that the e2e query in `tests/e2e/civil-cases.spec.ts:116-166` selects. Query shape (start from `git show 9d787c1:src/lib/data/agency-detail.ts`, `personnelLinkedCivilCases`):

  ```sql
  with staff as (
    select ap.personnel_id,
           bool_or(<currentAssignmentSql("ap")>) as is_current_staff
    from public.agency_personnel ap
    where ap.agency_id = $1
    group by ap.personnel_id
  )
  select distinct
    c.id as civil_case_id, c.slug, c.title, c.cause_number,
    c.filed_date::text as filed_date, c.date_terminated::text as date_terminated,
    c.court, c.outcome,
    p.id as personnel_id, p.slug as personnel_slug, p.first_name, p.last_name, p.suffix,
    staff.is_current_staff,
    case_agency.id as case_agency_id, case_agency.name as case_agency_name,
    case_lp.path || case_agency.slug || '/' as case_agency_path,
    (case_bpp.entity_id is not null) as case_agency_has_page
  from public.civil_case_personnel ccp
  join public.agency_personnel case_ap on case_ap.id = ccp.agency_personnel_id
  join staff on staff.personnel_id = case_ap.personnel_id
  join public.civil_cases c on c.id = ccp.civil_case_id
  join public.personnel p on p.id = case_ap.personnel_id
  join public.agency case_agency on case_agency.id = case_ap.agency_id
  join public.location_path case_lp on case_lp.location_path_id = case_agency.location_path_id
  left join public.build_page_payload case_bpp
    on case_bpp.page_type = 'agency' and case_bpp.entity_id = case_agency.id
  where case_ap.agency_id <> $1
    and not exists (
      select 1
      from public.civil_case_personnel own_ccp
      join public.agency_personnel own_ap on own_ap.id = own_ccp.agency_personnel_id
      where own_ccp.civil_case_id = c.id and own_ap.agency_id = $1
    )
  ```

  Differences from the predecessor, on purpose: `staff` CTE replaces the `lateral ... limit 1` (current wins across all assignments, spec "A person with any current assignment"); `case_bpp` is a `left join` (spec "The case agency has no page"); no `order by` (Task 2 orders).

  Expected: rows return; no `civil_case_id` in the result is also in `select distinct ccp.civil_case_id from public.civil_case_personnel ccp join public.agency_personnel ap on ap.id = ccp.agency_personnel_id where ap.agency_id = $1`.

- [ ] **Step 2: Add `StaffOtherJobCaseLink` to `agency-civil-case-rows.ts`.**

- [ ] **Step 3: Add the query to `loadAgencyRows`** as `staffOtherJobCaseLinks`, using `client.query<StaffOtherJobCaseLink>(sql, [agencyId])`, `currentAssignmentSql` imported from `./annotation-access.js`. Return it with the other fields.

- [ ] **Step 4: Extend the `"civil-cases"` branch of `agencyTopicWhereSql`** to `exists (own) or exists (other-jobs)`, where other-jobs is: a `civil_case_personnel` row on an `agency_personnel` row with `agency_id <> bpp.entity_id` for a `personnel_id` that has an `agency_personnel` row at `bpp.entity_id`, and the same `not exists` as Step 1 with `bpp.entity_id` in place of `$1`.

- [ ] **Step 5: In `buildAgencyDetail`, set `staffOtherJobCivilCases` and `counts.staffOtherJobCivilCases`** after Task 2 exists. Until then, leave this step unchecked and do Task 2 first if running strictly in order. `counts.civilCases` stays `civilCases.length`.

- [ ] **Step 6: Type check.**
      Run: `mise exec -- npx astro check`
      Expected: `0 errors`, `0 warnings`, `0 hints`.

### Task 2: Group and order other-jobs rows

**Files:**

- Modify: `src/lib/data/agency-civil-case-rows.ts`
- Create: `src/lib/data/agency-civil-case-rows.test.mjs`
- Modify: `package.json` (`test:data` adds `src/lib/data/agency-civil-case-rows.test.mjs`)

**Interfaces:**

- Consumes: `StaffOtherJobCaseLink` (Task 1).
- Produces:
  ```ts
  export type StaffOtherJobCaseAgency = {
    id: string;
    name: string;
    href: string | null;
  };
  export type StaffOtherJobPerson = {
    id: string;
    name: string;
    href: string; // `/personnel/${slug}/`
    isCurrentStaff: boolean;
    caseAgencies: StaffOtherJobCaseAgency[];
  };
  export type StaffOtherJobCaseRow = Omit<
    CivilCaseRow,
    "personnel" | "personnelNames"
  > & {
    staff: StaffOtherJobPerson[];
    hasCurrentStaff: boolean;
  };
  export const buildStaffOtherJobCaseRows: (
    links: StaffOtherJobCaseLink[],
  ) => StaffOtherJobCaseRow[];
  export const lastAgencyCivilCasesPage: (
    rowCounts: number[],
    pageSize: number,
  ) => number; // max(1, ...ceil(n / pageSize))
  ```
- Rules the tests pin: one row per `civil_case_id`; one person per `personnel_id` in a row; a person is current when any of their links has `is_current_staff`; `caseAgencies` unique by `id`, sorted by name; `href` is `case_agency_path` when `case_agency_has_page`, else `null`; person name is `[first_name, last_name, suffix]` non-empty parts joined by a space; `outcome` uses the existing `getOutcomeLabel`; `caseUrl` is `/civil-cases/${slug}/`; staff in a row are ordered current first, then last name, first name; rows ordered `hasCurrentStaff` first, then `filed_date` newest first (null last), then title.

- [ ] **Step 1: Write the failing tests** in `src/lib/data/agency-civil-case-rows.test.mjs`, importing from `./agency-civil-case-rows.ts`, with a `link(overrides)` fixture helper (synthetic ids like `case-1`, `person-1`, names like `Pat Example`; no real people):
  - `groups links into one row per case`: two links, same `civil_case_id`, different `personnel_id` → 1 row, `staff.map(s => s.id)` deep-equals both ids.
  - `lists every case agency once per person`: same case and person, `case_agency_id` `agency-b` and `agency-c`, plus a duplicate `agency-b` link → `staff[0].caseAgencies.map(a => a.id)` deep-equals `["agency-b", "agency-c"]`.
  - `marks a person current when any link says current`: same case and person, `is_current_staff` `false` then `true` → `staff[0].isCurrentStaff === true`, `row.hasCurrentStaff === true`.
  - `links a case agency only when it has a page`: `case_agency_has_page: false` → `href === null`; `true` with `case_agency_path: "/tx/x/y/agency-b/"` → `href === "/tx/x/y/agency-b/"`.
  - `orders current-staff rows first, then newest filed date, then title`: rows A (former, `2024-05-01`), B (current, `2019-01-01`), C (current, `2021-01-01`), D (current, `null`), E (current, `2021-01-01`, title sorting before C) → slugs `["e", "c", "b", "d", "a"]`.
  - `throws when a required person field is missing`: `personnel_slug: ""` → `assert.throws(..., /personnel/)`.
  - `lastAgencyCivilCasesPage`: `([0, 0], 25) === 1`, `([25, 0], 25) === 1`, `([26, 3], 25) === 2`, `([3, 51], 25) === 3`.

- [ ] **Step 2: Run the tests and confirm they fail.**
      Run: `mise exec -- node --test src/lib/data/agency-civil-case-rows.test.mjs`
      Expected: FAIL, `buildStaffOtherJobCaseRows` / `lastAgencyCivilCasesPage` is not a function (or not exported).

- [ ] **Step 3: Implement the types and the two functions** in `agency-civil-case-rows.ts` per the Interfaces block. Reuse `getOutcomeLabel`; hoist the existing collator and `getTime` to module scope so both builders share them. Use only erasable TypeScript (no `enum`, no parameter properties), so Node can import the file.

- [ ] **Step 4: Run the tests and confirm they pass.**
      Run: `mise exec -- node --test src/lib/data/agency-civil-case-rows.test.mjs`
      Expected: PASS, 7 tests, 0 fail, 0 skipped.

- [ ] **Step 5: Add the test file to `test:data` in `package.json`** and finish Task 1 Step 5 (`staffOtherJobCivilCases: buildStaffOtherJobCaseRows(data.staffOtherJobCaseLinks)`).
      Run: `mise exec -- npm run test:data && mise exec -- npx astro check`
      Expected: all `test:data` tests pass; `astro check` reports 0 errors, 0 warnings, 0 hints.

### Task 3: Agency profile block

**Files:**

- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro:223-258` (recent items) and `:543-560` (after "Recent civil cases")

**Interfaces:**

- Consumes: `data.staffOtherJobCivilCases`, `data.counts.staffOtherJobCivilCases` (Tasks 1-2). Existing `formatDate`, `formatCount`, `agencyPath`.

- [ ] **Step 1: Write the failing e2e test** `agency page lists cases from staff members' other jobs separately` in `tests/e2e/civil-cases.spec.ts`. Select the agency with independent SQL (pattern at `:116-166`): agency with own count ≥ 1 and other-jobs count ≥ 1; compute `own_count`, `other_count` (distinct cases, same rule as Task 1 Step 1, written again in the test, not imported). Assert on `agency.path`:
  - Civil Cases stat cell `.ledger-value` has text `own_count` (unchanged, same locator as `:175-181`).
  - `page.getByRole("region", { name: "Cases from staff members' other jobs" })` is visible and contains the explanation sentence and `` `${other_count} case${other_count === 1 ? "" : "s"}` ``.
  - The region has `min(other_count, 6)` links in `.recent-list`, each `href` in the SQL set of `/civil-cases/{slug}/`.
  - Body text does not match ``new RegExp(`\\b${(own_count + other_count).toLocaleString("en-US")} (civil )?cases?\\b`)`` (no combined total), when `own_count + other_count` differs from both counts.
  - The region text does not match `/verif|confirm|fact.check|at fault|misconduct/i`.

- [ ] **Step 2: Run it and confirm it fails.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts -g "other jobs separately"`
      Expected: FAIL, region not found.

- [ ] **Step 3: Add the block** directly after the "Recent civil cases" section, rendered only when `counts.staffOtherJobCivilCases > 0`:
      `<section class="civic-section" aria-labelledby="staff-other-job-cases">`, `civic-section-head` with `<h2 id="staff-other-job-cases">` (heading text from Global Constraints) and `<p>` explanation sentence, then `<p class="civic-limit-note">` count text, then `.recent-list` of the first 6 `staffOtherJobCivilCases` rows (already ordered; do not re-sort by date). Each item: `<a href={row.caseUrl}>`, title span `row.title || "Civil case"`, meta span = `["Civil case", row.court, filed ? "Filed " + formatDate(filed) : null, row.outcome]` joined with `·`, then a second meta span listing staff as `{name} — while at {agency names joined ", "} ({current|former} staff)` joined with `; ` (text only — no nested links inside the `<a>`). Then a link `View all cases from staff members' other jobs →` to `${agencyPath}civil-cases/`. Do not touch the `StatCell` for Civil Cases or `recentCases`.

- [ ] **Step 4: Run the test and confirm it passes.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts -g "other jobs separately"`
      Expected: PASS.

### Task 4: Agency civil-cases page section and routes

**Files:**

- Create: `src/components/AgencyStaffOtherJobCases.astro`
- Modify: `src/components/AgencyCivilCasesPage.astro`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/index.astro`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page].astro`

**Interfaces:**

- Consumes: `StaffOtherJobCaseRow`, `lastAgencyCivilCasesPage` (Task 2); `CIVIL_CASES_PAGE_SIZE`.
- Produces: `AgencyStaffOtherJobCases` props `{ count: number; currentPage: number; lastPage: number; rows: StaffOtherJobCaseRow[] }` where `rows` is already the page slice and `lastPage` is this list's own last page.
- Produces: `AgencyCivilCasesPage` props `{ currentPage: number; data; rows: CivilCaseRow[]; otherJobRows: StaffOtherJobCaseRow[] }`.

- [ ] **Step 1: Write the failing e2e tests** in `tests/e2e/civil-cases.spec.ts`:
  - `agency civil-cases page lists other-jobs cases in their own table`: same agency selection as Task 3. On `${path}civil-cases/` and each later page up to `ceil(other_count / 25)`, collect `href`s of `region "Cases from staff members' other jobs"` table `a.row-link`; the union equals the SQL set; the own table's `a.row-link` set is disjoint from it; lede still reads `` `${own_count} civil cases tied to this agency's personnel records.` ``.
  - `a shared case appears once and names every linked staff member`: SQL picks a case with ≥ 2 distinct linked staff of one agency (same rule); on that agency's civil-cases pages the case's `href` appears in exactly one row, and that row contains each person's name and `while at {case agency name}`.
  - `current-staff rows come first`: on page 1 of an agency whose other-jobs list has both a row with `(current staff)` and a row with only `(former staff)`, no row containing `(current staff)` follows a row without it.
  - `agency with only other-jobs cases has a civil-cases page`: SQL picks an agency with own count 0 and other count ≥ 1; `${path}civil-cases/` returns 200, lede reads `0 civil cases tied to this agency's personnel records.`, no own table, and the other-jobs region lists `min(other_count, 25)` rows.
  - `page past both lists is not built`: for the Task 3 agency, `page.goto(`${path}civil-cases/page/${last + 1}/`)` returns status 404, where `last = max(1, ceil(own/25), ceil(other/25))`.

- [ ] **Step 2: Run them and confirm they fail.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts`
      Expected: the five new tests FAIL; the existing tests still pass.

- [ ] **Step 3: Implement.**
  - `AgencyStaffOtherJobCases.astro`: `<section aria-labelledby="staff-other-job-cases">`, `civic-section-head` with `<h2 id="staff-other-job-cases">`, explanation `<p>`, count `<p class="civic-limit-note">`, `Page {currentPage} of {lastPage}` line only when `lastPage > 1`, then `TableScroll` + `table.record-table` with the existing columns (Case, Cause number, Court, Filed, Outcome) plus `Staff members`: one line per person, `<a href={person.href}>{name}</a> — while at ` + each agency as `<a>` when `href` else text, joined `, `, then ` (current staff)` / ` (former staff)`. Move the `formatDate` arrow from `AgencyCivilCasesPage.astro` into `agency-civil-case-rows.ts` as `export const formatCivilCaseDate = (value?: string | null): string` (same `en-US`, `UTC`, `year: "numeric", month: "short", day: "numeric"` options) and import it in both components, so the date format is not duplicated.
  - `AgencyCivilCasesPage.astro`: `lastPage = lastAgencyCivilCasesPage([rows.length, otherJobRows.length], CIVIL_CASES_PAGE_SIZE)`; keep the existing throw for `currentPage` outside `1..lastPage`. Own table renders only when this page has own rows (empty own list on page 1 → no table, lede unchanged; see "Decision to confirm"). Render `AgencyStaffOtherJobCases` only when this page has other-jobs rows, with its own last page `ceil(otherJobRows.length / CIVIL_CASES_PAGE_SIZE)`. One `Pagination` with the shared `lastPage`. Keep the existing `civic-limit-note` about court dockets last.
  - `civil-cases/index.astro`: pass `otherJobRows={data.staffOtherJobCivilCases}`.
  - `civil-cases/page/[...page].astro`: in `getStaticPaths`, `lastPage = lastAgencyCivilCasesPage([buildAgencyCivilCaseRows(data).length, data.staffOtherJobCivilCases.length], CIVIL_CASES_PAGE_SIZE)`; params only, no props. Render passes `otherJobRows={data.staffOtherJobCivilCases}`.

- [ ] **Step 4: Run the e2e file and confirm all tests pass.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts`
      Expected: all tests PASS, 0 skipped.

- [ ] **Step 5: Type check and inline-CSS check.**
      Run: `mise exec -- npx astro check`
      Expected: 0 errors, 0 warnings, 0 hints.
      Then audit H1/H2 on the two changed pages (DESIGN.md "Verification"): one H1; the new heading is an H2 with no page-local heading CSS.

### Task 5: EGM.md contracts and full validation

**Files:**

- Modify: `src/lib/data/EGM.md` (`agency-civil-case-rows.ts`, `agency-detail.ts` sections)
- Modify: `src/components/EGM.md` (`AgencyCivilCasesPage`, new `AgencyStaffOtherJobCases`)
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/EGM.md` (replace the invariant "A person's cases from other agencies are not listed." with the two-section rule)
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/EGM.md`

Other agents are editing EGM.md files in this worktree. Before editing each file, re-read it; edit only the lines about this change; do not reformat other sections.

- [ ] **Step 1: Update each contract** with `[file:anchor]` citations in the existing style, e.g. `[agency-civil-case-rows.ts:buildStaffOtherJobCaseRows]`, `[agency-detail.ts:staffOtherJobCaseLinks]`, `[AgencyCivilCasesPage.astro:lastAgencyCivilCasesPage]`, `[index.astro:otherJobRows={data.staffOtherJobCivilCases}]`. State: the other-jobs list is separate, its count is separate, never summed; eligibility includes either list; page N shows page N of each list.

- [ ] **Step 2: Run the citation check** on the changed contracts: every `[path:anchor]` anchor must appear verbatim in the cited file relative to the contract's folder.
      Run (one contract per call):

  ```bash
  d='src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases'
  grep -o '`\?\[[^]]*\.\(ts\|js\|mjs\|astro\):[^]]*\]' "$d/EGM.md" | tr -d '`' | sed 's/^\[//;s/\]$//' |
  while IFS= read -r c; do f="${c%%:*}"; a="${c#*:}"; grep -qF -- "$a" "$d/$f" || echo "MISSING: $c"; done
  ```

  Expected: no `MISSING:` lines for any changed contract.

- [ ] **Step 3: Format.**
      Run: `mise exec -- npx prettier --write <each changed file>` then `mise exec -- npm run format:check`
      Expected: `All matched files use Prettier code style!`

- [ ] **Step 4: Verify runtime and dependencies.**
      Run: `mise exec -- node --version && mise exec -- npm ci && mise exec -- npm ls --depth=0`
      Expected: `v26.13.1`; `npm ci` exits 0; `npm ls` shows no `invalid` or `missing`.

- [ ] **Step 5: Run the full gate on the final head.**
      Run: `mise exec -- npm run validate`
      Expected: exit 0; every stage passes (`format:check`, `lint`, `validate:types`, `validate:shell`, `validate:schema`, `validate:openspec`, `scan:personal-data`, `test` including `test:data` with the new unit file and `test:e2e` with the new specs). Record test counts, every warning and hint with its fix, and every skipped test (expected: none). Fix any finding, including pre-existing ones, and rerun.

- [ ] **Step 6: Hand back to the owner.** List each changed file with the task that required it, the `npm run validate` evidence, and the state: worktree `ddl-openspec`, nothing committed by this plan (the owner commits in PR #58), nothing pushed, nothing merged.
