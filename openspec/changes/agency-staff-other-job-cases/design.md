# Design: Cases From Staff Members' Other Jobs

## Context

[PR #58](https://github.com/PoliceConductUS/policeconduct.org/pull/58) (branch `ddl-openspec`) set the civil-case count rule (`openspec/specs/civil-case-content`, "Civil case counts follow personnel assignments"): an agency counts only cases tied to its own `agency_personnel` rows. Before that, `src/lib/data/agency-detail.ts` loaded `personnelLinkedCivilCases` (cases tied to other agencies' assignments of this agency's staff) and `agency-civil-case-rows.ts` merged them into the agency's list. PR #58 removed that merge. This change brings the information back as a separate, labeled view. This change ships in the same PR, on top of the count-rule commit, so the `civil-case-content` spec delta lands with the count rule.

Pages involved: the agency profile (`[agencySlug]/index.astro`, Civil Cases tile and recent list) and the agency civil-cases pages (`[agencySlug]/civil-cases/index.astro` and `page/[...page].astro`, rendered by `AgencyCivilCasesPage.astro`). Pages reload the agency by route params at render time (AGENTS.md routing rule).

EGM.md contracts are the per-folder `EGM.md` files that state each folder's invariants, each with a `[file:anchor]` citation that must appear verbatim in the cited file; the citation check (plan Task 5 Step 2) confirms that.

## Goals / Non-Goals

**Goals:**

- Show, for each agency, the distinct civil cases tied to a staff member's assignment at another agency, with who and where.
- Keep the agency's own count, tile and list exactly as the count rule defines them.
- Never present a combined number.

**Non-Goals:**

- No change to personnel pages, location pages or federal pages.
- No marker on the agency personnel list (open question).
- No new tables or intake changes.
- No staff status on rows. The site may not derive it (AGENTS.md "The Site Is A View Of The Database"). Intake's view `site_agency_personnel_employment` gives a status per assignment, not per person at an agency, and picking one row to stand for several is a site decision. Intake requirement: a per-person status at an agency, or the stored `agency_personnel.employment_status` plus an intake rule for several rows (intake change `supply-site-display-data`). When intake supplies it, a later change may show it.

## Decisions

1. **One loader query returns links; a pure builder groups them per case.** Add `staffOtherJobCaseLinks` to the agency detail load: links for cases `c` where some `case_ap` (assignment linked through `civil_case_personnel`) has `case_ap.agency_id <> $agency` and `case_ap.personnel_id` has an assignment at `$agency`, and no assignment at `$agency` is linked to `c`. The query returns one row per (case, person, case agency) link; `buildStaffOtherJobCaseRows` groups them into one row per case with every person. Grouping in SQL with `json_agg` was not chosen, because the pure builder is unit-testable. The previous `personnelLinkedCivilCases` SQL (`personnelLinkedCivilCases` in `src/lib/data/agency-detail.ts` on `main`, removed on this branch) is the starting point. The other-jobs rule is written once, as an exported SQL fragment (`staffOtherJobCaseLinkSql`, in the dependency-free `src/lib/data/staff-other-job-case-sql.js`), and used by the loader, page eligibility and sitemap lastmod. Joins to `personnel`, the case `agency` and its `location_path` are left joins, so a broken link reaches the builder and throws there instead of being dropped. Every hop is a recorded foreign key; nothing is matched by name, text, date or geography. Owner decision (2026-11-22): "the site follows explicit FK relationships in the database; it never decides which records match or are included. Chains like other-job cases may be a database view or projection for speed/clarity." Intake proposes the view `site_agency_staff_other_civil_case` (`supply-site-display-data`); when it exists, the loader reads it and the fragment is deleted (task 5.1). _Alternative:_ reuse one row per person and dedupe in the template — rejected, it spreads the distinct-case rule into the view.
2. **Case agency URL** comes from the joined `location_path.path` plus agency slug (AGENTS.md), and the case agency must have an agency page (`build_page_payload` agency row) to be linked; otherwise its name shows without a link. The name shows as stored.
3. **Ordering:** `filed_date desc, title asc`, the same order as the own list. `title` and `filed_date` are required (NOT NULL); a missing value throws.
4. **Agency profile:** below the own-case recent list, a separate block with its own heading, a one-line explanation, its own count and at most 6 rows (the "Recent civil cases" limit) and, always, a "View all" link below them to the civil-cases page section anchor `#staff-other-job-cases`. The block is hidden when the count is 0. The tile's value stays the own count. No allegation note is added to the block (owner decision, 2026-11-19: no allegation note on the profile block); the civil-cases page keeps its full note.
5. **Civil-cases page:** the own cases table first, under the H2 "Cases tied to this agency's personnel records", then a second section with its own heading and table, using `PAGE_SIZE` (50, from `src/lib/pagination.js`), the agency civil-case list's existing page size. One route and one shared `Pagination` serve both lists (owner decision, 2026-11-19: one route, one pager; page N shows page N of each list; section anchor for the profile's link): page N shows page N of each list; the section prints no page text of its own. When a list has rows but none on page N, its heading shows with one line "No more cases in this list." The other-jobs section has the anchor `#staff-other-job-cases`. _Alternative:_ a separate route `civil-cases/other-jobs/` with its own title, lede and single-list paging — clearer titles and structured data, but it adds two routes, an eligibility rule per route and sitemap entries, and the owner chose one route.
6. **Page eligibility:** page 1 of the civil-cases page is enumerated by `loadAgencyLocationStaticPathsForTopic("civil-cases")`, whose `agencyTopicWhereSql("civil-cases")` today admits agencies with own cases. This change extends it to also admit agencies with other-jobs links (shared fragment), so other-jobs-only agencies get the page (owner decision, 2026-11-18: "An agency with no own cases keeps the line '0 civil cases tied to this agency's personnel records.' on its civil-cases page."). This is a page selection rule; page selection rules stay, and move into database views where possible (owner decision, 2026-11-22). Intake's proposed `site_topic_page` view (`supply-site-display-data`) holds the civil-cases topic rule; task 5.2 checks that its civil-cases row covers other-jobs cases before the site switches to it. Pages 2 and up: `getStaticPaths` builds pages up to `lastAgencyCivilCasesPage` of the built list lengths. The render reloads by params and throws on an out-of-range page. If page 1 is later built for every agency, this extension stays only as the page-2+ pre-filter.
7. **Copy (8th grade, descriptive):** heading "Cases from staff members' other jobs"; explanation "These cases are tied to a staff member's job at another agency, not to this agency." Per-person text "`{Name} — while at {Agency}[, {Agency}...]`" with no suffix. Follow DESIGN.md tokens and existing table/StatCell patterns; no inline CSS.
8. **Sitemap lastmod:** the agency query in `src/lib/sitemap-lastmod.js` adds a separate column `max_staff_other_job_case_updated_at` (max `civil_cases.updated_at` over the shared fragment). It is applied only to the agency's `canonical_path` key, with `greatest(...)`. Place, area, state and category lastmods do not use it. No civil-cases lastmod key is added.

