# Cases From Staff Members' Other Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Approval gate:** Do not start Task 1 until the user approves this change (`proposal.md`, `design.md`, `specs/agency-staff-other-job-cases/spec.md`, `specs/civil-case-content/spec.md`, `tasks.md`, this plan). AGENTS.md: "Do not implement until the user approves."

> **No commit steps.** The owner commits this work in [PR #58](https://github.com/PoliceConductUS/policeconduct.org/pull/58) (branch `ddl-openspec`), on top of the count-rule commit. Do not run `git add`, `git commit`, `git push` or `git town sync` while running this plan.

**Goal:** Show, on the agency profile page and the agency civil-cases page, a separate "Cases from staff members' other jobs" list with its own count, without changing the agency's own civil-case count, tile or list.

**Architecture:** One new read-only query in `loadAgencyRows` (`src/lib/data/agency-detail.ts`) returns one row per (case, person, case agency) link. The other-jobs rule lives in one exported SQL fragment, `staffOtherJobCaseLinkSql`, used by the loader, page eligibility and sitemap lastmod. A pure builder in `src/lib/data/agency-civil-case-rows.ts` groups those links into one row per case, with every linked person, sets each person's status with `getAssignmentStatus`, and orders the rows. The agency profile renders a recent-rows block; the civil-cases routes render a second section through a new component, with one shared page control.

**Tech Stack:** Astro static pages, TypeScript, PostgreSQL through `withDb` (`#src/lib/db.js`), `node --test` for pure units (Node 26 runs `.ts` imports directly), Playwright through `npm run test:e2e`.

**Spec:** `openspec/changes/agency-staff-other-job-cases/specs/agency-staff-other-job-cases/spec.md` and `specs/civil-case-content/spec.md`, with `design.md` and `brainstorm.md` in the same folder.

## Global Constraints

- Work only in the worktree `~/dev/PoliceConductUS/policeconduct.org/ddl-openspec` (branch `ddl-openspec`). Run every command from that folder.
- Runtime: Node `26.13.1` from `mise.toml`; prefix commands with `mise exec --`.
- The local database on `127.0.0.1:54322` is shared. Every query in this plan is read-only. Do not run `data reset`, `supabase db reset` or `supabase stop`.
- Never write a database row ID (agency, person or case) into a committed file, test or doc. Tests select their rows with SQL at run time.
- Heading text, exactly: `Cases from staff members' other jobs` (straight apostrophe).
- Explanation sentence, exactly: `These cases are tied to a staff member's job at another agency, not to this agency.`
- Own-cases heading on the civil-cases page, exactly: `Cases tied to this agency's personnel records`.
- Per person, exactly: `{Name} — while at {Agency}[, {Agency}...]` followed by ` (current staff)`, ` (former staff)`, or nothing when the status is unknown.
- Ended-list line, exactly: `No more cases in this list.`
- Count text: `{n} case` when n is 1, else `{n} cases`, with `n.toLocaleString("en-US")`.
- The agency's own count (`counts.civilCases`), the Civil Cases `StatCell`, the "Recent civil cases" block and the civil-cases page lede `{n} civil cases tied to this agency's personnel records.` do not change.
- No number that adds the own count and the other-jobs count appears anywhere.
- No section copy that claims verification, accuracy, fault, misconduct, or that this agency was a party (spec "Other-jobs labels describe the link without judgment").
- Page size: `CIVIL_CASES_PAGE_SIZE = 25` from `src/lib/data/civil-cases.ts`.
- Staff status: spec "Staff status follows the agency personnel list rule" (`getAssignmentStatus` in `src/lib/data/assignment-status.js`; current wins, then former, else unknown). No status rule in SQL.
- Case agency URL = joined `location_path.path` + `agency.slug` + `/`. Link it only when a `build_page_payload` row with `page_type = 'agency'` exists for that agency; otherwise show the name as text.
- No inline CSS, no `style` attributes, no new CSS rules when an existing class fits (`civic-section`, `civic-section-head`, `recent-list`, `recent-list-title`, `recent-list-meta`, `record-table`, `row-link`, `muted`, `civic-limit-note`). H2 for the new section headings, from shared tokens (DESIGN.md "Heading Rules").
- No new dependencies. Sort text with `Intl.Collator("en", { numeric: true, sensitivity: "base" })`.
- Required fields fail loudly: a link row with an empty personnel `id`, `slug` or name, an empty case `slug`, `title` or `filed_date`, or a missing joined personnel row, case agency row or case agency location path, throws.

## Review Focus

1. **A person with a current and a former assignment at this agency.** Expected: shown as current staff once. Test: Task 2, `marks a person current when any assignment here is current`.
2. **One person linked to one case through two other agencies.** Expected: the person appears once on the row, with both agencies after "while at", joined by `, `. Test: Task 2, `lists every case agency once per person`.
3. **A person whose assignment dates do not support a status.** Expected: no status text; the row sorts with the rows that have no current staff member. Tests: Task 2, `marks a person with a future start date as unknown`, `marks a person with an invalid end date as unknown`, `sorts unknown-only rows with former-only rows`.
4. **Other-jobs list longer than the own list (or the reverse).** Expected: page N shows rows for the lists that reach page N; a list that ended shows its heading and `No more cases in this list.`; pages past both lists are not built. Tests: Task 2 `lastAgencyCivilCasesPage`, Task 4 e2e `page past both lists is not built`.
5. **An agency with zero own cases but some other-jobs cases.** Expected: the civil-cases page exists, the lede reads `0 civil cases tied to this agency's personnel records.`, no own-cases table is shown, the Civil Cases tile still shows the empty value. Test: Task 4 e2e `agency with only other-jobs cases has a civil-cases page`.

## File Structure

- Modify `src/lib/data/agency-civil-case-rows.ts` — add link/row types, `buildStaffOtherJobCaseRows`, `lastAgencyCivilCasesPage`. Pure; no database.
- Create `src/lib/data/agency-civil-case-rows.test.mjs` — unit tests for the two new functions.
- Modify `package.json` — add the new test file to `test:data` so `npm run validate` runs it.
- Modify `src/lib/data/agency-detail.ts` — add `const staffOtherJobCaseLinkSql = (agencyIdExpr: string) => \`...\``, which returns the `from ... where`body (the`civil_case_personnel`→`agency_personnel case_ap`join, the`case_ap.agency_id <> ${agencyIdExpr}`filter, the same-person-at-this-agency`exists`, and the `not exists`own-link check); new query in`loadAgencyRows`; new fields in `buildAgencyDetail`; civil-cases eligibility in `agencyTopicWhereSql`. Export the fragment for `sitemap-lastmod.js`.
- Modify `src/lib/sitemap-lastmod.js` — agency lastmod also considers other-jobs cases.
- Modify `src/lib/format.js` — add `formatCivilCaseDate`.
- Modify `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro` — new profile block.
- Create `src/components/AgencyStaffOtherJobCases.astro` — the civil-cases page section (heading, explanation, count, table).
- Modify `src/components/AgencyCivilCasesPage.astro` — take `otherJobRows`, shared last page, render both sections.
- Modify `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/index.astro` and `.../civil-cases/page/[...page].astro` — pass `otherJobRows`, enumerate pages from both lists.
- Modify `tests/e2e/civil-cases.spec.ts` — new e2e tests.
- Modify EGM.md contracts: `src/lib/data/EGM.md`, `src/lib/EGM.md` (if it covers `format.js` or `sitemap-lastmod.js`), `src/components/EGM.md`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`, `.../civil-cases/EGM.md`, `.../civil-cases/page/EGM.md`, `src/EGM.md` (line 20: the `AgencyCivilCasesPage.astro:rows.length / CIVIL_CASES_PAGE_SIZE` citation).
- Modify `AGENTS.md` — the civil-case Agency bullet (task 4.7).

## Tasks

### Task 1: Load other-jobs links in the agency detail

**Files:**

- Modify: `src/lib/data/agency-detail.ts` — `agencyTopicWhereSql` (the `civil-cases` branch, the final `return`), `loadAgencyRows`, `buildAgencyDetail`
- Modify: `src/lib/data/agency-civil-case-rows.ts` (types only in this task)
- Modify: `src/lib/sitemap-lastmod.js`
- Test: the e2e tests in Tasks 3 and 4 (they need the database); this task is checked with `npx astro check` and a read-only SQL run.

**Interfaces:**

- Produces, in `agency-civil-case-rows.ts`:
  ```ts
  export type StaffAssignmentDates = {
    start_date: string | null;
    end_date: string | null;
    data_source_values: unknown;
  };
  export type StaffOtherJobCaseLink = {
    civil_case_id: string;
    slug: string;
    title: string;
    cause_number: string | null;
    filed_date: string;
    date_terminated: string | null;
    court: string | null;
    outcome: string | null;
    personnel_id: string | null;
    personnel_slug: string | null;
    first_name: string | null;
    last_name: string | null;
    staff_assignments: StaffAssignmentDates[];
    case_agency_id: string | null;
    case_agency_name: string | null;
    case_agency_path: string | null;
    case_agency_has_page: boolean;
  };
  ```
  The personnel and case agency fields are nullable because of the left joins; the builder throws when any of them is missing.
- Produces, on `loadAgencyDetail` result: `staffOtherJobCaseLinks: StaffOtherJobCaseLink[]` (from `loadAgencyRows`), `staffOtherJobCivilCases: StaffOtherJobCaseRow[]` (Task 2 builder), `counts.staffOtherJobCivilCases: number` (= `staffOtherJobCivilCases.length`).
- Produces: `loadAgencyLocationStaticPathsForTopic("civil-cases")` returns agencies with own cases **or** other-jobs cases.

- [ ] **Step 1 (1.1, 1.4): Write the query and run it read-only against the shared database before wiring it in.** Save a scratchpad script (not committed) that imports `withDb` and the SQL fragment from Step 3 (or, before wiring, the query text) and runs it with `client.query(sql, [agencyId])`, where `agencyId` comes from the selection query in `tests/e2e/civil-cases.spec.ts` (run at the same time, never typed in by hand). Do not write the id into any committed file, test or doc. Query shape (start from `personnelLinkedCivilCases` in `src/lib/data/agency-detail.ts` on `main`, removed on this branch):

  ```sql
  select distinct
    c.id as civil_case_id, c.slug, c.title, c.cause_number,
    c.filed_date::text as filed_date, c.date_terminated::text as date_terminated,
    c.court, c.outcome,
    p.id as personnel_id, p.slug as personnel_slug, p.first_name, p.last_name,
    (
      select jsonb_agg(jsonb_build_object(
        'start_date', own_ap.start_date,
        'end_date', own_ap.end_date,
        'data_source_values', own_ap.data_source_values))
      from public.agency_personnel own_ap
      where own_ap.agency_id = $1 and own_ap.personnel_id = link.personnel_id
    ) as staff_assignments,
    case_agency.id as case_agency_id, case_agency.name as case_agency_name,
    case_lp.path || case_agency.slug || '/' as case_agency_path,
    (case_bpp.entity_id is not null) as case_agency_has_page
  from (
    select ccp.civil_case_id, case_ap.personnel_id, case_ap.agency_id
    ${staffOtherJobCaseLinkSql("$1")}
  ) link
  join public.civil_cases c on c.id = link.civil_case_id
  left join public.personnel p on p.id = link.personnel_id
  left join public.agency case_agency on case_agency.id = link.agency_id
  left join public.location_path case_lp on case_lp.location_path_id = case_agency.location_path_id
  left join public.build_page_payload case_bpp
    on case_bpp.page_type = 'agency' and case_bpp.entity_id = case_agency.id
  ```

  where `staffOtherJobCaseLinkSql(agencyIdExpr)` returns:

  ```sql
  from public.civil_case_personnel ccp
  join public.agency_personnel case_ap on case_ap.id = ccp.agency_personnel_id
  where case_ap.agency_id <> ${agencyIdExpr}
    and exists (
      select 1 from public.agency_personnel here_ap
      where here_ap.agency_id = ${agencyIdExpr}
        and here_ap.personnel_id = case_ap.personnel_id
    )
    and not exists (
      select 1
      from public.civil_case_personnel own_ccp
      join public.agency_personnel own_ap on own_ap.id = own_ccp.agency_personnel_id
      where own_ccp.civil_case_id = ccp.civil_case_id and own_ap.agency_id = ${agencyIdExpr}
    )
  ```

  `jsonb` (not `json`) keeps `select distinct` valid, since `json` has no equality operator. Links whose `case_ap.agency_id` is null are excluded by `case_ap.agency_id <> $1` (SQL null comparison); this is intended — such an assignment has no other agency to name.

  Differences from the predecessor, on purpose: no current/former rule in SQL (each person's assignments at this agency are returned and the builder applies `getAssignmentStatus`); `personnel`, case `agency` and `location_path` are `left join`s so a broken link reaches the builder and throws; `case_bpp` is a `left join` (spec "The case agency has no page"); the case agency URL comes from `location_path.path` + `agency.slug`, not `case_bpp.path` as before (AGENTS.md: agency URLs from the joined location path); no `order by` (Task 2 orders).

  Expected: rows return; no `civil_case_id` in the result is also in `select distinct ccp.civil_case_id from public.civil_case_personnel ccp join public.agency_personnel ap on ap.id = ccp.agency_personnel_id where ap.agency_id = $1`.

  Also run `EXPLAIN (ANALYZE, BUFFERS)` on the query for that agency and record the execution time (no ids) for the hand-back.

- [ ] **Step 1b (1.4): Check that the e2e tests have data.** Write and run, read-only, the selection query for each e2e test: (1) own ≥ 1 and other ≥ 1; (2) a case with ≥ 2 distinct staff of one agency linked through other jobs; (3) a page-1 other-jobs list with a current-staff row and a row without one (select on rendered builder output if the three-state status rule makes SQL selection impractical, and say so); (4) own = 0 and other ≥ 1; (5) the Task 3 agency for the past-the-end page. Record each result count (counts only, no ids or names) in the hand-back. If any is 0, stop and report: the test would have no data.

- [ ] **Step 2 (1.1): Add `StaffAssignmentDates` and `StaffOtherJobCaseLink` to `agency-civil-case-rows.ts`.**

- [ ] **Step 3 (1.1): Add `staffOtherJobCaseLinkSql` and the query to `agency-detail.ts`.** Add the query to `loadAgencyRows` as `staffOtherJobCaseLinks`, using `client.query<StaffOtherJobCaseLink>(sql, [agencyId])`. Return it with the other fields.

- [ ] **Step 4 (1.3): Extend the `"civil-cases"` branch of `agencyTopicWhereSql`** to `exists (own) or exists (select 1 ${staffOtherJobCaseLinkSql("a.id")})`.

- [ ] **Step 5 (1.5): Include other-jobs cases in the agency lastmod** in `src/lib/sitemap-lastmod.js`: the agency query also takes the max `civil_cases.updated_at` over `staffOtherJobCaseLinkSql("a.id")` links. Expected: an other-jobs case's `updated_at` can move the agency profile and civil-cases page lastmod.

- [ ] **Step 6: Type check.**
      Run: `mise exec -- npx astro check`
      Expected: `0 errors`, `0 warnings`, `0 hints`.

### Task 2: Group and order other-jobs rows

**Files:**

- Modify: `src/lib/data/agency-civil-case-rows.ts`
- Create: `src/lib/data/agency-civil-case-rows.test.mjs`
- Modify: `package.json` (`test:data` adds `src/lib/data/agency-civil-case-rows.test.mjs`)

**Interfaces:**

- Consumes: `StaffOtherJobCaseLink` (Task 1); `getAssignmentStatus` (`src/lib/data/assignment-status.js`).
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
    status: "current" | "former" | "unknown";
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
    options?: { now?: Date },
  ) => StaffOtherJobCaseRow[];
  export const lastAgencyCivilCasesPage: (
    rowCounts: number[],
    pageSize: number,
  ) => number; // max(1, ...ceil(n / pageSize))
  ```
- Rules the tests pin: one row per `civil_case_id`; one person per `personnel_id` in a row; a person's `status` is `"current"` when `getAssignmentStatus` says any of their `staff_assignments` is current, otherwise `"former"` when any has ended, otherwise `"unknown"`; `hasCurrentStaff` is true when any person is current; `caseAgencies` unique by `id`, sorted by name; `href` is `case_agency_path` when `case_agency_has_page`, else `null`; person name uses the same rule as `getOfficerName` in `agency-civil-case-rows.ts` (first and last name); case agency `name` goes through `toDisplayName`; `outcome` is shown the same way as the own list on the same page (civil-cases page: as `buildAgencyCivilCaseRows` does; profile block: as the "Recent civil cases" items do); `caseUrl` is `/civil-cases/${slug}/`; staff in a row are ordered current first, then last name, first name; rows ordered `hasCurrentStaff` first, then `filed_date` newest first, then title.

- [ ] **Step 1 (1.2): Write the failing tests** in `src/lib/data/agency-civil-case-rows.test.mjs`, importing from `./agency-civil-case-rows.ts`, with a `link(overrides)` fixture helper (synthetic ids like `case-1`, `person-1`, names like `Pat Example`; no real people; dates relative to an injected `now`, passed as `{ now }`):
  - `groups links into one row per case`: two links, same `civil_case_id`, different `personnel_id` → 1 row, `staff.map(s => s.id)` deep-equals both ids.
  - `lists every case agency once per person`: same case and person, `case_agency_id` `agency-b` and `agency-c`, plus a duplicate `agency-b` link → `staff[0].caseAgencies.map(a => a.id)` deep-equals `["agency-b", "agency-c"]`.
  - `marks a person current when any assignment here is current`: `staff_assignments` with one ended and one open assignment → `staff[0].status === "current"`, `row.hasCurrentStaff === true`.
  - `marks a person with a future start date as unknown`: only assignment starts after `now`, no end date → `status === "unknown"`.
  - `marks a person with an invalid end date as unknown`: only assignment has an unreadable end date → `status === "unknown"`.
  - `sorts unknown-only rows with former-only rows`: an unknown-only row with a newer filed date and a former-only row with an older one, plus a current row → current row first, then the unknown-only row, then the former-only row.
  - `links a case agency only when it has a page`: `case_agency_has_page: false` → `href === null`; `true` with `case_agency_path: "/tx/x/y/agency-b/"` → `href === "/tx/x/y/agency-b/"`.
  - `orders current-staff rows first, then newest filed date, then title`: rows A (former, `2024-05-01`), B (current, `2019-01-01`), C (current, `2021-01-01`), E (current, `2021-01-01`, title sorting before C) → slugs `["e", "c", "b", "a"]`.
  - `throws when a required person field is missing`: `personnel_slug: ""` → `assert.throws(..., /personnel/)`.
  - `throws when the case agency path is missing`: `case_agency_path: null` → `assert.throws(..., /agency/)`.
  - `throws when filed_date is missing`: `filed_date: ""` → `assert.throws(..., /filed_date/)`.
  - `lastAgencyCivilCasesPage`: `([0, 0], 25) === 1`, `([25, 0], 25) === 1`, `([26, 3], 25) === 2`, `([3, 51], 25) === 3`.

- [ ] **Step 2 (1.2): Run the tests and confirm they fail.**
      Run: `mise exec -- node --test src/lib/data/agency-civil-case-rows.test.mjs`
      Expected: FAIL, `buildStaffOtherJobCaseRows` / `lastAgencyCivilCasesPage` is not a function (or not exported).

- [ ] **Step 3 (1.2): Implement the types and the two functions** in `agency-civil-case-rows.ts` per the Interfaces block. Reuse `getOfficerName`, `toDisplayName`, the existing outcome rule and `getAssignmentStatus`; hoist the existing collator and `getTime` to module scope so both builders share them. Use only erasable TypeScript (no `enum`, no parameter properties), so Node can import the file.

- [ ] **Step 4 (1.2): Run the tests and confirm they pass.**
      Run: `mise exec -- node --test src/lib/data/agency-civil-case-rows.test.mjs`
      Expected: PASS, 12 tests, 0 fail, 0 skipped.

- [ ] **Step 5 (1.2): Add the test file to `test:data` in `package.json`, and wire the builder.** In `buildAgencyDetail`, set `staffOtherJobCivilCases: buildStaffOtherJobCaseRows(data.staffOtherJobCaseLinks)` and `counts.staffOtherJobCivilCases`; `counts.civilCases` stays `civilCases.length`.
      Run: `mise exec -- npm run test:data && mise exec -- npx astro check`
      Expected: all `test:data` tests pass; `astro check` reports 0 errors, 0 warnings, 0 hints.

### Task 3: Agency profile block

**Files:**

- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro` — the `recentCases` items in the frontmatter, and the markup directly after the "Recent civil cases" `<section>`

**Interfaces:**

- Consumes: `data.staffOtherJobCivilCases`, `data.counts.staffOtherJobCivilCases` (Tasks 1-2). Existing `formatDate`, `formatCount`, `agencyPath`.

- [ ] **Step 1 (4.1): Write the failing e2e test** `agency page lists cases from staff members' other jobs separately` in `tests/e2e/civil-cases.spec.ts`. Select the agency with independent SQL (pattern in the existing agency selection in that file): agency with own count ≥ 1 and other-jobs count ≥ 1; compute `own_count` and `other_count` (distinct `civil_case_id`, computed only from `public.civil_case_personnel` and `public.agency_personnel`: links on an assignment at another agency, for a person with an assignment at this agency, minus the case ids linked to an assignment at this agency; no joins to `personnel`, `agency`, `location_path` or `build_page_payload`). An empty selection fails the test (`expect(rows.length).toBeGreaterThan(0)`), as `tests/e2e/civil-cases.spec.ts` already does; never `test.skip`. Assert on `agency.path`:
  - Civil Cases stat cell `.ledger-value` has text `own_count` (unchanged, same locator as the existing Civil Cases tile test).
  - `page.getByRole("region", { name: "Cases from staff members' other jobs" })` is visible and contains the explanation sentence and `` `${other_count} case${other_count === 1 ? "" : "s"}` ``.
  - The region has `min(other_count, 6)` links in `.recent-list`, each `href` in the SQL set of `/civil-cases/{slug}/`.
  - The region's "View all" link `href` ends with `civil-cases/#staff-other-job-cases`.
  - Body text does not match ``new RegExp(`\\b${(own_count + other_count).toLocaleString("en-US")} (civil )?cases?\\b`)`` (no combined total), when `own_count + other_count` differs from both counts.
  - The text of the region's `h2`, explanation `p` and count `p.civic-limit-note` (not the case rows) does not match `/verif|confirm|fact.?check|accura|at fault|misconduct|party|defendant|sued/i`.

- [ ] **Step 2 (4.1): Run it and confirm it fails.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts -g "other jobs separately"`
      Expected: FAIL, region not found.

- [ ] **Step 3 (2.1, 2.2): Add the block** directly after the "Recent civil cases" section, rendered only when `counts.staffOtherJobCivilCases > 0`:
      `<section class="civic-section" aria-labelledby="staff-other-job-cases">`, `<div class="civic-section-head"><div><h2 id="staff-other-job-cases">...</h2><p>...</p></div></div>` (heading text and explanation sentence from Global Constraints), then `<p class="civic-limit-note">` count text, then `.recent-list` of the first 6 `staffOtherJobCivilCases` rows (already ordered; do not re-sort by date). Each item: `<a href={row.caseUrl}>`, `recent-list-title` span `row.title`, `recent-list-meta` span = `["Civil case", row.court, "Filed " + formatDate(row.filedDate), row.outcome]` joined with `·`, then a second `recent-list-meta` span listing staff as `{name} — while at {agency names joined ", "}` plus ` (current staff)`, ` (former staff)` or nothing, joined with `; ` (text only — no nested links inside the `<a>`). Then a link `View all cases from staff members' other jobs →` to `${agencyPath}civil-cases/#staff-other-job-cases`. Do not touch the `StatCell` for Civil Cases or `recentCases`. No allegation note on this block (owner decision, 2026-11-19).

- [ ] **Step 4 (4.1): Run the test and confirm it passes.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts -g "other jobs separately"`
      Expected: PASS.

### Task 4: Agency civil-cases page section and routes

**Files:**

- Create: `src/components/AgencyStaffOtherJobCases.astro`
- Modify: `src/components/AgencyCivilCasesPage.astro`
- Modify: `src/lib/format.js`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/index.astro`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page].astro`

**Interfaces:**

- Consumes: `StaffOtherJobCaseRow`, `lastAgencyCivilCasesPage` (Task 2); `CIVIL_CASES_PAGE_SIZE`.
- Produces: `AgencyStaffOtherJobCases` props `{ count: number; rows: StaffOtherJobCaseRow[] }` where `rows` is already the page slice (may be empty when the list ended before this page).
- Produces: `AgencyCivilCasesPage` props `{ currentPage: number; data; rows: CivilCaseRow[]; otherJobRows: StaffOtherJobCaseRow[] }`.

- [ ] **Step 1 (4.1-4.3, 4.6): Write the failing e2e tests** in `tests/e2e/civil-cases.spec.ts`. Every selection uses the SQL oracle from Task 3 Step 1; an empty selection fails the test (`expect(rows.length).toBeGreaterThan(0)`); never `test.skip`. Locators: own table = `page.getByRole("region", { name: "Cases tied to this agency's personnel records" }).locator("a.row-link")`; other-jobs table = `page.getByRole("region", { name: "Cases from staff members' other jobs" }).locator("a.row-link")`.
  - `agency civil-cases page lists other-jobs cases in their own table`: same agency selection as Task 3. On `${path}civil-cases/` and each later page up to `ceil(other_count / 25)`, collect the other-jobs table `href`s; the union equals the SQL set; the own table's `href` set is disjoint from it; lede still reads `` `${own_count} civil cases tied to this agency's personnel records.` ``. Body text does not match the combined-total regex from Task 3 Step 1. The heading, explanation and count text do not match the banned-claims regex from Task 3 Step 1.
  - `a shared case appears once and names every linked staff member`: SQL picks a case with ≥ 2 distinct linked staff of one agency (same oracle); on that agency's civil-cases pages the case's `href` appears in exactly one row, and that row contains each person's name (`[first_name, last_name].filter(Boolean).join(" ")` from the selection SQL) and `while at {case agency name}`.
  - `current-staff rows come first`: assert ordering on rendered text only: on page 1 of the agency from Task 1 Step 1b (3), no row containing `(current staff)` follows a row without it.
  - `agency with only other-jobs cases has a civil-cases page`: SQL picks an agency with own count 0 and other count ≥ 1; `${path}civil-cases/` returns 200, the page states `0 civil cases tied to this agency's personnel records.`, no own-cases region or table is shown, and the other-jobs region lists `min(other_count, 25)` rows. Body text does not match the combined-total regex from Task 3 Step 1.
  - `page past both lists is not built`: for the Task 3 agency, `page.goto(`${path}civil-cases/page/${last + 1}/`)` returns status 404, where `last = max(1, ceil(own/25), ceil(other/25))`.

