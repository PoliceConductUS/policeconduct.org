# Place-First Navigation Implementation Notes

## Current Route Map

- State/territory rollup: `/{state-or-territory}/`
- County-equivalent rollup: `/{state-or-territory}/{county-equivalent}/`
- Place rollup: `/{state-or-territory}/{county-equivalent}/{place}/`
- Canonical agency page: `/{state-or-territory}/{county-equivalent}/{place}/{agency-slug}/`
- Canonical personnel page: `/personnel/{personnel-slug}/`
- Canonical civil case page: `/civil-cases/{case-slug}/`

Top-level personnel and civil-case collection routes are not paginated. State-scoped personnel and civil-litigation collection URLs are retired and redirect to the matching state page.

Videos are not top-level entities. Coverage and media links appear only where attached to existing agency, personnel, incident, civil-case, or related records.

## Data Enrichment

Agency geographic navigation is based on address fields only:

- `state`
- `administrative_area`
- `administrative_area_slug`
- `city`
- `place_slug`
- `slug`

The Supabase migration `20260509120000_add_agency_place_navigation_fields.sql` adds the new agency fields and deterministically populates them with named counties, parishes, boroughs, districts, or county-equivalents.

The Supabase migration `20260510120000_add_location_build_projections.sql` adds the build-time projection tables:

- `location_path`
- `location_path_closure`
- `build_page_payload`
- `agency_zip_index`

Agency canonical URLs are not stored on `public.agency`. The build projection refresh links agencies to place-level `location_path` rows and derives agency page paths as `location_path.path || agency.agency_slug || '/'`.

This enrichment uses address-derived geography only.

## Navigation

Top-level navigation uses:

- Find My Area
- Search
- Submit
- About the Data

The place-first browse path is map-first with list and search controls:

1. Find My Area
2. State/territory
3. County-equivalent
4. Place
5. Agencies located here
6. Agency page

Location pages render maps from stored coordinates and bounds. Lists and search inputs remain available as the mobile and keyboard-accessible path.

## Unsupported Questions

The UI must not answer or imply answers to:

- Who polices here?
- Which agencies operate here?
- Which agencies have legal jurisdiction here?
- Which agency should respond to a call here?
- Which agencies cover this ZIP?
- What is the full service area?

## Redirect Inventory

Current redirect rules are isolated and removable.

Pattern-based redirects:

- `/civil-litigation/{category}/{case-slug}/` -> `/civil-cases/{case-slug}/`
- `/personnel/{state-or-territory}/` -> `/{state-or-territory}/`
- `/personnel/{state-or-territory}/page/*` -> `/{state-or-territory}/`
- `/civil-litigation/{state-or-territory}/` -> `/{state-or-territory}/`
- `/civil-litigation/{state-or-territory}/page/*` -> `/{state-or-territory}/`
- `/videos`, `/videos/`, `/videos/*`, `/video`, `/video/`, `/video/*` -> `/search/`
- Existing `/report/{category}/{slug}/` -> `/report/{slug}/` remains application-generated.

DB-backed agency redirects:

- `/law-enforcement-agency/{category}/{agency-slug}/` -> `/{state-or-territory}/{county-equivalent}/{place}/{agency-slug}/`

Because agency redirect targets require DB-backed location paths, these redirects are generated from `build_page_payload` during the static build. The build also writes `dist/_redirect-map.json` from `scripts/generate-redirect-map.mjs` so the DB-backed redirect inventory is explicit and easy to remove or wire into another static/CDN redirect mechanism later.

## Redirect Verification Checklist

- Old agency URL redirects to address-based canonical agency URL.
- Old personnel URLs remain canonical under `/personnel/{slug}/`.
- Old state-scoped personnel collection URLs redirect to the state page.
- Old civil-litigation detail URL redirects to `/civil-cases/{slug}/`.
- Old state-scoped civil-litigation collection URLs redirect to the state page.
- Old report detail URL redirects to `/report/{slug}/`.
- Old video/media top-level URLs redirect to a useful non-video parent, currently `/search/`.
- Redirects preserve query strings where handled at CloudFront.
- No current page templates emit old agency detail URLs as regular links.
- No `/videos/` route or top-level video navigation exists.
