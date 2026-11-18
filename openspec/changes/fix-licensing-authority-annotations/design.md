## Decision

Owner decision, 2026-11-18: "Message only", and page by linking to the
existing data-annotations page.

Record pages: `DataAnnotations` renders each annotation as
`annotationNoteLabel(entry)` followed by `annotationDisplay(entry).message`.
It renders no field name, value, replacement value, source, record ID or
evidence, and no `details` element. `RecordDataNotes` and
`PersonnelAssignments` keep passing annotations through `DataAnnotations`
unchanged, so the intake contract check in `parseAnnotations` still runs.

Licensing authority page: remove `RecordDataNotes` from
`src/pages/[category]/licensing-authority/index.astro`. The page already links
to `licensing-authority/data-annotations/`, which pages the same annotations
with `annotationPages` (50 per page) and `DataAnnotationIndex`. No new route,
loader or component.

Data-annotations listings and CSV: unchanged.

## Verification

- Record-page annotation test in `tests/e2e/data-annotations.spec.ts`: the
  annotation shows label and message, and no evidence, value, source or record
  ID.
- An `excluded_records` annotation shows "Excluded record" and not
  `excluded_records` or its JSON.
- The licensing-authority page has no "Source data annotations" region and
  links to its data-annotations page, which lists the annotations filed on the
  authority.
- Build `/tx/licensing-authority/` before and after.
- `npm run validate` on the final head.
