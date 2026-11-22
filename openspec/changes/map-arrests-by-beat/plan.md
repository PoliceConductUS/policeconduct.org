# Arrest beat maps implementation plan

**Goal:** Named beat maps on personnel and agency pages only.
**Architecture:** Acquisition emits sanitized city-published boundaries; transform writes them once per agency profile. Personnel maps use that agency boundary evidence with their own counts. One map component provides persistent labels and accessible counts. See `design.md`.
**Tech Stack:** TypeScript, Astro, existing Leaflet, PostgreSQL JSON.
**Spec:** specs/arrest-beat-maps/spec.md, specs/arrest-records/spec.md

## Global constraints

No private arrest points or identifiers in public output. No new dependencies or fallback contracts. Personnel maps find their agency profile only through `arrest_profile.agency_arrest_profile_id`; no matching by source or months. Keep provenance in `coverage.provenance` and keep unmapped totals. No maps on city, county, state or federal pages; no reset. No basemap: the map draws polygons on a plain background because pages make no calls to other sites.

## Review focus

Duplicate/missing boundaries; numeric beat names; multi-person bookings; unmapped arrests; inactive beats with arrests; no-JavaScript/mobile rendering.

## Files

Website (this repository):

- Create `src/lib/data/arrest-beats.ts`, `src/components/ArrestBeatMap.astro`, `tests/e2e/arrest-beat-map.spec.ts`.
- Modify `src/lib/data/arrest-profiles.ts`, `src/components/PersonnelArrestProfiles.astro`, `src/pages/personnel/[slug]/index.astro`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`, `tests/e2e/agency-arrest-profiles.spec.ts`, `tests/e2e/personnel-arrest-profiles.spec.ts`. Follow-up tasks also modify `src/components/EGM.md` and `src/lib/data/EGM.md`.
- Modify `openspec/specs/arrest-records/spec.md` (restore, see tasks.md 3.6).

Intake (already on intake `main`; follow-up edits listed in tasks.md section 2): `sources/gov/irvingtx/arrests/beats.ts`, `enrichment.ts`, `acquire.ts`, `transform.ts`, `arrest.ts`, `test/sources/gov.irvingtx.arrests/transform.test.ts`, and a new migration adding `arrest_profile.agency_arrest_profile_id` (task 2.7).

Website follow-up also modifies `scripts/validate-schema-contract.mjs` (task 3.7).

## Tasks

See `tasks.md`.
