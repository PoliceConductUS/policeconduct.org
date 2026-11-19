# Plan

1. In `tests/e2e/data-annotations.spec.ts`, replace the record-page evidence
   test with tests that a warning, error or correction annotation shows only
   "<label>: <message>" and no `details` element, and that an
   `excluded_records` annotation reads "Excluded record: <message>". Add a test
   that the licensing-authority page has no "Data notes" region (aria-label
   "Source data annotations"), links to its data-annotations page, and that
   page pages the annotations filed on the authority. Point the canonical
   record-page test at the annotation message instead of the source record ID,
   and skip entries whose `record_url` is a data-annotations listing. Run them
   and see them fail. The authority test needs local data with at least one
   authority that has more than 50 annotations filed on it (Texas: 58 at
   `58e8b1f`).
2. Change `src/components/DataAnnotations.astro` to render
   `annotationNoteLabel(entry)` and `annotationDisplay(entry).message` only.
3. Remove `RecordDataNotes` from
   `src/pages/[category]/licensing-authority/index.astro`.
4. Review round 1: set `record_url` for authority-owned annotations to the
   subpage; change the labels to "Warning" and "Correction"; change the
   duplicate message; rewrite intake's generic messages. See `tasks.md`
   sections 3 and 4.
5. Run the tests, compare `/tx/licensing-authority/` before and after, and run
   `npm run validate` on the final committed head.
