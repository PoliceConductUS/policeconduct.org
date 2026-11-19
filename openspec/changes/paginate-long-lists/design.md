## Context

The site has no single rule for long lists. This table describes the branch
after its sync with `ddl-openspec` (`b097b2f`). "Max rows" figures are dated
2026-11-18; task group 2 measures every list again before code changes and
records the result in `verify.md`.

| List                                                         | Route                                                    | Max rows                       | Behavior today                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Counties in a state                                          | `/{state}/counties/`                                     | 254 (Texas)                    | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Places in a county                                           | `/{state}/{county}/places/`                              | 171                            | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Agencies in a place                                          | `/{state}/{county}/{place}/agencies/`                    | 40                             | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Agency civil cases                                           | `<agency>/civil-cases/`                                  | 58                             | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Agency personnel roster                                      | `<agency>/personnel/`                                    | 6,030 (Texas DPS, 2.1 MB HTML) | every row on page 1, filtered in the browser                           |
| Area civil cases                                             | `/{state}/civil-cases/`, county, place                   | measured in task 2.2           | the 50 most recent from a 200-row query, no pager                      |
| Global civil cases                                           | `/civil-cases/`                                          | 551                            | 25 per page (`CIVIL_CASES_PAGE_SIZE`), Astro `paginate()`              |
| News                                                         | `/news/`                                                 | —                              | 50 per page (`PAGE_SIZE`), Astro `paginate()`                          |
| Agency reports, data annotations                             | various                                                  | —                              | 50 per page (`PAGE_SIZE`), params-only routes                          |
| Area report archives (state, county, place)                  | `/{state}/reports/`, county, place (`ReportArchivePage`) | measured in task 2.2           | every report on one page, no pager                                     |
| Federal agency, branch, civil-case and personnel lists       | `/federal/…` (`CivicAgencyHierarchyPage`)                | measured in task 2.2           | every row on one page                                                  |
| Personnel topic pages                                        | `/personnel/{slug}/{topic}/`                             | measured in task 2.2           | every row on one page                                                  |
| Fatal-force incident lists (state, county, place)            | `/{state}/fatal-force-incidents/`, county, place         | measured in task 2.2           | every row on one page                                                  |
| Previews on other pages                                      | personnel profile, agency overview (`index.astro`)       | —                              | a few recent rows; excluded (D2), must link to the full list           |
| Licensing, discipline, education browsers on personnel pages | in-page                                                  | —                              | 10 per view, local controls, no URLs (`authority-discipline-browsing`) |

Lists with at most 50 rows comply. Each list measured above 50 rows in task 2.2
is in scope: the rows above with a dated maximum over 50 are listed in D2, and
any other list measured above 50 rows is added to D2, Impact and `tasks.md`
before code for it is written. The 25 people on `/personnel/` appear only in
its structured data (JSON-LD), not in a visible list; the visible page is the
state map.

The paged routes for counties, places, place agencies and agency civil cases
follow one pattern (`src/pages/[category]/counties/page/[...page].astro`):
`getStaticPaths()` returns params only, the render reloads the location or
agency by its exact path, and it passes `currentPage` to the component.
`CivicChildIndexPage`, `AgencyCivilCasesPage` and `AgencyTopicPage` take
`currentPage`, slice their rows themselves, and throw for a page number past the
last page. `AgencyTopicPage` builds `pagePath` as `…/page/{n}/` for page 2 and
later, so those pages are self-canonical. `src/lib/alpha-navigation.ts` no
longer exists; D4 builds its replacement in `src/lib/data/agency-roster.ts`.

`src/lib/pagination.ts` exports `PAGE_SIZE = 50`, and
`src/components/Pagination.astro` renders the pager.
`src/lib/data/civil-cases.ts` still exports `CIVIL_CASES_PAGE_SIZE = 25` for the
global list. `/find-records/data.json` is an existing static JSON endpoint that
the browser loads on first use.

