# Agency coverage report v1

Generated 2026-10-25T05:55:12.823Z from database `postgres`, dialled at 127.0.0.1:54322/postgres (server reports itself as 172.18.0.10:5432).

That store is **the intake agency corpus**, the single source of record for agency counts, verified here by schema signature rather than by address. Intake is the only path that populates it, so the counts below are this organisation's agency counts rather than one store's opinion of them — there is no second store to reconcile against. See `docs/0007-authoritative-agency-store.md`.

**This report contains no achieved coverage percentage.** Not one. The reason is in _Why there are no percentages_ below, and it is the most important finding here.

## What we hold

- Agency records in the measured store: **3,538**
- Of those, rendering as public agency pages: **3,393** (held is not the same as published)
- Federal agency records included in that total: **11** (the BJS denominators count state and local agencies only)
- Jurisdictions with at least one record: **7**
- Jurisdictions with a denominator and zero records: **44**
- Jurisdictions where we hold more than the denominator counts: **4**

Corpus fingerprint: 3,538 rows, newest `updated_at` 2026-10-06T18:05:22.188Z. Quote these counts only with this fingerprint attached — the development database is shared and is reset without notice.

## The denominators

- Primary (headline): 14,924 general-purpose agencies (BJS Census of State and Local Law Enforcement Agencies, 2018)
- Reported alongside, never instead of: 17,541 law enforcement agencies of all types (BJS Census of State and Local Law Enforcement Agencies, 2018)

- National ceiling: No more than 24% of 14,924 general-purpose agencies (BJS Census of State and Local Law Enforcement Agencies, 2018) — we hold 3,538 agencies here, but we cannot yet say which of them are in that universe, so this is a ceiling and not a coverage figure. That denominator is 8 years old and is not a current count.
- National ceiling: No more than 20% of 17,541 law enforcement agencies of all types (BJS Census of State and Local Law Enforcement Agencies, 2018) — we hold 3,538 agencies here, but we cannot yet say which of them are in that universe, so this is a ceiling and not a coverage figure. That denominator is 8 years old and is not a current count.

Read the national ceilings with this in mind: in 4 of the 7 jurisdictions we hold records in, we hold more agencies than that state's own denominator counts. Those records are inside the national numerator, so the ceilings above are inflated by an unknown number of rows that are not in the denominator's universe at all. The ceilings are still ceilings — they cannot overstate what we have achieved — but they are looser than they look.

## Why there are no percentages

### numerator universe unverified

655 held agencies, in DC, IL, MN, OR, VA, WA, carry no sourced agency type, so they cannot be placed in the BJS universes the denominators are drawn from. These states' sources enumerate entities that employ licensed peace officers without saying what kind of entity each one is: MN POST's productions key agencies by name only and publish no type column, and Oregon's DPSST loader emits an agency's name, address, contact and status but no type field. No percentage is reported for these jurisdictions or for the national total; ceilings are reported instead. States whose agencies all carry a sourced type are not affected and do report achieved coverage.

_Unblocked by:_ Obtain a per-agency type for these states — a state roster that publishes one, or an authoritative national roster with types (INS-31). Name matching is not a substitute: it was tested on INS-79 and, beyond leaving most records unclassified, an unconstrained name join silently gave 22 Minnesota and Oregon agencies a Texas classification.

## What kind of agencies we hold

Agency type comes from the source's own classification of the entity, never from its name. Where no source publishes a type, the agencies are `untyped` and the state reports a ceiling rather than a percentage — `untyped` is a gap, not a category.

The three leftmost count columns sum to the general-purpose numerator. `constable / marshal` and `special jurisdiction` are law enforcement agencies that BJS counts in the all-agency total but not in general-purpose. `outside the census` are entities that employ licensed peace officers — prosecutors' investigators, probation and parole, courts, jails, 911 centres — which the BJS census does not enumerate at all, so they belong in neither numerator and are the reason a licensing roster is not an agency roster.

