# Cases From Staff Members' Other Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Approve before implementing (AGENTS.md):** Do not start Task 1 until the user approves this change (`proposal.md`, `design.md`, `specs/agency-staff-other-job-cases/spec.md`, `specs/civil-case-content/spec.md`, `tasks.md`, this plan). AGENTS.md: "Do not implement until the user approves."

> **No commit steps.** The owner commits this work in [PR #58](https://github.com/PoliceConductUS/policeconduct.org/pull/58) (branch `ddl-openspec`), on top of the count-rule commit. Do not run `git add`, `git commit`, `git push` or `git town sync` while running this plan.

> **Re-read before editing.** Line numbers below are from 2026-11-22. Other agents edit this worktree; re-read every cited file and EGM.md line before changing it.

**Goal:** Show, on the agency profile page and the agency civil-cases page, a separate "Cases from staff members' other jobs" list with its own count, without changing the agency's own civil-case count, tile or list.

**Architecture:** One new read-only query in `loadAgencyRows` (`src/lib/data/agency-detail.ts`) returns one row per (case, person, case agency) link. The other-jobs rule lives in one SQL fragment, `staffOtherJobCaseLinkSql`, in the dependency-free `src/lib/data/staff-other-job-case-sql.js`, used by the loader, page eligibility and sitemap lastmod. Every hop is a recorded foreign key (owner decision, 2026-11-22: the site follows explicit FK relationships; chains like other-job cases may become a database view). A pure builder in `src/lib/data/agency-civil-case-rows.ts` groups those links into one row per case, with every linked person, and orders the rows. The agency profile renders a recent-rows block; the civil-cases routes render a second section through a new component, with one shared page control. Task 6 replaces the fragment with intake's views once they exist.

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
- Per person, exactly: `{Name} — while at {Agency}[, {Agency}...]`, with no suffix.
- Ended-list line, exactly: `No more cases in this list.`
- Count text: `{n} case` when n is 1, else `{n} cases`, with `n.toLocaleString("en-US")`.
- The agency's own count (`counts.civilCases`), the Civil Cases `StatCell`, the "Recent civil cases" block and the civil-cases page lede `{n} civil cases tied to this agency's personnel records.` do not change.
- No number that adds the own count and the other-jobs count appears anywhere.
- No section copy that claims verification, accuracy, fault, misconduct, or that this agency was a party (spec "Other-jobs labels describe the link without judgment").
- Page size: `PAGE_SIZE = 50` from `src/lib/pagination.js`, the agency civil-case list's existing size.
- No staff status. The site does not derive status from assignment dates (AGENTS.md "The Site Is A View Of The Database"); rows show none.
- Stored text shows as stored: person names, case agency names, court and outcome are not re-cased, trimmed or relabeled.
- Case agency URL = joined `location_path.path` + `agency.slug` + `/`. Link it only when a `build_page_payload` row with `page_type = 'agency'` exists for that agency; otherwise show the name as text.
- No inline CSS, no `style` attributes, no new CSS rules when an existing class fits (`civic-section`, `civic-section-head`, `recent-list`, `recent-list-title`, `recent-list-meta`, `record-table`, `row-link`, `text-muted`, `civic-limit-note`). H2 for the new section headings, from shared tokens (DESIGN.md "Heading Rules").
- No new dependencies. Sort text with `Intl.Collator("en", { numeric: true, sensitivity: "base" })`.
- Required fields fail loudly: a link row with an empty personnel `id`, `slug` or name, an empty case `slug`, `title` or `filed_date`, or a missing joined personnel row, case agency row or case agency location path, throws. The own builder also throws on a missing person field (Task 2 Step 3).

## Review Focus

1. **One person linked to one case through two other agencies.** Expected: the person appears once on the row, with both agencies after "while at", joined by `, `. Test: Task 2, `lists every case agency once per person`.
2. **Other-jobs list longer than the own list (or the reverse).** Expected: page N shows rows for the lists that reach page N; a list that ended shows its heading and `No more cases in this list.`; pages past both lists are not built. Tests: Task 2 `lastAgencyCivilCasesPage`, Task 4 e2e `later pages follow the longer list`.
3. **An agency with zero own cases but some other-jobs cases.** Expected: the civil-cases page exists, the lede reads `0 civil cases tied to this agency's personnel records.`, no own-cases table is shown. Test: Task 4 e2e `agency with only other-jobs cases has a civil-cases page`.

## File Structure

- Create `src/lib/data/staff-other-job-case-sql.js` — exports `staffOtherJobCaseLinkSql(agencyIdExpr)` with JSDoc; no imports.
- Modify `src/lib/data/agency-civil-case-rows.ts` — add link/row types, `buildStaffOtherJobCaseRows`, `lastAgencyCivilCasesPage`; `getPersonnelRef` throws. Pure; no database.
- Create `src/lib/data/agency-civil-case-rows.test.mjs` — unit tests.
- Modify `package.json` — add the new test file to `test:data` so `npm run validate` runs it.
- Modify `src/lib/data/agency-detail.ts` — import `staffOtherJobCaseLinkSql` (shape in Task 1 Step 1); add the query to `loadAgencyRows`; add fields in `buildAgencyDetail`; extend the civil-cases eligibility in `agencyTopicWhereSql`.
- Modify `src/lib/sitemap-lastmod.js` — import the fragment from `./data/staff-other-job-case-sql.js`; the agency `canonical_path` lastmod also considers other-jobs cases.
- Modify `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro` — new profile block.
- Create `src/components/AgencyStaffOtherJobCases.astro` — the civil-cases page section (heading, explanation, count, table).
- Modify `src/components/AgencyCivilCasesPage.astro` — take `otherJobRows`, shared last page, render both sections.
- Modify `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/index.astro` and `.../civil-cases/page/[...page].astro` — pass `otherJobRows`, enumerate pages from both lists.
- Modify `tests/e2e/civil-cases.spec.ts` — shared agency selection helper and new e2e tests.
- Modify EGM.md contracts: `src/lib/data/EGM.md`, `src/lib/EGM.md`, `src/components/EGM.md`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`, `.../civil-cases/EGM.md`, `.../civil-cases/page/EGM.md`, `src/EGM.md` (line 20: the `[components/AgencyCivilCasesPage.astro:rows.length / PAGE_SIZE]` citation).
- Modify `AGENTS.md` — the civil-case Agency bullet (task 4.6).

## Tasks

### Task 1: Load other-jobs links in the agency detail

**Files:**

- Create: `src/lib/data/staff-other-job-case-sql.js`
- Modify: `src/lib/data/agency-detail.ts` — `agencyTopicWhereSql` (the `civil-cases` branch, the final `return`), `loadAgencyRows`, `buildAgencyDetail`
- Modify: `src/lib/data/agency-civil-case-rows.ts` (types only in this task)
- Modify: `src/lib/sitemap-lastmod.js`
- Test: the e2e tests in Tasks 3 and 4 (they need the database); this task is checked with `npx astro check` and a read-only SQL run.

**Interfaces:**

- Produces, in `agency-civil-case-rows.ts`:
  ```ts
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
    case_agency_id: string | null;
    case_agency_name: string | null;
    case_agency_path: string | null;
    case_agency_has_page: boolean;
  };
  ```
  The personnel and case agency fields are nullable because of the left joins; the builder throws when any of them is missing.
- Produces, on `loadAgencyDetail` result: `staffOtherJobCaseLinks: StaffOtherJobCaseLink[]` (from `loadAgencyRows`), `staffOtherJobCivilCases: StaffOtherJobCaseRow[]` (Task 2 builder), `counts.staffOtherJobCivilCases: number` (= `staffOtherJobCivilCases.length`).
- Produces: `loadAgencyLocationStaticPathsForTopic("civil-cases")` returns agencies with own cases **or** other-jobs cases.

- [ ] **Step 1 (1.1, 1.4): Write the query and run it read-only against the shared database before wiring it in.** Save a script at `.cache/agency-staff-other-job-cases/check.mjs` in the worktree (gitignored, not committed) that imports `withDb` by relative path (`../../src/lib/db.js`) and runs the pasted query text below (the fragment file does not exist until Step 3) with `client.query(sql, [agencyId])`, where `agencyId` comes from the agency selection helper in `tests/e2e/civil-cases.spec.ts` (Task 3 Step 1; run at the same time, never typed in by hand). Do not write the id into any committed file, test or doc. Query shape (start from `personnelLinkedCivilCases` in `src/lib/data/agency-detail.ts` on `main`, removed on this branch):

  ```sql
  select distinct
    c.id as civil_case_id, c.slug, c.title, c.cause_number,
    c.filed_date::text as filed_date, c.date_terminated::text as date_terminated,
    c.court, c.outcome,
    p.id as personnel_id, p.slug as personnel_slug, p.first_name, p.last_name,
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

  Links whose `case_ap.agency_id` is null are excluded by `case_ap.agency_id <> $1` (SQL null comparison); this is intended — such an assignment has no other agency to name.

  Differences from the predecessor, on purpose: no status rule anywhere; `personnel`, case `agency` and `location_path` are `left join`s so a broken link reaches the builder and throws; `case_bpp` is a `left join` (spec "The case agency has no page"); the case agency URL comes from `location_path.path` + `agency.slug`, not `case_bpp.path` as before (AGENTS.md: agency URLs from the joined location path); no `order by` (Task 2 orders).

  Expected: rows return; no `civil_case_id` in the result is also in `select distinct ccp.civil_case_id from public.civil_case_personnel ccp join public.agency_personnel ap on ap.id = ccp.agency_personnel_id where ap.agency_id = $1`.

  Also run `EXPLAIN (ANALYZE, BUFFERS)` on this query for that agency, and on the `agencyTopicWhereSql("civil-cases")` enumeration query with the Step 4 change, and record each execution time (no ids) for the hand-back. The sitemap agency query is measured in Step 5.

