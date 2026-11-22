## 1. Done

- [x] 1.1 Website: test and implement pure map count preparation; attach agency boundaries to personnel evidence.
- [x] 1.2 Website: render maps on personnel and agency pages only; verify labels, counts, and mobile/no-JavaScript access.
- [x] 1.3 Website: types, lint, OpenSpec, focused tests and independent review pass.

Intake tasks for the boundary contract live in the intake repo `openspec/changes/map-arrests-by-beat/tasks.md`. Section 2 lists the follow-up intake edits this review found; each is done in the intake repo, not here.

## 2. Intake follow-up (intake repo)

- [ ] 2.1 `sources/gov/irvingtx/arrests/enrichment.ts`: an arrest inside a PD1/PD2 polygon the city marks inactive gets that beat's code (`beatStatus = "matched"`), the same as an active polygon; remove the `inactive_polygon` branch. Test: one arrest inside an inactive PD1 polygon is counted under that beat code in `by_arrest_beat`, not under `unknown`.
- [ ] 2.2 `sources/gov/irvingtx/arrests/beats.ts`: keep publishing every PD1/PD2 boundary, active and inactive. Add `.min(1)` to the outer `z.array(...)` of `BeatBoundariesSchema`, and add a `superRefine` issue when a boundary code is `unknown`. Tests: `patrolBeatBoundaries` throws when no PD1/PD2 feature exists; it throws when a boundary code is `unknown`.
- [ ] 2.3 Data note for arrests with no beat: when an agency arrest profile has `by_arrest_beat.unknown` greater than zero, the transform (`sources/gov/irvingtx/arrests/transform.ts`) attaches one data note to that agency whose `record_url` is the agency page path, saying how many recorded arrests could not be placed in a patrol beat. Plain wording, 8th-grade level, no claim of verification, no "Our" prefix. Test: a fixture with one unplaced arrest yields the note; a fixture with none yields no note.
- [ ] 2.4 `test/sources/gov.irvingtx.arrests/transform.test.ts`: (a) one booking linked to two different people; the agency profile counts it once and each personnel profile counts it once; (b) a matched beat code with no boundary makes the transform throw. Fixture rows are built in the test, not taken from database row IDs.
- [ ] 2.7 Link personnel profiles to their agency profile (owner decision, 2026-11-22). Add a migration with the nullable foreign key column `public.arrest_profile.agency_arrest_profile_id` referencing `public.agency_arrest_profile(id)`. `sources/gov/irvingtx/arrests/transform.ts` sets it on every personnel arrest profile to the agency arrest profile written in the same transform. Test: in `test/sources/gov.irvingtx.arrests/transform.test.ts`, every personnel profile carries the id of the agency profile from the same run. Fixture rows are built in the test. This is shared with `show-neighborhood-income`; do it once.
- [ ] 2.5 Intake `npm run typecheck` passes. Today it is blocked by `SourceNameToCanonicalIdLedger.readSourceName` errors in `src/cli/cache/index.ts` and its tests, outside this change. This does not block the import (the CLI runs through `tsx`). Required before the intake folder is archived.
- [ ] 2.6 Intake change folder `openspec/changes/map-arrests-by-beat/`: keep only the boundary contract requirement, renamed "Published patrol beat boundaries", with: provenance stays in `coverage.provenance` and boundary entries carry none; each boundary entry includes only patrol code, name and geometry; arrests are placed by location including inactive beats; `by_arrest_beat` keys are boundary codes plus reserved `unknown`, counts add up to `coverage.totalArrests`, no boundary uses the code `unknown`; an empty boundary list, a duplicate code, or a matched code with no boundary stops the transform with an error that names the beat code; arrests with no beat produce the agency data note (2.3). Keep only intake tasks; link back to this website folder. `npx openspec validate map-arrests-by-beat` passes in intake.

## 3. Website follow-up

- [ ] 3.1 `src/lib/data/arrest-beats.ts`: throw when `arrest_beat_boundaries` is not an array or is empty (`!Array.isArray(boundaries) || boundaries.length === 0`); throw `Reserved arrest beat code unknown` when a boundary has that code; return only beats whose count is at least one. Tests in `tests/e2e/arrest-beat-map.spec.ts`: `[]` throws; a boundary coded `unknown` throws; a zero-count boundary is not in `data.beats`; an inactive-beat boundary with arrests is in `data.beats` with its count.
- [ ] 3.2 Loader test in `tests/e2e/arrest-beat-map.spec.ts` for the link in `src/lib/data/arrest-profiles.ts`: a personnel profile with `by_arrest_beat` and a set `agency_arrest_profile_id` gets the linked profile's boundaries; a null link throws `Missing agency arrest profile link for arrest profile {id}`; a second agency profile from the same source and months that is not linked is never used. Fixtures built in the test. Runs after 3.7.
- [ ] 3.3 `src/components/ArrestBeatMap.astro`:
  - Remove "Source:{" "}{source}." and the `source` prop; remove `source=` from `src/pages/personnel/[slug]/index.astro` and `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`.
  - Replace `"This personnel member’s arrests"` with `"Recorded arrests linked to this agency assignment"`.
  - Wrap the map box and "Drag or zoom to explore." in an element with `hidden`; the script removes `hidden` when it draws the map. Keep the snapshot sentence visible. No inline CSS.
  - Format `firstMonth`/`lastMonth` as "January 2024" with `Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })`.
  - After 4.7, if any real beat name already starts with "Beat", drop the "Beat " prefix in the count list.