| state |  held | local police | sheriff | primary state | **general-purpose** | constable / marshal | special jurisdiction | **all-agency** | outside the census | federal | tribal | untyped |
| ----- | ----: | -----------: | ------: | ------------: | ------------------: | ------------------: | -------------------: | -------------: | -----------------: | ------: | -----: | ------: |
| TX    | 2,883 |          809 |     254 |             1 |           **1,064** |                 742 |                  753 |      **2,559** |                319 |       3 |      2 |       0 |
| MN    |   394 |            0 |       0 |             0 |               **0** |                   0 |                    0 |          **0** |                  0 |       0 |      0 |     394 |
| OR    |   237 |            0 |       0 |             0 |               **0** |                   0 |                    0 |          **0** |                  0 |       0 |      0 |     237 |
| DC    |    17 |            0 |       0 |             0 |               **0** |                   0 |                    0 |          **0** |                  0 |       0 |      0 |      17 |
| VA    |     5 |            0 |       0 |             0 |               **0** |                   0 |                    0 |          **0** |                  0 |       0 |      0 |       5 |
| IL    |     1 |            0 |       0 |             0 |               **0** |                   0 |                    0 |          **0** |                  0 |       0 |      0 |       1 |
| WA    |     1 |            0 |       0 |             0 |               **0** |                   0 |                    0 |          **0** |                  0 |       0 |      0 |       1 |

Read the Texas row against that state's denominators — 1,041 general-purpose and 1,935 all-agency. The corpus looked like 2.8x the state's general-purpose count because most of it was never general-purpose: Texas elects a constable per justice-of-the-peace precinct, and the licensing roster additionally carries school district, campus, fire marshal, hospital and water district agencies plus several hundred entities the census does not count. Decomposed, the general-purpose figure lands within a few percent of the published denominator.

## By state

`held` is agency records in the measured store. The two denominator columns are that state's own published counts — never a share of the national figure. A reading of **`= N%`** is achieved coverage: every agency held in that state carries a sourced type, so the numerator counts only agencies in that denominator's universe. A reading of `≤ N%` is a ceiling, not a measurement. Anything else is the name of a gap.

A high ceiling is not near-complete coverage. `≤ 94%` means only that we hold enough records that coverage _could_ be as high as 94% if every one of them were in that universe and matched a distinct agency in it — neither of which is established. Where the same state reads `universe mismatch` in the other column, we already know the count includes records outside at least one of these universes.