- [ ] **Step 1b (1.4): Check that the e2e tests have data.** Write and run, read-only, the selection query for each e2e test: (1) own ≥ 1 and other ≥ 1; (2) a case with ≥ 2 distinct staff of one agency linked through other jobs; (3) own = 0 and other ≥ 1; (4) own ≥ 1 and `ceil(other / 50) > ceil(own / 50)`. Record each result count (counts only, no ids or names) in the hand-back. If any is 0, stop and report: the test would have no data.

- [ ] **Step 2 (1.1): Add `StaffOtherJobCaseLink` to `agency-civil-case-rows.ts`.**

- [ ] **Step 3 (1.1): Create `src/lib/data/staff-other-job-case-sql.js` and add the query to `agency-detail.ts`.** The new file exports `staffOtherJobCaseLinkSql(agencyIdExpr)` (JSDoc `@param {string} agencyIdExpr`, `@returns {string}`) and has no imports, so `sitemap-lastmod.js` can import it at Astro config time. `agency-detail.ts` imports it from `./staff-other-job-case-sql.js`. Add the query to `loadAgencyRows` as `staffOtherJobCaseLinks`, using `client.query<StaffOtherJobCaseLink>(sql, [agencyId])`. Return it with the other fields.

- [ ] **Step 4 (1.3): Extend the `"civil-cases"` branch of `agencyTopicWhereSql`** to `exists (own) or exists (select 1 ${staffOtherJobCaseLinkSql("a.id")})`.

