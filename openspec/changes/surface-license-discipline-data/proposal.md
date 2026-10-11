## Why

The intake schema (`redesign-config-driven-intake`) — the schema of record for
this branch — renamed the officer tables to personnel, dropped the denormalized
`*_stats` tables, and added five populated tables the website does not yet read:
`license` (163,612 rows — one per personnel, 100% coverage), `license_action`
(188,036 rows), `licensing_authority` (2 rows: TCOLE, MN POST), `discipline`
(76 rows), and `discipline_agency_personnel` (83 rows). The site was migrated to
the renamed tables and its color-contrast accessibility gaps were fixed, but the
new licensing and discipline data is still invisible to the public. Surfacing it
turns each personnel page from a role/assignment stub into a real certification
record.

## What Changes

**Schema migration to the new personnel schema — DONE**

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

**Accessibility (color contrast) — DONE**

- Secondary/outline control borders (nav "Volunteer" button, masthead search
  input) moved from `--ipc-color-rule-strong` (2.36:1, failed WCAG 1.4.11) to
  `--ipc-color-ink-faint` (~5:1). Choropleth gutter/state labels darkened from
  `#6c757d` to `#495057` (7.78:1) so they hold over any state fill.

**Surface licensing data on the personnel page — INCOMPLETE (new scope)**

- From: the personnel aside shows "License Type: <role>", which is actually the
  assignment role (`agency_personnel.title`), not a license; no license or
  certification history is shown anywhere.
- To: a "Licenses & certification" section (one card per license: normalized
  type, normalized status, first-awarded date, issuing-authority badge) and a
  single **newest-first vertical timeline** merging every `license_action` across
  all of a person's licenses (~15% hold multiple), with adverse actions
  (reprimands, holds, noncompliance, revocations) visually emphasized over
  routine "Granted". The mislabeled aside field is relabeled "Role".
- Impact: user-visible on ~100% of personnel pages; no new routes.

**Surface discipline — INCOMPLETE (new scope)**

- Render a discipline section on the personnel page only when present (~76
  people): action, effective/expiration dates, case number, attributed agency
  (via `discipline_agency_personnel → agency_personnel`). Show an agency-level
  discipline count on the agency page.

**Agency roster + licensing authority — INCOMPLETE (new scope)**

- Agency personnel roster gains a license status/type column. State pages link
  their licensing authority (TCOLE → `/tx/`, MN POST → `/mn/`) to the authority
  website.

**Explicitly out of scope (decided):** no per-license standalone pages and no
license URL segment (would add ~163k pages, roughly doubling the build; the
timeline already lives on the personnel page). `license.id` is opaque and there
is no human license number, so no citeable per-license route is offered.