- [ ] **Step 2: Run them and confirm they fail.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts`
      Expected: the five new tests FAIL; the existing tests still pass.

- [ ] **Step 3 (3.1, 3.2): Implement.**
  - `src/lib/format.js`: move the `formatDate` arrow from `AgencyCivilCasesPage.astro` into `src/lib/format.js` as `export const formatCivilCaseDate = (value) => ...` (same `en-US` options, `timeZone: "UTC"`, `year: "numeric", month: "short", day: "numeric"`), with a JSDoc type. `formatShortDate` is not reused because it has no UTC option and throws on missing values. Import it in both components.
  - `AgencyStaffOtherJobCases.astro`: `<section class="civic-section" aria-labelledby="staff-other-job-cases">` (the H2 id `staff-other-job-cases` is the anchor the profile's "View all" link targets), `<div class="civic-section-head"><div><h2 id="staff-other-job-cases">...</h2><p>...</p></div></div>`, count `<p class="civic-limit-note">`. No page text of its own. When `rows` is empty, show `<p class="muted">No more cases in this list.</p>` and no table. Otherwise `TableScroll` + `table.record-table` with the existing columns (Case, Cause number, Court, Filed, Outcome) plus `Staff members`: one line per person, `<a href={person.href}>{name}</a> — while at ` + each agency as `<a>` when `href` else text, joined `, `, then ` (current staff)`, ` (former staff)` or nothing.
  - `AgencyCivilCasesPage.astro`: `lastPage = lastAgencyCivilCasesPage([rows.length, otherJobRows.length], CIVIL_CASES_PAGE_SIZE)`; keep the existing throw for `currentPage` outside `1..lastPage`. Wrap the own table in `<section class="civic-section" aria-labelledby="agency-own-civil-cases">` with `<div class="civic-section-head"><div><h2 id="agency-own-civil-cases">Cases tied to this agency's personnel records</h2></div></div>`. When the own list is empty, render no own section (lede reads `0 civil cases tied to this agency's personnel records.`, owner decision 2026-11-18). When the own list has rows but none on this page, render its heading and `<p class="muted">No more cases in this list.</p>` with no table. Render `AgencyStaffOtherJobCases` whenever the other-jobs list has rows, passing this page's slice. One `Pagination` with the shared `lastPage`. Keep the existing `civic-limit-note` about court dockets last.
  - `civil-cases/index.astro`: pass `otherJobRows={data.staffOtherJobCivilCases}`.
  - `civil-cases/page/[...page].astro`: in `getStaticPaths`, `lastPage = lastAgencyCivilCasesPage([buildAgencyCivilCaseRows(data).length, data.staffOtherJobCivilCases.length], CIVIL_CASES_PAGE_SIZE)`; params only, no props. Render passes `otherJobRows={data.staffOtherJobCivilCases}`.

- [ ] **Step 4: Run the e2e file and confirm all tests pass.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts`
      Expected: all tests PASS, 0 skipped.