- [ ] **Step 5 (1.5): Include other-jobs cases in the agency lastmod** in `src/lib/sitemap-lastmod.js`, importing the fragment from `./data/staff-other-job-case-sql.js`. Add to the agency query: `(select max(sc.updated_at) from public.civil_cases sc where sc.id in (select ccp.civil_case_id ${staffOtherJobCaseLinkSql("a.id")})) as max_staff_other_job_case_updated_at`. Set the `canonical_path` key to `greatest` of its current value and this column (ignore null). Do not add it to the value written for place, area, state or category paths. No civil-cases lastmod key is added.
      Check: run the query read-only for one agency from Step 1b (1) and compare the column with the oracle's max `updated_at` of that agency's other-jobs cases; record `EXPLAIN (ANALYZE, BUFFERS)` time for the whole agency rollup query, with and without the column.

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
    caseAgencies: StaffOtherJobCaseAgency[];
  };
  export type StaffOtherJobCaseRow = Omit<
    CivilCaseRow,
    "personnel" | "personnelNames"
  > & {
    title: string;
    filed_date: string;
    outcome: string | null;
    staff: StaffOtherJobPerson[];
  };
  export const buildStaffOtherJobCaseRows: (
    links: StaffOtherJobCaseLink[],
  ) => StaffOtherJobCaseRow[];
  export const lastAgencyCivilCasesPage: (
    rowCounts: number[],
    pageSize: number,
  ) => number; // max(1, ...ceil(n / pageSize))
  ```
- Rules the tests pin: one row per `civil_case_id`; one person per `personnel_id` in a row; `caseAgencies` unique by `id`, sorted by name; `href` is `case_agency_path` when `case_agency_has_page`, else `null`; person name uses the same rule as `getOfficerName` in `agency-civil-case-rows.ts` (first and last name); case agency `name` is `case_agency_name` as stored (AGENTS.md: stored text is shown as stored); `outcome` is the stored value or null (no derived label); the civil-cases table renders `row.outcome || "--"` like the own table, and the profile block leaves it out when null like the "Recent civil cases" items; `caseUrl` is `/civil-cases/${slug}/`; staff in a row are ordered last name, first name; rows ordered `filed_date` newest first, then title.

- [ ] **Step 1 (1.2, 1.6): Write the failing tests** in `src/lib/data/agency-civil-case-rows.test.mjs`, importing from `./agency-civil-case-rows.ts`, with a `link(overrides)` fixture helper (synthetic ids like `case-1`, `person-1`, names like `Pat Example`; no real people):
  - `groups links into one row per case`: two links, same `civil_case_id`, different `personnel_id` → 1 row, `staff.map(s => s.id)` deep-equals both ids.
  - `lists every case agency once per person`: same case and person, `case_agency_id` `agency-b` and `agency-c`, plus a duplicate `agency-b` link → `staff[0].caseAgencies.map(a => a.id)` deep-equals `["agency-b", "agency-c"]`.
  - `links a case agency only when it has a page`: `case_agency_has_page: false` → `href === null`; `true` with `case_agency_path: "/tx/x/y/agency-b/"` → `href === "/tx/x/y/agency-b/"`.
  - `orders newest filed date first, then title`: rows A (`2024-05-01`), B (`2019-01-01`), C (`2021-01-01`), E (`2021-01-01`, title sorting before C) → slugs `["a", "e", "c", "b"]`.
  - `throws when a required person field is missing`: `personnel_slug: ""` → `assert.throws(..., /personnel/)`.
  - `throws when the case agency path is missing`: `case_agency_path: null` → `assert.throws(..., /agency/)`.
  - `throws when filed_date is missing`: `filed_date: ""` → `assert.throws(..., /filed_date/)`.
  - `lastAgencyCivilCasesPage`: `([0, 0], 50) === 1`, `([50, 0], 50) === 1`, `([51, 3], 50) === 2`, `([3, 101], 50) === 3`.
  - `buildAgencyCivilCaseRows throws when a linked person has no slug`: an own case whose linked person has `slug: ""` → `assert.throws(..., /slug/)`, and the message names the case.

- [ ] **Step 2 (1.2): Run the tests and confirm they fail.**
      Run: `mise exec -- node --test src/lib/data/agency-civil-case-rows.test.mjs`
      Expected: FAIL, `buildStaffOtherJobCaseRows` / `lastAgencyCivilCasesPage` is not a function (or not exported), and `buildAgencyCivilCaseRows` does not throw.

- [ ] **Step 3 (1.2, 1.6): Implement the types and the two functions** in `agency-civil-case-rows.ts` per the Interfaces block. Reuse `getOfficerName`; hoist the existing collator and `getTime` to module scope so both builders share them. In the own builder, `getPersonnelRef` throws (naming the case and the missing field) instead of returning null; remove `isPersonnelRef`. Use only erasable TypeScript (no `enum`, no parameter properties), so Node can import the file. Runtime imports use relative specifiers (for example `./x.js`); `import type` lines may keep `#src/...` because Node erases them.

