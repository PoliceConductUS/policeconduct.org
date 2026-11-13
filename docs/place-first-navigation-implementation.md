# Place-First Navigation Implementation Notes

## Current Route Map

- State/territory rollup: `/{state-or-territory}/`
- County-equivalent rollup: `/{state-or-territory}/{county-equivalent}/`
- Place rollup: `/{state-or-territory}/{county-equivalent}/{place}/`
- Canonical agency page: `/{state-or-territory}/{county-equivalent}/{place}/{agency-slug}/`
- Canonical personnel page: `/personnel/{personnel-slug}/`
- Canonical civil case page: `/civil-cases/{case-slug}/`
- Canonical report page: `/{state-or-territory}/{county-equivalent}/{place}/reports/{year}/{month}/{day}/{report-slug}/`

The top-level personnel collection is not paginated. Civil cases use `/civil-cases/` for page 1 and `/civil-cases/page/{number}/` for later pages. State-scoped personnel and civil-litigation collection URLs are retired and redirect to the matching state page.

Videos are not top-level entities. Coverage and media links appear only where attached to existing agency, personnel, incident, civil-case, or related records.

## Data Enrichment

Agency geographic navigation resolves `public.agency.location_path_id` joined to `public.location_path`. Address fields are enrichment inputs, not parallel sources of route identity. Pages reload the agency using the exact stored location path and `agency.slug`; missing or mismatched identity fails the build.

Schema, migrations, and data loading belong to the intake repository; see [Local Database](../README.md#local-database).

The build uses these existing tables:

- `location_path`
- `location_path_closure`
- `build_page_payload`
- `agency_zip_index`

Agency canonical URLs are not stored on `public.agency`. Projection refresh requires agencies to have valid location links before it runs. The canonical agency path uses the joined `location_path.path` and persisted `agency.slug`.

This geography describes an agency's address, not its jurisdiction or service area.

## Navigation

The masthead has search plus these links:

- News
- Donate
- Share an experience
- Volunteer

Search submits to `/find-records/`, which offers place and agency lookup. Geographic pages provide child-location and agency browse links, with metric links and jump controls where available. Readers can follow state/territory, county-equivalent, place, and agency links through the stored geographic hierarchy.

## Unsupported Questions

The UI must not answer or imply answers to:

- Who polices here?
- Which agencies operate here?
- Which agencies have legal jurisdiction here?
- Which agency should respond to a call here?
- Which agencies cover this ZIP?
- What is the full service area?

## Redirect generation

`scripts/generate-redirect-map.mjs` writes `dist/_redirect-map.json` during the build. Agency destinations use the agency's joined location path and stored slug. Report destinations use the report's joined location path, incident date, and stored slug.

See [Workspace redirects](workspace-redirects.md) for generation commands and workspace-owned mappings.
