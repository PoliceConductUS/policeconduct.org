## Context

PR #58 set the civil-case count rule (`openspec/specs/civil-case-content`, "Civil case counts follow personnel assignments"): an agency counts only cases tied to its own `agency_personnel` rows. Before that, `src/lib/data/agency-detail.ts` loaded `personnelLinkedCivilCases` (cases tied to other agencies' assignments of this agency's staff) and `agency-civil-case-rows.ts` merged them into the agency's list. PR #58 removed that merge. This change brings the information back as a separate, labelled view.

Pages involved: the agency profile (`[agencySlug]/index.astro`, Civil Cases tile and recent list) and the agency civil-cases pages (`[agencySlug]/civil-cases/index.astro` and `page/[...page].astro`, rendered by `AgencyCivilCasesPage.astro`). Pages reload the agency by route params at render time (AGENTS.md routing rule).

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

1. **One loader query, distinct cases, people aggregated.** Add `staffOtherJobCivilCases` to the agency detail load: cases `c` where some `case_ap` (assignment linked through `civil_case_personnel`) has `case_ap.agency_id <> $agency` and `case_ap.personnel_id` has an assignment at `$agency`, and no assignment at `$agency` is linked to `c`. Return one row per case with an array of people `{ personnel slug/name, case agency name/canonical path, current at this agency }`. The previous `personnelLinkedCivilCases` SQL (git `9d787c1`, `agency-detail.ts`) is the starting point; it returned one row per person, so rows are grouped by case in TypeScript or with `json_agg`. _Alternative:_ reuse one row per person and dedupe in the template — rejected, it spreads the distinct-case rule into the view.
2. **Case agency URL** comes from the joined `location_path.path` plus agency slug (AGENTS.md), and the case agency must have an agency page (`build_page_payload` agency row) to be linked; otherwise its name shows without a link.
3. **"Current" means an assignment at this agency that `currentAssignmentSql` treats as current.** A person with both current and former assignments here counts as current.
4. **Ordering:** rows with at least one current staff member first, then former-only rows; within each, `filed_date desc, title asc`.
5. **Agency profile:** below the own-case recent list, a separate block with its own heading, a one-line explanation, its own count and up to the same number of recent rows as the own list, linking to the civil-cases page for the rest. The tile's value stays the own count.
6. **Civil-cases page:** own cases table first (unchanged), then a second section with its own heading and table and its own pagination using `CIVIL_CASES_PAGE_SIZE`. To keep one route scheme, page N shows page N of each list; a list past its last page shows nothing for that section. _Alternative:_ a separate route `/civil-cases/other-jobs/` — rejected for now as more routes and redirects; can be revisited.
7. **Page eligibility:** the agency civil-cases page exists when the own list or the other-jobs list has rows. `getStaticPaths` enumerates from the same loader counts; the render reloads by params and throws on an out-of-range page.
8. **Copy (8th grade, descriptive):** heading "Cases from staff members' other jobs"; explanation "These cases are tied to a staff member's job at another agency, not to this agency." Per-person text "Name — while at Agency (current staff / former staff)". Follow DESIGN.md tokens and existing table/StatCell patterns; no inline CSS.

## Risks / Trade-offs

- [Visitors read the second count as the agency's record] → separate heading, explanation sentence, and no combined total anywhere.
- [Large agencies produce long lists] → paginate the section with the existing page size; profile shows only recent rows.
- [Pagination of two lists on one route] → each section has its own "page N of M" text; page links cover the larger of the two page counts.
- [Build time] → one extra query per agency, scoped by agency id; same order of cost as the removed query.

## Migration Plan

No data migration. Ships with the next site build; rollback is reverting the change.

## Open Questions

- Marker on the agency personnel list (not in this change unless approved).
- Whether page eligibility should include other-jobs-only agencies (this design says yes).
