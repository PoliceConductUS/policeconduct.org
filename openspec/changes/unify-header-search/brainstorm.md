## Design Summary

This brainstorm records the owner's answers to the four open questions from
the round-1 review (`.egm-reviews/unify-header-search-resolution1.md`, E1-E4).
The answers are in `.egm-reviews/owner-decisions-round1.md` (Q44-Q47, dated
2026-11-18/19). The earlier decisions of 2026-11-18 are in
[`paginate-long-lists/brainstorm.md`](../paginate-long-lists/brainstorm.md), "A
site-wide header search is a separate backlog change": no people, and a state
filter only.

- **Q44 (E1):** Keep both the masthead search and `/find-records/`. The
  masthead form `action`, the Enter key with no active option, and the
  no-results link keep pointing at `/find-records/`.
- **Q45 (E2):** "Finds no people" means that no page about a person is in the
  search index. A person's name inside a civil-case or report page may still
  match; that result leads to the case or report, not to a person.
- **Q46 (E3):** When a visitor chooses a state, pages that have no state
  (federal agencies, news, about pages and so on) are hidden. "All states"
  shows everything.
- **Q47 (E4):** Send every search event with its result count and the chosen
  state. Do not send the query text: Google's terms forbid sending personal
  data, and visitors type people's names. The owner may override this later.
- **Q48 (paginate-long-lists):** Every roster page leaves the search index in
  `paginate-long-lists`. This change does not touch roster routes.

## Alternatives Considered

### Option A: Fold `/find-records/` into the masthead search

- **Approach:** One search. `/find-records/` becomes a static browse page or is
  retired.
- **Pros:** One search to maintain.
- **Cons:** Loses the finder's grouped, name-first results and its zip-code and
  county matching. The no-JavaScript path needs a new target.
- **Why not chosen:** The owner chose to keep both (Q44).

### Option B: Hide every person's name on every page

- **Approach:** Option "B" of E2: also mark names on civil-case and report
  pages with `data-pagefind-ignore`.
- **Pros:** No name can match anywhere.
- **Cons:** Needs a list of every template that shows a name, and makes case
  and report pages harder to find.
- **Why not chosen:** The owner chose "no page about a person" (Q45).

### Option C: Show stateless pages under every state

- **Approach:** Give stateless pages every state value, or run a second
  unfiltered query.
- **Pros:** Federal agencies show up with any state chosen.
- **Cons:** A larger index and more client code.
- **Why not chosen:** The owner chose to hide them (Q46).

## Agreed Approach

Keep both searches. Remove `/personnel/` from the index; rosters leave in
`paginate-long-lists`. Give each indexed page that has a state a Pagefind
`state` filter value from its own `location_path` record, and add a "State"
select to the masthead search that filters on it. Add the result count and
the chosen state to every search event, and never send the query text. The
details are in `design.md`.

## Key Decisions

- Both searches stay (Q44).
- No page about a person is indexed (Q45).
- Stateless pages are hidden when a state is chosen (Q46).
- Every search event carries the result count and the chosen state; never the
  query text (Q47).
- Roster pages are `paginate-long-lists` work (Q48).

## Open Questions

None. Design choices that follow from these answers are in `design.md`.
