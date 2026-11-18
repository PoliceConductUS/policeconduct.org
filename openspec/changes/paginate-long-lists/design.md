## Context

The site has no single rule for long lists. Today:

| List                                                         | Route                                  | Rows today                           | Behavior today                                                         |
| ------------------------------------------------------------ | -------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Counties in a state                                          | `/{state}/counties/`                   | up to 254 (Texas)                    | every row on page 1                                                    |
| Places in a county                                           | `/{state}/{county}/places/`            | up to 171                            | every row on page 1                                                    |
| Agencies in a place                                          | `/{state}/{county}/{place}/agencies/`  | up to 40                             | every row on page 1                                                    |
| Agency civil cases                                           | `<agency>/civil-cases/`                | up to 58                             | every row on page 1                                                    |
| Agency personnel roster                                      | `<agency>/personnel/`                  | up to 6,030 (Texas DPS, 2.1 MB HTML) | every row on page 1, filtered in the browser                           |
| Area civil cases                                             | `/{state}/civil-cases/`, county, place | up to several hundred                | the 50 most recent from a 200-row query, no pager                      |
| Global civil cases                                           | `/civil-cases/`                        | 551                                  | 25 per page, paginated                                                 |
| Agency reports, news, data annotations                       | various                                | —                                    | 50 per page (`PAGE_SIZE`), paginated                                   |
| Licensing, discipline, education browsers on personnel pages | in-page                                | —                                    | 10 per view, local controls, no URLs (`authority-discipline-browsing`) |

Lists outside this table already comply: the federal agency and branch tables
(`CivicAgencyHierarchyPage.astro`) have at most 11 rows today, and the 25
people on `/personnel/` appear only in its structured data (JSON-LD), not in a
visible list; the visible page is the state map.

Commit `74ecc8a` deleted the `/page/{n}/` routes for counties, places, place
agencies and agency civil cases, because page 1 already showed every row and
those pages only repeated it. The user approved those 404s with no redirect.

`src/lib/pagination.ts` exports `PAGE_SIZE = 50`. `src/components/Pagination.astro`
renders the pager, `CivicChildIndexPage.astro` already accepts a `page` prop with
`currentPage`, `data` and `lastPage`, and `src/lib/alpha-navigation.ts` maps each
initial letter to the page where it starts. `/find-records/data.json` is an
existing static JSON endpoint that the browser loads on first use.

The roster component `AgencyPersonnelList.astro` filters rows already in the
DOM: name (substring of `last, first`), status facet, and "With discipline
actions" (person-level discipline count, per `roster-discipline-filter`). It
updates a "Showing X of Y" summary and an empty state, and it hides A–Z letters
that have no visible rows. The tools appear only for rosters of 15 or more rows.

## Goals / Non-Goals

**Goals:**

- Every list of more than 50 rows shows 50 rows per page, with page 1 at the
  base path, later pages at `/page/{n}/`, and a pager on every page.
- No list drops rows without a pager.
- Every roster control works across the whole roster, combined as today.
- The standard is written down in `DESIGN.md` and `AGENTS.md`.

**Non-Goals:**

- A site-wide header search (a separate change, `unify-header-search`). The
  user decided on 2026-11-18 that it finds no people for now and filters by
  state only.
- Shareable URLs for filtered roster results.
- The 10-per-view in-page browsers on personnel pages. They keep their own
  local paging, as `authority-discipline-browsing` specifies.
- Changing sort orders, row content or which records each list includes.

## Decisions

### D1. One page size from one place

Every paginated list uses `PAGE_SIZE` (50) from `src/lib/pagination.ts`.
`CIVIL_CASES_PAGE_SIZE` (25) is removed. A list with 50 or fewer rows renders as
one page with no pager and generates no `/page/{n}/` routes.

### D2. Server-rendered pages for lists without filters

Counties, places, place agencies, agency civil cases, global civil cases and
area civil cases render rows `0–49` on the base path and rows `50(n−1)…50n−1`
on `/page/{n}/`, using Astro `paginate()` as the reports and news routes do.
The base page and each later page load their rows from the same loader, so page
1 and the paged routes cannot drift apart again. Page 2 and later stay
self-canonical, as today for news and reports.

### D3. Area civil cases lose their hidden cap

The area civil-case query drops `limit 200`, and the table drops
`slice(0, 50)` and the "showing the 50 most recent" note. The list is paginated
like the others. The scope note from `d5031fe` stays on every page.

### D4. Rosters: 50 people per page, whole-roster filtering from a data file