The roster component `AgencyPersonnelList.astro` filters rows already in the
DOM: name (substring of `last, first`), status facet, and "With discipline
actions" (person-level discipline count, per `roster-discipline-filter`). It
updates a "Showing X of Y" summary and an empty state, and it dims A–Z letters
that have no visible rows. The name search, status facets and A–Z jump appear
only for rosters of 15 or more rows; the "With discipline actions" checkbox
always appears.

## Goals / Non-Goals

**Goals:**

- Every server-rendered list page of more than 50 rows shows 50 rows per page,
  with page 1 at the base path, later pages at `/page/{n}/`, and a pager on
  every page.
- No list shows only part of its rows without a pager.
- Every roster control keeps its matching rules across the whole roster, and
  filters still combine.
- Roster pages leave the site search index.
- The standard is written down in `DESIGN.md`, `AGENTS.md` and the affected
  `EGM.md` contracts.

**Non-Goals:**

- A site-wide header search (a separate change, `unify-header-search`). The
  user decided on 2026-11-18 that it finds no people for now and filters by
  state only.
- Shareable URLs for filtered roster results.
- The 10-per-view in-page browsers on personnel pages. They keep their own
  local paging, as `authority-discipline-browsing` specifies.
- Changing which records each list includes or how rows look. The only sort
  change is a final tie-break key (D2).
- An A–Z jump on county, place or agency lists.

## Decisions

### D1. One page size from one place

Every paged list uses `PAGE_SIZE` (50) from `src/lib/pagination.ts`.
`CIVIL_CASES_PAGE_SIZE` (25) is removed. A list with 50 or fewer rows renders as
one page with no pager and generates no `/page/{n}/` routes.

### D2. Server-rendered pages for lists without filters

The lists this change pages are the global civil cases, the state, county and
place civil cases, and agency rosters (D4), plus any list task 2.2 measures above
50 rows. Counties, places, place agencies and agency civil cases already comply
and do not change.

Each list renders rows 1-50 on the base path and rows 50(n−1)+1 to 50n on
`/page/{n}/`. Every paged route follows the pattern in
`src/pages/[category]/counties/page/[...page].astro`: `getStaticPaths()` returns
params only (one entry per page number from 2 to the last page); the render
parses and checks `Astro.params.page`, reloads the entity by its exact path,
and passes `currentPage` to a component that slices the rows and throws when the
page number is past the last page. No route uses Astro `paginate()` or passes
rows or identity through props. `src/pages/civil-cases/page/[...page].astro` and
`src/pages/news/page/[...page].astro` move to this pattern in this change.

Every paged query ends its `order by` with the row's primary key (`c.id` for
civil cases), so rows that tie on every other sort column keep one order across
page renders. A unit test checks that the union of all pages equals the full
list with no duplicates.

Self-canonical pages come from `currentPage` on `AgencyTopicPage`,
`CivicChildIndexPage` and the components in D6: page 2 and later set `pagePath`
to `…/page/{n}/`, which `SiteLayout` uses as the canonical URL. Page 2 and later
add "Page N" to the `<title>` and breadcrumb.

Only agency rosters have an A–Z jump; county, place and agency lists do not get
one in this change.

Preview excerpts on other pages (the personnel profile, the agency overview)
are not paged. Each must link to the page that holds the complete list; task
5.4 checks this and reports any preview without that link instead of adding one.

### D3. Area civil cases show every row through a pager

The area civil-case query drops `limit 200`, and the table drops
`slice(0, 50)` and the "showing the 50 most recent" note. The list is paged like
the others. The page description, which says which cases the list includes,
stays on every page.

`getStaticPaths()` for area civil-case pages and roster pages counts rows with a
count-only query per location or agency, not the full loader. The area loader
caches its result per location path for the length of a production build, as
`agency-detail.ts` does for agency detail, and slices it per page.

### D4. Rosters: 50 people per page, whole-roster filtering from a data file

