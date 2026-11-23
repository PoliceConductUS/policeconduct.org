# Map arrests by patrol beat

## Why

Visitors need geographic context for arrest beat codes.

## What Changes

Show city-published patrol beat boundaries (the city's two patrol battalions, coded PD1 and PD2), labeled with beat names and arrest counts, on personnel and agency pages only. Agency maps use the agency's own arrest counts (every booking of the agency, counted once), never sums of personnel counts. Keep arrests that have no beat in the totals. Maps on city, county, state and federal pages are not part of this change.

The only source with beat data today is the Irving, Texas police arrest records (`gov/irvingtx/arrests`).

The data comes from the intake change `import-arrest-records` (owner decisions, 2026-11-22: complete import of the arrest records, tables named for what they are, no new arrest foreign key column). That change drops `arrest_profile` and `agency_arrest_profile` and adds:

- `police_beat`: one row per official beat polygon (`agency_id`, `code`, `name`, `geometry`).
- `arrest.police_beat_id`: the beat that intake places each arrest in, by its location.
- The views `arrest_coverage` and `arrest_breakdown`: counts per agency and per `agency_personnel`, with an arrest-beat dimension.

Intake places each arrest in a patrol beat by its location, including beats the city marks inactive (owner decision Q34). A map draws exactly the beats that appear in its `arrest_breakdown` beat rows, each with its `police_beat` boundary. A grouped view has no rows for beats with no arrests, so the site filters nothing. When arrests have no beat, intake records an annotation on the agency (owner decision Q34), and the agency page shows it through the existing `RecordDataNotes` component.

A personnel map shows one `agency_personnel` row's counts (one agency assignment). Its boundaries come from the `police_beat` rows that the breakdown rows name. The site follows recorded relationships only and never matches records by source, months, names or codes (AGENTS.md "The Site Is A View Of The Database").

## Goals

- Show where recorded arrests fall by patrol beat on agency and personnel pages.

## Non-Goals

- Maps on city, county, state or federal pages.
- Plotting individual arrest locations.
- Showing any other arrest-record field. The website build reads arrest data only through `arrest_coverage`, `arrest_breakdown`, `police_beat` and the arrest annotations (intake `import-arrest-records` design D7).

## Alternatives Considered

- Third-party tile basemap: rejected; no external network calls (AGENTS.md "Astro + Data Loading").
- Count list only: rejected; it gives no geographic context. The list stays as the no-JavaScript view.
- Server-rendered static SVG: not chosen; the existing Leaflet dependency already gives zoom and pan.
- One same-origin geometry file per agency: deferred unless the page size recorded in verify.md is a problem.
- Plotting arrest points: not part of this change. Arrest records are public by law, but this change shows counts by beat only. Publishing arrest locations or other record fields needs its own OpenSpec change (intake `import-arrest-records` D7).
- Site matches a personnel profile to an agency profile by source and months: rejected; the site never infers a relationship (AGENTS.md "The Site Is A View Of The Database").
- A foreign key column `arrest_profile.agency_arrest_profile_id`: withdrawn. The owner replaced arrest profiles with arrest records and asked for no new arrest foreign key column (2026-11-22).

## Risks & Mitigations

- Boundary snapshot differs from the arrest period: the map states it is one snapshot with no dates.
- Label crowding: compact labels with connectors; three labels checked at 1280px and 390px; the full Irving map is checked in tasks.md 4.5.
- Page size: boundary size to be measured and recorded in verify.md (tasks.md 4.7).
- Inactive beats: after intake places arrests in inactive beats (tasks.md 2.1), an inactive beat with arrests is drawn with its count, and no beat shows a false zero.
- Overlapping beats: an arrest inside both an inactive and an active polygon cannot be placed and counts as not mapped; tasks.md 4.7 measures how often.
- Multi-person bookings: the agency map uses the agency scope of `arrest_coverage` and `arrest_breakdown`; intake test planned (tasks.md 2.1).
- Small personnel counts: counts shown as recorded, with the total and not-mapped count.
- Missing or inconsistent data: the site build stops with an error when beat counts plus the not-mapped count differ from the total, when a beat count is below 1, or when a beat row has no `police_beat` boundary (tasks.md 3.1, 3.2).

## Impact

Website data loaders, the map component and the personnel and agency pages. The website reads the intake views and tables above instead of `arrest_profile.breakdowns` and `agency_arrest_profile`. No new tables, IDs or dependencies in the website.

Ownership: intake owns the arrest tables, views, beat placement and annotations in the intake change `import-arrest-records`. The intake change folder `openspec/changes/map-arrests-by-beat/` held the old JSON boundary contract (`breakdowns.arrest_beat_boundaries`), which `import-arrest-records` replaces (tasks.md 2.2). This folder owns the website maps.

Landing order: `import-arrest-records` must be on intake `main` and loaded into the database `DATABASE_URL` names for the build (tasks.md 5.1) before the website change merges. Until then the site reads the old tables.

A separate code change already removed the site-side matching (by source and months) from `src/lib/data/arrest-profiles.ts`. Today personnel pages show no beat map; agency maps use the agency's own row. Tasks 3.2 and 3.7 move both to the new views.

This change modifies only "Agency arrest display is deferred" in `arrest-records`; `show-neighborhood-income` owns "Personnel profiles preserve current import count units", including the beat-map sentence. That change still names `arrest_profile.agency_arrest_profile_id` and must move to the new views too (tasks.md 3.8).
