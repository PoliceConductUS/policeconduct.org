# Task: Implement location-centric build projections for faster static generation

## Context

PoliceConduct.org is moving to a place-first navigation model.

The goal is to make static generation faster by avoiding repeated joins and aggregations during the build.

See:

`/Users/dalelotts/dev/PoliceConductUS/policeconduct.org/docs/0006-url-design.md`

for the URL design decision.

## Goal

Create a location-centric database and build-data design that lets the static site generator read precomputed page payloads instead of repeatedly joining normalized source tables.

The static generator should be able to load rows like:

```sql
SELECT path, page_type, payload
FROM build_page_payload
ORDER BY path;
```

and render pages directly from those payloads.

## Important constraints

- Minimum implementation only.
- Do not add speculative future features.
- Do not add jurisdiction/service-area modeling.
- Do not add legacy fallback features.
- Do not add optional URL segments.
- Do not add generalized abstractions unless required by this task.
- Do not add routes not required by the current URL design.
- Do not implement boundary-shape logic unless existing data already supports it.
- Do not store canonical agency URLs on the normalized agency table.
- If expanding functionality, adding a fallback, or introducing a broader abstraction seems useful, stop and ask first.
- Architecture decisions belong in ADRs. If a durable architecture decision is required, propose an ADR instead of hiding it in code or implementation notes.

## Current URL design

Use address/location-based geography.

Canonical agency route:

```txt
/{state-or-territory}/{administrative-area}/{place}/{agency-slug}/
```

Example:

```txt
/tx/dallas-county/irving/irving-police-department/
```

Place rollup route:

```txt
/{state-or-territory}/{administrative-area}/{place}/
```

Example:

```txt
/tx/dallas-county/irving/
```

Administrative-area rollup route:

```txt
/{state-or-territory}/{administrative-area}/
```

Example:

```txt
/tx/dallas-county/
```

State/territory rollup route:

```txt
/{state-or-territory}/
```

Example:

```txt
/tx/
```

Canonical personnel route remains global:

```txt
/personnel/{personnel-slug}/
```

Civil cases remain global:

```txt
/civil-cases/{case-slug}/
```

Incident routes ARE place/date based:

```txt
/{state-or-territory}/{administrative-area}/{place}/incidents/{yyyy}/{mm}/{dd}/{incident-slug}/
```

Do not add optional URL segments.

Do not create alternate canonical routes for the same entity.

## Recommended database design

### 1. Add `location_path`

Create a first-class location path table representing the resolved geographic URL spine.

A `location_path` row represents a full canonical geographic path, not a single path segment.

Examples:

```txt
/tx/
/tx/dallas-county/
/tx/dallas-county/irving/
```

Recommended minimum fields:

```sql
location_path_id
path
level
state_or_territory_slug
administrative_area_slug
place_slug
state_or_territory_name
administrative_area_name
place_name
parent_location_path_id
latitude
longitude
created_at
updated_at
```

Rules:

- `path` must be unique.
- `level` must identify whether the row is a state/territory, administrative area, or place.
- `parent_location_path_id` should point to the immediate parent path.
- Do not model jurisdiction/service-area data.
- Do not add optional URL segment support.

### 2. Link agencies to `location_path`

Agencies should link to the most specific location path derived from their official address/location.

Minimum agency location requirements:

```sql
agency.location_path_id
agency.agency_slug
```

Rules:

- `agency.location_path_id` points to the place-level `location_path`.
- `agency.agency_slug` is the agency-specific slug used in the canonical agency URL.
- Enforce `UNIQUE (location_path_id, agency_slug)` to prevent canonical URL collisions.
- Do not store `agency.canonical_path` in the normalized agency table.
- The canonical agency path is derived during build-payload generation from:

```txt
location_path.path + agency.agency_slug + "/"
```

Example derived path:

```txt
/tx/dallas-county/irving/irving-police-department/
```

The derived path is stored as:

```txt
build_page_payload.path
```

Use address/location data only.

Do not imply this represents legal jurisdiction or operational coverage.

### 3. Add `location_path_closure`

Add a closure table to make rollups fast.

```sql
location_path_closure
  ancestor_location_path_id
  descendant_location_path_id
  depth
```

Rules:

- Include self rows with `depth = 0`.
- Include state → administrative area → place ancestry.
- Use this table for rollups instead of path-prefix string scans.
- Keep it deterministic and rebuildable.

Example relationships:

```txt
/tx/                       -> /tx/                       depth 0
/tx/                       -> /tx/dallas-county/         depth 1
/tx/                       -> /tx/dallas-county/irving/  depth 2
/tx/dallas-county/         -> /tx/dallas-county/         depth 0
/tx/dallas-county/         -> /tx/dallas-county/irving/  depth 1
/tx/dallas-county/irving/  -> /tx/dallas-county/irving/  depth 0
```