**Roster row model.** One module, `src/lib/data/agency-roster.ts`, moves the row
building out of the `AgencyPersonnelList.astro` frontmatter. It exports
`buildAgencyRoster(detail)`, which returns:

- the rows in display order: the letter groups flattened in their rendered
  order, so "Unnamed record" and `#` rows sit where they render today;
- the whole-roster totals (personnel, current, former, uncertain);
- `letterPages`: for each letter group present, the page number and anchor where
  it starts (`…/personnel/page/{n}/#roster-{letter}`, or the base path for page
  1).

Pages slice this flattened list. `src/lib/alpha-navigation.ts` is not restored.
The JSON entry type is
`{ label: string; href: string | null; status: 'current' | 'former' | 'uncertain'; context: string; agencyDisciplineCount: number; personDisciplineCount: number; letter: string }`.
`AgencyPersonnelList` takes
`roster: { kind: 'single'; rows } | { kind: 'paged'; rows; currentPage; lastPage; totals; letterPages; dataPath }`.
No boolean prop is added.

**Endpoint.** The data file is
`src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/roster.json.ts`,
modeled on `src/pages/data-annotations/[...parts]/data.csv.ts`:
`getStaticPaths()` returns params only, for agencies whose roster has more than
50 rows; the handler reloads the agency through `loadAgencyDetailByRouteParams`
and fails when it is missing or has 50 or fewer rows. The endpoint is not in the
sitemap.

**Pages and controls.**

- `<agency>/personnel/` shows the first 50 people in display order, and
  `<agency>/personnel/page/{n}/` the rest, each with the pager.
- The summary line keeps the whole-roster totals (personnel, current, former,
  uncertain) on every page.
- The A–Z jump lists every letter group present in the whole roster, including
  `#`, and links each to the page and anchor where it starts (`letterPages`).
- Each data file entry holds the label, profile URL (or none), status, context
  line, agency-linked discipline count, person-level discipline count and
  letter group (type above). The client derives the search key from the label.
  The data file holds no field beyond what the roster's HTML already contains,
  including its `data-` attributes.
- The first time a visitor types a name, picks a status facet or checks "With
  discipline actions", the script fetches `roster.json` and keeps it after the
  first successful load. While any filter is active, the list area shows the
  matching rows from the whole roster in display order, 50 per view, with
  Previous/Next buttons. The existing summary reads "Showing {a}–{b} of {N}
  matching people ({TOTAL} on this roster)", the same range wording as
  `PersonnelEducation.astro`; there is no second counter. The empty state works
  as today, and the A–Z letters dim when no result starts with that letter.
- While a filter is active, an A–Z letter moves the filtered view to the 50-row
  view that holds the first result starting with that letter. It does not leave
  the page or drop the filter. Without a filter, an A–Z letter links to the page
  and anchor where that letter starts.
- The filtered view keeps the letter-group headings for the groups it shows.
- Clearing every filter restores the server-rendered page and its pager. The
  server pager is hidden while a filter is active.
- Rosters of 50 or fewer rows stay one page and keep filtering their rendered
  rows. They get no data file.
- While the file loads, the summary says "Loading the full roster…". Filter
  input typed while the file loads is kept and applied when it arrives. If it
  fails, the summary says the full roster could not be loaded, a "Try again"
  button retries the fetch, and the page keeps its server-rendered rows. The
  script never presents one page's rows as whole-roster results.
- The filtered view follows the local-pager rules of
  `authority-discipline-browsing`: Previous and Next are buttons named "Previous
  results" and "Next results", disabled at the first and last view; after
  Previous, Next or an A–Z jump, focus moves to the results heading; one
  `aria-live="polite"` region (the existing summary) announces the range and
  total, and no second live counter is added.
- The server renders one hidden `<template>` row from the same Astro partial as
  the server rows; the script clones it and fills it with `textContent` and
  `href` only, never `innerHTML`. One filter function runs over row records; for
  rosters of 50 or fewer rows the records come from the rows' `data-*`
  attributes, for larger rosters from `roster.json`.