- [ ] 3.4 `tests/e2e/arrest-beat-map.spec.ts`: in the no-JavaScript block assert `[data-arrest-beat-map]` is not visible and "Drag or zoom" is not visible; replace `` path: `/tmp/beat-map-${width}.png` `` with `path: testInfo.outputPath(\`beat-map-${width}.png\`)`, taking `testInfo`as the test's second argument; add an e2e check that city, county, state and federal pages contain no`[data-arrest-beat-map]`.
- [ ] 3.5 `src/components/EGM.md`: add "When no free spot is found, a label stays on its anchor and may overlap." `src/lib/data/EGM.md`: add "`arrest_profile.breakdowns.arrest_beat_boundaries` holds geometry, not counts. Read `breakdowns` by named key; do not loop over all its keys."
- [ ] 3.6 `openspec/specs/arrest-records/spec.md`: restore the two requirements to their text before commit `89ff562` (from git history), removing the change-folder names; this change's `specs/arrest-records/spec.md` delta carries the new wording. Coordinate the income sentence with `show-neighborhood-income`, which modifies the same requirement.

- [ ] 3.7 After intake 2.7 is on intake `main` and imported: add `agency_arrest_profile_id` to `arrest_profile` in `scripts/validate-schema-contract.mjs` (columns only; it is nullable). In `src/lib/data/arrest-profiles.ts`, load the agency comparison by joining `public.agency_arrest_profile` on `arrest_profile.agency_arrest_profile_id`; throw `Missing agency arrest profile link for arrest profile {id}` when a profile that needs a comparison (`by_arrest_beat` or `by_income_status`) has no link. No matching by source or months. Shared with `show-neighborhood-income`; do it once. Pass: `npm run validate:schema` passes against the imported database; 3.2 passes; `grep -n "firstMonth <=\|coverage.source ===" src/lib/data/arrest-profiles.ts` finds nothing.

## 4. Live page check

- [ ] 4.1 Confirm no other worktree is mid-rebuild or mid-verification on the shared database at 127.0.0.1:54322 (AGENTS.md "Database Expectations").
- [ ] 4.2 From the intake `main` folder, after section 2 (including the 2.7 migration) is on intake `main`, run `npm run cli -- data acquire gov/irvingtx/arrests`, then `data transform gov/irvingtx/arrests`, `data generate gov/irvingtx/arrests` and `data up`. The intake typecheck errors do not block these commands, because the CLI runs through `tsx`.
- [ ] 4.3 Query the database: exactly one agency arrest profile with `coverage.source = 'gov/irvingtx/arrests'` has `breakdowns.by_arrest_beat` and an `arrest_beat_boundaries` list of the length recorded in verify.md. Choose one personnel profile with `by_arrest_beat` by query (prefer one whose booking is linked to two or more personnel). Record the query, not a row ID.
- [ ] 4.4 `npm run build` succeeds. It does not throw "Missing agency arrest profile link" or "Missing boundary for arrest beat".
- [ ] 4.5 On the Irving agency page and the chosen personnel page, at 1280px and 390px, with JavaScript on and off: every drawn beat shows beat name and count, and no drawn beat has a zero count; beat counts plus the not-mapped count equal `coverage.totalArrests`; the not-mapped count equals `by_arrest_beat.unknown`; the agency total equals the agency profile total, not a sum of personnel totals; when `unknown` is greater than zero, the agency page shows the data note from 2.3; the browser makes no requests to other sites.
- [ ] 4.6 No city, county, state or federal page contains `[data-arrest-beat-map]`.
- [ ] 4.7 Record each result, the byte length of `JSON.stringify(data.beats)` for the Irving agency map and the largest per-page total on a personnel page, the active and inactive beat counts, and the real beat names in verify.md. Only verify.md and tasks.md change in this step.

## 5. Landing

- [ ] 5.1 Reimport Irving in each database the site builds against (same commands as 4.2).
- [ ] 5.2 Commit the website change on `ddl-openspec` with a Conventional Commit message (replace the `WIP` commit), run `git town sync`, open the website PR.
- [ ] 5.3 After the owner merges the website PR, deploy from `main` with `npm run deploy -- <environment>`.
- [ ] 5.4 Archive this website change folder in the website repo; archive the intake change folder in the intake repo after 2.5 and 2.6.
