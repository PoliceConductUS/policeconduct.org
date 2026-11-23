# Scope

The owner asked for two changes to how annotations show on a state licensing
authority page (`src/pages/[category]/licensing-authority/index.astro`):

1. Hide the raw JSON. A reader sees only the annotation's label and message,
   not the raw field name, the JSON `value`, or the raw source namespace and
   record ID.
2. Page the annotations. Intake will add 494 more (163 Texas, 270 Oregon,
   61 Minnesota). At `58e8b1f` the page listed them inline with no paging.

Owner decisions in review round 1 (2026-11-19): no label says "ours", because
every annotation is the site's own, so "Our warning" and "Our correction"
become "Warning" and "Correction". Messages that do not say what is wrong or
with which field are rewritten so they do.

Owner decisions on 2026-11-22: the site is a view of the database and never
guesses which authority an annotation belongs to. Each annotation has a
message code, and the build joins it to a message intake stores. Intake
attaches every annotation about a person to the licensing authority and keeps
the person link; the person's page shows it when built, and the authority's
page always does. `NO_PERSONNEL` hides personnel pages only. Say
"annotations", never "notes".

## What existed before this change (`58e8b1f`)

- The authority page appended `RecordDataNotes`, which rendered every
  annotation whose `record_url` was the authority page. That was every
  annotation filed on the `LicensingAuthority` (local data: 58 for Texas,
  mostly `excluded_records`).
- `DataAnnotations` (used by `RecordDataNotes` on every record page and by
  `PersonnelAssignments`) printed `Our warning (excluded_records):`, the JSON
  value, `Source: <namespace> · Record <id>`, and evidence as JSON inside a
  `details` element.
- The authority page already linked to `licensing-authority/data-annotations/`.
  That page listed the annotations filed on the `LicensingAuthority` record,
  50 per page, with type filters and a CSV of all matching annotations.
- `annotationNoteLabel` turned `excluded_records` into "Excluded record" or
  "Excluded duplicate" by matching message text. `84c5cec` removed that,
  because the site no longer matches text.
- The annotation contract defines no link field for evidence, so there is no
  evidence URL to show.

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

## Approaches considered: which annotations an authority's page lists

- Pick the authority from the annotation's source namespace. Rejected by the
  owner (2026-11-22): the site never guesses; removed in `2445cd6`.
- List annotations whose record is the authority, plus annotations intake
  attaches by `data_annotation.licensing_authority_id`. Chosen: both are stored
  facts.
