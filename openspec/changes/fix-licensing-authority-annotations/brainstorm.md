# Scope

The owner asked for two changes to how annotations show on a state licensing
authority page (`src/pages/[category]/licensing-authority/index.astro`):

1. Hide the raw JSON. A reader sees only the annotation's label and message,
   not the raw field name, the JSON `value`, or the raw source namespace and
   record ID.
2. Page the annotations. Intake will add 494 more (163 Texas, 270 Oregon,
   61 Minnesota). Today the page lists them inline with no paging.

Owner decisions in review round 1 (2026-11-19): no label says "ours", because
every note is the site's own, so "Our warning" and "Our correction" become
"Warning" and "Correction". Messages that do not say what is wrong or with
which field are rewritten so they do.

## What existed before this change (`58e8b1f`)

- The authority page appends `RecordDataNotes`, which renders every annotation
  whose `record_url` is the authority page. Today that is every annotation
  filed on the `LicensingAuthority` (local data: 58 for Texas, mostly
  `excluded_records`).
- `DataAnnotations` (used by `RecordDataNotes` on every record page and by
  `PersonnelAssignments`) prints `Our warning (excluded_records):`, the JSON
  value, `Source: <namespace> · Record <id>`, and evidence as JSON inside a
  `details` element.
- The authority page already links to `licensing-authority/data-annotations/`.
  That page listed the annotations filed on the `LicensingAuthority` record,
  but not `AuthorityLicense` annotations from other namespaces (this change
  fixes that), 50 per page, with type filters and a CSV of all matching
  annotations.
- `annotationNoteLabel` already turns `excluded_records` into "Excluded record"
  or "Excluded duplicate" on the data-annotations page.
- Evidence has no link field, so there is no evidence URL to show.

## Approaches considered: raw data

- Move the value, replacement, source and evidence into a closed `details`
  element per annotation. Rejected: the raw JSON and internal names still ship
  in every page's HTML and show when opened, which is what the owner asked to
  remove.
- Remove them from record pages and keep them on the data-annotations listings
  and CSV. Chosen by the owner ("Message only").

## Approaches considered: paging

- A. Authority page stops listing its annotations; its existing link to the
  data-annotations page carries them, already paged. Chosen by the owner.
- B. Page the annotations on the authority page itself with `Pagination` and
  new `licensing-authority/page/{n}/` routes. Rejected: a second paginated copy
  of the data-annotations page.
- C. Show the first N annotations inline and link to the rest. Rejected: it
  keeps a second, partial copy of the listing on the authority page and needs a
  new display limit the owner did not ask for; option A gives the same access
  with no new rule.
