## Context

The loader counts discipline through assignment links, while individual profiles query discipline.personnel_id. The checkbox consumes the former.

## Goals / Non-Goals

Make the checkbox find every roster person with a discipline record. Do not change agency metrics, existing count labels, source data, or attribution.

## Decisions

Expose a required numeric personnelDisciplineCount on each employee using a grouped query restricted to roster personnel IDs. Use that value for the checkbox data attribute. Preserve disciplineCount for agency-linked display and counts.discipline for the agency aggregate.

## Risks / Trade-offs

Filtered people can have no agency-linked count label. This accurately preserves existing labels while fulfilling the requested filtering behavior. Tests must distinguish direct counts from agency links and prove totals remain unchanged.