## Risks / Trade-offs

- [Visitors read the second count as the agency's record] → separate heading, explanation sentence, and no combined total anywhere.
- [Large agencies produce long lists] → paginate the section with the agency civil-case list's page size (`PAGE_SIZE`, 50); profile shows only recent rows.
- [Pagination of two lists on one route] → one shared page control; a list that ended shows "No more cases in this list." under its heading on later pages.
- [The civil-cases page lede, meta description and structured-data description read "{n} civil cases tied to this agency's personnel records.", which counts only own cases, even on a page that also lists other-jobs cases] → kept on purpose (owner decision, 2026-11-18: "An agency with no own cases keeps the line '0 civil cases tied to this agency's personnel records.' on its civil-cases page."). The other-jobs section directly below carries its own heading, explanation sentence and count. The page title stays "{Agency} Civil Cases" because the page lists both kinds of civil case, each labeled.
- [A wrong person-to-case link now shows on a second public page, the agency page of each agency the person worked at] → no new data; the link already shows on the person's page. Corrections to `civil_case_personnel` fix both pages on the next build.
- [Broken links silently dropped] → left joins and a TypeScript throw (Decision 1). The own builder also throws on a missing person field instead of dropping the person (task 1.6), so both lists fail the same way.
- [More agencies get a civil-cases page, and eligibility adds a nested `exists`/`not exists`] → measured in Task 1 (`EXPLAIN`).
- [Build time] → one extra query per agency, scoped by agency id. Task 1 records `EXPLAIN (ANALYZE, BUFFERS)` for the agency query, the page eligibility query and the sitemap agency query; Task 4 records the build time after the change.

## Migration Plan

No data migration. Ships with the next site build; rollback is reverting the change.

## Open Questions

- Marker on the agency personnel list (not in this change unless approved).