- [ ] **Step 4 (1.2): Run the tests and confirm they pass.**
      Run: `mise exec -- node --test src/lib/data/agency-civil-case-rows.test.mjs`
      Expected: PASS, 9 tests, 0 fail, 0 skipped.

- [ ] **Step 5 (1.2): Add the test file to `test:data` in `package.json`, and wire the builder.** In `buildAgencyDetail`, set `staffOtherJobCivilCases: buildStaffOtherJobCaseRows(data.staffOtherJobCaseLinks)` and `counts.staffOtherJobCivilCases`; `counts.civilCases` stays `civilCases.length`.
      Run: `mise exec -- npm run test:data && mise exec -- npx astro check`
      Expected: all `test:data` tests pass; `astro check` reports 0 errors, 0 warnings, 0 hints.

### Task 3: Agency profile block

**Files:**

- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro` — the markup directly after the "Recent civil cases" `<section>`
- Modify: `tests/e2e/civil-cases.spec.ts`

**Interfaces:**

- Consumes: `data.staffOtherJobCivilCases`, `data.counts.staffOtherJobCivilCases` (Tasks 1-2). Existing `formatDate`, `formatCount`, `agencyPath`.

- [ ] **Step 1 (4.1): Write the failing e2e test** `agency page lists cases from staff members' other jobs separately` in `tests/e2e/civil-cases.spec.ts`. Move the existing agency selection SQL in `tests/e2e/civil-cases.spec.ts` (lines 106-195) into a local helper that also returns `own_count`, `other_count` and the other-jobs slugs; use it in the existing test and the new one. `own_count` and `other_count` are distinct `civil_case_id` counts computed only from `public.civil_case_personnel` and `public.agency_personnel`: links on an assignment at another agency, for a person with an assignment at this agency, minus the case ids linked to an assignment at this agency; no joins to `personnel`, `agency`, `location_path` or `build_page_payload` to compute the ids; after the distinct case ids are computed, join `public.civil_cases` only to read `slug` (and `public.agency` only to read a name, for the Task 4 shared-case test). Select an agency with own count ≥ 1 and other-jobs count ≥ 1. An empty selection fails the test (as the existing selection does with `expect(rows).toHaveLength(1)`); never `test.skip`. New multi-row selections use `expect(rows.length).toBeGreaterThan(0)`. Assert on `agency.path`:
  - Civil Cases stat cell `.ledger-value` has text `own_count` (unchanged, same locator as the existing Civil Cases tile test).
  - `page.getByRole("region", { name: "Cases from staff members' other jobs", exact: true })` is visible and contains the explanation sentence and `` `${other_count.toLocaleString("en-US")} case${other_count === 1 ? "" : "s"}` ``.
  - The region has `min(other_count, 6)` links in `.recent-list`, each `href` in the SQL set of `/civil-cases/{slug}/`.
  - The region's "View all" link `href` ends with `civil-cases/#staff-other-job-cases`.
  - Body text does not match ``new RegExp(`\\b${(own_count + other_count).toLocaleString("en-US")} (civil )?cases?\\b`)`` (no combined total), when `own_count + other_count` differs from both counts.
  - The text of the region's `h2`, explanation `p` and count `p.civic-limit-note` (not the case rows) does not match `/verif|confirm|fact.?check|accura|at fault|misconduct|party|defendant|sued/i`.