### 4. Create build projection table

Create a build-facing table that contains page payloads ready for static generation.

Recommended table:

```sql
build_page_payload
  path
  page_type
  entity_id
  payload
  content_hash
  content_updated_at
  generated_at
```

Rules:

- `path` is the primary key.
- `payload` is JSON or JSONB.
- `page_type` should be a stable value such as `location`, `agency`, `personnel`, `civil_case`, `incident`, or collection-specific page types currently required by the implementation.
- `content_hash` should change when the rendered content-relevant payload changes.
- Static generation should read this table directly.
- Canonical URL uniqueness is enforced by `build_page_payload.path`.
- Do not add generalized build abstractions beyond what is required to generate current pages.

Example rows:

```txt
/tx/                                                       location
/tx/dallas-county/                                        location
/tx/dallas-county/irving/                                 location
/tx/dallas-county/irving/irving-police-department/        agency
/personnel/james-markham-v-7635c7/                        personnel
/civil-cases/ndtx-3-25-cv-03329-lotts-v-city-of-irving/   civil_case
```

### 5. Precompute location page payloads

Populate `build_page_payload` for each `location_path`.

Location pages should include only data currently supported.

For state/admin-area/place pages, payloads may include:

- location path
- display name
- level
- parent path
- child locations
- agencies located here
- counts supported by existing data
- data-quality note

Do not include:

- agencies operating here
- jurisdiction coverage
- service area coverage
- ZIP coverage claims
- boundary data unless already available

Use language consistent with current data:

```txt
Agencies located here
```

not:

```txt
Agencies operating here
```

### 6. Precompute agency page payloads

Populate `build_page_payload` for each agency.

Agency payloads should include:

- agency id
- agency name
- agency slug
- derived canonical path
- location path
- address/location-derived geography
- agency type if available
- related personnel if existing data supports it
- related incidents if existing data supports it
- related civil cases if existing data supports it
- coverage/media links only where already attached
- data-quality note

Do not add top-level video functionality.

Do not add jurisdiction or service-area claims.

### 7. Precompute personnel and civil-case payloads only if currently generated

If personnel and civil-case pages are already part of the static build, include them in `build_page_payload`.

Personnel canonical route:

```txt
/personnel/{personnel-slug}/
```

Civil case canonical route:

```txt
/civil-cases/{case-slug}/
```

Do not invent additional personnel or civil-case route patterns.

### 8. Derive ZIP index from agency records

Derive a ZIP index from existing agency records if ZIP/postal code data is already present.

Minimum behavior:

- Do not add ZIP as part of the canonical geographic URL.
- Do not create ZIP routes unless already required elsewhere.
- Do not add ZIP support as a user-facing feature unless explicitly requested.
- If ZIP data exists, derive an internal index from agency records for future search/navigation support.

Possible derived index shape:

```sql
agency_zip_index
  postal_code
  agency_id
  relationship_type
```

Where `relationship_type` is limited to currently supported facts, such as:

```txt
official_address
```

Do not infer service ZIPs.

Do not infer ZIP coverage.

Do not claim agencies operate in a ZIP unless jurisdiction/service-area data exists.

## Pagination and jump indexes

Location pages and agency subpages may contain long lists.

The build must precompute pagination routes and jump indexes for any list that exceeds the configured page size.

### Paginated route shape

Use real static routes for pagination.

Preferred pattern:

```txt
/{collection-path}/
/{collection-path}/page/2/
/{collection-path}/page/3/
```

Examples:

```txt
/tx/dallas-county/irving/agencies/
/tx/dallas-county/irving/agencies/page/2/

/tx/dallas-county/irving/irving-police-department/personnel/
/tx/dallas-county/irving/irving-police-department/personnel/page/2/
```

Do not use optional URL segments.

Do not use query-parameter pagination for canonical static pages.

Avoid:

```txt
/tx/dallas-county/irving/agencies?page=2
```

Avoid:

```txt
/tx/dallas-county/irving/agencies/[page]?
```

### Collections that need pagination support

Precompute pagination for current supported collections only.

At minimum:

- state/territory child administrative areas
- administrative-area child places
- place agencies located here
- place incidents, if supported
- place civil cases, if supported
- agency personnel, if supported
- agency incidents, if supported
- agency civil cases, if supported
- personnel incidents, if supported
- personnel civil cases, if supported

Do not add new collection types just to support pagination.

### Build payload requirements for pagination

