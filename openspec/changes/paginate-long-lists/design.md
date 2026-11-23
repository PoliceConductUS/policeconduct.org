## Context

The site has no single rule for long lists. This table describes `ddl-openspec`
after the 2026-11-22 merge and the site-decisions removal (`84c5cec`), with the
staff counts read from intake views (`179d0cd`, `5bf8979`). "Max rows" figures
come from read-only queries against the local database; each is dated. Task 2.2
measures them again before code changes and records the result in `verify.md`.

| List                                                         | Route                                                    | Max rows                                                                                                    | Behavior today                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Counties in a state                                          | `/{state}/counties/`                                     | 254 (Texas, 2026-11-18)                                                                                     | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Places in a county                                           | `/{state}/{county}/places/`                              | 171 (2026-11-18)                                                                                            | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Agencies in a place                                          | `/{state}/{county}/{place}/agencies/`                    | 40 (2026-11-18)                                                                                             | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Agency civil cases (agency-linked scope)                     | `<agency>/civil-cases/`                                  | 58 (Houston Police Department, 2026-11-22)                                                                  | paged at 50 (`PAGE_SIZE`) by params-only routes                        |
| Agency personnel roster                                      | `<agency>/personnel/`                                    | 8,146 rows (Harris County Sheriff's Office, 2026-11-22); Texas DPS 6,194 rows (2.1 MB HTML on 2026-11-18)   | every row on page 1, filtered in the browser                           |
| Area civil cases (agency-linked scope)                       | `/{state}/civil-cases/`, county, place                   | state 485 (`/tx/`), county 122 (`/tx/harris-county/`), place 100 (`/tx/harris-county/houston/`), 2026-11-22 | the 50 most recent from a 200-row query, no pager                      |
| Global civil cases                                           | `/civil-cases/`                                          | 551 (2026-11-22)                                                                                            | 25 per page (`CIVIL_CASES_PAGE_SIZE`), Astro `paginate()`              |
| News                                                         | `/news/`                                                 | —                                                                                                           | 50 per page (`PAGE_SIZE`), Astro `paginate()`                          |
| Agency reports, data annotations                             | various                                                  | —                                                                                                           | 50 per page (`PAGE_SIZE`), params-only routes                          |
| Area report archives (state, county, place)                  | `/{state}/reports/`, county, place (`ReportArchivePage`) | 2 (`/mn/`, 2026-11-22)                                                                                      | every report on one page, no pager; complies                           |
| Federal agency, branch, civil-case and personnel lists       | `/federal/…` (`CivicAgencyHierarchyPage`)                | 11 federal agencies; 0 branches and 0 civil cases per federal agency (2026-11-22)                           | every row on one page; complies                                        |
| Personnel topic pages                                        | `/personnel/{slug}/{topic}/`                             | civil cases 8, reports 1 (2026-11-22)                                                                       | every row on one page; complies                                        |
| Fatal-force incident lists (state, county, place)            | `/{state}/fatal-force-incidents/`, county, place         | —                                                                                                           | no rows rendered (not projected for this scope yet); not in scope      |
| Previews on other pages                                      | personnel profile, agency overview (`index.astro`)       | —                                                                                                           | a few recent rows; excluded (D2), must link to the full list           |
| Licensing, discipline, education browsers on personnel pages | in-page                                                  | —                                                                                                           | 10 per view, local controls, no URLs (`authority-discipline-browsing`) |

Lists with at most 50 rows comply. On 2026-11-22 the lists above 50 rows are the
agency rosters, the area civil-case lists and the global civil-case list; D2
names them. 771 rosters have more than 50 rows on 2026-11-22. The 25 people on
`/personnel/` appear only in its structured data (JSON-LD), not in a visible
list; the visible page is the state map.

The paged routes for counties, places, place agencies and agency civil cases
follow one pattern (`src/pages/[category]/counties/page/[...page].astro`):
`getStaticPaths()` returns params only, the render reloads the location or
agency by its exact path, and it passes `currentPage` to the component.
`CivicChildIndexPage`, `AgencyCivilCasesPage` and `AgencyTopicPage` take
`currentPage`; the first two slice their rows themselves and throw for a page
number past the last page. `AgencyTopicPage` builds `pagePath` as `…/page/{n}/`
for page 2 and later, so those pages are self-canonical. Neither
`AgencyTopicPage` nor `CivicChildIndexPage` adds "Page N" to the title or
breadcrumb today. `src/lib/alpha-navigation.ts` no longer exists; D4 builds its
replacement in `src/lib/data/agency-roster.ts`.

`src/lib/pagination.ts` exports `PAGE_SIZE = 50`, and
`src/components/Pagination.astro` renders the pager.
`src/lib/data/civil-cases.ts` still exports `CIVIL_CASES_PAGE_SIZE = 25` for the
global list. `/find-records/data.json` is an existing static JSON endpoint that
the browser loads on first use.

The roster component `AgencyPersonnelList.astro` filters rows already in the
DOM: name (substring of `last, first` as stored) and "With discipline actions"
(per `roster-discipline-filter`). It updates the summary and an empty state, and
it dims A–Z letters with no visible rows. The summary shows the staff counts
(personnel, current, former, uncertain) that `loadAgencyDetail` reads from the
intake view `site_agency_count`; while a filter is active it reads "Showing X of
Y". The name search and A–Z jump appear only for rosters of 15 or more rows; the
"With discipline actions" checkbox always appears. The site-decisions removal
(2026-11-22) took out the status facet, the "Unnamed record" label and the
per-person license rule, because the site derived them
(`.egm-reviews/site-decisions-inventory.md` §2 item 1). The status facet returns
only when intake adds `agency_personnel.employment_status`, in a later change.
Each roster row is one `agency_personnel` row (one entry per assignment period),
so a person with two assignments at one agency has two rows.

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
  owner decided on 2026-11-18 that it finds no people for now and filters by
  state only. `unify-header-search` owns the `site-search` spec delta; until it
  lands, `openspec/specs/site-search/spec.md` still mentions officers.
- Shareable URLs for filtered roster results.
- The 10-per-view in-page browsers on personnel pages. They keep their own
  local paging, as `authority-discipline-browsing` specifies.
- Changing which records each list includes or how rows look. The only sort
  change is a final tie-break key (D2).
- Bringing back the status facet, status-derived values or a label fallback on
  the roster. They return only from intake data, in a later change.
- An A–Z jump on county, place or agency lists.

## Decisions

### D1. One page size from one place

Every paged list uses `PAGE_SIZE` (50) from `src/lib/pagination.ts`.
`CIVIL_CASES_PAGE_SIZE` (25) is removed. A list with 50 or fewer rows renders as
one page with no pager and generates no `/page/{n}/` routes.

### D2. Server-rendered pages for lists without filters

The lists this change pages are the global civil cases, the state, county and
place civil cases, and agency rosters (D4). Counties, places, place agencies
and agency civil cases keep their page size and routes; their components gain
"Page N" on page 2 and later.

Each list renders rows 1-50 on the base path and rows 50(n−1)+1 to 50n on
`/page/{n}/`. Every paged route follows the pattern in
`src/pages/[category]/counties/page/[...page].astro`: `getStaticPaths()` returns
params only (one entry per page number from 2 to the last page); the render
parses and checks `Astro.params.page`, reloads the entity by its exact path,
and passes `currentPage` to a component that slices the rows and throws past
the last page (`CivicChildIndexPage`, `AgencyCivilCasesPage`,
`CivicScopedIndexPage`, `AgencyPersonnelList`). The global civil-case and news
routes have no such component; each slices in the route and throws past the last
page, as
`src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/reports/page/[...page].astro`
does. News reloads `loadNewsArticles()` (file-based, no database path) and keeps
its "Newer News"/"Older News" links; it does not adopt `Pagination`. No route
uses Astro `paginate()` or passes rows or identity through props.
`src/pages/civil-cases/page/[...page].astro` and
`src/pages/news/page/[...page].astro` move to this pattern in this change.

Every paged query ends its `order by` with the row's primary key (`c.id` for
civil cases), and the JS comparator in `src/lib/data/agency-civil-case-rows.ts`
ends with `id`. Roster ties are already broken by `personnel_id` in
`comparePersonnelEntry` (`agency-detail.ts`). A unit test checks that the pages
together cover the list once.

