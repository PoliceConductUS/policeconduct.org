## Context

The generator only sees current slugs; it cannot reconstruct historical slugs. INS-110 explicitly authorizes this scoped repair.

## Goals / Non-Goals

Restore the six supported old routes without changing case titles, slugs or IDs. No public mutation or new acquisition.

## Decisions

Use explicit aliases keyed by retained canonical IDs, following the existing agency alias pattern. A slug match alone cannot identify a case. Resolve destinations from database rows; reject a resolved target without built HTML. Absent case IDs emit no aliases, leaving prior-sitemap coverage fail-closed. Do not infer watch URLs without historical video identity evidence.

## Risks / Trade-offs

The retained ID is the identity anchor. A missing case in another corpus must not redirect to an unrelated row with the same slug. Retained evidence supports route continuity, not substantive allegations or publication approval.
