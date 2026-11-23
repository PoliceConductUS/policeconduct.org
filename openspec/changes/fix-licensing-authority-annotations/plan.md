# Plan

1. Done: in `tests/e2e/data-annotations.spec.ts`, the record-page evidence
   test was replaced with tests that a warning, error or correction
   annotation shows only "<label>: <message>" and no `details` element, and a
   test that the licensing-authority page has no "Source data annotations"
   region and links to its data-annotations page.
2. Done: `src/components/DataAnnotations.astro` renders
   `annotationNoteLabel(entry)` and `annotationDisplay(entry).message` only.
3. Done: `RecordDataNotes` removed from
   `src/pages/[category]/licensing-authority/index.astro`.
4. Labels and wording (`tasks.md` 2.3 and 2.5): labels by type with no "ours";
   public labels say "annotations".
5. Authority subpage (`tasks.md` 3.3 and 3.5): annotations whose record is an
   authority link to its subpage; rewrite the two authority e2e tests.
6. Carried-forward code (`tasks.md` section 6): for each of 6.1, 6.2, 6.3 and
   6.5, write the failing test, then the code; 6.6, 6.7, 6.8 and 6.9 are
   documentation, spec, intake and dependency upkeep.
7. Moved INS-121 tasks (`tasks.md` section 5).
8. After intake's `supply-site-display-data` migrations are in the shared
   local database (see `design.md` "Risks and limits"): message codes
   (`tasks.md` 2.4), attachment by `licensing_authority_id` (3.4), and the
   contract (6.4).
9. Verification (`tasks.md` section 4) runs last: compare
   `/tx/licensing-authority/` before and after, and run `npm run validate` on
   the final committed head.