- [ ] **Step 5 (4.8): Type check, heading audit and inline-CSS check.**
      Run: `mise exec -- npx astro check`
      Expected: 0 errors, 0 warnings, 0 hints.
      Then audit H1/H2 on the two changed pages (DESIGN.md "Verification"): one H1; the new headings are H2s with no page-local heading CSS.
      Then build and check for inline CSS: `mise exec -- npx astro build && mise exec -- npm run validate:no-inline-css`. Expected: build exits 0; the validator reports no inline CSS. Do not run `npm run build` or `build:site` (they refresh build projections in the shared database).

### Task 5: EGM.md contracts, AGENTS.md and full validation

**Files:**

- Modify: `src/EGM.md` (line 20: the `AgencyCivilCasesPage.astro:rows.length / CIVIL_CASES_PAGE_SIZE` citation)
- Modify: `src/lib/data/EGM.md` (`agency-civil-case-rows.ts`, `agency-detail.ts` sections)
- Modify: the EGM.md that covers `src/lib/format.js` and `src/lib/sitemap-lastmod.js`
- Modify: `src/components/EGM.md` (`AgencyCivilCasesPage`, new `AgencyStaffOtherJobCases`)
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/EGM.md` (replace the invariant "A person's cases from other agencies are not listed." with the two-section rule)
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/EGM.md`
- Modify: `AGENTS.md`