Each paginated page must be represented as a `build_page_payload` row.

Example rows:

```txt
/tx/dallas-county/irving/agencies/
/tx/dallas-county/irving/agencies/page/2/
/tx/dallas-county/irving/irving-police-department/personnel/
/tx/dallas-county/irving/irving-police-department/personnel/page/2/
```

The static generator should render paginated pages directly from `build_page_payload`.

### Pagination payload shape

Each paginated payload should include:

```json
{
  "items": [],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "pageSize": 50,
    "totalItems": 0,
    "firstPath": null,
    "previousPath": null,
    "nextPath": null,
    "lastPath": null
  }
}
```

Use `null` for unavailable previous/next paths.

### Jump indexes

For long sorted lists, precompute a jump index from the active sort key.

Do not treat all jump indexes as alphabetical. The jump index should reflect the value used to sort or group the list.

Call this structure `jumpIndex`.

#### Jump index examples by sort key

Text sort:

- Use the first normalized character of the display value.
- Use `#` for numbers, symbols, blank, or unknown values.
- Example labels: `A`, `B`, `C`, `#`.

Date sort:

- Use year, year-month, or date depending on list granularity.
- Use the coarsest useful granularity.
- For incident lists, default to year/month if the list is long.
- For civil-case lists, default to year unless month-level grouping is needed.
- Preserve the list sort direction. If the list is newest-first, the jump index should also be newest-first.

Numeric sort:

- Use exact values only when the number of unique values is small and useful.
- Otherwise use deterministic buckets.
- Do not create numeric jump buckets unless the list is actually sorted numerically.

Enum/category sort:

- Use the enum/category display values.
- Include only categories that have at least one item.

Status sort:

- Use the status display values.
- Include only statuses that have at least one item.

Location sort:

- Use the relevant location label, such as administrative area or place.
- Include only locations that have at least one item.

#### Jump index payload shape

Each paginated payload should include a jump index when useful:

```json
{
  "jumpIndex": [
    {
      "label": "A",
      "sortKey": "a",
      "path": "/tx/dallas-county/irving/agencies/#a",
      "itemCount": 17
    },
    {
      "label": "B",
      "sortKey": "b",
      "path": "/tx/dallas-county/irving/agencies/page/2/#b",
      "itemCount": 22
    }
  ]
}
```

Date example:

```json
{
  "jumpIndex": [
    {
      "label": "2026",
      "sortKey": "2026",
      "path": "/tx/dallas-county/irving/incidents/#year-2026",
      "itemCount": 31
    },
    {
      "label": "2025",
      "sortKey": "2025",
      "path": "/tx/dallas-county/irving/incidents/page/2/#year-2025",
      "itemCount": 44
    }
  ]
}
```

#### Jump index rules

- Generate the jump index during build-payload generation.
- Include only sections that have at least one item.
- The `path` should point to the first page and anchor where that section appears.
- Render matching section anchors on the page.
- The jump control must be keyboard accessible.
- If the list is short, omit the jump index.
- If the active sort key does not produce useful sections, omit the jump index.
- Do not add alternate sort modes unless explicitly requested.

### Sorting rules

Use deterministic sorting.

Recommended defaults:

- child locations: display name ascending
- agencies: agency name ascending
- personnel: display name ascending
- civil cases: most recent activity date descending, then case name ascending
- incidents: incident date descending, then incident slug ascending

If a page uses text jump sections, sort by the same normalized text field used to generate the jump index.

If a page uses date-first sorting, generate the jump index from the date sort value.

### Page size

Use one configured page size per collection type.

Recommended starting defaults:

- locations: 100
- agencies: 50
- personnel: 50
- incidents: 25
- civil cases: 25

Do not add user-configurable page sizes unless explicitly requested.

### SEO and canonical rules for pagination

Each paginated static page should have a self-canonical URL.

Example:

```txt
/tx/dallas-county/irving/agencies/page/2/
```

should canonicalize to itself.

The first page should be:

```txt
/tx/dallas-county/irving/agencies/
```

Do not create both:

```txt
/agencies/
```

and:

```txt
/agencies/page/1/
```

`/page/1/` should redirect to the collection root if it is ever requested.

## Static generation behavior

The static generator should read precomputed payloads.

Preferred build query:

```sql
SELECT path, page_type, payload
FROM build_page_payload
ORDER BY path;
```

The static generator should not repeatedly run deep joins to produce each page.

Build sequence:

1. Load/import normalized source data.
2. Populate or refresh `location_path`.
3. Populate or refresh `location_path_closure`.
4. Populate or refresh `build_page_payload`, including paginated collection rows.
5. Run static generation from `build_page_payload`.
6. Generate sitemap and redirects from canonical paths and redirect map.

