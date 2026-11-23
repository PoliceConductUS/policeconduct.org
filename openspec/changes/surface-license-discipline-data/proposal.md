## Why

Intake migrations `20260903000000_authority_license.sql` and
`20260927000001_personnel_discipline_education.sql` added licensing and
discipline tables the website did not read: `license`, `authority_license`,
`license_action`, `licensing_authority`, `discipline` and
`discipline_agency_personnel`. The site was migrated to the renamed tables and
its color-contrast accessibility gaps were fixed, but the new licensing and
discipline data was not shown to the public. This change shows each person's
licenses, license history and discipline on their personnel page.

## What Changes

**Schema migration to the new personnel schema (shipped)**

- From: queries and the schema contract referenced `officers`, `agency_officers`
  (`officer_id`), `civil_case_officers`/`review_officers(_ratings)`/
  `coverage_link_agency_officers` (`agency_officer_id`, `review_officer_id`), and
  the dropped `officers_stats`/`agency_stats`.
- To: `personnel`, `agency_personnel` (`personnel_id`), `civil_case_personnel`,
  `review_personnel(_ratings)`, `coverage_link_agency_personnel`
  (`agency_personnel_id`, `review_personnel_id`); per-personnel report counts are
  computed live from `review_personnel`; the per-personnel `rating` (formerly
  `officers_stats.weighted_average`) has no source in the new schema and renders
  blank. No back-compat SQL aliases.
- Impact: build validates against the migrated DB; no route or URL changes.

**Accessibility (color contrast) (shipped)**

- Secondary/outline control borders (nav "Volunteer" button, masthead search
  input) moved from `--ipc-color-rule-strong` (2.36:1, failed WCAG 1.4.11) to
  `--ipc-color-ink-faint` (5.23:1 on `--ipc-color-paper`, computed from the
  token values in `src/styles/theme.css`). Choropleth gutter/state labels
  darkened from `#6c757d` to `#495057` (7.78:1) so they hold over any state fill.

**Surface licensing data on the personnel page**

- From: the personnel aside shows "License Type: <role>", which is actually the
  assignment role (`agency_personnel.title`), not a license; no license or
  certification history is shown anywhere.
- To: a "Licenses & certification" section (one card per license: type (from
  `authority_license.name`, as stored), status as stored, first-awarded date,
  and, when one is recorded, the issuing authority linked to its page on this
  site) and a single **newest-first vertical timeline** merging every
  `license_action` across all of a person's licenses. The site no longer decides
  which actions to emphasize. Once intake links each action to its type
  (`license_action.license_action_type_id`, intake change
  `supply-site-display-data`), each entry shows the type name and category as
  stored under the visible label "License Action", and entries in the
  `discipline` category are emphasized; until then, no entry is emphasized. The
  status pill is neutral, and green only for a status that intake marks as
  active (not yet supplied; see `design.md` Open Questions). The assignment role
  now shows in a "Role" column of the assignments table, separate from the
  license.
- Impact: user-visible on personnel pages with license records; no new routes.

**Surface discipline**

- Render a discipline section on the personnel page when the person directly
  owns discipline records (`discipline.personnel_id`), as
  `personnel-post-records` requires. Agencies are listed only when explicitly
  linked through `discipline_agency_personnel`. Show an agency-level count of
  discipline records tied to jobs at this agency (explicit links) on the agency
  page.

**Agency roster**

- Each agency personnel roster row shows, in the person's context line (the
  short line of details under each name on the roster, `.roster-meta` in
  `AgencyPersonnelList.astro`), the license tied to that assignment
  (`agency_personnel.license_id`), and no license when there is no link. A row
  whose person owns discipline records shows a count of them from any source (no
  label when the count is zero), the same rule the "With discipline actions"
  filter uses.

**Explicitly out of scope (decided):** no per-license standalone pages and no
license URL segment (one page per license would add 210,417 pages, one per `license` row on
2026-11-18, to about 153,000 personnel pages; the
timeline already lives on the personnel page). `license.id` is opaque and there
is no human license number, so no citeable per-license route is offered. An
agency-page list of explicitly linked discipline records is deferred to a
separate change: its fields and layout are unspecified, and on 2026-11-18 the
local database had 0 `discipline_agency_personnel` rows
(`select count(*) from public.discipline_agency_personnel`).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `personnel-post-records`: license cards, license action timeline, discipline
  section anchor.
- `roster-discipline-filter`: roster discipline counts and the agency discipline
  total.
- `agency-browsing`: roster license per assignment; filter cross-reference. When
  the change is archived, the `agency-browsing` Purpose gains "and show each
  roster row's assignment license".

### Referenced, unchanged

- `state-licensing-authority`: state pages already link to their licensing
  authority's page.

## Impact

- Files (Phase 1, no intake dependency):
  - Modify: `src/lib/data/licensing.ts`, `src/lib/data/agency-detail.ts`,
    `src/components/AgencyPersonnelList.astro`,
    `src/pages/personnel/[slug]/index.astro`,
    `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`,
    `DESIGN.md`, `tests/e2e/agency-discipline.spec.ts`,
    `tests/e2e/personnel-post-data.spec.ts`, `src/lib/data/EGM.md`,
    `src/components/EGM.md`, `src/pages/personnel/[slug]/EGM.md`,
    `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md`.
  - Create: `tests/e2e/personnel-licensing.spec.ts`,
    `tests/e2e/agency-roster-license.spec.ts`.
- Files (Phase 2, after intake ships): Modify
  `scripts/validate-schema-contract.mjs` (`license_action_type`,
  `license_action.license_action_type_id`, and the `discipline_count` columns of
  `site_personnel_count` and `site_agency_count`), `src/lib/data/licensing.ts`,
  `src/lib/data/agency-detail.ts`, `src/components/LicenseTimeline.astro`,
  `src/pages/personnel/[slug]/index.astro`,
  `tests/e2e/personnel-licensing.spec.ts`, `tests/e2e/agency-discipline.spec.ts`,
  `src/lib/data/EGM.md`, `src/components/EGM.md`.
- No new routes or URL changes. Build memory: see `design.md` Risks.
- Intake dependencies (Phase 2), all in the intake change
  `supply-site-display-data`: (1) license action types (`license_action_type`,
  `license_action_text`, `license_action.license_action_type_id`; its tasks
  3.1-3.3); (2) the discipline count columns `site_personnel_count.discipline_count`
  (any source) and `site_agency_count.discipline_count` (explicit links) (its
  task 6.3a). A stored fact that marks a license status as active is not yet in
  any intake change (see `design.md` Open Questions). Phase 1 tasks do not wait
  on them.
- Roster rows change meaning: the license shown comes from the assignment's own
  link (rows without a link show none), and discipline counts include records
  with no agency link.