Other agents are editing EGM.md files in this worktree. Before editing each file, re-read it; edit only the lines about this change; do not reformat other sections.

- [ ] **Step 1 (4.4): Update each contract** with `[file:anchor]` citations in the existing style, e.g. `[agency-civil-case-rows.ts:buildStaffOtherJobCaseRows]`, `[agency-detail.ts:staffOtherJobCaseLinkSql]`, `[AgencyCivilCasesPage.astro:lastAgencyCivilCasesPage]`, `[index.astro:otherJobRows={data.staffOtherJobCivilCases}]`. State: the other-jobs list is separate, its count is separate, never summed; eligibility includes either list; page N shows page N of each list under one page control.
      Known stale lines: `src/components/EGM.md` `[AgencyCivilCasesPage.astro:timeZone: "UTC"]` (moves with the date formatter to `format.js`); `src/lib/data/EGM.md` the `agency-civil-case-rows.ts` bullets "dropped with no error" and "The file throws no errors." (the new builder throws); `src/lib/data/EGM.md` the `npm run test:data` file list (add `agency-civil-case-rows.test.mjs`).

- [ ] **Step 2 (4.4): Run the citation check** over every EGM.md that cites a changed file: every `[path:anchor]` anchor must appear verbatim in the cited file relative to the contract's folder. List them with `grep -rl --include=EGM.md -e 'agency-civil-case-rows' -e 'agency-detail' -e 'AgencyCivilCasesPage' -e 'civil-cases' -e 'format.js' -e 'sitemap-lastmod' src` and run the loop for each listed contract (anchors resolve relative to that contract's folder).
      Run (one contract per call):

  ```bash
  d='src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases'
  grep -o '`\?\[[^]]*\.\(ts\|js\|mjs\|astro\):[^]]*\]' "$d/EGM.md" | tr -d '`' | sed 's/^\[//;s/\]$//' |
  while IFS= read -r c; do f="${c%%:*}"; a="${c#*:}"; grep -qF -- "$a" "$d/$f" || echo "MISSING: $c"; done
  ```

  Expected: no `MISSING:` lines for any listed contract.