- `<agency>/personnel/` shows the first 50 people in the existing sort order,
  and `<agency>/personnel/page/{n}/` the rest, each with the pager.
- The summary line keeps the whole-roster totals (personnel, current, former,
  uncertain) on every page.
- The A–Z jump lists every letter present in the whole roster and links each
  letter to the page and anchor where it starts (`buildAlphaPageMap`).
- For rosters of more than 50 rows, the build emits
  `<agency>/personnel/roster.json` from the same rows the pages render. Each
  entry holds the label, profile URL (or none), status, context line,
  agency-linked discipline count, person-level discipline count and the
  lower-case search key. The data file has no fields the page does not already
  show.
- The first time a visitor types a name, picks a status facet or checks "With
  discipline actions", the script fetches `roster.json` once. While any filter
  is active, the list area shows the matching rows from the whole roster in
  roster order, 50 per view, with Previous/Next buttons and "Results 1–50 of N".
  The summary reads "Showing N of TOTAL", the empty state works as today, and
  the A–Z letters dim when no result starts with that letter.
- While a filter is active, an A–Z letter moves the filtered view to the 50-row
  view that holds the first result starting with that letter. It does not
  leave the page or drop the filter.
- Clearing every filter restores the server-rendered page and its pager.
- Rosters of 50 or fewer rows stay one page and keep filtering their rendered
  rows. They get no data file.
- While the file loads, the summary says "Loading the full roster…". If it fails
  to load, the summary says the full roster could not be loaded and asks the
  visitor to try again, and the page keeps its server-rendered rows. The script
  never presents one page's rows as whole-roster results.
- Client-rendered result rows reuse the same markup and classes as the server
  rows, so they look identical.

### D4a. Roster pages stay in the site search index

Roster pages use `PageShell` with the default `searchable` setting today, so
the names on them can be found with the site search. Every roster page,
including `/page/{n}/`, stays in the index so this keeps working. The index
gains about 2,700 small pages; measure its size before and after in
`verify.md`. Whether the site search should find people at all is for the
separate header search change, where the user said "no people at the moment".

### D4b. Later pages of area civil-case lists

Page 2 and later of `/{state}/civil-cases/` and the county and place versions
repeat the heading, breadcrumb, scope note and pager. The overview above the
table (stat band and charts from `CivicScopedOverviewPage`) appears on page 1
only, like the global `/civil-cases/page/{n}/` pages, which repeat only their
header.

### D5. Removed page numbers are 404s

Moving the global civil-case list from 25 to 50 rows per page removes its
higher page numbers (about `/civil-cases/page/13/` to `/page/23/` today). Those
URLs are recorded in `route-absences.json` as 404s with no redirect, as the user
decided for the removed duplicate pages. This waits on the user's confirmation
(Open Questions).

### D6. Document the standard

- `DESIGN.md` gets a "Lists" rule: more than 50 rows means 50 per page, a pager
  on every page, and no hidden truncation.
- `AGENTS.md` adds the same rule next to the existing pagination URL rule in
  Data + Routing Conventions.

### Alternatives considered

Option B (a dropdown name search plus one route per filter) breaks combined
filters. Option C (Pagefind person records with an agency filter) needs about
160,000 records and fragment files and changes name matching. The user chose
the per-agency data file. `brainstorm.md` has the details.

## Risks / Trade-offs

- [The build gains about 2,700 roster pages, about 690 roster data files and the
  area civil-case pages] → This is about 1.5% more pages. Measure build time and
  `dist` size before and after on a local build and record both in `verify.md`.
- [Texas DPS `roster.json` is about 700 KB raw, about 100 KB compressed
  (estimate)] → It loads only when a visitor filters. Measure the real size in
  verification.
- [Client-rendered rows could drift from server rows] → Build both from one row
  model, and an e2e test compares a filtered result row with the same person's
  server-rendered row.
- [Bookmarked roster anchors such as `#roster-s` now live on a later page] →
  The A–Z bar links to the right page. The old anchor on page 1 lands at the
  top, which is acceptable.
- [Search engines see new paged URLs] → They are self-canonical like news and
  reports pages, and they enter the sitemap automatically.

## Migration Plan

Pages are generated at build, so this ships with the next release build. No
data migration. Rollback is a revert of the change's commits followed by a
rebuild.

## Open Questions

- Confirm that the global civil-case page numbers that stop existing
  (about `/civil-cases/page/13/` to `/page/23/`) should be 404s with no
  redirect, like the removed duplicate pages.