Page 2 and later are self-canonical: `AgencyTopicPage` and the D6 components
build `pagePath` as `…/page/{n}/`, which `SiteLayout` uses as the canonical URL;
`CivicChildIndexPage`, the global civil-case routes and news pass `canonicalUrl`
for the `/page/{n}/` URL. Page 2 and later add "Page N" to the `<title>` and
breadcrumb; `AgencyTopicPage`, `CivicChildIndexPage` and the roster page
component (D5) add it in this change.

Only agency rosters have an A–Z jump; county, place and agency lists do not get
one in this change.

Preview excerpts on other pages (the personnel profile, the agency overview)
are not paged. Each must link to the page that holds the complete list; task
5.4 checks this and reports any preview without that link instead of adding one.

### D3. Area civil cases show every row through a pager

The area civil-case query drops `limit 200`, and the table drops
`slice(0, 50)` and the "showing the 50 most recent" sentence. The list is paged
like the others. The page description, which says which cases the list
includes, stays on every page.

`getStaticPaths()` for roster pages and `roster.json` counts
`buildAgencyRoster(await loadAgencyDetail…).rows.length` from the per-build
cached agency detail, as the agency civil-case paged route does. For area
civil-case pages it calls the area loader, which caches its result per location
path for a production build, and uses `rows.length`. No separate count query is
added.

