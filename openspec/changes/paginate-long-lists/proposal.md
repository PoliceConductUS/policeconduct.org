## Why

Long lists behave differently across the site: some show every row on one
page (the Texas DPS roster was 2.1 MB of HTML on 2026-11-18, and the largest
roster has 8,146 rows on 2026-11-22), some
show only part of their rows without a pager (area civil-case tables show "the
50 most recent"), and the global civil-case list uses 25 rows per page. The
owner approved one standard on 2026-11-18: more than 50 rows means 50 per page,
with a pager.

## What Changes

**Long lists**

- From: the global civil-case list shows 25 rows per page; agency rosters show
  every row on page 1; area civil-case tables show only the 50 most recent
  rows. Counties, places, place agencies and agency civil cases already show
  50 rows per page (`PAGE_SIZE`); they keep their page size and routes, and
  their components gain "Page N" on page 2 and later.
- To: every server-rendered list page of more than 50 rows shows 50 rows per
  page, page 1 at the base path and later pages at `/page/{n}/`, with a pager on
  every page; no list shows only part of its rows without a pager.
- Reason: approved standard; the Texas DPS roster page is 2.1 MB of HTML, and a
  list that shows only part of its rows hides records.
- Impact: non-breaking for existing URLs except the global civil-case page
  numbers above the list's new last page, which become 404s, as the owner
  confirmed on 2026-11-18.

**Agency roster filters**

- From: the name search, "With discipline actions" checkbox, summary, empty
  state and A–Z jump work on the rows of the single roster page.
- To: they work across the whole roster. The first filter use loads the
  agency's roster data file; results show 50 per view with Previous/Next.
- Reason: splitting rosters into pages must not break filtering; the owner did
  not approve breaking it.
- Impact: non-breaking for visitors; one new static JSON file per roster of
  more than 50 rows.

**Site search**

- Every agency roster page, including the new `/personnel/page/{n}/` pages and
  `/federal/{slug}/personnel/`, leaves the site search index (owner decision, 2026-11-19). This matches the
  owner's direction that the site search finds no pages about people.

**Documentation**

- `DESIGN.md`, `AGENTS.md` and the `EGM.md` contracts that state the old list
  behavior state the list standard.

## Capabilities

### New Capabilities

- `list-pagination`: the 50-row page standard for server-rendered public list
  pages.

### Modified Capabilities

- `agency-browsing`: roster filters cover the whole roster across its pages,
  and roster pages are not in the site search index.

## Impact

- Routes: `/page/{n}/` for agency rosters and for state, county and place civil
  cases; fewer global civil-case pages. `/page/{n}/` routes exist only for lists
  of more than 50 rows.
- Code, against `ddl-openspec` after the site-decisions removal:
  - Modify: `src/lib/data/civil-cases.ts`, `src/lib/data/civic-topic-records.ts`,
    `src/lib/data/agency-detail.ts` (final sort key only),
    `src/lib/data/agency-civil-case-rows.ts` (comparator ends with `id`),
    `src/components/AgencyTopicPage.astro`,
    `src/components/CivicChildIndexPage.astro`,
    `src/components/CivicAgencyHierarchyPage.astro`,
    `src/components/CivicScopedIndexPage.astro`,
    `src/components/CivicScopedOverviewPage.astro`,
    `src/components/CivicScopedRowsTable.astro`,
    `src/components/AgencyPersonnelList.astro` (including its header comment),
    `src/pages/civil-cases/index.astro`,
    `src/pages/civil-cases/page/[...page].astro`,
    `src/pages/news/page/[...page].astro`, the three area civil-case
    `index.astro` routes (`src/pages/[category]/civil-cases/`,
    `src/pages/[category]/[administrativeArea]/civil-cases/`,
    `src/pages/[category]/[administrativeArea]/[place]/civil-cases/`),
    `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/index.astro`,
    `src/pages/federal/[slug]/personnel/index.astro`,
    `route-absences.json`, `tests/e2e/agency-discipline.spec.ts`, `package.json`
    (`test:data` script), `DESIGN.md`, `AGENTS.md`, and the `EGM.md` files
    listed in design D8.
  - Create: `src/lib/data/agency-roster.ts`,
    `src/lib/data/agency-roster.test.mjs`, `src/lib/agency-topic-shell.ts`,
    `src/components/AgencyRosterRow.astro`,
    `src/components/AgencyRosterPage.astro`,
    `src/components/CivicAgencyHierarchyContent.astro`, `page/[...page].astro` under each of
    the three area civil-case routes,
    `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/page/[...page].astro`,
    `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/roster.json.ts`,
    an `EGM.md` for each new route folder, and the e2e cases in design
    "Testing".
  - Delete: none.
- Build: about 3,300 more roster pages, 771 roster data files, and more area
  civil-case pages (counts on 2026-11-22; measured before and after in
  `verify.md`).
- Search index: every roster page leaves the index, so it shrinks.
- Tests: unit tests for the roster row model and paging, and e2e coverage for
  paging and whole-roster filtering (design "Testing").
- Depends on: `surface-license-discipline-data` tasks 4.5 and 4.6 (the roster
  row's license and discipline count) and the `atomic-sha-deploys` work that
  adds `data-data-version` (the roster data file's `dataVersion`).
- No database or seed changes. No public-trust or positive-deviance claims.
