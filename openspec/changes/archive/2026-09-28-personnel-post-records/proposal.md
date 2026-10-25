## Why

Newly imported discipline facts/documents and education records are absent from personnel profiles. The old discipline loader follows agency assignments rather than the direct personnel relationship.

## What Changes

Load discipline by discipline.personnel_id, group explicit agency links under each distinct discipline, include stored authority and source/factual details. Add a compact Education & training section with all stored course fields, name/sponsor/instructor search and local ten-record pagination. Keep optional content omitted and data scoped to the exact person.

## Capabilities

### New Capabilities

- personnel-post-records: direct discipline detail and education display on existing personnel profiles.

## Impact

Personnel loaders/page/components, schema contract and focused tests. No DB writes/migrations, import or seed changes, new routes, dependencies or data interpretation. Existing licensing/assignments remain. Some stored education dates are anomalous; preserve recorded values rather than correcting them in UI.