## Redirects

Existing public URLs must continue to work.

When route changes are introduced:

- Inventory existing public URL patterns.
- Map old URLs to new canonical URLs.
- Add redirects in the simplest reliable place for the deployment.
- Avoid redirect chains.
- Avoid redirect loops.
- Preserve query parameters when appropriate.
- Add verification for known existing URLs.
- Redirect `/page/1/` routes to their collection root if those URLs are ever requested.

Redirects may be implemented in:

- CloudFront Functions
- Lambda@Edge
- application/router-level redirects
- static hosting redirect rules
- CDN redirect configuration

Choose the simplest reliable option.

## Performance requirements

The implementation should reduce static build time by moving repeated joins, rollups, pagination, and jump-index generation into precomputed build payloads.

Measure before and after:

- total static build time
- database query count during build
- slowest build queries
- number of pages generated
- payload generation time
- static rendering time
- number of generated paginated pages

Do not optimize beyond the current pain without data.

## Acceptance criteria

### Location model

- `location_path` exists and contains state/territory, administrative-area, and place rows needed by current agency data.
- `location_path.path` is unique.
- Agencies link to place-level `location_path` rows.
- Agencies enforce `UNIQUE (location_path_id, agency_slug)`.
- Agency canonical paths are not stored in the normalized agency table.
- Agency canonical paths are derived during build-payload generation.
- Canonical URL uniqueness is enforced by `build_page_payload.path`.

### Rollup performance

- `location_path_closure` exists and supports rollups without string-prefix path scans.
- State/admin-area/place rollups can be queried by `location_path_id`.

### Build projection

- `build_page_payload` exists.
- Static generation can read from `build_page_payload`.
- Static generation does not need repeated deep joins for each location or agency page.
- Page payloads include only currently supported data.

### Pagination

- Long lists are paginated during build-payload generation.
- Paginated pages exist as `build_page_payload` rows.
- Static generation reads paginated pages from `build_page_payload`.
- Page 1 uses the collection root path.
- Page 2 and later use `/page/{page-number}/`.
- No query-param pagination is used for canonical static pages.
- `/page/1/` redirects to the collection root if requested.
- Pagination is deterministic and stable across builds when the source data has not changed.
- Pagination does not introduce unsupported collection types or speculative routes.

### Jump indexes

- Jump indexes are generated for long sorted lists when useful.
- Jump indexes are based on the active sort key.
- Jump index links point to the correct page and anchor.
- Matching anchors are rendered on the target pages.
- Jump controls are keyboard accessible.
- Jump indexes are omitted when the list is short or the sort key does not produce useful sections.

### ZIP index

- If ZIP data exists in agency records, an internal ZIP index is derived from official agency address data.
- ZIP data is not treated as jurisdiction or service-area coverage.
- No ZIP routes or ZIP user-facing features are added unless explicitly approved.

### Navigation data

- State pages can list child administrative areas.
- Administrative-area pages can list child places.
- Place pages can list agencies located there.
- Agency pages can render from agency build payloads.

### Language and correctness

- Pages say “agencies located here,” not “agencies operating here.”
- Pages do not claim to answer jurisdiction/service-area questions.
- Data-quality notes disclose that pages are based on agency location and available records.

### Redirects

- Existing public URLs redirect to useful canonical pages.
- Redirects are tested.
- No redirect loops or chains are introduced.

## Deliverables

1. Proposed schema migration for `location_path`.
2. Proposed schema migration for `location_path_closure`.
3. Proposed schema migration for `build_page_payload`.
4. Agency location-path enrichment/migration.
5. Build payload generation script or job.
6. Static generator update to read `build_page_payload`.
7. Precomputed pagination routes for current supported long-list collections.
8. Precomputed jump indexes for current supported long-list collections.
9. Derived ZIP index from agency records, if ZIP data exists.
10. Redirect inventory and redirect map.
11. Build-time before/after measurements.
12. Notes documenting current-work assumptions only.

## Do not do

- Do not store canonical agency URLs in the normalized agency table.
- Do not add jurisdiction modeling.
- Do not add service-area modeling.
- Do not add ZIP routes.
- Do not add ZIP coverage claims.
- Do not add optional URL segments.
- Do not add query-param pagination for canonical static pages.
- Do not add user-configurable page sizes.
- Do not add alternate sort modes unless explicitly requested.
- Do not add legacy fallback features.
- Do not add new top-level video navigation.
- Do not create speculative future entities.
- Do not add generalized abstraction layers unless required by this task.
- Do not implement broader functionality without asking first.
