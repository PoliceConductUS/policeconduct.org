# Data implementation report

## RED

`PLAYWRIGHT_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/personnel-post-data.spec.ts --workers=1` failed as intended: the current discipline loader returned two rows for one discipline linked to two agencies, and the education loader module did not exist.

## GREEN

The same focused command passed: 2 tests, 0 failures. The live-database test compares a multi-agency discipline's stored fields, direct authority path, and distinct linked agencies against the loader output. The education test compares the full collection for a person with more than ten courses, including date text, numeric credit text, optional fields, and stable date ordering. A nonexistent person returns no courses.

The database currently has 76 discipline rows, all with agency links, so a live no-agency record is unavailable. The discipline query uses `d.personnel_id` for ownership and a correlated agency aggregate, which leaves an empty agency array when no assignment is linked. No database rows or schema were changed. The education loader caches only the set of personnel IDs with education and reads course rows per person.

The UI component fixture covers the empty-agency output shape without a database mutation; its record remains visible and omits agency copy.

## Decisions

- Preserve recorded date text using `::text`; the renderer must format from its calendar components in UTC.
- Keep authority identity strict: a discipline with a missing or malformed state path throws.
- Preserve existing license and license-history loader behavior.

`npm run validate:schema` passed for 33 public tables, and `npm run validate:types` reported 0 errors, 0 warnings, and 3 existing hints.
