## Why

Personnel pages show income-matching codes such as `matched` and `geocoder_no_match`. These codes do not tell visitors how a personnel member's arrests are spread across neighborhood income ranges.

## What Changes

- Replace the income-matching table with a table of arrests by estimated household income range, with Unknown, No recorded date, and Total rows.
- Columns: Estimated household income, Count, Percentage, and Share of agency arrests, with an info icon that explains Share of agency arrests.
- Share of agency arrests is the personnel member's share of the agency's arrests in that row. Intake computes every count, including the agency counts, and the database supplies the finished rows (see Intake work). The site never matches records, never counts arrests, and never filters by month.
- Row labels (the income ranges, Unknown and No recorded date) come from stored data, not site code.
- Arrests with no recorded date get their own No recorded date row, which intake supplies. Intake also records an annotation on the agency when it has arrests with no recorded date (owner decision Q38).
- Stop showing the arrest-location matching table and the residential census tract table.
- No old field names are kept for compatibility.

## Intake work

These items belong to the intake change `import-arrest-records` (intake repo, `openspec/changes/import-arrest-records/`). That change replaces `arrest_profile` and `agency_arrest_profile` with arrest records and the views `arrest_coverage` and `arrest_breakdown` (owner decision, 2026-11-22: complete import of the arrest data; no new arrest foreign key column). The site reads only what that change lists in its website boundary (its design D7).

- Income rows: `arrest_breakdown` has an income band dimension for each `agency_personnel` scope, and `household_income_band` holds the band labels and limits (manual records; intake open question 5 decides whether the limits stay the ones the deleted `src/lib/data/arrest-income.js` used, `Under $25,000` through `$150,000 or more`). Each personnel row also needs the agency count for the same row, and the scope needs the agency total. For dated rows, the agency count is the agency's arrests in the personnel scope's first to last month, inclusive. For No recorded date, it is every undated arrest of the agency. `import-arrest-records` does not yet supply these agency counts, the Unknown and No recorded date rows, or their stored labels; intake adds them to that change and sets the names. The site reads them as stored.
- Undated arrests: `import-arrest-records` design D1 makes `arrest.arrest_date` `not null`. Intake decides how a booking with no recorded date is stored, so that the No recorded date row can exist.
- Annotation: when an agency has arrests with no recorded date, intake records one `data_annotation` with that agency as subject and a `message_code` whose public message is a manual record in `data_annotation_message` (intake change `supply-site-display-data`). The site joins the message; it maps no codes.

## Until intake ships

A separate code change removed the site-side matching (by source and months) from `src/lib/data/arrest-profiles.ts` and deleted `src/lib/data/arrest-income.js`. Until intake ships the rows above, the site has no rows to show. Personnel pages show no income table until then.

## Alternatives Considered

- Show the agency's own spread across ranges instead of the personnel member's share: not chosen. The owner kept the share and asked for a clearer name and an info icon ([owner decision Q39](../../../.egm-reviews/owner-decisions-round1.md)).
- Put undated arrests in Unknown: not chosen. It merges "date unknown" with "income unknown", and an undated agency arrest from outside the personnel months would inflate Unknown's agency count. Count them in their income range on both sides: not chosen, because undated agency arrests cannot be limited to the personnel months, so they would mix into dated ranges. Make them an intake error: not chosen, because the source does record these arrests and dropping them would hide real records. Chosen: a separate No recorded date row and an annotation ([owner decision Q38](../../../.egm-reviews/owner-decisions-round1.md)).
- The site matches records, counts arrests and holds the range labels: not chosen. AGENTS.md "The Site Is A View Of The Database" forbids site-side relationship, category and count logic; intake supplies the rows.
- A foreign key from the personnel arrest profile to the agency arrest profile: not chosen. The owner dropped it on 2026-11-22 ("No new arrest FK column"); `import-arrest-records` replaces both profile tables with views over arrest records.
- Other range cut points: not chosen here. Intake owns the ranges, so changing them is an intake change and needs no site change.
- Show the Census margin of error: not chosen. Ranges use the point estimate. Intake stores the margin of error, so it can be added later.

## Risks and Limits

- Percentage and Share of agency arrests use different totals. Readers may compare them; the info icon says not to compare them, and the page note says they use different totals.
- Unknown can be a large share when home addresses do not match a census tract or income estimate.
- Only the Irving arrests source supplies income evidence today.
- A stored estimate of 250,000 means 250,000 or more. It falls in "$150,000 or more" either way, so ranges are not affected.
- The page does not name the Census survey period.
- One invalid row set fails the whole personnel load. This is the intended loud failure.
- Agency arrests with no recorded date cannot be limited to the personnel months, so intake compares the No recorded date row against all undated arrests of the agency.
- The income table cannot ship until `import-arrest-records` supplies the agency counts and the Unknown and No recorded date rows.

## Impact

- Specs: `personnel-arrest-income` (new), `arrest-records` (modified), `public-record-coverage` (modified).
- Files (website): Create `src/lib/data/arrest-income.ts`, `tests/e2e/arrest-income.spec.ts`; Modify `src/lib/data/arrest-profiles.ts` (or the loader that replaces it in the website follow-up of `import-arrest-records`), `scripts/validate-schema-contract.mjs`, `src/components/PersonnelArrestProfiles.astro`, `src/lib/data/EGM.md`, `src/components/EGM.md`.
- Intake: the income rows, agency counts, undated-arrest storage and annotation, in `import-arrest-records`.
- This is descriptive data, not evidence of targeting or of anyone's personal income.

## Coordination with map-arrests-by-beat

Both changes modify the arrest-records requirement "Personnel profiles preserve current import count units". An OpenSpec MODIFIED delta replaces the whole requirement, so the change archived last wins. This change's delta includes the map-arrests-by-beat wording (`by_arrest_beat` as named count maps, capability `arrest-beat-maps`) and adds the income and hidden-table detail. Archive map-arrests-by-beat first, then this change, so `arrest-beat-maps` exists and this delta's fuller text is the final requirement. If this change is archived first, map-arrests-by-beat's delta must be updated to this text before it is archived.
