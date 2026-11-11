# Reconcile annotation employment status

## Why

The legacy employment fix interpreted malformed and future separation dates as definitive employment status. Annotation-aware ingestion preserves these values instead of silently clearing them.

## What Changes

- Preserve annotation-aware effective values and report-title guards.
- Classify only absent effective separation dates as open and valid past dates as ended.
- Show uncertain status for other recorded values; withhold worksFor.
- Preserve ended-assignment selection and verification.

## Impact

Personnel profiles, rosters, and agency counts in local review; no source mutation or publication.