| state |  held | general-purpose denom. | all-agency denom. | general-purpose reading | all-agency reading |
| ----- | ----: | ---------------------: | ----------------: | ----------------------- | ------------------ |
| AK    |     0 |                     38 |                49 | nothing held            | nothing held       |
| AL    |     0 |                    360 |               401 | nothing held            | nothing held       |
| AR    |     0 |                    333 |               364 | nothing held            | nothing held       |
| AZ    |     0 |                     93 |               131 | nothing held            | nothing held       |
| CA    |     0 |                    397 |               531 | nothing held            | nothing held       |
| CO    |     0 |                    218 |               239 | nothing held            | nothing held       |
| CT    |     0 |                    114 |               135 | nothing held            | nothing held       |
| DC    |    17 |                      1 |                 3 | universe mismatch       | universe mismatch  |
| DE    |     0 |                     35 |                43 | nothing held            | nothing held       |
| FL    |     0 |                    329 |               373 | nothing held            | nothing held       |
| GA    |     0 |                    503 |               608 | nothing held            | nothing held       |
| HI    |     0 |                      4 |                 8 | nothing held            | nothing held       |
| IA    |     0 |                    366 |               424 | nothing held            | nothing held       |
| ID    |     0 |                    104 |               112 | nothing held            | nothing held       |
| IL    |     1 |                    781 |               846 | ≤ 0.1%                  | ≤ 0.1%             |
| IN    |     0 |                    450 |               476 | nothing held            | nothing held       |
| KS    |     0 |                    324 |               364 | nothing held            | nothing held       |
| KY    |     0 |                    332 |               357 | nothing held            | nothing held       |
| LA    |     0 |                    286 |               326 | nothing held            | nothing held       |
| MA    |     0 |                    340 |               374 | nothing held            | nothing held       |
| MD    |     0 |                    106 |               138 | nothing held            | nothing held       |
| ME    |     0 |                    127 |               144 | nothing held            | nothing held       |
| MI    |     0 |                    514 |               564 | nothing held            | nothing held       |
| MN    |   394 |                    392 |               417 | universe mismatch       | ≤ 94%              |
| MO    |     0 |                    529 |               558 | nothing held            | nothing held       |
| MS    |     0 |                    274 |               351 | nothing held            | nothing held       |
| MT    |     0 |                    106 |               121 | nothing held            | nothing held       |
| NC    |     0 |                    446 |               516 | nothing held            | nothing held       |
| ND    |     0 |                    104 |               113 | nothing held            | nothing held       |
| NE    |     0 |                    198 |               210 | nothing held            | nothing held       |
| NH    |     0 |                    205 |               212 | nothing held            | nothing held       |
| NJ    |     0 |                    479 |               507 | nothing held            | nothing held       |
| NM    |     0 |                    102 |               140 | nothing held            | nothing held       |
| NV    |     0 |                     32 |                65 | nothing held            | nothing held       |
| NY    |     0 |                    455 |               528 | nothing held            | nothing held       |
| OH    |     0 |                    745 |               806 | nothing held            | nothing held       |
| OK    |     0 |                    387 |               456 | nothing held            | nothing held       |
| OR    |   237 |                    152 |               167 | universe mismatch       | universe mismatch  |
| PA    |     0 |                    956 |               995 | nothing held            | nothing held       |
| RI    |     0 |                     41 |                49 | nothing held            | nothing held       |
| SC    |     0 |                    222 |               262 | nothing held            | nothing held       |
| SD    |     0 |                    133 |               145 | nothing held            | nothing held       |
| TN    |     0 |                    334 |               363 | nothing held            | nothing held       |
| TX    | 2,883 |                  1,041 |             1,935 | universe mismatch       | universe mismatch  |
| UT    |     0 |                    121 |               140 | nothing held            | nothing held       |
| VA    |     5 |                    289 |               339 | ≤ 1.7%                  | ≤ 1.5%             |
| VT    |     0 |                     67 |                73 | nothing held            | nothing held       |
| WA    |     1 |                    210 |               254 | ≤ 0.5%                  | ≤ 0.4%             |
| WI    |     0 |                    486 |               519 | nothing held            | nothing held       |
| WV    |     0 |                    196 |               212 | nothing held            | nothing held       |
| WY    |     0 |                     71 |                77 | nothing held            | nothing held       |

All state denominators: BJS Census of State and Local Law Enforcement Agencies, 2018, table 3. The per-state values are survey estimates carrying standard errors, not exact enumerations.

## Named gaps by state

### Nothing held — 44 jurisdictions

Each of these is a complete gap and a direct input to acquisition work. Whether a lawfully ingestible source exists for each is not yet known; that is INS-12.

AK (49 agencies exist), AL (401 agencies exist), AR (364 agencies exist), AZ (131 agencies exist), CA (531 agencies exist), CO (239 agencies exist), CT (135 agencies exist), DE (43 agencies exist), FL (373 agencies exist), GA (608 agencies exist), HI (8 agencies exist), IA (424 agencies exist), ID (112 agencies exist), IN (476 agencies exist), KS (364 agencies exist), KY (357 agencies exist), LA (326 agencies exist), MA (374 agencies exist), MD (138 agencies exist), ME (144 agencies exist), MI (564 agencies exist), MO (558 agencies exist), MS (351 agencies exist), MT (121 agencies exist), NC (516 agencies exist), ND (113 agencies exist), NE (210 agencies exist), NH (212 agencies exist), NJ (507 agencies exist), NM (140 agencies exist), NV (65 agencies exist), NY (528 agencies exist), OH (806 agencies exist), OK (456 agencies exist), PA (995 agencies exist), RI (49 agencies exist), SC (262 agencies exist), SD (145 agencies exist), TN (363 agencies exist), UT (140 agencies exist), VT (73 agencies exist), WI (519 agencies exist), WV (212 agencies exist), WY (77 agencies exist)

### Jurisdictions with records and an unresolved gap

#### DC — 17 held

- **universe mismatch** — 17 agencies held in DC against 1 general-purpose agencies in DC (BJS Census of State and Local Law Enforcement Agencies, 2018). Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.
  - _Unblocked by:_ Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.
- **universe mismatch** — 17 agencies held in DC against 3 law enforcement agencies of all types in DC (BJS Census of State and Local Law Enforcement Agencies, 2018). Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.
  - _Unblocked by:_ Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.

#### MN — 394 held

