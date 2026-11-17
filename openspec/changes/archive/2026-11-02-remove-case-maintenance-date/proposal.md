# Remove the ambiguous case maintenance date

## Why

Local review found that Updated could mean either site maintenance or activity in court. The displayed value comes from the internal record timestamp.

## What Changes

- Remove the Updated row from civil case detail pages.
- Preserve Filed, Closed, internal timestamps, and routing.
- Update existing browser coverage to require the row to be absent.

## Impact

Only the case facts list changes. No data migration or publication is involved.
