# Map arrests by patrol beat

## Why

Visitors need geographic context for arrest beat codes.

## What Changes

Show city-published patrol beat boundaries (PD1/PD2), labeled with beat names and arrest counts, on personnel and agency pages only. Use agency booking aggregates, never sums of personnel profiles. Keep arrests that have no beat in the totals. Maps on city, county, state and federal pages are not part of this change.

The only source with beat data today is the Irving, Texas police arrest records (`gov/irvingtx/arrests`).

Intake places each arrest in a patrol beat by its location, including beats the city marks inactive. A map draws only the beats that have at least one arrest in that map's counts, active or not. When an agency has arrests with no beat, intake attaches a data note to that agency, and the agency page shows it through the existing `RecordDataNotes` component.

A personnel map uses the boundaries of the agency arrest profile that the personnel arrest profile links to. Intake adds the foreign key column `arrest_profile.agency_arrest_profile_id` (owner decision, 2026-11-22). The site reads that link and never matches profiles by source or months (AGENTS.md "The Site Is A View Of The Database").

## Goals

- Show where recorded arrests fall by patrol beat on agency and personnel pages.

## Non-Goals

- Maps on city, county, state or federal pages.
- Plotting individual arrest locations.

## Alternatives Considered

- Third-party tile basemap: rejected; no external network calls (AGENTS.md "Astro + Data Loading").
- Count list only: rejected; it gives no geographic context. The list stays as the no-JavaScript view.
- Server-rendered static SVG: not chosen; the existing Leaflet dependency already gives zoom and pan.
- One same-origin geometry file per agency: deferred unless the page size recorded in verify.md is a problem.
- Plotting arrest points: rejected; private arrest points stay private.

## Risks & Mitigations

- Boundary snapshot differs from the arrest period: the map states it is one snapshot with no dates.
- Label crowding: compact labels with connectors; checked at 1280px and 390px.
- Page size: boundary size measured and recorded in verify.md.
- Inactive beats: arrests inside an inactive beat count for that beat, and only beats with arrests are drawn, so no beat shows a false zero.
- Multi-person bookings: agency map uses the agency aggregate; intake test added.
- Missing link: a personnel profile with `by_arrest_beat` and no `agency_arrest_profile_id` stops the site build with an error that names the profile.
- Small personnel counts: counts shown as recorded, with the total and not-mapped count.
- Missing boundaries: transform and site build stop with an error.

## Impact

Intake acquisition/transform JSON contract and website data loaders/map component. Agency profiles require reacquisition and transformation to include boundaries. Intake adds one migration: the nullable foreign key column `arrest_profile.agency_arrest_profile_id` referencing `public.agency_arrest_profile(id)`, set by the transform. No new tables, durable IDs or dependencies. Private arrest points and booking identifiers remain private.

Ownership: intake owns the boundary and count contract ("Published patrol beat boundaries") in intake `openspec/changes/map-arrests-by-beat/`. This folder owns the website maps.

Landing order: the intake acquisition and transform code is already on intake `main`. Before the website change merges, Irving (`gov/irvingtx/arrests`) must be reacquired, transformed and imported in every database the site builds against. Any profile that has `by_arrest_beat` while its linked agency profile lacks `arrest_beat_boundaries` makes the site build fail, by design.

A separate code change is removing the site-side matching (by source and months) from `src/lib/data/arrest-profiles.ts` now. Until intake ships the `agency_arrest_profile_id` column and data, personnel pages have no agency comparison, so they show no beat map. Agency maps use the agency's own profile and are not affected. When the column ships, the site loader joins on it (tasks.md 3.7).

Shares the link with `openspec/changes/show-neighborhood-income/`: both read `arrest_profile.agency_arrest_profile_id` through `src/lib/data/arrest-profiles.ts`. Both changes are in the same branch; they merge together or show-neighborhood-income merges first.
