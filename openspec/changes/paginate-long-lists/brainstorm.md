## Design Summary

Every server-rendered public list page with more than 50 rows shows 50 rows per
page. Page 1 is the list's base path, later pages are `/page/{n}/`, every page
of a paged list shows a pager, and no list shows only part of its rows without a
pager. The user approved this standard on 2026-11-18.

Agency rosters are the hard case: their name search, status facets
(All/Current/Former), "With discipline actions" checkbox, result summary, empty
state and A–Z jump must keep working across the whole roster. The user stated
that breaking any of them is not approved.

The agreed roster design: each roster page server-renders 50 people. The first
time a visitor uses any roster filter, the page loads that agency's roster data
file and keeps it after the first successful load, and filtered results come
from the whole roster, 50 per view with Previous/Next controls. Clearing the
filters restores the server-rendered page. The A–Z jump links to the page where
each letter starts.

## Alternatives Considered

### Option A: Per-agency roster data file (chosen)

- **How**: The build writes one JSON roster file per agency whose roster has
  more than 50 rows. The roster script fetches it on first filter use and
  filters every row in the browser, as today.
- **Pros**: Every control keeps its matching rules, and filters still combine.
  Three things change: filtered results show 50 per view with Previous/Next;
  while a filter is active an A–Z letter moves the filtered view; the first
  filter use shows a loading state and can fail. Name matching stays "any part
  of the name" (`mit` finds Smith). About 690 files, fetched only when a
  visitor filters.
- **Cons**: One extra file per large roster. Filtered results have no URL.

### Option B: Dropdown name search plus one paged route per filter

- **How**: Typing a name shows up to 10 matches in a dropdown that open the
  profile. Current, Former and With discipline become separate paged routes.
- **Pros**: Each filter has a shareable URL.
- **Cons**: Filters stop combining unless every combination gets its own route,
  and name search no longer narrows the list.
- **Why not chosen**: It breaks combined filtering, and the user did not
  approve breaking it.

### Option C: Pagefind person records scoped by an agency filter

- **How**: Add one Pagefind custom record per person at build time, with
  filters for agency, status at that agency and discipline.
- **Pros**: One search engine for the site.
- **Cons**: Pagefind returns one result per record, so it needs about 160,000
  person records and as many fragment files per release. Matching is by word
  prefix (`mit` no longer finds Smith).
- **Why not chosen**: about 160,000 person records would bring back the
  per-release index cost that `b41ae26` ("keep the ~153k personnel pages out of
  the Pagefind index") removed, and word-prefix matching stops `mit` from
  finding Smith. The user chose Option A on 2026-11-18 after this comparison.

## Agreed Approach

Option A. The user chose it after comparing it with Pagefind scoping, and it is
the only option that keeps every roster control's matching rules and lets
filters combine.

## Key Decisions

- 50 rows per page, from `PAGE_SIZE` in `src/lib/pagination.ts`, for every list.
- Filtered roster results are shown 50 per view with Previous/Next controls; the
  user called paged search results reasonable.
- Rosters with 50 or fewer rows stay one page and keep filtering their rendered
  rows; they get no data file.
- Every roster page leaves the site search index in this change (owner
  decision, 2026-11-19; design D5).
- The roster work stays in this one change (owner decision, 2026-11-19).
- A site-wide header search is a separate backlog change,
  `unify-header-search`. The user decided on 2026-11-18 that it finds no people
  for now and has a state filter only.
- Calls made by the agent after the design was drafted, open to the user's
  correction: an A–Z letter moves the filtered view instead of leaving the page
  (D4); later pages of area civil-case lists repeat everything above the table
  (D6).

## Open Questions

See `design.md` Open Questions. On 2026-11-18 the user confirmed that global
civil-case page numbers with no rows after the move to 50 per page are 404s with
no redirect.
