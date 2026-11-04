## Why

Agency status and status_date now exist in the database but are absent from agency pages and search metadata.

## What Changes

- Display supplied status and status date near the agency name, emphasizing non-active status.
- Include the same facts in descriptions and structured data, and non-active status in titles.
- Require the new columns in the schema contract while respecting nullable values.

## Capabilities

### New Capabilities

- `agency-status`: Agency status visibility and metadata consistency.

### Modified Capabilities

None.

## Impact

Agency detail loader, agency overview page, schema validation, focused tests. No database writes, migrations, seed changes, routes, new dependencies, or compatibility fallbacks. Existing schema is required. No safety or accountability inference.
