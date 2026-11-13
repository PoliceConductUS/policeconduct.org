# Location-centric build projections

Build projections prepare display data for static pages so the website can reuse geographic counts and relationships during generation.

## Ownership and refresh

Intake owns schema, migrations, and data loading. See [Local Database](../README.md#local-database).

The website refreshes derived data with `scripts/refresh-build-projections.mjs`. `npm run build` runs schema validation and projection refresh before Astro generates pages. `npm run refresh:build-projections` runs the refresh separately against the configured database.

Agency location relationships and their referenced `location_path` rows must already exist. Refresh fails when required location data is missing; it does not create agency location identity from parallel address fields.

## Stored projections

- `public.location_path` holds exact geographic paths, display names, levels, and parent relationships.
- `public.location_path_closure` records ancestor/descendant relationships and depth for geographic rollups.
- `public.build_page_payload` stores location, agency, and report-summary display payloads, keyed by path. Rows include entity identity, a content hash, and update metadata.
- Refresh also rebuilds `public.agency_zip_index` from official-address ZIP values.

The refresh runs in a transaction. It rebuilds the derived rows and commits them together, or rolls back on failure.

Location payloads contain child locations or agencies, record counts, and available map coordinates and bounds. Agency payloads contain agency identity, address, and location display fields. Report-summary payloads contain the report's stored slug, incident date, location, and related personnel.

## Routes and loaders

Agency location identity comes from `public.agency.location_path_id` joined to `public.location_path`. Agency slugs are stored, required, and globally unique.

Projections supply route enumeration and display data. Page rendering must resolve the required entity from the exact database-backed path and stored slug. Route props and projection convenience fields do not replace that lookup.

The current URL shapes are documented in [Public URL Design](0006-url-design.md). Report URLs use the stored incident location, incident date, and report slug.

`src/lib/data/build-payloads.ts` loads location and report-summary payloads. Entity-specific loaders under `src/lib/data/` load agency, personnel, civil-case, and report data.

## Collections

Supported collections define their page sizes and sorting in their loaders and route pages. Paginated URLs use `/page/{number}/`; page 1 uses the collection root. Civil cases use `/civil-cases/` and `/civil-cases/page/{number}/`. The top-level personnel collection is not paginated.

Geographic pages use the browse links, metric links, and jump controls in `src/components/CivicIndexPage.astro`.

## Verification

`npm run validate:schema` checks the required database contract. `npm run validate` runs the repository's full validation chain. Build and redirect-generation commands are defined in `package.json`.