- [ ] **Step 2 (4.1): Run it and confirm it fails.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts -g "other jobs separately"`
      Expected: FAIL, region not found.

- [ ] **Step 3 (2.1, 2.2): Add the block** directly after the "Recent civil cases" section, rendered only when `counts.staffOtherJobCivilCases > 0`:
      `<section class="civic-section" aria-labelledby="staff-other-job-cases">`, `<div class="civic-section-head"><div><h2 id="staff-other-job-cases">...</h2><p>...</p></div></div>` (heading text and explanation sentence from Global Constraints), then `<p class="civic-limit-note">` count text, then `.recent-list` of the first 6 `staffOtherJobCivilCases` rows (already ordered). Each item: `<a href={row.caseUrl}>`, `recent-list-title` span `row.title`, `recent-list-meta` span = `["Civil case", row.court || null, "Filed " + formatDate(row.filed_date), row.outcome || null].filter(Boolean).join(" · ")`, then a second `recent-list-meta` span listing staff as `{name} — while at {agency names joined ", "}`, joined with `; ` (text only — no nested links inside the `<a>`). Then, inside the same `<section>`, a link `View all cases from staff members' other jobs →` to `${agencyPath}civil-cases/#staff-other-job-cases`. Do not touch the `StatCell` for Civil Cases or `recentCases`. No allegation note on this block (owner decision, 2026-11-19: no allegation note on the profile block).

