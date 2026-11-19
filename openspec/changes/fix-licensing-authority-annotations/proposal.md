## Why

A licensing authority page prints raw annotation data to readers: the internal
field name `excluded_records`, a JSON value such as
`{"key":"509914","kind":"Agency"}`, the source namespace, the source record ID
and evidence as JSON. It also lists every annotation inline with no paging, and
intake will add 494 more (163 Texas, 270 Oregon, 61 Minnesota).

## What Changes

- On every record page that shows annotations, through the components
  `RecordDataNotes`, `DataAnnotations` and `PersonnelAssignments`, each
  annotation shows only its label and message. The field name, reported value,
  replacement value, source namespace and record ID, and evidence are removed
  from record pages.
- Record pages use the existing `annotationNoteLabel` labels, so an
  `excluded_records` annotation reads "Excluded record" or "Excluded duplicate"
  instead of "Our warning (excluded_records)".
- No label says "ours": every note is the site's own. "Our warning" becomes
  "Warning" and "Our correction" becomes "Correction", on record pages and
  listings.
- Messages that do not say what is wrong, or with which field, are rewritten
  so they do (for example, "The end date is not a valid date." instead of "The
  reported value is not a valid date.").
- The licensing authority page stops listing its annotations. Its existing
  link leads to the `licensing-authority/data-annotations/` page, which lists
  them 50 per page with type filters and a CSV.
- The annotation loader links annotations filed on a licensing authority or
  its authority licenses to `licensing-authority/data-annotations/` instead of
  the licensing-authority page. No database, route or CSV-column change. No
  positive-deviance or public-trust claim.
- The data-annotations listing pages and their CSV keep the field, value,
  replacement, source, record ID and evidence.
- This drops approved requirements that record pages show the reported value,
  the source record ID, evidence and correction values.

## Capabilities

### Modified Capabilities

- `public-data-annotations`: record pages show annotation label and message
  only; annotations filed on a licensing authority appear only on its
  paginated data-annotations page; every annotation is attached to one
  licensing authority.

## Impact

- `src/components/DataAnnotations.astro`: every record page that shows
  annotations, and the date annotations in `PersonnelAssignments.astro`.
- `src/pages/[category]/licensing-authority/index.astro`.
- `src/lib/data/data-annotations.ts`: `record_url` for authority-owned
  annotations.
- `src/lib/data/annotation-values.js`: note labels and the duplicate message.
- `tests/e2e/data-annotations.spec.ts`, `tests/unit/data-annotations.test.mjs`:
  record-page annotation assertions, labels and authority `record_url`.
- Message wording is intake's: the generic messages are rewritten in the
  intake repository.
- This change modifies `openspec/specs/public-data-annotations/spec.md`,
  accepted when `publish-source-data-annotations` was archived as
  `2026-11-18-publish-source-data-annotations`.
- Section 5 of `tasks.md` closes two INS-121 tasks carried over from
  `2026-11-18-publish-source-data-annotations` (Analytics pull/push on both
  sites, and INS-121 validation). They add no behavior to this change.
- Section 6 of `tasks.md` carries forward the code work from the round-1
  review of `publish-source-data-annotations`, whose fixes were applied to the
  main specs in `openspec/specs/`.
