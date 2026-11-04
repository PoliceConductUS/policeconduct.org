## Why

Validation assumes obsolete civic-page labels and an old database snapshot. Current optional location reports are absent, and case text/counts changed.

## What Changes

- Assert the current geography H1 instead of removed civic-index labels.
- Read mutable civic counts and optional context from database build payloads.
- Read mutable case text and agency location name for the two affected prefill fixtures.
- Use the named Texas map region for the real-pointer navigation test instead of whichever tiny SVG region happens to be first.
- Continue exact assertions; fail on missing required fixtures and assert absence for absent optional reports.

## Capabilities

### New Capabilities

- `live-data-validation`: Match browser expectations to the current local data source.

### Modified Capabilities

None.

## Impact

Three browser test files only, plus workflow artifacts. No production code, database writes, dependencies, URLs or public copy change.