### D4. Rosters: 50 rows per page, whole-roster filtering from a data file

**Roster row model.** One module, `src/lib/data/agency-roster.ts`, moves the row
building out of the `AgencyPersonnelList.astro` frontmatter. It exports
`buildAgencyRoster(detail)`, which returns:

- `rows`: the letter groups flattened in their rendered order;
- `letterPages`: for each A–Z letter present in the whole roster, the page
  number and anchor where its group starts, using the existing `groupId` rule
  (`…/personnel/page/{n}/#roster-{lowercase letter}`, or the base path with the
  anchor for page 1).

The module only moves the existing row building out of the component; it adds
no status, label fallback or other derived value (AGENTS.md "The Site Is A View
Of The Database"). The summary's staff counts stay the `counts` that
`loadAgencyDetail` reads from `site_agency_count`; the module does not compute
totals. `src/lib/alpha-navigation.ts` is not restored.

In both `kind`s, `rows` is `AgencyRosterRow[]` (the module's exported row type:
`label`, `href`, `context`, `disciplineCount`, `letter`, `search`) in display
order. `context` holds the stored rank, dates, report count and, when
`agency_personnel.license_id` is set, that license's type and status (Q28).
`disciplineCount` is the person's discipline count from any source (Q29), the
same value the "With discipline actions" filter uses. This change lands after
`surface-license-discipline-data` tasks 4.5 and 4.6, which supply these fields in
`agency-detail.ts`; task 1.1 checks that.

The data file is `{ dataVersion: string; entries: Entry[] }`, where `Entry` is
`{ label: string; href: string | null; context: string; disciplineCount: number; letter: string }`.
`AgencyPersonnelList` takes
`roster: { kind: 'single'; rows; counts } | { kind: 'paged'; rows; counts; currentPage; letterPages; dataPath }`.
For `kind: 'paged'`, the route passes the whole roster, and
`AgencyPersonnelList` validates `currentPage`, slices, throws past the last page
and renders `Pagination`. No boolean prop is added.

**Endpoint.** The data file is
`src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/roster.json.ts`,
modeled on `src/pages/data-annotations/[...parts]/data.csv.ts`:
`getStaticPaths()` returns params only, for agencies whose roster has more than
50 rows; the handler reloads the agency through `loadAgencyDetailByRouteParams`
and fails when it is missing or has 50 or fewer rows. `dataVersion` comes from
the same source as the page's `data-data-version` (the `version` of the newest
`public.data_mutation_applied` row, added by `atomic-sha-deploys`). The endpoint
is not in the sitemap.

**Pages and controls.**

- `<agency>/personnel/` shows the first 50 rows in display order, and
  `<agency>/personnel/page/{n}/` the rest, each with the pager.
- The summary line keeps the staff counts from `site_agency_count` (personnel,
  current, former, uncertain) on every page.
- The A–Z bar stays the fixed A–Z set. A letter present in the whole roster
  links to the page and anchor where its group starts (`letterPages`); letters
  absent from the whole roster render dimmed as today. Groups outside A–Z
  (digits, accented initials, `#`) keep their headings and have no bar link, as
  today.
