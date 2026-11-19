# Map arrests by patrol beat

## Why

Visitors need geographic context for arrest beat codes.

## What Changes

Show city-published patrol beat boundaries (PD1/PD2), labeled with beat names and arrest counts, on personnel and agency pages only. Use agency booking aggregates, never sums of personnel profiles. Keep arrests that have no beat in the totals. Maps on city, county, state and federal pages are not part of this change.

The only source with beat data today is the Irving, Texas police arrest records (`gov/irvingtx/arrests`).

Intake places each arrest in a patrol beat by its location, including beats the city marks inactive. A map draws only the beats that have at least one arrest in that map's counts, active or not. When an agency has arrests with no beat, intake attaches a data note to that agency, and the agency page shows it through the existing `RecordDataNotes` component.

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
- Small personnel counts: counts shown as recorded, with the total and not-mapped count.
- Missing boundaries: transform and site build stop with an error.

## Impact

Intake acquisition/transform JSON contract and website data loaders/map component. Agency profiles require reacquisition and transformation to include boundaries. No new tables, migrations, durable IDs or dependencies. Private arrest points and booking identifiers remain private.

Ownership: intake owns the boundary and count contract ("Published patrol beat boundaries") in intake `openspec/changes/map-arrests-by-beat/`. This folder owns the website maps.

Landing order: the intake acquisition and transform code is already on intake `main`. Before the website change merges, Irving (`gov/irvingtx/arrests`) must be reacquired, transformed and imported in every database the site builds against. Any profile that has `by_arrest_beat` while its agency profile lacks `arrest_beat_boundaries` makes the site build fail, by design.

Depends on `openspec/changes/show-neighborhood-income/`, which adds the shared agency-profile matching in `src/lib/data/arrest-profiles.ts`. Both changes are in the same branch; they merge together or show-neighborhood-income merges first.
