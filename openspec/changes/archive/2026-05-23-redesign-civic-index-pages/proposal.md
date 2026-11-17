## Why

State, administrative-area, and place pages currently function mostly as drill-down directories. They should instead help residents and defense attorneys start civic research from a jurisdiction page: understand current record coverage, find the next relevant local record set, and see which datasets are not collected yet.

## What Changes

**Shared Civic Index page pattern**

- From: State, administrative-area, and place pages use similar but separate directory-oriented layouts.
- To: All three page types use one shared Civic Index visual system with editorial title area, current record coverage, one-level-down map, searchable/sortable index table, persona action rail, and future-data placeholders.
- Reason: Jurisdiction pages should be useful research entry points, not just lists.
- Impact: User-visible page redesign; no intended route or URL compatibility break.

**One-level-down map and index behavior**

- From: Location pages show child records in simple lists and maps.
- To: State pages map/index administrative areas, administrative-area pages map/index places, and place pages map/index agencies.
- Reason: The map should reveal the next civic geography layer without overwhelming state pages with every agency directly.
- Impact: User-visible map/index behavior becomes explicit and consistent across page levels.

**Current data vs future placeholders**

- From: Available and unavailable datasets are not presented as a jurisdiction-scoped coverage summary.
- To: Current record coverage uses local database data where available, while future datasets are displayed in a clearly labeled "Data not collected yet" section.
- Reason: Researchers need to know what exists now and what is not yet collected without guessing from missing UI.
- Impact: Adds coverage presentation requirements without adding new collected datasets in this change.

## Capabilities

### New Capabilities

- `civic-index-pages`: Requirements for shared state, administrative-area, and place landing pages as jurisdiction-scoped civic research indexes.

### Modified Capabilities

None.

## Impact

- Affects `/[category]/`, `/[category]/[administrativeArea]/`, and `/[category]/[administrativeArea]/[place]/` location landing pages.
- Affects shared location-page components, styling, client-side table search/sort behavior, and local data loaders for jurisdiction-scoped counts.
- Must preserve database-backed slug, location-path, and agency canonical path conventions.
- Must continue to fail builds when expected required database tables or fields are missing.
- Uses existing local database data only; no external network calls or new dependencies are expected.
- Future placeholder content must not present uncollected data as findings, rankings, or endorsement. Positive-deviance practices remain a future placeholder until evidence-backed data exists.
