## Why

Search Console reports three invalid object-type warnings on the home-page Dataset. Search consumers need supported types while retaining the site's organization identity.

## What Changes

- Emit the publisher as Organization, retaining nonprofitStatus and existing metadata.
- Emit spatialCoverage as Place named United States.
- Add regression coverage for the JSON-LD graph references and supported types.

## Capabilities

### New Capabilities

- `dataset-search-types`: Supported Dataset coverage and organization types.

### Modified Capabilities

None.

## Impact

Changes src/lib/structured-data.js and adds a Playwright regression test. The shared publisher type changes on all consuming pages. No database, routing, dependency, copy, or public-trust claim changes. The old object-type spelling is intentionally replaced with no compatibility branch.
