## Why

Long lists behave differently across the site: some show every row on one
page (Texas DPS lists 6,030 people in 2.1 MB of HTML), some cut rows off
silently (area civil-case tables show "the 50 most recent"), and the global
civil-case list uses 25 rows per page. The user approved one standard on
2026-11-18: more than 50 rows means 50 per page, with a pager.

## What Changes

**Long lists**

- From: counties, places, place agencies, agency civil cases and agency
  rosters show every row on page 1; area civil-case tables show only the 50
  most recent rows; the global civil-case list shows 25 per page.
- To: every list of more than 50 rows shows 50 rows per page, page 1 at the
  base path and later pages at `/page/{n}/`, with a pager on every page and no
  hidden truncation.
- Reason: approved standard; large pages are slow, and hidden truncation hides
  records.
- Impact: non-breaking for existing URLs except the global civil-case page
  numbers above the new last page, which become 404s (pending the user's
  confirmation).

**Agency roster filters**

- From: the name search, status facets, "With discipline actions" checkbox,
  summary, empty state and A–Z jump work on the rows of the single roster page.
- To: they work across the whole roster. The first filter use loads the
  agency's roster data file; results show 50 per view with Previous/Next.
- Reason: splitting rosters into pages must not break filtering, which the
  user did not approve.
- Impact: non-breaking for visitors; one new static JSON file per roster of
  more than 50 people.

**Documentation**

- `DESIGN.md` and `AGENTS.md` state the list standard.

## Capabilities

### New Capabilities

- `list-pagination`: the 50-row page standard for every public list.

### Modified Capabilities

- `agency-browsing`: roster filters cover the whole roster across its pages.

## Impact

- Routes: `/page/{n}/` for counties, places, place agencies, agency civil
  cases, agency rosters and state, county and place civil cases; fewer global
  civil-case pages.
- Code: `src/lib/pagination.ts`, `src/lib/data/civil-cases.ts`,
  `CivicChildIndexPage.astro`, `CivicScopedRowsTable.astro`,
  `src/lib/data/civic-topic-records.ts`, `AgencyPersonnelList.astro`, the
  agency personnel and civil-case routes, a new roster JSON endpoint, and
  `route-absences.json`.
- Build: about 2,700 more roster pages, about 690 roster data files, and more
  area civil-case pages.
- Tests: e2e coverage for paging and whole-roster filtering.
- No database or seed changes. No public-trust or positive-deviance claims.
