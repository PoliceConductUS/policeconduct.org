## Why

The Minneapolis roster hides eight personnel with discipline records because its checkbox incorrectly requires agency attribution. The user wants to find people with discipline regardless of where it came from.

## What Changes

Use direct personnel discipline counts for the existing checkbox. Keep agency-linked labels and department totals unchanged. Update the earlier active filter specification to prevent contradictory requirements.

## Capabilities

### New Capabilities

- `roster-discipline-filter`: Person-wide discipline filtering on agency rosters.

### Modified Capabilities

None.

## Impact

Agency detail loader, roster filter data, focused loader/browser tests and specifications. No schema, seed, intake, dependency, route or public-trust claims. Intentionally replaces agency-linked checkbox semantics without compatibility behavior.
