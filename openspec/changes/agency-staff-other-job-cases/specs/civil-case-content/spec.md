## MODIFIED Requirements

### Requirement: Civil case counts follow personnel assignments

Every civil-case count and list SHALL count distinct civil cases, so one case record counts once however many personnel or agencies link to it. Links SHALL run through `public.civil_case_personnel` to `public.agency_personnel`. A personnel page SHALL include every case linked to any of that person's assignments. An agency page's civil-case count, Civil Cases tile and own case list SHALL include only cases linked to that agency's own assignments; a person's cases from assignments at other agencies SHALL NOT count for it. An agency page MAY show those other cases only in the separate section defined by `agency-staff-other-job-cases`, which has its own count. No page SHALL show a number that is the sum of the two counts. A place, administrative-area, or state page SHALL include the cases linked to assignments at every agency whose `location_path_id` path lies within that location, not the case's own incident location. A federal agency SHALL include the cases linked to assignments at its listed child agencies, and its totals and the all-federal totals SHALL count each case once.

#### Scenario: Person moved between agencies

- **WHEN** a person has a case linked to an assignment at agency A and also has an assignment at agency B
- **THEN** the case counts on the person's page and on agency A
- **AND** the case does not count on agency B

#### Scenario: Case names personnel at two agencies in one place

- **WHEN** one case links to assignments at two agencies located in the same place
- **THEN** the case counts once on each agency page and once on the place, administrative-area, and state pages