- [ ] **Step 3 (4.7): Edit `AGENTS.md`.** In "Data + Routing Conventions", the civil-case paragraph's Agency scope: append "These cases may appear only in the separate 'Cases from staff members' other jobs' section, with its own count, never summed." Expected: the bullet and the `civil-case-content` spec delta say the same thing.

- [ ] **Step 4: Format.**
      Run: `mise exec -- npx prettier --write <each changed file>` then `mise exec -- npm run format:check`
      Expected: `All matched files use Prettier code style!`

- [ ] **Step 5: Verify runtime and dependencies.**
      Run: `mise exec -- node --version && mise exec -- npm ci && mise exec -- npm ls --depth=0`
      Expected: `v26.13.1`; `npm ci` exits 0; `npm ls` shows no `invalid` or `missing`.

- [ ] **Step 6 (4.5): Run the full gate on the final head.**
      Run: `mise exec -- npm run validate`
      Expected: exit 0; every stage passes (`format:check`, `lint`, `validate:types`, `validate:shell`, `validate:schema`, `validate:openspec`, `scan:personal-data`, `test` including `test:data` with the new unit file and `test:e2e` with the new specs). Record test counts, every warning and hint with its fix, and every skipped test (expected: none). Fix any finding, including pre-existing ones, and rerun.

- [ ] **Step 7: Hand back to the owner.** List each changed file with the task that required it, the `npm run validate` evidence, the Task 1 Step 1 `EXPLAIN ANALYZE` time and Step 1b selection counts, the build time before and after, and the state: worktree `ddl-openspec`, nothing committed by this plan (the owner commits in PR #58), nothing pushed, nothing merged.
