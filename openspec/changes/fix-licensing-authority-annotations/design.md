## Decision

Owner decision, 2026-11-18 (in session; no issue): "Message only" for record
pages, and page the authority's annotations by linking to its existing
data-annotations page. Owner decisions, review round 1 (2026-11-19): no label
says "ours"; messages say what is wrong and with which field.

Record pages: `DataAnnotations` renders each annotation as
`annotationNoteLabel(entry)` followed by `annotationDisplay(entry).message`.
It renders no field name, value, replacement value, source, record ID or
evidence, and no `details` element. `RecordDataNotes` and
`PersonnelAssignments` keep passing annotations through `DataAnnotations`
unchanged, so the intake contract check in `parseAnnotations` still runs.

Labels: `annotationNoteLabel` returns "Warning", "Data error", "Correction",
"Excluded record" or "Excluded duplicate". The same labels show on record pages
and in `DataAnnotationIndex`.

Messages: the stored message is intake's. Intake rewrites its generic messages
(for example "The reported value is not a valid date." in intake's
`src/shared/inspect-data-annotations.ts`) to name the field and say what is
wrong. The site's own message rewrites in `annotationDisplay` follow the same
rule; the duplicate message becomes "Matches an existing record."

Licensing authority page: remove `RecordDataNotes` from
`src/pages/[category]/licensing-authority/index.astro`. The page already links
to `licensing-authority/data-annotations/`, which pages the same annotations
with `annotationPages` (50 per page) and `DataAnnotationIndex`. The loader sets
`record_url` for annotations whose owner is a `LicensingAuthority` (including
`AuthorityLicense`, through its parent) to
`<state>/licensing-authority/data-annotations/`, the same destination already
used for agencies without a page. No new route or component.

Data-annotations listings and CSV: unchanged.

## Risks and limits

- Record-page notes rely on the message to name the field. Until intake
  rewrites its generic messages, some notes do not name the field; the
  listings and CSV still show it.
- Authority-owned annotations need a `record_url` that points at the subpage;
  the loader sets it.
- The authority test needs local data with an authority that has more than 50
  annotations filed on it; it fails with a clear message if none exists.
- Non-goals: no change to listing or CSV columns, no new route or component,
  no field-name map.

## Verification

- Record-page annotation test in `tests/e2e/data-annotations.spec.ts`: the
  annotation shows label and message, and no evidence, value, source or record
  ID.
- An `excluded_records` annotation shows "Excluded record" and not
  `excluded_records` or its JSON.
- Warning and correction labels read "Warning" and "Correction".
- The licensing-authority page has no "Data notes" region (aria-label "Source
  data annotations") and links to its data-annotations page, which lists the
  annotations filed on the authority and its authority licenses.
- Authority-owned annotations have `record_url`
  `<state>/licensing-authority/data-annotations/`.
- Listing and CSV columns are unchanged; existing coverage:
  `tests/unit/data-annotations.test.mjs` "native warnings and errors retain
  supporting evidence" and the e2e test "active native annotations render in
  the public index and CSV".
- Build `/tx/licensing-authority/` before and after.
- `npm run validate` on the final committed head.
