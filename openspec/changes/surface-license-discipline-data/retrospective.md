# Task 6.2a slice: agency discipline counts retrospective

Kept the approved display inside the existing roster context line and reused the agency page's shared note styling. Attribution uses only explicit assignment links; distinct personnel/discipline pairs prevent repeat assignments from inflating roster counts, and distinct discipline IDs establish the agency total.

On October 5, 2026 the local database had no `discipline_agency_personnel` rows (`select count(*) from public.discipline_agency_personnel`). Rollback-only fixtures verified the real loader without persisting records; rendered fixtures verified count links and zero omission. The separate agency record list is deferred to a separate change.

## Whole-change retrospective

To be written after tasks 7.2-7.4 are done, using the sections of the bridge retrospective template (Evidence, Wins, Misses, Plan deviations, Skill / workflow compliance, Surprises, Promote candidates).
