## 1. Schema migration to the new personnel schema

- [x] 1.1 Rename all SQL table/column references to the new schema across the data layer and scripts (`officers→personnel`, `agency_officers→agency_personnel` + `officer_id→personnel_id`, `civil_case_officers→civil_case_personnel`, `review_officers(_ratings)→review_personnel(_ratings)`, `coverage_link_agency_officers→coverage_link_agency_personnel`, `agency_officer_id→agency_personnel_id`, `review_officer_id→review_personnel_id`); `license_type→title` was already present. No back-compat aliases.
- [x] 1.2 Remove reads of the dropped `officers_stats`/`agency_stats` tables; compute per-personnel report counts live from `review_personnel`; render `rating` blank (no source in new schema).
- [x] 1.3 Update `scripts/validate-schema-contract.mjs` to the new table/column names; drop the two `*_stats` tables; keep `personnel.last_name` out of notNull (now nullable).
- [x] 1.4 Verify: schema contract passes, `astro check` 0 errors, `refresh-build-projections` succeeds, full build renders with 0 errors.

## 2. Accessibility — color contrast

- [x] 2.1 Move secondary/outline control borders (`.nav-action-volunteer`, `.masthead-search-input`) from `--ipc-color-rule-strong` (2.36:1) to `--ipc-color-ink-faint` (5.23:1 on `--ipc-color-paper`) to satisfy WCAG 1.4.11.
- [x] 2.2 Darken choropleth `.small-state-gutter-label` from `#6c757d` to `#495057` (7.78:1 on paper; holds over colored state fills).
- [x] 2.3 Re-run the axe audit on a fresh build and confirm the two fixes clear (the earlier audit ran against a stale dist).

## 3. Schema contract for the new tables

- [x] 3.1 Add `license`, `authority_license`, `license_action`, `licensing_authority`, `discipline`, `discipline_agency_personnel` to `scripts/validate-schema-contract.mjs` (columns, notNull, unique/FK expectations) so builds guard on them.

## 4. Data layer + normalization

- [x] 4.1 Add `src/lib/data/licensing.ts`: `loadLicensingForPersonnel(personnelId)` returning the person's licenses (join `licensing_authority`) and a single merged, newest-first `license_action` timeline with each event tagged by its license.
- [x] 4.2 Add a display normalizer for `license.status` (case-insensitive `active`/`inactive`/`expired`/`deceased` → "Active"/"Inactive"/"Expired"/"Deceased"; other values shown trimmed as stored). License types come from `authority_license.name`, already cleaned by intake; the site only trims them.
- [ ] 4.3 Take timeline emphasis from intake's explicit table of all recorded license-action values. Prerequisite: an intake change (intake repo) that adds the table, classifies every recorded `license_action.action` value, and fails intake on an unknown value. Then, in this repo: delete `ADVERSE_ACTION_PATTERNS` and `isAdverseLicenseAction` from `src/lib/data/licensing.ts`; join each action to the intake table and fail the build when a recorded value has no row (name the value in the error); add the table to `scripts/validate-schema-contract.mjs`; in `src/components/LicenseTimeline.astro`, replace the "Adverse action" text with "License Action" and rename the `isAdverse` field and `is-adverse` class to match; update the `LicenseTimelineEntry` line in `src/lib/data/EGM.md`. Pass: `rg -n "ADVERSE_ACTION_PATTERNS|isAdverse|Adverse action" src` returns nothing, and the 7.4 tests pass.
- [x] 4.4 Add a discipline loader: disciplines owned directly by the person (`discipline.personnel_id`), with authority, stored action/date/case/document/factual fields, and any agencies explicitly linked through `discipline_agency_personnel → agency_personnel` (governed by `personnel-post-records`); and an agency-level count of explicitly linked discipline.
- [ ] 4.5 Roster license per assignment: in `src/lib/data/agency-detail.ts`, load each roster row's license from its own `agency_personnel.license_id` (joined to `license` and `authority_license`), and return no license when it is null. Remove the current rule that picks one license per person (active first, then newest first-awarded) across all of the person's licenses. Pass: a fixture test shows a row with a linked license gets that license's type and status, and a row with a null `license_id` shows no license even when the person holds other licenses.
- [ ] 4.6 Roster discipline counts from any source: in `src/lib/data/agency-detail.ts`, count distinct `discipline.id` per roster person by `discipline.personnel_id` (the same rule as the "With discipline actions" filter), not by `discipline_agency_personnel` links. Keep the agency total on explicit links. Update `tests/e2e/agency-discipline.spec.ts` fixtures and assertions to the new rule. Pass: tests show a record with no agency link and a record linked only to another agency both count on the roster row, a record with repeated links counts once, and the agency total excludes records without a link to that agency.

