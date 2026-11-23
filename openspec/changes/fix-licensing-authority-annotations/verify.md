# Verify

Final head: `<sha>` on branch `fix-licensing-authority-annotations`. Node
26.13.1 from `mise.toml`; `npm ci` from the lockfile. Fill this in when tasks
4.1 and 4.2 run on the final committed head.

## Before (uncommitted tree on 58e8b1f)

### Tests first

Four test definitions (six cases: the warning/error/correction loop makes
three) in `tests/e2e/data-annotations.spec.ts` ran before the code change: 5
failed and 1 passed. The case that passed was the canonical record-page test,
which checks for the annotation message; the old component also printed the
message. This is worked out from the test assertions; the run log was not
kept. All pass after it (18 of 18 in that file). Update the counts after the
tests in `tasks.md` sections 2 and 3 are added.

### `/tx/licensing-authority/`

- Before: a "Data notes" region (aria-label "Source data annotations") with 58
  annotations, each showing "Our warning (excluded_records):", the message,
  "Reported value:" with JSON such as `{"key":"509914","kind":"Agency"}`, and
  "Source: gov/texas/tcole · Record 509914".
- After, on that uncommitted tree: no annotation region and no
  `excluded_records` text on the page. The existing "Source data notes and
  downloads" link leads to `/tx/licensing-authority/data-annotations/`, which
  lists the annotations 50 per page with type filters and a CSV.

### An agency record page

`/tx/bosque-county/meridian/meridian-police-department-14d17e/` showed each
annotation as "Our correction: <message>" with no value, replacement, source,
record ID or evidence. The label changes to "Correction" in task 2.3.

## After (final committed head)

Pending tasks 4.1 and 4.2.

## `npm run validate`

Pending task 4.2 on the final committed head: SHA, Node version, exit code,
stage results, test counts and skip count.

## Carried-over INS-121 tasks

Pending tasks 5.1 and 5.2: the section1983.org `main` SHA, the
`npm run test:analytics-config` command and exit code on both sites, and the
note that task 4.2 covers `d6c17a6`.

## Labels (tasks 2.3 and 2.5)

Pending: the two grep commands and their empty output.

## Annotation messages (task 2.4)

Pending: the output of the message-code query in task 2.4, one row per active
message code with its stored message.

## Authority attachment (task 3.4)

Pending: the count of active annotations with a `licensing_authority_id`, per
authority, and the e2e result that each appears in its authority's subpage CSV.

## Build cost (task 6.3)

Pending: median of 5 runs before and after, and the output comparison.

## Dependency exception (task 6.9)

Pending: `npm ls node-domexception` output and date, and whether the exception
is resolved or renewed.
