# Why

Personnel pages show income-matching codes such as `matched` and `geocoder_no_match`. These codes do not tell visitors how a personnel member's arrests are spread across neighborhood income ranges.

# What Changes

- Replace the income-matching table (`by_income_status`) with a table of arrests by estimated household income range, with Unknown, No recorded date, and Total rows.
- Columns: Estimated household income, Count, Percentage, and Share of agency arrests. Share of agency arrests was first named "Agency Percentage"; it is renamed so the header says what it divides by, and its header gets an info icon with a short explanation.
- Share of agency arrests is the personnel member's share of the agency's arrests in that row, within the personnel profile's recorded months. The agency arrests come from the agency arrest profile that the personnel profile links to through the new foreign key column `arrest_profile.agency_arrest_profile_id`, which intake adds (owner decision, 2026-11-22). The site never matches profiles by source or months.
- Income range labels come from stored data, not site code. No stored field holds them today, so intake adds them (see Intake work).
- Arrests with no recorded date get their own No recorded date row. Intake attaches a data note to the agency when its arrest profile has undated arrests.
- Stop showing the arrest-location matching table (`by_beat_status`) and the residential census tract table (`by_residential_tract`).
- The site does not change stored `breakdowns` data. No old field names are kept for compatibility.

# Intake work

- Migration: the nullable foreign key column `public.arrest_profile.agency_arrest_profile_id` referencing `public.agency_arrest_profile(id)`. The Irving transform sets it on each personnel arrest profile to the agency arrest profile it writes in the same run. Shared with `map-arrests-by-beat` (its tasks.md 2.7); done once.
- Income range labels: no field holds them today. Site code in `src/lib/data/arrest-income.js` held the ranges (`Under $25,000` through `$150,000 or more`) and placed each estimate in one; the separate code change below deletes that file. Intake stores them instead, in `breakdowns` of both the personnel and the agency profile: an ordered list of range labels (proposed `income_ranges`) and the range label of each evidence cell (proposed `cells[].incomeRange`, null when the arrest has no matched estimate). The intake change sets the final names; the site reads them as stored.

# Until intake ships

A separate code change is removing the site-side matching (by source and months) from `src/lib/data/arrest-profiles.ts` now. Until intake ships the `agency_arrest_profile_id` column and data, there is no agency comparison, so Share of agency arrests cannot be shown. Until intake stores the range labels, the site has no labels of its own to show. Personnel pages show no income table until both ship.

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
- A personnel profile with `by_income_status` and no `agency_arrest_profile_id` fails the build, by design.
- Agency arrests with no recorded date cannot be limited to the personnel profile's months, so the No recorded date row compares against all undated arrests in the linked agency profile.

# Impact

- Specs: `personnel-arrest-income` (new), `arrest-records` (modified), `public-record-coverage` (modified).
- Files: `src/lib/data/arrest-income.js`, `src/lib/data/arrest-profiles.ts`, `scripts/validate-schema-contract.mjs`, `src/components/PersonnelArrestProfiles.astro`, `tests/e2e/arrest-income.spec.ts`, `src/lib/data/EGM.md`, `src/components/EGM.md`; intake: a migration for `arrest_profile.agency_arrest_profile_id`, `sources/gov/irvingtx/arrests/transform.ts` and its test for the link, the range labels and the data note.
- This is descriptive data, not evidence of targeting or of anyone's personal income.

# Coordination with map-arrests-by-beat

Both changes modify the arrest-records requirement "Personnel profiles preserve current import count units". An OpenSpec MODIFIED delta replaces the whole requirement, so the change archived last wins. This change's delta includes the map-arrests-by-beat wording (`by_arrest_beat` as named count maps, capability `arrest-beat-maps`) and adds the income and hidden-table detail. Archive map-arrests-by-beat first, then this change, so `arrest-beat-maps` exists and this delta's fuller text is the final requirement. If this change is archived first, map-arrests-by-beat's delta must be updated to this text before it is archived.
