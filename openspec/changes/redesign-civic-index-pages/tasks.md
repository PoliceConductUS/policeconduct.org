## 1. Data Model and Loading

- [x] 1.1 Inspect existing `build_page_payload`, `location_path`, agency, personnel, report, civil case, and coverage/source-link data sources for the fields needed by Civic Index pages.

  Audit note: the required `rg` commands could not inspect `supabase/` because that directory is absent from this worktree. Local schema-contract and data-loader references confirm `coverage_links`, `coverage_link_agency_officers`, `coverage_link_reports`, and `coverage_link_civil_cases` exist, but current local code only loads links for specific agency/officer/report/civil-case profiles. No reliable jurisdiction-scoped source-link count is available for the first Civic Index implementation, so the initial coverage model should omit a `source_links` metric until scoped aggregate loading is deliberately added.

- [x] 1.2 Define a minimal shared Civic Index presentation type for jurisdiction metadata, breadcrumbs, coverage counts, one-level-down map points, table rows, persona actions, and future placeholders.
- [x] 1.3 Implement scoped aggregate loading for agency, personnel, public report, and civil case counts using local database joins through `location_path`.
- [x] 1.4 Ensure missing required tables or fields continue to fail the build, and do not add silent schema guards for required current-data fields.

## 2. Shared Page Pattern

- [x] 2.1 Build shared Civic Index rendering components for the editorial title area, current record coverage panel, action rail, map/index section, and future-data placeholder section.
- [x] 2.2 Keep the visual system aligned with the mockup: light-mode first, thin rules, compact tables, restrained deep red and muted teal accents, and no marketing-style decoration.
- [x] 2.3 Add no-JavaScript baseline markup for the full index table and links.
- [x] 2.4 Add lightweight client-side search and stable sorting for the index table.

## 3. Route Integration

- [x] 3.1 Update the state route to render the shared Civic Index pattern with administrative-area/county map points and table rows only.
- [x] 3.2 Update the administrative-area route to render the shared Civic Index pattern with place map points and table rows only.
- [x] 3.3 Update the place route to render the shared Civic Index pattern with agency map points and table rows only.
- [x] 3.4 Verify all route params and links continue to come from database-backed location paths or agency canonical paths, with no runtime slug generation from names.

## 4. Current and Future Data Presentation

- [x] 4.1 Populate the current record coverage panel with available scoped counts and omit any optional count that lacks a reliable existing local source.
- [x] 4.2 Add resident action links for finding a local agency, sharing an interaction, and getting notified when records change using existing approved routes.
- [x] 4.3 Add defense attorney action links for personnel history, civil litigation, and missing source record submission using existing approved routes.
- [x] 4.4 Add the "Data not collected yet" section for use-of-force policy checklist, settlement and payout history, complaint outcomes, civil forfeiture indicators, accountability barriers, and positive-deviance practices.
- [x] 4.5 Ensure future placeholders do not imply missing records are findings, rankings, praise, or endorsements.

## 5. Verification

- [x] 5.1 Add or update tests for state, administrative-area, and place one-level-down map/index behavior.
- [x] 5.2 Add or update tests for scoped coverage counts and database-backed canonical links.
- [ ] 5.3 Run `npm run validate:openspec`.
- [ ] 5.4 Run `npx openspec status --change redesign-civic-index-pages`.
- [ ] 5.5 Run relevant site validation, including `npm run validate` before claiming implementation complete.