- Each data file entry holds the label, profile URL (or none), context line,
  discipline count and letter group (type above). The client derives the search
  key from the label. Each field is a value the roster HTML already renders or
  carries in a `data-` attribute; `disciplineCount` is carried as
  `data-discipline-count` on every server row, including rows with no profile
  link.
- The first time a visitor types a name or checks "With discipline actions", the
  script fetches `roster.json` and keeps it after the first successful load.
  While any filter is active, the list area shows the matching rows from the
  whole roster in display order, 50 per view, with Previous/Next buttons. The
  existing summary reads "Showing {a}–{b} of {N} matching entries ({TOTAL}
  entries on this roster)", where an entry is one roster row and {TOTAL} is the
  whole-roster row count; this follows the range wording of
  `PersonnelEducation.astro`, and there is no second counter. The empty state
  works as today, and the A–Z letters dim when no result starts with that
  letter.
- While a filter is active, an A–Z letter moves the filtered view to the 50-row
  view that holds the first result starting with that letter. It does not leave
  the page or drop the filter. Without a filter, an A–Z letter links to the page
  and anchor where that letter starts.
- The filtered view keeps the letter-group headings for the groups it shows.
- Clearing every filter restores the server-rendered page and its pager. The
  server pager is hidden while a filter is active.
- Rosters of 50 or fewer rows stay one page, keep filtering their rendered rows
  and keep today's "Showing X of Y" summary. They get no data file.
- While the file loads, the summary says "Loading the full roster…". Filter
  input typed while the file loads is kept and applied when it arrives. If it
  fails, the summary says the full roster could not be loaded, a "Try again"
  button retries the fetch, and the page keeps its server-rendered rows. If the
  file's `dataVersion` differs from the page's `data-data-version`, the script
  shows the same failure state with the text "This roster was updated. Reload
  the page to see the full roster." and keeps the server rows. The script never
  presents one page's rows as whole-roster results.
- The filtered view uses buttons named "Previous results" and "Next results",
  disabled at the first and last view. After Previous, Next or an A–Z jump,
  focus moves to the filtered-results heading: an
  `<h2 tabindex="-1" data-roster-results-heading>` reading "Matching personnel",
  which uses the shared H2 class and is rendered only while a filter is active.
  One `aria-live="polite"` region (the existing summary) announces the range and
  total; no second live counter is added. The view returns to the first view
  when a filter changes.
- Every server row and one hidden `<template>` row render from a new partial,
  `src/components/AgencyRosterRow.astro` (moved from the inline markup in
  `AgencyPersonnelList.astro`). The script clones the template and fills it with
  `textContent` and `href` only, never `innerHTML`. The summary is rebuilt from
  DOM nodes (`<strong>` plus text nodes set with `textContent`), replacing the
  current `innerHTML` save and restore. One filter function runs over row
  records; for rosters of 50 or fewer rows the records come from the rows'
  `data-*` attributes, for larger rosters from `roster.json`.

### D5. Roster pages leave the site search index

The owner decided on 2026-11-19 to remove every roster page from the site search
index in this change (Q48). Every `<agency>/personnel/` page and every
`<agency>/personnel/page/{n}/` page renders through a new component,
`src/components/AgencyRosterPage.astro`. It composes
`src/layouts/PageShell.astro` with `searchable={false}`, as
`src/pages/personnel/[slug]/index.astro` passes it straight to `PageShell`, and
renders the same agency header, breadcrumb, `currentPage` handling and "Page N"
as `AgencyTopicPage`. `AgencyTopicPage` splits nothing out today, so the
`PageShell` props both components build (title, `pagePath`, breadcrumbs,
structured data) move into one function in `src/lib/agency-topic-shell.ts` that
both call. `AgencyTopicPage` gains no prop, and every other agency topic stays in
the index.

`/federal/{slug}/personnel/` (`src/pages/federal/[slug]/personnel/index.astro`)
lists the federal agency's child agencies with their staff counts and also
leaves the index (Q48, Q45; `unify-header-search` counts it as a roster page).
The body of `CivicAgencyHierarchyPage.astro` moves into
`src/components/CivicAgencyHierarchyContent.astro`; `CivicAgencyHierarchyPage`
keeps composing `PageShell` around it for every other route, and the federal
personnel route composes `PageShell` with `searchable={false}` around it
directly. No boolean prop or model field is added.

