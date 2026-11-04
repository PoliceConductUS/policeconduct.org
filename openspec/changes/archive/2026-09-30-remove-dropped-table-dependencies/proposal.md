## Why

The database has dropped ten empty tables. The site still queries these tables and requires eight in its schema contract, so schema validation and page rendering fail against the current database.

## What Changes

Remove obsolete queries, types, projections, and displays for dropped tables. Preserve surviving data sources and strict schema checks. Replace federal branch joins with the new agency.parent_federal_agency_id foreign key.

## Capabilities

### New Capabilities

- `current-schema-consumers`: Site consumers match the current database after empty-table removal.

### Modified Capabilities

None.

## Impact

Report, civil-case, agency, federal, and civic loaders/templates; build projections, redirects, schema checks, and regression checks. Obsolete internal payload fields are removed without compatibility handling. No database or intake form changes. No public-trust conclusions are introduced.
