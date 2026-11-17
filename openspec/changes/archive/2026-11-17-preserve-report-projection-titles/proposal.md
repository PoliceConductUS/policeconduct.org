## Why

Report archives currently receive a linked personnel job title because a projection query selects two columns named title. Regenerating projections repeats the regression.

## What Changes

- Keep report and personnel titles distinct in the projection query and mapper.
- Reject duplicate projection column names before writing derived data.
- Provide a database verifier comparing generated titles with their respective source rows.

## Impact

Only derived report summaries change. No source records, canonical paths, or publication gates change.
