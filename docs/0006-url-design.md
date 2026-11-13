# Public URL Design

Record URLs use stored database paths and slugs. Geographic paths describe the location attached to the record.

## Canonical routes

| Page                      | URL                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| State or territory        | `/{state}/`                                                           |
| County or equivalent area | `/{state}/{area}/`                                                    |
| Place                     | `/{state}/{area}/{place}/`                                            |
| Agency                    | `/{state}/{area}/{place}/{agency-slug}/`                              |
| Federal parent agency     | `/federal/{agency-slug}/`                                             |
| Personnel                 | `/personnel/{personnel-slug}/`                                        |
| Civil case                | `/civil-cases/{case-slug}/`                                           |
| Report                    | `/{state}/{area}/{place}/reports/{year}/{month}/{day}/{report-slug}/` |
| Site news post            | `/news/{year}/{month}/{day}/{slug}/`                                  |

`{area}` is the stored county, parish, borough, district, municipio, or other county-equivalent segment. Federal branch offices use the address-based agency route. Federal agency slugs retain their stored hash.

Report location comes from the report's `location_path_id` joined to `location_path`; its date comes from the incident date. The report's stored slug remains required. The canonical path is assembled by `src/lib/data/report-paths.ts`.

News coverage links open the external source. They are attached to officers at agencies through the existing coverage relationships.

## Identity and geography

Agency location identity comes from `public.agency.location_path_id` joined to `public.location_path`. The agency's required, globally unique `slug` supplies its final URL segment. Address geography does not describe jurisdiction or service area.

Personnel and civil cases have global canonical pages because they can relate to several agencies or locations. Agency, personnel, and geographic collection pages show their connected records without changing those canonical identities.

Every route segment must resolve from exact database-backed path data. Static-path enumeration and display projections do not replace the page's entity lookup. Missing required identity fails the build.

## Collections and pagination

Agency collections use the agency URL followed by the supported collection, such as `/personnel/`, `/reports/`, or `/civil-cases/`. Geographic report archives use `/reports/` beneath the stored location path, followed by supported date segments.

Paginated collections use `/page/{number}/`. Page 1 uses the collection root. The civil-case collection uses `/civil-cases/` and `/civil-cases/page/{number}/`; the top-level personnel collection is not paginated.

Existing report and civil-case watch pages use `/watch/{videoId}/` beneath the record URL.

## Implementation

- `src/lib/data/report-paths.ts`: report location/date/slug paths.
- `src/lib/data/agency-detail.ts`: exact agency route lookup.
- `src/lib/data/location-paths.ts`: agency path values.
- `scripts/generate-redirect-map.mjs`: the built redirect inventory.
- `src/pages/`: implemented page routes.
