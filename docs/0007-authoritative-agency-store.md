# ADR 0007: The Single Source of Record for Agency Counts

## Status

Accepted

## Date

2026-10-24, revised 2026-10-25 to record the board's ruling

## Decision Owner

Founding Engineer (INS-80); premise settled by the board

## Context

INS-80 was filed as "three stores disagree on how many agencies we hold; none is
marked authoritative". Three counts were in circulation — 3,538 in the intake corpus,
3,003 attributed to a `seed.sql` dump, and 3,393 from `build_page_payload` — and the
INS-7 coverage report emitted a `CORPUS_COUNT_DISPUTED` gap because it could not say
which was ours.

The board resolved the premise rather than the arithmetic:

> seed.sql is legacy and abandoned - intake repo is the only path to populate the
> database - there are not three sources, only one = intake

That is the governing fact, and it is independently checkable: intake ADR 0033 sets
`sql_paths = []`, so the database is built from migrations plus the configured sources
and never from a seed file. There was never a three-way disagreement to arbitrate —
there was one source and two artifacts being mistaken for sources.

## Decision

**The intake agency corpus (`public.agency`) is the single source of record for agency
counts.**

The other two numbers are not rival counts and are not reconciled _to_ agreement:

- **`seed.sql` is abandoned.** Its row count is not a count of record, whatever it
  says. It is retained only as the record of legacy website data for migrating
  hand-curated gaps, and it lives in no git repository, so it has no diff and no
  history.
- **`build_page_payload` is a projection of the source of record**, not another store.
  It is held minus held-but-not-published.

The site's configured `DATABASE_URL` points at port 55432, which is not running and
for which no pgdata or compose file exists. It is not a candidate; it is absent.

### Corroborating checks

Each is repeatable by someone else, and none of them is "it had the most rows".

1. **Intake is the only populate path** — intake ADR 0033, `sql_paths = []`.
2. **Production serves pages that exist only here.** All 237 Oregon agencies are absent
   from the legacy dump; `/or/linn-county/albany/albany-police-department/` returns 200.
3. **Production serves this store's slugs, and redirects the legacy ones into them.**
   `/law-enforcement-agency/mn/minneapolis-police-department-mn-n6rd/` 301s to
   `/mn/hennepin-county/minneapolis/minneapolis-police-dept-gs3yan/`.
4. **Its schema is forward of the legacy dump's**, which predates the
   officers-to-personnel rename and has no `agency.latitude`, `agency.status`,
   `agency.parent_federal_agency_id`, `federal_agency` table or `build_page_payload`.

## Consequences

- `scripts/coverage-report.mjs` run against this store emits no
  `CORPUS_COUNT_DISPUTED` gap, and its normal invocation passes no `--cross-check`
  arguments at all. INS-7's other gap, `numerator_universe_unverified`, is untouched
  by this ADR.
- The designation is **enforced, not documented**. `verifyAuthoritativeStore`
  identifies the store by schema signature — not by address, because a forwarded port
  or a copied connection string would let the legacy dump answer as though it were the
  current store. Measuring a store that fails the signature raises
  `MEASURED_STORE_NOT_AUTHORITATIVE`, and the report says in its opening lines that its
  numbers are not the corpus count.
- **The abandoned dump can never raise a dispute.** Presenting its count to the report
  yields "abandoned — not a count of record", not a disagreement. Deliberately, no row
  count for it is stored anywhere in the code: storing one would invite exactly the
  comparison this ruling retired.
- **The derived projection is checked live, never recorded.** `build_page_payload` is
  compared against the published-page count the run actually measured. A projection
  cannot legitimately disagree with the store it projects, so a mismatch is a real
  finding — and because the check is live, it cannot go stale the way a frozen constant
  would.
- A count from a store we cannot identify is still a reported gap. So `--cross-check`
  can neither clear a finding nor manufacture one out of a retired artifact.

## Historical note: where the 3,003 came from

Kept because the figure appears in INS-80's own description and in this script's former
usage example, so it will be quoted again. It is history, not a reconciliation.

**The dump holds 3,008 agency rows, not 3,003.** The 3,003 is a count of
`INSERT INTO public.agency` _statements_; five of them carry two value tuples each. The
file also mixes two generations of statement formatting — 8 single-line, 12-column
statements and 2,995 multi-line, 14-column ones — so a line-oriented parser reads it as
3,003 rows and silently drops the difference. The 3,008 came from parsing at statement
level into a throwaway database.

Matched row by row against the source of record (on agency id; identical when matched
on slug, which is the cross-check that the ids mean what they appear to):

|                              |  rows |
| ---------------------------- | ----: |
| in both                      | 2,903 |
| only in the dump             |   105 |
| only in the source of record |   635 |
| **dump total**               | 3,008 |

The 635 are later loader output the snapshot predates: Minnesota 394, Oregon 237, and 4
others. The 105 decompose as **54** TCOLE out-of-state service placeholders that are not
agencies at all ("State of Alabama" through "State of Wyoming", plus "Foreign Service"
and a law firm, all carrying city `ABBOTT` and state `TX`), **4** federal agencies since
normalised into the `federal_agency` table and published under `/federal/`, **7**
duplicate second copies whose legacy URLs redirect to the live page, and **40**
hand-curated legacy rows in states we do not yet cover. 83 of the 105 were already
board-approved 404s in `route-absences.json` as of 2026-10-15.

Two cautions from that exercise, both still worth knowing:

- **Neither artifact was a subset of the other.** The dump held _more_ Texas agencies
  (2,937 vs 2,883) and spanned 26 state values against 7, which made the source of
  record look like the narrower copy. It is not.
- **Surrogate-id set math overstates divergence.** 22 of the 105 initially looked like
  major agencies missing from the corpus — FBI, LAPD, Dallas PD, Texas DPS. Most were
  the _same_ agencies under a different id or in a different table.

## Not settled by this ADR

- **11 hand-curated legacy agencies 404 in production without a `route-absences.json`
  entry** (INS-82): Los Angeles PD, Denver PD, Phoenix PD, Buffalo PD, Canton OH,
  Claremont NC, Melvindale MI, Lodi CA, Pottsville AR, Orangeburg SC, Larchmont NY.
  These are absences, not wrong published data.
- **One duplicate inside the source of record** (INS-83): "Oak Ridge Police Department",
  TX, appears twice under different ids, so 3,538 rows is 3,537 distinct name-and-state
  entities.
- **No ORI codes**, which is why cross-store agency matching relies on surrogate ids and
  name-plus-state normalisation. Tracked separately in the backlog.
- **"Source of record" does not mean "proven rebuildable."** Every state in this store
  does have an intake source, Oregon included: `sources/gov.or.dpsst` is a complete
  DPSST / CJ IRIS loader. An earlier revision of this ADR claimed Oregon had none,
  which was wrong — the claim came from listing `sources/` on intake `origin/main`,
  where the loader had not yet landed because it was being kept outside version control
  altogether. It is now intake PR #81 and still unmerged. What remains unproven is
  narrower and still worth stating: nobody has run the Oregon acquire and transform to
  confirm they reproduce the records already in this store. "A source exists" and "a
  reload reproduces the corpus" are different claims, and a coverage report can
  establish neither — it measures what the store holds, not whether a source could
  reproduce it.
- **Nothing here claims to measure production's database.** It claims production is
  _built from_ this store, evidenced by the live URL probes above. There is still no
  readable production database.
