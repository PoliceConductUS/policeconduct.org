# Verification

## Reproduction

`npm run validate` reproduced seven failures: four civic-index tests, two personnel-prefill tests, and the home-map pointer test. Error examples: `getByText('State civic index')` expected visible but no element; exact prefill expected `Lotts v. City of Irving et al` while the stored title is `Lotts v. City of Irving`. Log: `/tmp/policeconduct-validate-repro.log`.

## Root causes and fix

Committed templates no longer render the civic-index eyebrows, and the shared metric label is Personnel. Civic counts and case text were hardcoded from an older database snapshot. No location reports are currently attached to Texas. Tests now read the relevant database fixtures, retain exact assertions, fail missing required fixtures, and assert that absent optional context is omitted. Test fixture environment loading matches the dev server's file order and override behavior.

## Checks

- Focused civic suite: 4 passed. The preceding combined focused run passed all 28 prefill tests and three civic tests; its remaining stale Personnel Records label was then corrected.
- Scoped ESLint, Prettier and git diff --check passed.
- Independent review: environment mismatch found and corrected, then confirmed resolved; no further findings.
- First post-fix aggregate: 92 passed, 1 home-map pointer failure, 7 existing skips. The first populated SVG region was D.C.; Virginia intercepted its bounding-box-center click. The generic navigation test now selects Texas explicitly and retains a real click. Both focused map tests passed.
- Final `npm run validate`: exit 0. Formatting, ESLint, SQL lint, Astro types (0 errors), shell syntax, schema, OpenSpec, all 10 redirect tests and browser suite passed. Browser result: 93 passed, 7 existing skips, 0 failed (1.1 minutes). Log: `/tmp/policeconduct-validate-final.log`.
- Production source files and database source records unchanged; no new skips.

## Existing skips

Seven browser tests were already skipped before this change. This repair does not alter their skip conditions.