### D5. Roster pages leave the site search index

The owner decided on 2026-11-19 to remove every roster page from the site search
index in this change. Every `<agency>/personnel/` page and every
`<agency>/personnel/page/{n}/` page renders without `data-pagefind-body`, through
`PageShell`'s existing `searchable` setting (as `/personnel/[slug]/` does since
`b41ae26`). `AgencyTopicPage` passes that setting through to `PageShell` for the
roster routes; every other agency topic stays in the index. The index loses
every roster page it holds today and gains none of the new ones; task groups 2
and 14 record the indexed page count and index size before and after in
`verify.md`.

### D6. Later pages of area civil-case lists

Page 2 and later of `/{state}/civil-cases/` and the county and place versions
render the same page as page 1 (heading, breadcrumb, description, count line and
the "Submit civil case" action bar) with that page's 50 rows and the pager.
Page 2 and later add "Page N" to the title and breadcrumb and are
self-canonical. `CivicScopedIndexPage` and `CivicScopedOverviewPage` take a
required `currentPage: number` (1 for every existing caller of the other four
topic kinds) and build `pagePath` and the canonical URL from it, as
`AgencyTopicPage` does. `CivicScopedRowsTable` receives the already-sliced rows.
No boolean prop is added.

### D7. Removed page numbers are 404s

When a list moves to 50 rows per page, page numbers above its new last page
return 404 with no redirect. In this change that is the global civil-case list
(551 cases on 2026-11-18 fill 12 pages instead of 23). Agency civil-case lists
already page at 50; their one removed page number
(`/tx/harris-county/houston/harris-co-sheriff-s-office-0a08ad/civil-cases/page/2/`)
already has a `route-absences.json` entry, which task 4.4 rechecks. The task
derives the exact URLs from the sitemap of the production release that is live
when the change is built and adds one `route-absences.json` entry for each. The
same task deletes every `route-absences.json` entry whose route this change
builds again. The owner confirmed this rule for the global list on 2026-11-18;
the spec applies it to every list.

### D8. Document the standard

- `DESIGN.md`: add a `## Lists` section: "A list of more than 50 rows shows 50
  rows per page, with page 1 at the base path, later pages at `/page/{n}/`, and a
  pager on every page. No list shows only part of its rows without a pager."
- `AGENTS.md` Data + Routing Conventions: after the bullet "Pagination URLs use
  /page/{number}/; page 1 is the base path with no /page/1/.", add: "Lists of
  more than 50 rows show 50 rows per page (`PAGE_SIZE`). No list shows only part
  of its rows without a pager."
- Update the `EGM.md` contracts that state the old behavior: `src/EGM.md` (remove
  the 25-per-page civil-case exception), `src/lib/data/EGM.md` (`limit 200`,
  `CIVIL_CASES_PAGE_SIZE`), `src/components/EGM.md` (`slice(0, 50)`, roster
  component), `src/pages/civil-cases/EGM.md`, `src/pages/civil-cases/page/EGM.md`,
  `src/pages/news/page/EGM.md`, the agency personnel `EGM.md`, and the area
  civil-case route `EGM.md` files. Add an `EGM.md` for each new route folder and
  for the roster data endpoint.

## Alternatives Considered

- Rosters: Option B (a dropdown name search plus one route per filter) breaks
  combined filters. Option C (Pagefind person records with an agency filter)
  needs about 160,000 records and fragment files, the per-release index cost
  that `b41ae26` removed, and changes name matching. The user chose the
  per-agency data file. `brainstorm.md` has the details.
- D1: 25 per page (the old civil-case size) or "load more" — not chosen; the
  owner set 50 on 2026-11-18, and "load more" gives later rows no URL.
- D5: keep roster pages in the index until `unify-header-search`, or keep only
  page 1 — not chosen; the owner chose to remove every roster page now
  (2026-11-19).
- D7: redirect removed page numbers to the last page — not chosen; the owner
  confirmed 404 with no redirect on 2026-11-18.

