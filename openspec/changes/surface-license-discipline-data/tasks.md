## 1. Schema migration to the new personnel schema (DONE)

- [x] 1.1 Rename all SQL table/column references to the new schema across the data layer and scripts (`officers→personnel`, `agency_officers→agency_personnel` + `officer_id→personnel_id`, `civil_case_officers→civil_case_personnel`, `review_officers(_ratings)→review_personnel(_ratings)`, `coverage_link_agency_officers→coverage_link_agency_personnel`, `agency_officer_id→agency_personnel_id`, `review_officer_id→review_personnel_id`); `license_type→title` was already present. No back-compat aliases.
- [x] 1.2 Remove reads of the dropped `officers_stats`/`agency_stats` tables; compute per-personnel report counts live from `review_personnel`; render `rating` blank (no source in new schema).
- [x] 1.3 Update `scripts/validate-schema-contract.mjs` to the new table/column names; drop the two `*_stats` tables; keep `personnel.last_name` out of notNull (now nullable).
- [x] 1.4 Verify: schema contract passes (29 tables), `astro check` 0 errors, `refresh-build-projections` succeeds, full build renders with 0 errors.

## 2. Accessibility — color contrast (DONE)

- [x] 2.1 Move secondary/outline control borders (`.nav-action-volunteer`, `.masthead-search-input`) from `--ipc-color-rule-strong` (2.36:1) to `--ipc-color-ink-faint` (~5:1) to satisfy WCAG 1.4.11.
- [x] 2.2 Darken choropleth `.small-state-gutter-label` from `#6c757d` to `#495057` (7.78:1 on paper; holds over colored state fills).
- [ ] 2.3 Re-run the axe audit on a fresh build and confirm the two fixes clear (the earlier audit ran against a stale dist).

## 3. Schema contract for the new tables (INCOMPLETE)

- [ ] 3.1 Add `license`, `license_action`, `licensing_authority`, `discipline`, `discipline_agency_personnel` to `scripts/validate-schema-contract.mjs` (columns, notNull, unique/FK expectations) so builds guard on them.

## 4. Data layer + normalization (INCOMPLETE)

- [ ] 4.1 Add `src/lib/data/licensing.ts`: `loadLicensingForPersonnel(personnelId)` returning the person's licenses (join `licensing_authority`) and a single merged, newest-first `license_action` timeline with each event tagged by its license.
- [ ] 4.2 Add a display normalizer for `license.status` (`ACTIVE`/`Active`→"Active", `INACTIVE`→"Inactive", plus `Expired`/`Deceased`) and `license_type` duplicates (`Peace Officer`→`Peace Officer License`). One shared map applied in the data layer.
- [ ] 4.3 Classify `license_action.action` into routine (`Granted`, `Reactivated`, expirations) vs. adverse (reprimands, `Administrative Hold`, noncompliance, inactive/out-of-compliance, revocations) for timeline emphasis.
- [ ] 4.4 Add a discipline loader: disciplines for a personnel via `discipline_agency_personnel → agency_personnel` (returns action, effective/expiration dates, case number, attributed agency); and an agency-level discipline count.

## 5. Personnel page (INCOMPLETE)

- [ ] 5.1 Add a "Licenses & certification" section to `/personnel/[slug]/`: one `PersonnelLicenseCard` per license (normalized type, status pill, first-awarded date, issuing-authority badge linking to the authority website). ~15% of personnel show multiple cards.
- [ ] 5.2 Add a `LicenseTimeline` component: newest-first vertical timeline merging all `license_action`s across the person's licenses; each row = date · action · license · status; adverse actions emphasized; collapse-after-N with "show all".
- [ ] 5.3 Relabel the aside "License Type" field to "Role" (it renders `agency_personnel.title`, the assignment role — not a license).
- [ ] 5.4 Add a discipline section, rendered only when the person has discipline records (~76 people): action, effective/expiration dates, case number, attributed agency.

## 6. Agency page + licensing authority (INCOMPLETE)

- [ ] 6.1 Agency personnel roster: add a license status/type column (who is actively certified).
- [ ] 6.2 Agency page: show a discipline count/list for disciplines attributed to that agency's assignments.
- [ ] 6.3 State page: link the state's licensing authority (TCOLE → `/tx/`, MN POST → `/mn/`) to the authority website; no dedicated authority page required.

## 7. Out of scope (decided — do NOT build)

- [ ] 7.1 No per-license standalone pages and no `/<state>/<authority>/licenses/<...>` URL segment (~163k pages ≈ doubles the build; `license.id` is opaque with no human license number; the timeline already lives on the personnel page). Recorded here so it is not re-proposed.

## 8. Verify (INCOMPLETE)

- [ ] 8.1 `astro check` clean; schema contract passes with the five new tables added.
- [ ] 8.2 Full build renders 0 errors; spot-check a multi-license personnel page (timeline order, adverse emphasis, authority link) and one of the ~76 discipline pages.
- [ ] 8.3 axe: personnel license/discipline sections pass WCAG 2.1 AA (contrast, timeline semantics, table headers).
