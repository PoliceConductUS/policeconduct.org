## Design Summary

Correct the home-page Dataset object-type warnings reported by Search Console for spatialCoverage, creator, and publisher. The user directly requested this fix.

## Alternatives Considered

1. Use explicit Organization and Place types, retaining existing identity and nonprofitStatus. This is the smallest correction matching Google's supported Dataset types.
2. Inline duplicate creator/publisher organizations. Rejected because the existing shared organization identity is sufficient and duplication adds drift.
3. Remove optional fields. Rejected because it would discard useful existing information.

## Agreed Approach

Use Organization for the shared publisher and Place for United States coverage. These are implementation choices within the authorized fix. Preserve all other organization metadata and references.

## Key Decisions

Use the existing Playwright suite to verify generated JSON-LD. Parent agent owns Search Console actions and separate review.

## Open Questions

Google recrawl and warning clearance require later live verification.
