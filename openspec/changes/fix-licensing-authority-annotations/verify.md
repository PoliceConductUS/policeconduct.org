# Verify

Uncommitted working tree on branch `fix-licensing-authority-annotations`,
based on `58e8b1f`. Node 26.13.1 from `mise.toml`, `npm ci` from the lockfile.

## Tests first

The four new or changed tests in `tests/e2e/data-annotations.spec.ts` failed
before the code change (5 failed, 1 passed) and pass after it (18 of 18 in that
file).

## Before and after: `/tx/licensing-authority/`

- Before: a "Data notes" region with 58 annotations, each showing
  "Our warning (excluded_records):", the message, "Reported value:" with JSON
  such as `{"key":"509914","kind":"Agency"}`, and
  "Source: gov/texas/tcole · Record 509914".
- After: no annotation region and no `excluded_records` text on the page. The
  existing "Source data notes and downloads" link leads to
  `/tx/licensing-authority/data-annotations/`, which lists the annotations 50
  per page with type filters and a CSV.

## Before and after: an agency record page

`/tx/bosque-county/meridian/meridian-police-department-14d17e/` now shows each
annotation as "Our correction: <message>" with no value, replacement, source,
record ID or evidence.

## `npm run validate`

Exit 0. Prettier clean; ESLint 0 errors, 0 warnings; types, shell, schema
pass; OpenSpec 46 of 46; personal-data scan 0 findings; every `node --test`
suite 0 failed, 0 skipped; Playwright 228 passed, 0 skipped, 0 flaky.

Environment: this new worktree needed `.env` copied from `main` (ignored) and
`terraform init` in `infrastructure/bootstrap-policeconduct` and
`infrastructure/bootstrap-recaptcha` before the e2e dev server could start.