## 5. Personnel page

- [x] 5.1 Add a "Licenses & certification" section to `/personnel/[slug]/`: one inline card per license in `src/pages/personnel/[slug]/index.astro`, anchored `#license-{license.id}` (type, status pill, first-awarded date, issuing authority linked to its internal page).
- [x] 5.2 Add a `LicenseTimeline` component: newest-first vertical timeline merging all `license_action`s across the person's licenses; each row = date · action · license · status; the first 8 entries visible and the rest inside a native `<details>` ("Show all {n} license events"); undated actions last.
- [x] 5.3 Stop labeling the assignment role as a license: the role (`agency_personnel.title`) shows in the "Role" column of `PersonnelAssignments.astro`, next to a "License" column that links the assignment's `license_id` license.
- [x] 5.4 Add a discipline section (`PersonnelDiscipline.astro`, fragment ID `discipline`), rendered only when the person directly owns discipline records, per `personnel-post-records`.
- [ ] 5.5 Status pill: in `src/pages/personnel/[slug]/index.astro` (license card markup and `.personnel-status-pill` styles), keep the green style only for "Active" and give every other status a neutral style built from existing ink/rule tokens. Add the rule (green for Active only, neutral for every other status) to `DESIGN.md`. Pass: a fixture test shows an "Active" pill and an "Expired" pill with different classes, and the neutral style meets WCAG 1.4.3 text contrast.

## 6. Agency page

- [ ] 6.1 Agency personnel roster: show the license tied to each assignment (`agency_personnel.license_id`) as type and status in the person's context line; show no license when the link is null (implemented by 4.5).
- [x] 6.2a Agency page: show a distinct-record discipline total of explicitly linked records; roster: show positive counts linking to each person's discipline section (count rule changed by 4.6).
- [x] 6.3 Superseded: state pages link to their licensing authority's internal page (`<state path>licensing-authority/`), delivered by the archived `2026-09-27-state-licensing-authority-pages` change and governed by `state-licensing-authority`. Nothing to build here.

## 7. Verify

- [x] 7.1 `astro check` clean; schema contract passes with the six licensing and discipline tables added.
- [ ] 7.2 Run `npm run build` (exit 0, no errors or warnings). Pick subjects by query at run time and record the query, not IDs or names: (a) a person with 2 or more licenses and at least one emphasized action (per the intake table); (b) a person who directly owns discipline and has no `discipline_agency_personnel` link. On each built page, check: card count, authority links resolve to `licensing-authority/` pages, timeline order (newest first, undated last), the first-8 disclosure, the "License Action" label on emphasized entries, the status pill style, and that the discipline section and `#discipline` anchor appear. On an agency roster that lists subject (b), check that the row shows a discipline count linking to `#discipline`.
- [ ] 7.3 After 7.2, run `npm run audit:a11y`. Pass bar: exit 0, with zero axe violations of any impact and zero assistive findings. Record which personnel detail route was sampled and whether it has a license card, a timeline with the disclosure, the status pill, the emphasized-action label and a discipline section. If the sample lacks any of these, record the gap for an owner decision; do not add audit tooling in this change.
- [ ] 7.4 Add tests: a unit test for `normalizeLicenseStatus` (new file `src/lib/data/licensing.test.mjs`, added to `test:data` in `package.json`); fixture tests that an action the intake table marks for emphasis renders the "License Action" label and that an action value with no intake table row fails loudly; e2e/fixture tests (in `tests/e2e/personnel-post-ui.spec.ts` or a new `tests/e2e/personnel-licensing.spec.ts`) for license cards (authority link, `#license-{id}` anchor, status pill style per 5.5), timeline order across licenses, undated-last, and the first-8 disclosure. Pass: `npm run test:data` and `npm run test:e2e` exit 0 with the new tests counted and none skipped.
