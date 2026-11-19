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

**Schema migration to the new personnel schema**

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

**Accessibility (color contrast)**

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
  `authority_license.name`), status with letter case merged, first-awarded date,
  issuing authority linked to its page on this site) and a single
  **newest-first vertical timeline** merging every `license_action` across all of
  a person's licenses. Which actions are emphasized comes from an explicit table
  of all recorded license-action values that intake owns; intake fails on an
  unknown value. Emphasized entries show the visible label "License Action". The
  status pill is green only for "Active" and neutral for every other status. The
  assignment role now shows in a "Role" column of the assignments table,
  separate from the license.
- Impact: user-visible on personnel pages with license records; no new routes.

**Surface discipline**

- Render a discipline section on the personnel page when the person directly
  owns discipline records (`discipline.personnel_id`), as
  `personnel-post-records` requires. Agencies are listed only when explicitly
  linked through `discipline_agency_personnel`. Show an agency-level count of
  explicitly linked discipline on the agency page.

**Agency roster**

- Each agency personnel roster row shows, in the person's context line, the
  license tied to that assignment (`agency_personnel.license_id`), and no license
  when there is no link. Each row also shows a count of the person's discipline
  records from any source, the same rule the "With discipline actions" filter
  uses. State pages already link to their licensing authority's page through
  `state-licensing-authority`.

**Explicitly out of scope (decided):** no per-license standalone pages and no
license URL segment (one page per license would roughly double the build; the
timeline already lives on the personnel page). `license.id` is opaque and there
is no human license number, so no citeable per-license route is offered. An
agency-page list of explicitly linked discipline records is deferred to a
separate change: its fields and layout are unspecified, and no linked records
exist today.

## Capabilities

- Modified: `personnel-post-records` (license cards, license action timeline,
  discipline section anchor); `roster-discipline-filter` (roster discipline
  counts and agency discipline total); `agency-browsing` (roster license per
  assignment, filter cross-reference). Referenced, unchanged:
  `state-licensing-authority`.

## Impact

- Code: `src/lib/data/licensing.ts`, `src/lib/data/agency-detail.ts`,
  `src/components/LicenseTimeline.astro`,
  `src/components/PersonnelDiscipline.astro`,
  `src/components/AgencyPersonnelList.astro`,
  `src/components/PersonnelAssignments.astro`,
  `src/pages/personnel/[slug]/index.astro`,
  `scripts/validate-schema-contract.mjs`, `DESIGN.md`. No new routes or URL
  changes. Build memory rises from preloading licensing data.
- Intake dependency: the explicit license-action table and its unknown-value
  failure are built in the intake repo, not here.
- Roster rows change meaning: the license shown comes from the assignment's own
  link (rows without a link show none), and discipline counts include records
  with no agency link.
