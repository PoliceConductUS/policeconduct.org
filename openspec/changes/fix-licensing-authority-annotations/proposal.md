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
- Labels follow the annotation's type: "Warning", "Data error" or
  "Correction". No label says "ours", because every annotation is the site's
  own.
- The message is the one intake stores for the annotation's message code, shown
  unchanged. Intake writes each message so it says what is wrong and with which
  value.
- Public labels say "annotations", not "notes".
- The licensing authority page stops listing its annotations. Its existing
  link leads to the `licensing-authority/data-annotations/` page, which lists
  them 50 per page with type filters and a CSV.
- Annotations whose record is a licensing authority, or one of its authority
  licenses, link to that `licensing-authority/data-annotations/` page.
- An authority's data-annotations page lists the annotations whose record is
  that authority and, once intake stores it, every annotation whose
  `licensing_authority_id` names that authority, including annotations about a
  person. The site never picks an authority from a source namespace.
- `NO_PERSONNEL` hides personnel pages only; annotations about a person stay
  listed, without a link to the page that is not built.
- The data-annotations listings and their CSV keep the field, value,
  replacement, source, record ID and evidence. No route or CSV-column change.
  No positive-deviance or public-trust claim.
- This drops approved requirements that record pages show the reported value,
  the source record ID, evidence and correction values.

## Capabilities

### Modified Capabilities

- `public-data-annotations`: record pages show annotation label and message
  only; labels follow the type and messages come from message codes;
  annotations whose record is a licensing authority link to, and are listed
  on, its data-annotations page; an authority's page also lists annotations
  intake attaches to it by `licensing_authority_id`; records with no built
  page have no link; `NO_PERSONNEL` hides personnel pages only.
- `entity-page-chrome`: the "Homepage clearly identifies independent
  ownership" requirement is removed (moved).
- `home-introduction-video`: the same requirement is added, text unchanged.

## Impact

policeconduct.org, by task:

- `src/components/DataAnnotations.astro`,
  `src/pages/[category]/licensing-authority/index.astro` (2.2, 3.2, 2.5).
- `src/lib/data/annotation-values.js` (2.3, 3.4, 6.1).
- `src/lib/data/data-annotations.ts` (2.4, 3.3, 3.4, 6.2, 6.3, 6.4).
- `src/lib/data/annotation-views.ts` (6.3).
- `src/layouts/SiteLayout.astro`, `src/components/RecordDataNotes.astro`,
  `src/components/DataAnnotationIndex.astro`,
  `src/pages/[category]/licensing-authority/data-annotations/[...parts].astro`
  (2.5).
- `src/lib/data/annotation-contract.json` (6.4).
- `scripts/analytics-config.mjs`, `scripts/analytics-config.test.mjs`,
  `docs/analytics-config.md` (6.5).
- `README.md` (6.6).
- `openspec/specs/entity-page-chrome/spec.md`,
  `openspec/specs/home-introduction-video/spec.md`, through this change's
  deltas (6.7).
- `EGM.md` files beside each changed source file (2.3, 2.5, 3.4).
- `tests/unit/data-annotations.test.mjs`, `tests/e2e/data-annotations.spec.ts`
  (sections 2, 3 and 6).

intake:

- `openspec/changes/supply-site-display-data`: message codes (tasks 4.1-4.3)
  and `data_annotation.licensing_authority_id` (tasks 4a.1-4a.2). Tasks 2.4,
  3.4 and 6.4 wait on them.
- `scripts/publish-data-annotation-contract.ts` (6.4, read only).
- `openspec/changes/publish-source-data-annotations/` (6.8).

section1983.org: read only (5.1).

This change modifies `openspec/specs/public-data-annotations/spec.md`,
accepted when `publish-source-data-annotations` was archived as
`2026-11-18-publish-source-data-annotations`. Section 5 of `tasks.md` closes
two INS-121 tasks carried over from that change (Analytics pull/push on both
sites, and INS-121 validation); they add no behavior. Section 6 carries
forward the code work from the round-1 review of
`publish-source-data-annotations`, whose fixes were applied to the main specs
in `openspec/specs/`.
