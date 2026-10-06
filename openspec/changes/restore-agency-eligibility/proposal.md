## Why

The broad data-coverage change removed the established linked-record filter without explicit approval. Restore agency eligibility rather than publishing every agency row.

## What Changes

- Generate agencies with personnel assignments (current or former).
- Exclude other agencies from projections and their derived navigation.
- Correct the coverage specification and regression checks that required all agencies.

## Capabilities

### Modified Capabilities

- `public-record-coverage`: Restore agency inclusion criteria.
- `current-schema-consumers`: Apply the uniform rule to federal offices while always including root federal pages.

## Impact

Build projection query, federal loaders, legacy redirects, agency eligibility tests and specifications. No schema edits, new dependencies, branch or worktree, or deployment.