- [ ] **Step 4 (4.1): Run the test and confirm it passes.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts -g "other jobs separately"`
      Expected: PASS.

### Task 4: Agency civil-cases page section and routes

**Files:**

- Create: `src/components/AgencyStaffOtherJobCases.astro`
- Modify: `src/components/AgencyCivilCasesPage.astro`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/index.astro`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page].astro`
- Modify: `tests/e2e/civil-cases.spec.ts`

**Interfaces:**

- Consumes: `StaffOtherJobCaseRow`, `lastAgencyCivilCasesPage` (Task 2); `PAGE_SIZE` (`src/lib/pagination.js`); `formatShortDate` (`src/lib/format.js`).
- Produces: `AgencyStaffOtherJobCases` props `{ count: number; rows: StaffOtherJobCaseRow[] }` where `rows` is already the page slice (may be empty when the list ended before this page).
- Produces: `AgencyCivilCasesPage` props `{ currentPage: number; data; rows: CivilCaseRow[]; otherJobRows: StaffOtherJobCaseRow[] }`.

- [ ] **Step 1 (4.1-4.3, 4.5): Write the failing e2e tests** in `tests/e2e/civil-cases.spec.ts`. Every selection uses the SQL oracle and helper from Task 3 Step 1; an empty selection fails the test (`expect(rows.length).toBeGreaterThan(0)`); never `test.skip`. Locators: own table = `page.getByRole("region", { name: "Cases tied to this agency's personnel records", exact: true }).locator("a.row-link")`; other-jobs table = `page.getByRole("region", { name: "Cases from staff members' other jobs", exact: true }).locator("a.row-link")`.
  - `agency civil-cases page lists other-jobs cases in their own table`: same agency selection as Task 3. On `${path}civil-cases/` and each later page up to `ceil(other_count / 50)`, collect the other-jobs table `href`s; the union equals the SQL set; the own table's `href` set is disjoint from it; lede still reads `` `${own_count} civil cases tied to this agency's personnel records.` ``. Body text does not match the combined-total regex from Task 3 Step 1. The heading, explanation and count text do not match the banned-claims regex from Task 3 Step 1.
  - `a shared case appears once and names every linked staff member`: SQL picks a case with ≥ 2 distinct linked staff of one agency (same oracle); on that agency's civil-cases pages the case's `href` appears in exactly one row, and that row contains each person's name (`[first_name, last_name].filter(Boolean).join(" ")` from the selection SQL) and, for each selected person, the stored `agency.name` of the other agency the selection SQL used (read with a join to `public.agency` for the name only, after the case and person ids are chosen), checked with its own `toContainText`; do not match the whole "while at ..." string.
  - `agency with only other-jobs cases has a civil-cases page`: SQL picks an agency with own count 0 and other count ≥ 1; `${path}civil-cases/` returns 200, the page states `0 civil cases tied to this agency's personnel records.`, no own-cases region or table is shown, and the other-jobs region lists `min(other_count, 50)` rows. Body text does not match the combined-total regex from Task 3 Step 1.
  - `later pages follow the longer list`: SQL selects an agency with `own ≥ 1` and `ceil(other / 50) > ceil(own / 50)` (Step 1b (4)); `last = ceil(other / 50)`. Assert `${path}civil-cases/page/${last}/` returns 200, the other-jobs region has at least one `a.row-link`, the own region shows `No more cases in this list.` and no table; `page.goto(`${path}civil-cases/page/${last + 1}/`)` returns status 404.

