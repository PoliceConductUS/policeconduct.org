# Arrest beat maps implementation plan

- **Goal:** Named beat maps on personnel and agency pages only.
- **Architecture:** Intake stores arrest records, official beat polygons (`police_beat`) and the count views `arrest_coverage` and `arrest_breakdown` (intake change `import-arrest-records`). The site reads the agency scope for agency maps and one `agency_personnel` scope per personnel map, joins each beat row to its `police_beat` row through the recorded beat reference, and renders one map component with persistent labels and a count list readable without JavaScript. See `design.md`.
- **Tech Stack:** TypeScript, Astro, existing Leaflet, PostgreSQL.
- **Spec:** specs/arrest-beat-maps/spec.md, specs/arrest-records/spec.md

## Global constraints

The website build reads arrest data only through `arrest_coverage`, `arrest_breakdown`, `police_beat` and the arrest annotations (intake `import-arrest-records` D7); publishing any other arrest-record field needs its own OpenSpec change. No new dependencies and no fallback values for missing data. The site follows recorded relationships only; no matching by source, months, names or codes, and no new arrest foreign key column. Keep not-mapped arrests in the totals. No maps on city, county, state or federal pages. No `data reset` or `supabase db reset` of the shared database without the check in tasks.md 4.1. No basemap: the map draws polygons on a plain background because pages make no calls to other sites.

## Review focus

Missing boundaries; numeric beat names; multi-person bookings; unmapped arrests; inactive beats with arrests; no-JavaScript/mobile rendering.

## Files

Website (this repository):

- Create `src/lib/data/arrest-beats.ts`, `src/components/ArrestBeatMap.astro`, `tests/e2e/arrest-beat-map.spec.ts`.
- Modify `src/lib/data/arrest-profiles.ts`, `src/components/PersonnelArrestProfiles.astro`, `src/pages/personnel/[slug]/index.astro`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`, `tests/e2e/agency-arrest-profiles.spec.ts`, `tests/e2e/personnel-arrest-profiles.spec.ts`. Follow-up tasks also modify `src/components/EGM.md`, `src/lib/data/EGM.md`, `src/pages/personnel/[slug]/EGM.md`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/EGM.md` and `scripts/validate-schema-contract.mjs`.
- Modify `openspec/specs/arrest-records/spec.md` (restore, see tasks.md 3.6).

Intake (intake repo, change `import-arrest-records`; see tasks.md section 2): the arrest tables and views, `police_beat`, beat placement in `sources/gov/irvingtx/arrests/enrichment.ts`, the agency annotation, and the transform test.

## Tasks

See `tasks.md`.
