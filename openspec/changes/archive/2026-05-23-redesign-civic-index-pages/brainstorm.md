## Design Summary

Redesign the state, administrative-area, and place landing pages as a shared Civic Index page pattern. The current pages are useful as location drill-down directories, but they do not yet frame a jurisdiction as a civic research entry point for residents and defense attorneys. The new pattern should keep the database-backed location hierarchy and routes intact while making record coverage, next actions, one-level-down geography, and future data gaps visible on every jurisdiction page.

The design reference is the provided light-mode mockup at `/Users/dalelotts/Library/CloudStorage/GoogleDrive-dale@dalelotts.com/My Drive/police-conduct/civil-index-page.png`. The shared visual system should be sober, compact, editorial, and public-interest oriented: thin rules, clear table structure, restrained deep red and muted teal accents, no hero hype, no gradients, no glassmorphism, no nested cards, and no sensational language.

The page pattern should serve two primary personas:

- Local residents who need to find their local agency, share an interaction, or get notified when records change.
- Defense attorneys who need to check personnel history, review civil litigation, or submit missing source records.

Each page must show only the next level down on its map and index:

- State pages show administrative areas/counties.
- Administrative-area pages show places.
- Place pages show agencies.

Current data should drive the implementation where available: location hierarchy from `build_page_payload` / `location_path`, agency counts, agency names and canonical paths, agency addresses and map coordinates, personnel counts, public report counts, civil case counts, and coverage/source link counts if available. Future datasets must be explicitly labeled as "Data not collected yet" rather than implied by blank or silently missing fields.

## Alternatives Considered

### Approach A: Shared Civic Index component backed by enriched location payloads

- **Approach**: Build one shared Civic Index presentation model and component used by the state, administrative-area, and place route pages. Add scoped count loading that joins through the existing database-backed `location_path` relationships and keeps required schema failures explicit.
- **Pros**:
  - Creates one visual system for all jurisdiction pages.
  - Keeps existing routes, slugs, and location-path conventions intact.
  - Makes one-level-down map/index behavior explicit and testable.
  - Separates current data from future placeholder datasets.
- **Cons**:
  - Requires careful query design to aggregate counts at each jurisdiction level.
  - Requires route pages to shift from bespoke markup to a shared presentation model.
- **Why adopted**: This best matches the request for a shared page pattern while preserving the current database contract.

### Approach B: Restyle each existing route independently

- **Approach**: Update the three existing Astro route files with similar markup and styling while leaving data loading mostly as-is.
- **Pros**:
  - Smaller first edit.
  - Lower abstraction overhead.
- **Cons**:
  - Repeats the same page structure in three places.
  - Makes future changes to the Civic Index system harder to keep consistent.
  - Risks drift in persona actions, placeholder labels, and coverage count behavior.
- **Why not adopted**: It does not satisfy the shared visual system goal as cleanly and would make consistency harder to preserve.

### Approach C: Full new civic data model before redesign

- **Approach**: Add schema for all desired datasets first, then redesign pages around a richer civic index record model.
- **Pros**:
  - Could eventually support deeper jurisdiction research.
  - Avoids placeholder UI for future data.
- **Cons**:
  - Much larger scope than the request.
  - Requires data collection, migrations, seed work, and editorial rules that are not yet defined.
  - Delays the immediately useful research-entry page pattern.
- **Why not adopted**: The request explicitly asks to separate current-data implementation from future collection placeholders.

## Agreed Approach

Adopt Approach A: create a shared Civic Index pattern that the state, administrative-area, and place pages use with level-specific data. The implementation should enrich or supplement the current `LocationPagePayload` data with jurisdiction-scoped counts and row records without changing route semantics or generating slugs at runtime.

The shared pattern should include:

- Breadcrumbs and editorial title area scoped to the current jurisdiction.
- Current record coverage panel with available scoped counts.
- One-level-down map using only the next child level for that page type.
- Searchable and sortable index table below the map.
- Persona action rail for residents and defense attorneys.
- "Data not collected yet" section for the six named future datasets.

## Key Decisions

- Preserve the existing `/[category]/`, `/[category]/[administrativeArea]/`, and `/[category]/[administrativeArea]/[place]/` routes.
- Use `build_page_payload` / `location_path` as the source of location hierarchy and canonical location paths.
- Use agency canonical paths from the existing database-backed payload or existing agency loaders; do not derive agency routes from parallel columns.
- Keep missing required database schema as build-failing behavior; do not add silent fallbacks for expected required fields.
- Use current local database data only; do not add external network calls.
- Label unavailable future datasets clearly as not yet collected.
- Treat positive-deviance practices as a future dataset placeholder only until evidence-backed data and editorial rules exist.

## Open Questions

- The exact source-link count field may need discovery during implementation. If no existing coverage/source-link count exists, the panel should omit that current-data count or mark only the future dataset as not collected; it must not fabricate a number.
- Notification behavior may already have a target route or may need to link to an existing contact/help path until a dedicated subscription flow exists. Implementation should use existing routes only unless a separate change adds notification intake behavior.
