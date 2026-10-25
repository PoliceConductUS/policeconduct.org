## Design Summary

The user explicitly approved filtering roster personnel by any discipline applying to that person, regardless of agency attribution. Minneapolis has eight such people but all rendered agency-linked counts are zero.

## Alternatives Considered

Repairing agency links would answer a different question and require source attribution. Reusing person-wide counts for agency totals would change department metrics. A separate person-wide roster filter count satisfies the requested scope.

## Agreed Approach

Load person-wide discipline counts for roster filtering. Preserve agency-linked roster labels and department totals.

## Key Decisions

No intake mutations, invented agency attribution, new dependencies, or deployment. User approval supersedes the agency-linked filter requirement in current-agency-and-discipline-filter.

## Open Questions

None.
