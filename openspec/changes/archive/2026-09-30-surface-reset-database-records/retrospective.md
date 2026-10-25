# Retrospective

## Outcome

The implementation extends existing canonical pages to show assignment-linked arrest profiles, full stored personnel names and license associations, optional death-source links, report narrative facts and requested outcomes, case closing dates and incident geography, and optional news coverage. Agency projection eligibility now includes valid agencies without personnel or cases.

## What verification found

A table-by-table audit found substantive records absent from the existing UI. Source-aware tests prevented interpretation beyond the available data: arrest distributions remain assignment-specific, district codes keep their source meaning, and counts do not imply safety, misconduct, or unique agency totals.

Visual review caught a report date shifted by server timezone and a mobile table wider than its panel. Focused failing tests preceded the corrections. Final review caught a missing required schema column check for the newly displayed case closing date. The fix preserves nullability while ensuring a missing column fails validation.

The first full build found that 45 arrest profiles lack one or more categorical breakdowns. The original sample-only test missed this source variation. The corrected component preserves every stored map and omits absent categorical maps without filling them with zeroes. The regression now renders all 320 profiles and compares every bucket and share to its source.

## Decisions and limits

Approved report-rating suppression and reporter privacy remain in force. Labeled narrative facts remain visible even when words overlap the description; only an exact full-description duplicate suppresses an extra what-happened paragraph. This can repeat wording, but avoids silently erasing supplied context. Geographic polygons, alias-resolution metadata, and internal system tables are documented coverage exceptions rather than raw data dumped into pages.

The existing optional coverage publication-date formatter has a known positive-offset timezone portability limitation. Current Los Angeles/UTC builds preserve those dates, and the current table is empty. No speculative additional date refactor was added.

## Release evidence

The full build of `ad4f4ed` passed with 165,466 HTML files and 165,464 searchable pages. Aggregate validation passed with 138 browser tests; the dev-only built-search skip was covered by two passing tests against the completed output. Exhaustive per-person record counts matched the database with zero mismatches. All 12 final desktop/mobile checks passed. Both source commits are pushed and the full artifact is published. Nine live pages and 14 assets match the build. Live search exposed a deployed CSP mismatch: the repository already allows Pagefind WebAssembly, but the shared preview/production response policy does not. A browser-only one-token header substitution proved the fix; the user subsequently authorized the shared policy change, which was applied and verified with a passing unmodified live browser search test. This demonstrates why local built-search coverage does not replace an unmodified live browser check. See verify.md for the completed live release checks. Source database rows and schema were not modified; only the project's existing derived projection refresh and rollback-only test fixtures ran during verification/build.
