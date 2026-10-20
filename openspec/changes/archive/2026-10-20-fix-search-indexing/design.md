## Context

buildDataset emits Country and references a shared NonprofitOrganization. The home page emits that organization as a separate JSON-LD entry with the same @id.

## Goals / Non-Goals

Correct the three reported object types. Preserve organization data and graph identity. No changes to indexing policy, dataset content, routes, or deployment behavior.

## Decisions

Use Organization with the existing nonprofitStatus instead of NonprofitOrganization. Use Place named United States instead of Country. Keep @id references, avoiding duplicate entities.

Google documentation checked on 2026-10-20 supports Text or Place for spatialCoverage and Person or Organization for creator: https://developers.google.com/search/docs/appearance/structured-data/dataset . Schema.org publisher accepts Organization or Person: https://schema.org/publisher .

## Risks / Trade-offs

Google must recrawl before Search Console reports can clear. Local tests prove generated types and references, not remote acceptance.

## Migration Plan

Normal site release after review. Revert the scoped commit to roll back. No schema migration.

## Open Questions

None for implementation; parent owns live verification.
