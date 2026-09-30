## Verification Status

Complete on 2026-09-30. Aggregate validation passes with 138 browser tests, one dev-only built-search skip, and zero failures; both built-search tests subsequently pass. The full build of `ad4f4edb88b6` completed successfully, including 165,466 HTML files, Pagefind, no-inline-CSS validation, 6,271 redirects, CSS purge, and critical CSS validation. The older failures below are resolved historical evidence.

## Completed Checks

- Live catalog confirms the ten retired tables are absent and `agency.parent_federal_agency_id` is a nullable FK to `federal_agency.id`.
- All 11 federal parents have linked offices in the current database. No active source, script, or test references remain to the ten dropped tables.
- Schema validation passes for 25 required tables.
- Projection refresh succeeds with 3,206 agencies and 4,895 payloads, including offices without personnel or cases.
- Redirect generation succeeds with 6,177 entries. All 11 federal office legacy redirects match canonical paths from the database.
- Four federal regressions cover directory rendering, parent counts and office URLs, office parent navigation, and projection eligibility.
- Direct report/case/civic/form checks succeed against the current schema. Personnel suggestion and edit forms remain enabled.
- Formatting, ESLint, SQL lint, Astro type checking, shell syntax, OpenSpec validation, redirect tests, and API tests pass.
- `npm run validate` final rerun: 116 browser tests passed, 7 skipped, 1 failed solely for the missing discipline fixture described below. All four federal tests and the corrected agency prefill test passed.

## Review

Scoped and integration reviews approved the retired-consumer removals and direct federal FK migration. Review caught shared `.fact-list` CSS still needed by surviving pages; it was restored and re-reviewed. An explicit non-null predicate lets federal summary queries use the existing parent index; EXPLAIN ANALYZE completed in 234 ms after the original join plan exceeded 90 seconds. No schema changes were made.

## Initial Validation Blocker (Resolved)

The initial `tests/e2e/personnel-post-data.spec.ts` failure occurred before calling the site loader: its fixture query requires a discipline record with an allegation and more than one linked agency. The current database has 76 discipline records, 69 with allegations, and zero matching that fixture. The continuation supplies an explicit fixture in a rollback-only transaction on the real loader connection. It references an existing person with two distinct agencies and an existing state authority. All full-record, authority, single-record, and multiple-agency assertions remain intact. No loader or schema changes were needed; a separate connection confirmed zero persisted fixture rows. The focused rerun passed both tests, and independent fixture review found no blockers.

Seven browser tests are skipped; some report tests still depend on an older report schema. Separate current-schema route checks cover the affected report and case pages. Full static build failed on the county-level agency route mismatch described below. Doctor also reports missing Brewfile dependencies; no packages were installed to address that advisory.

## Full Build Blocker (2026-09-29)

`npm run build` with `build.concurrency: 8` passed environment/schema checks, refreshed 3,206 agency projections and 4,895 payloads, compiled static entrypoints, and rendered approximately 77,000 routes before failing:

> Personnel brian-bammert-zd0w8x assignment eq7j7rxpm6yhs4md73ujovus references agency r8srs1nkant4b7hou96pg9fv without a required canonical path.

The referenced agency is Metropolitan Airports Commission. Its authoritative `agency.location_path_id` joins to `/mn/hennepin-county/` at `administrative_area` level. The projection query requires a place with an administrative-area parent, and the agency route loader requires four path segments. As a result, no agency payload is emitted. This is the only assigned agency missing a projection and affects 117 distinct personnel. Another 93 unprojected agencies have no assigned personnel.

The required-path assertion remains intact. The user clarified that every agency must reference a place; county-level agency routing is not an option. On 2026-09-30 the reset database assigns Metropolitan Airports Commission to `/mn/hennepin-county/fort-snelling-ut/` at place level, and zero agencies violate the place invariant. The original data blocker is resolved; a fresh full build remains required. Search indexing, no-inline-CSS validation, redirect generation, CSS purging, and final CSS validation were not reached. Archive, commit, push, and deployment remain pending.

The initial serial build was deliberately stopped and restarted after the user directed parallel profile rendering. The parallel setting is now permanent in `astro.config.mjs`. Aggregate validation was rerun with that configuration and again passed: 117 browser tests, 7 existing skips, zero failures. Formatting and ESLint also pass for the configuration.

## Reset verification (2026-09-30)

Fresh schema validation passes for 25 required public tables. Projection refresh completes with 3,207 agencies and 4,897 payloads; MAC now projects correctly. Fresh aggregate validation passes (117 browser tests, 7 existing skips). The user has expanded scope to audit public-record coverage and publish the PR preview; see the associated `surface-reset-database-records` change. No production release is authorized by the current objective.

## Final build evidence (2026-09-30)

All 3,300 agencies have place-level locations and generated canonical pages. All 140,552 personnel pages and their stored education, license, action, discipline, arrest-profile, and assignment-license counts match the current database. The required-path assertion was preserved. The six retired-schema report skips are gone; the remaining dev-only search skip passed against built output (two search tests, zero skips). Twelve desktop/mobile page checks passed.

Completeness: all tasks complete. Correctness: current-schema and direct federal-parent requirements have implementation, focused regression, and full-build evidence. Coherence: exact database identity and required-schema failures are preserved. No unresolved blocking findings. Current PR preview publication belongs to the associated visitor-coverage change; this schema migration does not authorize production deployment.
