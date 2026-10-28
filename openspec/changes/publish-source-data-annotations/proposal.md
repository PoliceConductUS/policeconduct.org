## Why

Visitors need reported values and source-attributed warnings, errors, and corrections to remain visible together. Imports must not turn a bad source date into a claim of current employment.

## What Changes

Consume intake's generated annotation contract, show stored annotations beside affected records, and generate a central index plus licensing-authority views with 50-row pagination, source/type filters, and complete filtered CSV exports. Source-to-authority attribution uses explicit source_namespaces. Existing NO_PERSONNEL builds omit personnel-linked findings.

## Capabilities

### New Capabilities

- `public-data-annotations`: Display and export stored source-attributed findings.

## Impact

Requires intake's forward annotation migration and regenerated imports. No runtime API or new dependency. Existing routes and database-backed slugs remain authoritative. Merge, deployment, and personnel publication require their existing separate gates.
