# Design: Cases From Staff Members' Other Jobs

## Context

[PR #58](https://github.com/PoliceConductUS/policeconduct.org/pull/58) (branch `ddl-openspec`) set the civil-case count rule (`openspec/specs/civil-case-content`, "Civil case counts follow personnel assignments"): an agency counts only cases tied to its own `agency_personnel` rows. Before that, `src/lib/data/agency-detail.ts` loaded `personnelLinkedCivilCases` (cases tied to other agencies' assignments of this agency's staff) and `agency-civil-case-rows.ts` merged them into the agency's list. PR #58 removed that merge. This change brings the information back as a separate, labelled view. This change ships in the same PR, on top of the count-rule commit, so the `civil-case-content` spec delta lands with the count rule.

Pages involved: the agency profile (`[agencySlug]/index.astro`, Civil Cases tile and recent list) and the agency civil-cases pages (`[agencySlug]/civil-cases/index.astro` and `page/[...page].astro`, rendered by `AgencyCivilCasesPage.astro`). Pages reload the agency by route params at render time (AGENTS.md routing rule).

EGM.md contracts are the per-folder `EGM.md` files that state each folder's invariants, each with a `[file:anchor]` citation that must appear verbatim in the cited file; the citation check (plan Task 5 Step 2) confirms that.

## Goals / Non-Goals

**Goals:**

- Show, for each agency, the distinct civil cases tied to a staff member's assignment at another agency, with who, where, and current/former status.
- Keep the agency's own count, tile and list exactly as the count rule defines them.
- Never present a combined number.

**Non-Goals:**

- No change to personnel pages, location pages or federal pages.
- No marker on the agency personnel list (open question).
- No new tables or intake changes.

## Decisions

1. **One loader query returns links; a pure builder groups them per case.** Add `staffOtherJobCaseLinks` to the agency detail load: links for cases `c` where some `case_ap` (assignment linked through `civil_case_personnel`) has `case_ap.agency_id <> $agency` and `case_ap.personnel_id` has an assignment at `$agency`, and no assignment at `$agency` is linked to `c`. The query returns one row per (case, person, case agency) link; `buildStaffOtherJobCaseRows` groups them into one row per case with every person. Grouping in SQL with `json_agg` was not chosen, because the pure builder is unit-testable. The previous `personnelLinkedCivilCases` SQL (`personnelLinkedCivilCases` in `src/lib/data/agency-detail.ts` on `main`, removed on this branch) is the starting point. The other-jobs rule is written once, as an exported SQL fragment (`staffOtherJobCaseLinkSql`), and used by the loader, page eligibility and sitemap lastmod. Joins to `personnel`, the case `agency` and its `location_path` are left joins, so a broken link reaches the builder and throws there instead of being dropped. _Alternative:_ reuse one row per person and dedupe in the template — rejected, it spreads the distinct-case rule into the view.
2. **Case agency URL** comes from the joined `location_path.path` plus agency slug (AGENTS.md), and the case agency must have an agency page (`build_page_payload` agency row) to be linked; otherwise its name shows without a link.
3. **Staff status uses the agency personnel list's rule.** Each person's assignments at this agency go through `getAssignmentStatus` (`src/lib/data/assignment-status.js`): current when any assignment here is current, otherwise former when any has ended, otherwise unknown. Unknown shows no status text (`openspec/specs/annotation-employment`: uncertain dates make no employment claim).
4. **Ordering:** rows with at least one current staff member first, then all other rows (former or unknown only); within each, `filed_date desc, title asc`. `title` and `filed_date` are required (NOT NULL); a missing value throws.
5. **Agency profile:** below the own-case recent list, a separate block with its own heading, a one-line explanation, its own count and at most 6 rows (the "Recent civil cases" limit) and, always, a "View all" link below them to the civil-cases page section anchor `#staff-other-job-cases`. The block is hidden when the count is 0. The tile's value stays the own count. Its rows are ordered current staff first (Decision 4), unlike the date-ordered "Recent civil cases" block; this is intended. No allegation note is added to the block (owner decision, 2026-11-19); the civil-cases page keeps its full note.
6. **Civil-cases page:** the own cases table first, under the H2 "Cases tied to this agency's personnel records", then a second section with its own heading and table, using `CIVIL_CASES_PAGE_SIZE`. One route and one shared `Pagination` serve both lists (owner decision, 2026-11-19): page N shows page N of each list; the section prints no page text of its own. When a list has rows but none on page N, its heading shows with one muted line "No more cases in this list." The other-jobs section has the anchor `#staff-other-job-cases`. _Alternative:_ a separate route `civil-cases/other-jobs/` with its own title, lede and single-list paging — clearer titles and structured data, but it adds two routes, an eligibility rule per route and sitemap entries, and the owner chose one route.
7. **Page eligibility:** the agency civil-cases page exists when the own list or the other-jobs list has rows. `getStaticPaths` enumerates from the same loader counts; the render reloads by params and throws on an out-of-range page. Decided (owner, 2026-11-18): other-jobs-only agencies get the page, so the cases stay reachable; the page states 0 own cases (Decision on lede: see Risks).
8. **Copy (8th grade, descriptive):** heading "Cases from staff members' other jobs"; explanation "These cases are tied to a staff member's job at another agency, not to this agency." Per-person text "`{Name} — while at {Agency}[, {Agency}...]`" followed by " (current staff)", " (former staff)" or nothing when the status is unknown. Follow DESIGN.md tokens and existing table/StatCell patterns; no inline CSS.
9. **Sitemap lastmod:** the agency profile and civil-cases page lastmod in `src/lib/sitemap-lastmod.js` also consider `civil_cases.updated_at` of other-jobs cases, using the shared other-jobs SQL fragment (Decision 1).

## Risks / Trade-offs

- [Visitors read the second count as the agency's record] → separate heading, explanation sentence, and no combined total anywhere.
- [Large agencies produce long lists] → paginate the section with the existing page size; profile shows only recent rows.
- [Pagination of two lists on one route] → one shared page control; a list that ended shows "No more cases in this list." under its heading on later pages.
- [The civil-cases page lede, meta description and structured-data description read "{n} civil cases tied to this agency's personnel records.", which counts only own cases, even on a page that also lists other-jobs cases] → kept on purpose (owner decision, 2026-11-18). The other-jobs section directly below carries its own heading, explanation sentence and count. The page title stays "{Agency} Civil Cases" because the page lists both kinds of civil case, each labelled.
- [A wrong person-to-case link now shows on a second public page, the agency page of each agency the person worked at] → no new data; the link already shows on the person's page. Corrections to `civil_case_personnel` fix both pages on the next build.
- [Broken links silently dropped] → left joins and a TypeScript throw (Decision 1).
- [More agencies get a civil-cases page, and eligibility adds a nested `exists`/`not exists`] → accepted; cost not measured.
- [Build time] → one extra query per agency, scoped by agency id. Cost not measured; Task 1 records `EXPLAIN ANALYZE` for one agency and the build time before and after.

## Migration Plan

No data migration. Ships with the next site build; rollback is reverting the change.

## Open Questions

- Marker on the agency personnel list (not in this change unless approved).
