## Why

A licensing authority page prints raw annotation data to readers: the internal
field name `excluded_records`, a JSON value such as
`{"key":"509914","kind":"Agency"}`, the source namespace, the source record ID
and evidence as JSON. It also lists every annotation inline with no paging, and
intake is about to add about 494 more (163 Texas, 270 Oregon, 61 Minnesota).

## What Changes

- On every record page that shows annotations (`RecordDataNotes`,
  `DataAnnotations`, `PersonnelAssignments`), each annotation shows only its
  label and message. The field name, reported value, replacement value, source
  namespace and record ID, and evidence are removed from record pages.
- Record pages use the existing `annotationNoteLabel` labels, so an
  `excluded_records` annotation reads "Excluded record" or "Excluded duplicate"
  instead of "Our warning (excluded_records)".
- The licensing authority page stops listing its annotations. Its existing
  link leads to the `licensing-authority/data-annotations/` page, which already
  lists the same annotations 50 per page with type filters and a CSV.
- The data-annotations listing pages and their CSV do not change; they keep
  the field, value, replacement, source, record ID and evidence.
- This drops approved requirements that record pages show the reported value,
  the source record ID, evidence and correction values. No backward
  compatibility is kept.

## Capabilities

### Modified Capabilities

- `public-data-annotations`: record pages show annotation label and message
  only; annotations filed on a licensing authority appear only on its
  paginated data-annotations page.

## Impact

- `src/components/DataAnnotations.astro`: every record page that shows
  annotations, and the date annotations in `PersonnelAssignments.astro`.
- `src/pages/[category]/licensing-authority/index.astro`.
- `tests/e2e/data-annotations.spec.ts`: record-page annotation assertions.
- No database, loader, route or CSV change. No positive-deviance or
  public-trust claim.
- This change modifies `openspec/specs/public-data-annotations/spec.md`,
  accepted when `publish-source-data-annotations` was archived as
  `2026-11-18-publish-source-data-annotations`.
