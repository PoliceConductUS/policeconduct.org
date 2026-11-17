## Context

The current state, administrative-area, and place pages are implemented as three Astro route files:

- `src/pages/[category]/index.astro`
- `src/pages/[category]/[administrativeArea]/index.astro`
- `src/pages/[category]/[administrativeArea]/[place]/index.astro`

They already load location hierarchy from `loadLocationBuildPayloads()`, which reads `public.build_page_payload` rows with `page_type = 'location'`. The payload includes the current jurisdiction, child locations, agency lists for place pages, map bounds, and map points. This is the correct starting point because project routing conventions require database-backed slugs and location paths.

The redesign changes the page purpose: each jurisdiction page should become a civic research entry point for residents and defense attorneys. The page must communicate what records are currently available, provide the next level of local navigation, and label future datasets as not collected yet.

## Goals / Non-Goals

**Goals:**

- Use one shared Civic Index visual system for state, administrative-area, and place landing pages.
- Preserve existing database-backed route parameters, slug conventions, and canonical location paths.
- Show map and table records only one level below the current jurisdiction.
- Add current record coverage counts scoped to the current jurisdiction using existing local database data where available.
- Add obvious action paths for local residents and defense attorneys.
- Add a clearly labeled future-data section for uncollected datasets.
- Keep the design light-mode first, sober, compact, and public-interest oriented.

**Non-Goals:**

- Do not add new civic datasets, migrations, or seed data for future placeholders.
- Do not add state pages that map every agency directly.
- Do not add external map/data network calls beyond the existing map implementation.
- Do not generate slugs, agency IDs, or location identity at runtime.
- Do not introduce rankings, endorsements, or unsupported positive-deviance findings.

## Decisions

### Shared presentation model and component

Create a shared Civic Index presentation model that normalizes the three page levels into a common shape:

- jurisdiction label, level, path, breadcrumbs, and description
- scoped coverage counts
- map points for the next level only
- index rows for the next level only
- persona action groups
- future placeholder tiles

The three existing route files should remain the route owners and pass a level-specific model into shared components. This keeps route behavior explicit while avoiding copied markup.

### Scoped counts from local database joins

Add or extend local data loading so coverage counts are scoped by `location_path` relationships:

- agency counts
- personnel counts
- public report counts
- civil case counts
- coverage/source link counts where an existing reliable source exists

Required fields should be selected directly from expected tables. If expected schema is missing, the build should fail. Optional counts should only be shown when an existing data source is confirmed; they should not be fabricated or silently replaced with "0" because a source was not implemented.

### One-level-down records

Each page level uses a distinct index unit:

- State page rows represent administrative areas/counties.
- Administrative-area page rows represent places.
- Place page rows represent agencies.

The map uses the same one-level-down unit. A state page must not render every agency marker directly.

### Current data and future data separation

The coverage panel is for current collected data only. The "Data not collected yet" section is a separate list of future datasets:

- Use-of-force policy checklist
- Settlement and payout history
- Complaint outcomes
- Civil forfeiture indicators
- Accountability barriers
- Positive-deviance practices

These tiles should state that detailed data is not yet collected. They must not imply that missing data means a jurisdiction has no issues, no records, or unusually good practices.

### Client behavior

The index table should be searchable and sortable with lightweight client-side behavior. The no-JavaScript baseline should still render the full table and links. Sorting must be stable and locale-aware where implementation uses JavaScript sorting helpers.

### Visual direction

Use the mockup as the design reference: thin borders, editorial hierarchy, compact tables, deep red section labels, muted teal icon/accent color, and restrained typography. Avoid nested cards, decorative blobs, gradients, glassmorphism, marketing hero patterns, or sensational copy.

## Risks / Trade-offs

- [Risk] Existing `build_page_payload` may not include all counts needed for table rows. -> Mitigation: add focused aggregate loaders that join through `location_path` and preserve build-failing schema behavior.
- [Risk] Coverage/source link counts may not have one clear existing source. -> Mitigation: include the count only if a reliable local source exists; otherwise document it as unavailable rather than inventing a fallback.
- [Risk] A shared component could become too generic. -> Mitigation: keep route-level model construction explicit and keep the component focused on rendering the Civic Index pattern.
- [Risk] Map tiles currently depend on Leaflet's OpenStreetMap tile URL. -> Mitigation: this change does not expand external data usage; implementation should not add new external network sources.
- [Risk] Placeholder future datasets could be mistaken for negative findings. -> Mitigation: use explicit "not collected yet" copy and avoid evaluative language.

## Migration Plan

1. Add shared Civic Index data/model helpers and rendering components.
2. Update the three existing location route pages to build and render the shared model.
3. Add or update tests for level-specific map/index behavior and scoped counts.
4. Run OpenSpec and site validation.

Rollback is straightforward because the existing route files can be restored to their current layout if the shared pattern creates unexpected build or UX issues. No database migration is planned for this change.

## Open Questions

- Confirm whether a current local coverage/source-link count exists and which table should define it.
- Confirm the best existing destination for "get notified when records change" if no notification subscription route exists.
