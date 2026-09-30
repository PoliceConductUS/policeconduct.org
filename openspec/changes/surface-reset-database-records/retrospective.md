# Retrospective

## Outcome

The implementation extends existing canonical pages to show assignment-linked arrest profiles, full stored personnel names and license associations, optional death-source links, report narrative facts and requested outcomes, case closing dates and incident geography, and optional news coverage. Agency projection eligibility now includes valid agencies without personnel or cases.

## What verification found

A table-by-table audit found substantive records absent from the existing UI. Source-aware tests prevented interpretation beyond the available data: arrest distributions remain assignment-specific, district codes keep their source meaning, and counts do not imply safety, misconduct, or unique agency totals.

Visual review caught a report date shifted by server timezone and a mobile table wider than its panel. Focused failing tests preceded the corrections. Final review caught a missing required schema column check for the newly displayed case closing date. The fix preserves nullability while ensuring a missing column fails validation.

## Decisions and limits

Approved report-rating suppression and reporter privacy remain in force. Labeled narrative facts remain visible even when words overlap the description; only an exact full-description duplicate suppresses an extra what-happened paragraph. This can repeat wording, but avoids silently erasing supplied context. Geographic polygons, alias-resolution metadata, and internal system tables are documented coverage exceptions rather than raw data dumped into pages.

The existing optional coverage publication-date formatter has a known positive-offset timezone portability limitation. Current Los Angeles/UTC builds preserve those dates, and the current table is empty. No speculative additional date refactor was added.

## Release evidence

Final build and publication results will be recorded in verify.md. Source database rows and schema were not modified; only the project's existing derived projection refresh runs during verification/build.
