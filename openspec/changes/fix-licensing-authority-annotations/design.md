## Decision

Owner decision, 2026-11-18 (in session; no issue): "Message only" for record
pages, and page the authority's annotations by linking to its existing
data-annotations page. Owner decisions, review round 1 (2026-11-19): no label
says "ours"; messages say what is wrong and with which field. Owner decisions,
2026-11-22: the site is a view of the database and never guesses an
attachment; each annotation has a message code that the build joins to a
stored message; annotations about a person attach to the licensing authority
(intake stores it); `NO_PERSONNEL` hides personnel pages only; say
"annotations", never "notes".

Record pages: `DataAnnotations` renders each annotation as
`annotationNoteLabel(entry)` followed by `annotationDisplay(entry).message`.
It renders no field name, value, replacement value, source, record ID or
evidence, and no `details` element. `RecordDataNotes` and
`PersonnelAssignments` keep passing annotations through `DataAnnotations`
unchanged, so the intake contract check in `parseAnnotations` still runs.

Labels: `annotationNoteLabel` returns "Warning", "Data error" or "Correction"
from the stored `type`. The same labels show on record pages and in
`DataAnnotationIndex`. The former "Excluded record" and "Excluded duplicate"
labels matched message text, so they are gone.

Messages: the message is intake's. Intake's change `supply-site-display-data`
adds `data_annotation.message_code` and the manual-records table
`data_annotation_message` (tasks 4.1-4.3, design D5). The site joins the code
and shows the stored `message` unchanged (task 2.4). The site does not rewrite
a message or match its text; `annotationDisplay` already passes the message
through (`84c5cec`). The rule that a message says what is wrong and with which
value is intake's requirement "Public messages hold no internal identifiers".

Licensing authority page: `RecordDataNotes` is removed from
`src/pages/[category]/licensing-authority/index.astro`. The page already links
to `licensing-authority/data-annotations/`, which pages the annotations with
`annotationPages` (50 per page) and `DataAnnotationIndex`. No new route or
component.

Which annotations an authority's subpage lists: those attached to it, and an
annotation is attached only through stored facts. Its record is the authority
(`subject_kind` `LicensingAuthority`, as `authorityAnnotations` selects since
`2445cd6`), or intake's `data_annotation.licensing_authority_id` names the
authority (intake `supply-site-display-data` D11, tasks 4a.1-4a.2; site task
3.4). The site never picks an authority from a source namespace.

Where an annotation links (`record_url`): the page of the record the
annotation's subject resolves to through the `parent` foreign keys. Task 3.3
changes the `LicensingAuthority` owner URL to the authority's
`licensing-authority/data-annotations/` page, because the authority page no
longer lists annotations. `AuthorityLicense` reaches that owner through its
`licensing_authority_id` foreign key. Records with no built page (an agency, a
location, or a person when `NO_PERSONNEL` is set) have no link and stay in the
central index and CSV (`2445cd6`, `cc0c973`).

Annotations about a person: today they show only in the central index
(`/data-annotations/`) and its CSV, linked to the person's page when that page
is built. After intake stores `licensing_authority_id` and task 3.4 lands,
they also show on that authority's subpage, whether or not the person's page
is built. This holds until data sources become first-class records.

Data-annotations listings and CSV: columns unchanged.

## Carried-forward code (tasks.md section 6)

Section 6 is code catching up to requirements already in the main specs or in
this change's deltas.

- 6.1 implements "Complete filtered CSV download" (main spec): one prefix step
  in `annotationsCsv` before `quote`.
- 6.2 enforces the agency canonical URL rule in AGENTS.md: the Agency URL built
  from its location path and slug must equal its `build_page_payload` path.
- 6.3 reduces build queries with no change in output.
- 6.4 keeps the contract and `resolveOwner` in step.
- 6.5 implements `analytics-measurement` "form_submit_success stays un-marked"
  (owner Q23).
- 6.6 and 6.9 are documentation and dependency upkeep, with no behavior.
- 6.7 moves one requirement between capabilities, text unchanged.
- 6.8 is intake upkeep.

## Risks and limits

- Repository order: (1) intake applies `supply-site-display-data` tasks
  4.1-4.3 (message codes) and 4a.1-4a.2 (`licensing_authority_id`); (2) the
  shared local database is reloaded from intake; (3) this change's tasks 2.4
  and 3.4 merge; (4) task 6.4 regenerates the contract. Tasks 2.4 and 3.4 fail
  the build on a missing column or table, so merging them before (2) breaks
  every build. Sections 2.3, 2.5, 3.3, 3.5, 5 and 6 (except 6.4) do not wait
  on intake. This change is archived only after tasks 2.4, 3.4, 6.4 and 6.8
  are done.
- Until step (3), the site shows the stored `data_annotation.message`, an
  authority's subpage lists only annotations whose record is that authority,
  and annotations about a person appear only in the central index.
- `AuthorityLicense` annotations link to the subpage after task 3.3 but are
  listed there only once intake stores their `licensing_authority_id` (intake
  D11 lists `AuthorityLicense` as a person kind). Until then those links lead
  to a page that does not list them.
- On an authority's subpage, rows whose record is the authority link to that
  same subpage. Accepted; no change to `DataAnnotationIndex`.
- The field column of the index and CSV shows the stored field name, for
  example `location_path_id`, because the site no longer relabels fields
  (`84c5cec`). A reader-facing field label waits on intake's open question 8
  in `supply-site-display-data`.
- The authority test needs local data with an authority that has more than 50
  annotations whose record is that authority; task 3.3 makes it fail with a
  clear message if none exists.
- Non-goals: no change to listing or CSV columns, no new route or component,
  no field-name map, no message rewrites.

## Verification

- Record-page annotation test in `tests/e2e/data-annotations.spec.ts`: the
  annotation shows label and message, and no evidence, value, source or record
  ID.
- An `excluded_records` annotation shows its type label and message, and not
  `excluded_records` or its JSON.
- Labels read "Warning", "Data error" and "Correction".
- The message is the stored message for the annotation's message code.
- The licensing-authority page has no "Source data annotations" region and
  links to its data-annotations page, which lists the annotations attached to
  the authority.
- Annotations whose record is an authority have `record_url`
  `<state>/licensing-authority/data-annotations/`.
- Listing and CSV columns are unchanged; existing coverage:
  `tests/unit/data-annotations.test.mjs` "native warnings and errors retain
  supporting evidence" and the e2e test "active native annotations render in
  the public index and CSV".
- Build `/tx/licensing-authority/` before and after.
- `npm run validate` on the final committed head.