- [ ] **Step 2: Run them and confirm they fail.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts`
      Expected: the four new tests FAIL; the existing tests still pass.

- [ ] **Step 3 (3.1, 3.2): Implement.**
  - `AgencyStaffOtherJobCases.astro` formats `filed_date` with `formatShortDate` from `src/lib/format.js` (UTC for calendar dates; throws on a missing value). `AgencyCivilCasesPage.astro` keeps its formatter. Markup: `<section aria-labelledby="staff-other-job-cases">` with no `civic-section` class (the page's `AgencyTopicPage` already wraps content in one; the H2 id `staff-other-job-cases` is the anchor the profile's "View all" link targets), `<div class="civic-section-head"><div><h2 id="staff-other-job-cases">...</h2><p>...</p></div></div>`, count `<p class="civic-limit-note">`. No page text of its own. When `rows` is empty, show `<p class="text-muted">No more cases in this list.</p>` and no table. Otherwise `TableScroll` + `table.record-table` with the existing columns (Case, Cause number, Court, Filed, Outcome) plus `Staff members`: one line per person, `<a href={person.href}>{name}</a> — while at ` + each agency as `<a>` when `href` else text, joined `, `. The Outcome cell is `row.outcome || "--"`.
  - `AgencyCivilCasesPage.astro`: `lastPage = lastAgencyCivilCasesPage([rows.length, otherJobRows.length], PAGE_SIZE)`; keep the existing throw for `currentPage` outside `1..lastPage`. Wrap the own table in `<section aria-labelledby="agency-own-civil-cases">` (no `civic-section` class) with `<div class="civic-section-head"><div><h2 id="agency-own-civil-cases">Cases tied to this agency's personnel records</h2></div></div>`. When the own list is empty, render no own section (lede reads `0 civil cases tied to this agency's personnel records.`, owner decision 2026-11-18). When the own list has rows but none on this page, render its heading and `<p class="text-muted">No more cases in this list.</p>` with no table. Render `AgencyStaffOtherJobCases` whenever the other-jobs list has rows, passing this page's slice. One `Pagination` with the shared `lastPage`. Keep the existing `civic-limit-note` about court dockets last.
  - `civil-cases/index.astro`: pass `otherJobRows={data.staffOtherJobCivilCases}`.
  - `civil-cases/page/[...page].astro`: in `getStaticPaths`, `lastPage = lastAgencyCivilCasesPage([buildAgencyCivilCaseRows(data).length, data.staffOtherJobCivilCases.length], PAGE_SIZE)`; params only, no props. Render passes `otherJobRows={data.staffOtherJobCivilCases}`.

- [ ] **Step 4: Run the e2e file and confirm all tests pass.**
      Run: `mise exec -- npm run test:e2e -- tests/e2e/civil-cases.spec.ts`
      Expected: all tests PASS, 0 skipped.

- [ ] **Step 5 (4.7): Type check, heading audit and inline-CSS check.**
      Run: `mise exec -- npx astro check`
      Expected: 0 errors, 0 warnings, 0 hints.
      Then audit H1/H2 on the two changed pages (DESIGN.md "Verification"): one H1; the new headings are H2s with no page-local heading CSS. Check in the built civil-cases page that the two sections have no doubled padding.
      Then build and check for inline CSS: `mise exec -- npx astro build && mise exec -- npm run validate:no-inline-css`. Expected: build exits 0; the validator reports no inline CSS. Record the build time and the `agency civil case pagination static paths` step time. Do not run `npm run build` or `build:site` (they refresh build projections in the shared database).

### Task 5: EGM.md contracts, AGENTS.md and full validation

**Files:**

- Modify: `src/EGM.md` (line 20: the `[components/AgencyCivilCasesPage.astro:rows.length / PAGE_SIZE]` citation)
- Modify: `src/lib/data/EGM.md` (`agency-civil-case-rows.ts`, `agency-detail.ts` sections, new `staff-other-job-case-sql.js`)
- Modify: `src/lib/EGM.md` (`sitemap-lastmod.js`)
- Modify: `src/components/EGM.md` (`AgencyCivilCasesPage`, new `AgencyStaffOtherJobCases`)
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/EGM.md` (replace the invariant "A person's cases from other agencies are not listed." with the two-section rule)
- Modify: `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/EGM.md`
- Modify: `AGENTS.md`

Other agents are editing EGM.md files in this worktree. Before editing each file, re-read it; edit only the lines about this change; do not reformat other sections.

- [ ] **Step 1 (4.4): Update each contract** with `[file:anchor]` citations in the existing style, e.g. `[agency-civil-case-rows.ts:buildStaffOtherJobCaseRows]`, `[staff-other-job-case-sql.js:staffOtherJobCaseLinkSql]`, `[AgencyCivilCasesPage.astro:lastAgencyCivilCasesPage]`, `[index.astro:otherJobRows={data.staffOtherJobCivilCases}]`. State: the other-jobs list is separate, its count is separate, never summed; eligibility includes either list; page N shows page N of each list under one page control.
      Known stale lines (re-read each line first; other agents may already have changed it):
  - `src/lib/EGM.md` lines 120 and 249 (agency lastmod keys and sources): the agency gains `max_staff_other_job_case_updated_at`, applied to `canonical_path` only; line 291 if the query count changes.
  - `src/lib/data/EGM.md` line 42 (the civil-cases topic SQL admits own links or other-jobs links).
  - `src/lib/data/EGM.md` line 55: "These are the only cases on the agency page." → "Other-jobs cases appear only in their separate section, with their own count."
  - `src/lib/data/EGM.md` lines 369 and 372: replace with "Both builders throw on a missing person field, case `slug`, `title` or `filed_date`."
  - `src/lib/data/EGM.md` the `npm run test:data` file list (add `agency-civil-case-rows.test.mjs`).

