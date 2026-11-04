## Why

The reset database contains useful records that the website never shows, including 320 arrest profiles and 93 agencies without linked personnel. Some report facts and civil-case closing dates are also lost between storage and rendering. Visitors need these records in context, and the PR preview needs a fully verified current build.

## What Changes

- Audit all public tables and document visitor-facing use or internal purpose.
- Include agencies without linked records in canonical projections and navigation.
- Render arrest profiles on linked personnel pages with source, covered months, counts, shares, and all recorded breakdowns.
- Surface omitted report facts, case closing dates, and evidence links on existing pages.
- Verify data coverage, full validation, full static build, and the published PR preview.

## Capabilities

### New Capabilities

- `public-record-coverage`: Useful reset-database records appear on existing visitor pages.

### Modified Capabilities

None.

## Impact

Astro entity components, data loaders, projection eligibility, required schema contracts, and regression tests. No database edits, generated entity IDs, new dependencies, compatibility paths, or production deployment.
