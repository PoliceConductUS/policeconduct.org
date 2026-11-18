# Plan

1. In `tests/e2e/data-annotations.spec.ts`, replace the record-page evidence
   test with tests that a warning, error or correction annotation shows only
   "<label>: <message>" and no `details` element, and that an
   `excluded_records` annotation reads "Excluded record: <message>". Add a test
   that the licensing-authority page has no "Source data annotations" region,
   links to its data-annotations page, and that page pages the annotations
   filed on the authority. Point the canonical record-page test at the
   annotation message instead of the source record ID, and skip
   `LicensingAuthority` annotations there. Run them and see them fail.
2. Change `src/components/DataAnnotations.astro` to render
   `annotationNoteLabel(entry)` and `annotationDisplay(entry).message` only.
3. Remove `RecordDataNotes` from
   `src/pages/[category]/licensing-authority/index.astro`.
4. Run the tests, compare `/tx/licensing-authority/` before and after, and run
   `npm run validate`.
