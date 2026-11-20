# Why

Personnel pages show income-matching codes such as `matched` and `geocoder_no_match`. These codes do not tell visitors how a personnel member's arrests are spread across neighborhood income ranges.

# What Changes

- Replace the income-matching table (`by_income_status`) with a table of arrests by estimated household income range, with Unknown, No recorded date, and Total rows.
- Columns: Estimated household income, Count, Percentage, and Share of agency arrests. Share of agency arrests was first named "Agency Percentage"; it is renamed so the header says what it divides by, and its header gets an info icon with a short explanation.
- Share of agency arrests is the personnel member's share of the agency's arrests in that row, for the same source and recorded months.
- Arrests with no recorded date get their own No recorded date row. Intake attaches a data note to the agency when its arrest profile has undated arrests.
- Stop showing the arrest-location matching table (`by_beat_status`) and the residential census tract table (`by_residential_tract`).
- Stored `breakdowns` data is not changed. No database changes. No old field names are kept for compatibility.

# Alternatives Considered

- Show the agency's own spread across ranges instead of the personnel member's share: not chosen. The column stays the personnel member's share, renamed and explained (owner decision Q39).
- Put undated arrests in Unknown, count them on both sides in their income range, or make them an intake error: not chosen. They get a separate No recorded date row and a data note (owner decision Q38).
- Show the Census margin of error: not chosen. Ranges use the point estimate. Intake stores the margin of error, so it can be added later.

# Risks and Limits

- Percentage and Share of agency arrests use different totals. Readers may compare them; the info icon and the page note say not to.
- Unknown can be a large share when home addresses do not match a census tract or income estimate.
- Only the Irving arrests source supplies income evidence today.
- A stored estimate of 250,000 means 250,000 or more. It falls in "$150,000 or more" either way, so ranges are not affected.
- The page does not name the Census survey period.
- One invalid profile fails the whole personnel load. This is the intended loud failure.
- Agency arrests with no recorded date cannot be limited to the personnel profile's months, so the No recorded date row compares against all undated agency arrests from the same source.

# Impact

- Specs: `personnel-arrest-income` (new), `arrest-records` (modified), `public-record-coverage` (modified).
- Files: `src/lib/data/arrest-income.js`, `src/lib/data/arrest-profiles.ts`, `src/components/PersonnelArrestProfiles.astro`, `tests/e2e/arrest-income.spec.ts`, `src/lib/data/EGM.md`, `src/components/EGM.md`; intake `sources/gov/irvingtx/arrests/transform.ts` and its test for the data note.
- This is descriptive data, not evidence of targeting or of anyone's personal income.

# Coordination with map-arrests-by-beat

Both changes modify the arrest-records requirement "Personnel profiles preserve current import count units". An OpenSpec MODIFIED delta replaces the whole requirement, so the change archived last wins. This change's delta includes the map-arrests-by-beat wording (`by_arrest_beat` as named count maps, capability `arrest-beat-maps`) and adds the income and hidden-table detail. Archive map-arrests-by-beat first, then this change, so `arrest-beat-maps` exists and this delta's fuller text is the final requirement. If this change is archived first, map-arrests-by-beat's delta must be updated to this text before it is archived.