- [ ] **Step 2 (4.4): Run the citation check** over every EGM.md that cites a changed file: every `[path:anchor]` anchor must appear verbatim in the cited file relative to the contract's folder. List them with `grep -rl --include=EGM.md -e 'agency-civil-case-rows' -e 'agency-detail' -e 'AgencyCivilCasesPage' -e 'civil-cases' -e 'staff-other-job-case-sql' -e 'sitemap-lastmod' src` and run the loop for each listed contract (anchors resolve relative to that contract's folder).
      Run (one contract per call):

  ```bash
  d='src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases'
  grep -o '\[\(\[[^]]*\]\|[^][]\)*\.\(ts\|js\|mjs\|astro\):[^]]*\]' "$d/EGM.md" | sed 's/^\[//;s/\]$//' |
  while IFS= read -r c; do f="${c%%:*}"; a="${c#*:}"; grep -qF -- "$a" "$d/$f" || echo "MISSING: $c"; done
  ```

  Expected: no `MISSING:` lines for any listed contract. Also run it for `civil-cases/page/EGM.md` and confirm it prints the `[...page].astro` citations before trusting a clean result.

- [ ] **Step 3 (4.6): Edit `AGENTS.md`.** In "Data + Routing Conventions", the civil-case paragraph's Agency scope: append "These cases may appear only in the separate 'Cases from staff members' other jobs' section, with its own count, never summed." Expected: the bullet and the `civil-case-content` spec delta say the same thing.

- [ ] **Step 4: Format.**
      Run: `mise exec -- npx prettier --write <each changed file>` then `mise exec -- npm run format:check`
      Expected: `All matched files use Prettier code style!`

- [ ] **Step 5: Verify runtime and dependencies.**
      Run: `mise exec -- node --version && mise exec -- npm ci && mise exec -- npm ls --depth=0`
      Expected: `v26.13.1`; `npm ci` exits 0; `npm ls` shows no `invalid` or `missing`.

- [ ] **Step 6 (4.8): Run the full gate on the final head.**
      Run: `mise exec -- npm run validate`
      Expected: exit 0; every stage passes (`format:check`, `lint`, `validate:types`, `validate:shell`, `validate:schema`, `validate:openspec`, `scan:personal-data`, `test` including `test:data` with the new unit file and `test:e2e` with the new specs). Record test counts, every warning and hint with its fix, and every skipped test (expected: none). Fix any finding, including pre-existing ones, and rerun.

- [ ] **Step 7: Hand back to the owner.** List each changed file with the task that required it, the `npm run validate` evidence, the Task 1 `EXPLAIN (ANALYZE, BUFFERS)` times for the three queries, the Step 1b counts, and the build time after the change (with the `agency civil case pagination static paths` step time), and the state: worktree `ddl-openspec`, nothing committed by this plan (the owner commits in PR #58), nothing pushed, nothing merged.

### Task 6: Read intake's views (after intake ships them)

Starts only when the intake change `supply-site-display-data` has added the views to the local database. Until then, Tasks 1-5 are complete without it.

- [ ] **Step 1 (5.1): Replace the fragment with `site_agency_staff_other_civil_case`.** Read the view's columns. Check, read-only, that for one agency from Task 1 Step 1b (1) the view's case ids equal the Task 3 oracle's other-jobs case ids (it must exclude cases linked to any `agency_personnel` row at the agency itself). If they differ, stop and report it to intake; do not filter in the site. Otherwise read the view in `loadAgencyRows`, `agencyTopicWhereSql("civil-cases")` and `sitemap-lastmod.js`, delete `src/lib/data/staff-other-job-case-sql.js`, add the view to `scripts/validate-schema-contract.mjs`, and update the EGM.md citations. Pass: the Task 3 and Task 4 e2e tests still pass.
- [ ] **Step 2 (5.2): Read page 1 eligibility from `site_topic_page`.** Check, read-only, that every agency with own or other-jobs cases has a `civil-cases` row in the view. If not, stop and report it to intake. Otherwise enumerate page 1 from the view. Pass: the e2e test `agency with only other-jobs cases has a civil-cases page` still passes.
- [ ] **Step 3: Rerun the full gate** (Task 5 Steps 4-6).