- **universe mismatch** — 394 agencies held in MN against 392 general-purpose agencies in MN (BJS Census of State and Local Law Enforcement Agencies, 2018). Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.
  - _Unblocked by:_ Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.

#### OR — 237 held

- **universe mismatch** — 237 agencies held in OR against 152 general-purpose agencies in OR (BJS Census of State and Local Law Enforcement Agencies, 2018). Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.
  - _Unblocked by:_ Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.
- **universe mismatch** — 237 agencies held in OR against 167 law enforcement agencies of all types in OR (BJS Census of State and Local Law Enforcement Agencies, 2018). Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.
  - _Unblocked by:_ Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.

#### TX — 2,883 held

- **universe mismatch** — 1,064 of the 2,883 agencies held in TX carry a sourced type placing them in this universe, against 1,041 general-purpose agencies in TX (BJS Census of State and Local Law Enforcement Agencies, 2018). The numerator is now the right population and still exceeds the denominator, so this is no longer an unexplained universe mismatch — it is a residual difference between our count and a 2018 enumeration, and no percentage is reported.
  - _Unblocked by:_ Two untested causes remain, both on the denominator's side: BJS excludes agencies employing less than one full-time-equivalent sworn officer, and the enumeration is from 2018. Neither can be applied to our numerator without a sworn-headcount field BJS would recognise.
- **universe mismatch** — 2,559 of the 2,883 agencies held in TX carry a sourced type placing them in this universe, against 1,935 law enforcement agencies of all types in TX (BJS Census of State and Local Law Enforcement Agencies, 2018). The numerator is now the right population and still exceeds the denominator, so this is no longer an unexplained universe mismatch — it is a residual difference between our count and a 2018 enumeration, and no percentage is reported.
  - _Unblocked by:_ Two untested causes remain, both on the denominator's side: BJS excludes agencies employing less than one full-time-equivalent sworn officer, and the enumeration is from 2018. Neither can be applied to our numerator without a sworn-headcount field BJS would recognise.

## National gaps

- **denominator stale** — BJS Census of State and Local Law Enforcement Agencies is from 2018, 8 years before this report.
  - _Unblocked by:_ BJS fielded the 2022 CSLLEA but has not published it. When it lands it becomes primary and the swap is recorded in DENOMINATOR_LINEAGE.

## Denominator changes

- **general_purpose**: `lear_2016_general_purpose` → `csllea_2018_general_purpose` on 2026-08-24 (INS-27). BJS CSLLEA 2018 (NCJ 302187, published October 2022) is a more recent authoritative enumeration than LEAR 2016 and publishes per-state counts. The headline general-purpose denominator moves from 15,810 (2016) to 14,924 (2018).
- **all_agency**: `csllea_2008_all_agency` → `csllea_2018_all_agency` on 2026-08-24 (INS-27). The unpinned '~18,000' was traced to CSLLEA 2008's 17,985 (NCJ 233982, September 2008 reference period) and then retired in favour of CSLLEA 2018's 17,541. The estimate is no longer registered: a number we repeated because everyone repeats it is not a denominator.

## Source conflicts we are carrying, not resolving

- **local_police_count_lear_vs_csllea** — LEAR 2016 counts 12,695 local and county police departments; CSLLEA 2018 counts 11,824. The gap of 871 is larger than two years of consolidation plausibly explains. CSLLEA excludes any agency without at least one full-time-equivalent sworn officer and LEAR does not, which accounts for an unknown share of it. We have not reconciled the two and do not claim to have.
- **tribal_police_universe** — BJS classifies the 217 tribal police departments as their own type, outside 'general purpose'. A reader would call a tribal police department general-purpose. Our general-purpose denominator follows the BJS definition so it stays comparable to the published tables; tribal agencies are inside the all-agency denominator. If we ever report tribal coverage it needs its own denominator, not a share of this one.
- **state_counts_are_estimates** — The per-state agency counts in CSLLEA 2018 table 3 carry standard errors (appendix table 3) — they are estimates, not exact enumerations. Summing the 51 published state rows gives 17,540 against a published national total of 17,541 (local police 11,825 vs 11,824; sheriffs' offices 3,054 vs 3,051). BJS notes details may not sum to totals. We store the published state values and the published standard errors, and do not force them to reconcile.