The index loses every roster page it holds today and gains none of the new ones;
task groups 2 and 14 record the indexed page count and index size before and
after in `verify.md`.

### D6. Later pages of area civil-case lists

Page 2 and later of `/{state}/civil-cases/` and the county and place versions
render the same page as page 1 (heading, breadcrumb, description, the count line
in `CivicScopedRowsTable`, the table and the pager) with that page's 50 rows.
Page 2 and later add "Page N" to the title and breadcrumb and are
self-canonical. `CivicScopedIndexPage` and `CivicScopedOverviewPage` take
`currentPage?: number`, defaulting to 1 as `AgencyTopicPage` does; existing
callers are unchanged. They build `pagePath` and the canonical URL from it.
`CivicScopedIndexPage` validates `currentPage`, slices `records.rows` with
`PAGE_SIZE`, throws past the last page, and passes
`{ kind, rows: pageRows, totalCount, currentPage, lastPage, basePath }` to
`CivicScopedRowsTable`. That component renders the rows and
`<Pagination basePath currentPage lastPage>`. No boolean prop is added.

### D7. Removed page numbers are 404s

When a list moves to 50 rows per page, page numbers above its new last page
return 404 with no redirect. In this change that is the global civil-case list
(551 cases on 2026-11-22 fill 12 pages instead of 23). Agency civil-case lists
already page at 50. Under the agency-linked scope the Harris County Sheriff's
Office has 44 cases on 2026-11-22, so its page 2
(`/tx/harris-county/houston/harris-co-sheriff-s-office-0a08ad/civil-cases/page/2/`)
is not built and already has a `route-absences.json` entry, which task 4.4
rechecks. The task derives the exact URLs from the sitemap of the production
release that is live when the change is built and adds one `route-absences.json`
entry for each. The same task deletes every `route-absences.json` entry whose
route this change builds again. The owner confirmed this rule for the global
list on 2026-11-18; the spec applies it to every list.

### D8. Document the standard

- `DESIGN.md`: add a `Lists` section in the file's plain-label style, after the
  section on components (or at the end if none fits): "A list of more than 50
  rows shows 50 rows per page, with page 1 at the base path, later pages at
  `/page/{n}/`, and a pager on every page. No list shows only part of its rows
  without a pager."
- `AGENTS.md` Data + Routing Conventions: after the bullet "Pagination URLs use
  /page/{number}/; page 1 is the base path with no /page/1/.", add: "Lists of
  more than 50 rows show 50 rows per page (`PAGE_SIZE`). No list shows only part
  of its rows without a pager."
- Update the `EGM.md` contracts that state the old behavior: `src/EGM.md` (remove
  the 25-per-page civil-case exception), `src/lib/data/EGM.md` (`limit 200`,
  `CIVIL_CASES_PAGE_SIZE`, the old sort orders, and a new entry for
  `agency-roster.ts`), `src/components/EGM.md` (`slice(0, 50)`, the roster
  component, and new entries for `AgencyRosterRow.astro`,
  `AgencyRosterPage.astro` and `CivicAgencyHierarchyContent.astro`),
  `src/pages/civil-cases/EGM.md`, `src/pages/civil-cases/page/EGM.md`,
  `src/pages/news/EGM.md`, `src/pages/news/page/EGM.md`,
  `src/pages/federal/[slug]/personnel/EGM.md`, the agency personnel `EGM.md`
  (which also documents `roster.json.ts`), and the area civil-case route
  `EGM.md` files. Add an `EGM.md` for each new route folder.

## Alternatives Considered

- Rosters: Option B (a dropdown name search plus one route per filter) breaks
  combined filters. Option C (Pagefind person records with an agency filter)
  needs about 160,000 records and fragment files, the per-release index cost
  that `b41ae26` removed, and changes name matching. The owner chose the
  per-agency data file (`brainstorm.md` Agreed Approach).
- D1: 25 per page (the old civil-case size) or "load more" — not chosen; the
  owner set 50 on 2026-11-18 (`brainstorm.md` Key Decisions; 25 rows doubles the
  page count of the global list), and "load more" gives later rows no URL.
