## Decisions

Watch identity comes from the stored review_links or civil_case_links row ID. The render reloads the parent by exact stored slug and selects the matching supported video link from that parent's links. All URL segments must match the parent canonical path. Static path enumeration passes params only.

Report paths retain the existing joined location path and stored incident-date URL convention. Civil cases retain `/civil-cases/{slug}/`. Redirect generation reads associated stored links and preserves IDs through existing approved slug changes. It never maps replacement video IDs.