## Testing

- Unit (`src/lib/data/agency-roster.test.mjs`, run by `npm run test:data`): row
  order and letter groups; `letterPages` page and anchor; page counts at 50, 51
  and 101 rows; the union of all pages equals the list with no duplicates,
  including rows that tie on every sort column but the key; JSON entry shape.
- E2E: update `tests/e2e/agency-discipline.spec.ts` to the new `roster` prop
  (both `kind`s) with the data file served by the harness; a 51-row fixture
  roster has 2 pages; a filter finds a person on page 2; a load failure shows the
  "Try again" state and keeps server rows; A–Z while filtering; keyboard focus
  and announcements (D4); a filtered row matches the same person's server row;
  a roster of 50 or fewer rows requests no data file; a global civil-case page
  past the last page returns 404; roster pages carry no `data-pagefind-body`.
- Fixtures are generated in the test, not from the shared database, so no
  database or seed change is needed and no row ID is hard-coded.

## Risks / Trade-offs

- [The build gains about 2,700 roster pages, about 690 roster data files and the
  area civil-case pages] → Measure build time, peak build memory and `dist` size
  before and after on a local build and record them in `verify.md`.
- [Removing `limit 200` reruns the area queries per page, and the agency-detail
  cache holds every agency] → Count-only enumeration and a per-path cache (D3);
  record peak build memory before and after in `verify.md`.
- [The largest `roster.json` (Texas DPS, 6,030 entries) is estimated at 1-1.5 MB
  raw] → It loads only when a visitor filters; the search key is derived on the
  client. Record its real raw and compressed size in `verify.md`.
- [Client-rendered rows could drift from server rows] → Both come from one row
  model and one `<template>` partial, and an e2e test compares a filtered result
  row with the same person's server-rendered row.
- [The data files make it easier to copy every name on a large roster] → Each
  file holds only what the roster's HTML already holds; the roster pages already
  publish these names. The files are not in the sitemap.
- [`NO_PERSONNEL` builds] → The data file is built exactly when its roster page
  is built, and its `href` follows the roster page's link rule under
  `NO_PERSONNEL`. A test checks this.
- [HTML from one release with a data file from another] → Both are uploaded
  together under one `<commit>/build/` prefix by `npm run deploy`, and the page
  fetches the file by a relative path, so both come from the same release.
- [JavaScript is off] → The server pages and pager work without JavaScript; the
  filters need JavaScript, as today.
- [Bookmarked roster anchors such as `#roster-s` now live on a later page] → The
  A–Z bar links to the right page. An old anchor for a letter that moved to a
  later page opens page 1 at the top.
- [Search engines see new paged URLs] → Each is self-canonical and has a unique
  "Page N" title (D2), and they enter the sitemap automatically.
- [Names on roster pages can no longer be found with the site search] → This is
  the owner's decision (D5); profile pages already left the index in `b41ae26`.
- [A list shrinks later and a page number disappears] →
  `scripts/verify-redirect-coverage.mjs` fails the deploy until an absence entry
  is added. This is the existing gate for every paged list; no new handling.

## Migration Plan

Pages are generated at build, so this ships with the next release. No data
migration. Rollback is a revert of the change's commits followed by a rebuild.

## Open Questions

- Approval: the owner has not approved this design yet.
- Agent call, open to correction: while a filter is active, an A–Z letter moves
  the filtered view to the first result with that letter instead of leaving the
  page (D4).
- Agent call, open to correction: later pages of area civil-case lists repeat
  everything above the table (D6).
- Agent calls in D4 on loading, "Try again", input typed while loading, and the
  letter-group headings in the filtered view.
- Agent call, open to correction: D5 passes `PageShell`'s existing boolean
  `searchable` setting through `AgencyTopicPage`. AGENTS.md forbids adding
  boolean behavior flags to components; the alternative is a separate roster
  page component that composes `PageShell` with `searchable={false}`.
