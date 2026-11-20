## Why

The documentation rereview exposed skipped scanner inputs and an agency subtotal that omitted tribal law enforcement agencies.

## What Changes

Apply existing content checks to every requested file, fail on unreadable inputs, and count tribal LEAs in the all-agency comparison. Correct the related documentation and generated report wording.

## Capabilities

### New Capabilities

- `review-findings`: Complete scan inputs and inclusive all-agency totals.

## Impact

Personal-data scanner, coverage classification, and their tests. Documentation describes current behavior. No schema, dependency, routing, or database-source changes.