- D5: keep roster pages in the index until `unify-header-search`, or keep only
  page 1 — not chosen; the owner chose to remove every roster page now
  (2026-11-19, `.egm-reviews/owner-decisions-round1.md`, Q48).
- D5: pass `PageShell`'s boolean `searchable` through `AgencyTopicPage` — not
  chosen; AGENTS.md forbids boolean behavior props on components.
- D7: redirect removed page numbers to the last page — not chosen; the owner
  confirmed 404 with no redirect on 2026-11-18 (`brainstorm.md` Open Questions;
  a redirect to the last page would send different rows to an old URL).

## Testing

- Unit (`src/lib/data/agency-roster.test.mjs`, run by `npm run test:data`): the
  test registers the same `node:module` `registerHooks` resolver as
  `scripts/report-detail.test.mjs` (for `#src/*` and `.js`→`.ts`) before
  importing `agency-roster.ts`. Cases: row order and letter groups;
  `letterPages` page and anchor; page counts at 50, 51 and 101 rows; every row
  appears on exactly one page; JSON entry shape; each JSON entry's `href` equals
  its row's `href`.
- E2E harness cases (in-test fixtures, `tests/e2e/agency-discipline.spec.ts`):
  the harness's `resolvePath` maps `AgencyRosterRow.astro` so the child partial
  compiles. The test serves the fixture `roster.json` with `page.route` on the
  roster's `dataPath` after `page.goto` to a test origin, not `setContent` on
  `about:blank`. Cases: a filter finds a row from page 2; load failure and "Try
  again"; a mismatched `dataVersion` shows the reload message and keeps server
  rows; A–Z while filtering; focus and announcements (D4); a filtered row
  matches its server row; a 50-row roster requests no file; the small-roster
  "Showing X of Y" summary still passes.
- E2E dev-server cases (run against `astro dev` on the shared database,
  read-only): each picks its target agency with a read-only query at test time
  (a roster over 50 rows), hard-codes no row ID, and checks page 2 exists, a
  page past the last returns 404, and roster pages and
  `/federal/{slug}/personnel/` carry no `data-pagefind-body`. The global
  civil-case 404 case is a dev-server case.

## Risks / Trade-offs

- [The build gains about 3,300 roster pages, 771 roster data files and the area
  civil-case pages (2026-11-22)] → Measure build time, peak build memory and
  `dist` size before and after on a local build and record them in `verify.md`.
- [Removing `limit 200` loads every area case, and the agency-detail cache holds
  every agency] → Enumeration reuses the per-build caches (D3); record peak
  build memory before and after in `verify.md`.
- [The largest `roster.json` (Harris County Sheriff's Office, 8,146 entries on
  2026-11-22) is estimated at 1.5-2 MB raw] → It loads only when a visitor
  filters; the search key is derived on the client. Record its real raw and
  compressed size in `verify.md`.
- [Client-rendered rows could drift from server rows] → Both come from one row
  model and one `AgencyRosterRow.astro` partial, and an e2e test compares a
  filtered result row with the same server-rendered row.
- [The data files make it easier to copy every name on a large roster] → Each
  file holds only what the roster's HTML already holds; the roster pages already
  publish these names. The files are not in the sitemap.
- [`NO_PERSONNEL` builds] → `roster.json` is built exactly when its roster page
  is built, and each entry's `href` comes from the same `buildAgencyRoster` row
  as the server row. The data file adds no `NO_PERSONNEL` rule. The roster's
  existing links to unbuilt profiles under `NO_PERSONNEL` are reported
  separately and are not changed here.
- [A page from before a rebuild with a data file from after it] → A rebuild of a
  commit replaces `<commit>/build/` in place, so a cached page can meet a newer
  `roster.json`. The file carries `dataVersion`; on a mismatch with the page's
  `data-data-version` the script shows the reload message and keeps the server
  rows (D4). This depends on the `atomic-sha-deploys` work that adds
  `data-data-version`.
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
- Agent calls in D4 on loading, "Try again", input typed while loading, the
  data-version reload message, the "Matching personnel" heading, the "entries"
  wording in the filtered summary, and the letter-group headings in the filtered
  view.
