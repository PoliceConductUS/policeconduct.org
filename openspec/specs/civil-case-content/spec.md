# civil-case-content Specification

## Purpose

Describe case content and notifications without unsupported claims.

## Requirements

### Requirement: Case descriptions reflect their source

Case pages SHALL NOT present the mixed legacy claims_summary field as a complaint narrative or an AI-generated summary, including in page descriptions. A future AI summary SHALL be grounded in an identified complaint, link that filing, disclose AI generation, and distinguish allegations from findings.

#### Scenario: Legacy value contains only a cause code

- **WHEN** a case has a cause code or title in claims_summary
- **THEN** the case page does not display it as a complaint narrative

### Requirement: Case notification guidance is external

Case pages SHALL direct visitors to CourtListener for notifications and link its alert guidance. They SHALL use an existing CourtListener docket URL when available and otherwise link CourtListener. They SHALL NOT promise automatic site updates or claim that every filing is publicly available.

#### Scenario: Case has a retained CourtListener docket URL

- **WHEN** the visitor views notification guidance
- **THEN** the link opens that retained docket URL and alert guidance is available

### Requirement: Civil case counts follow personnel assignments

Every civil-case count and list SHALL count distinct civil cases, so one case record counts once however many personnel or agencies link to it. Links SHALL run through `public.civil_case_personnel` to `public.agency_personnel`. A personnel page SHALL include every case linked to any of that person's assignments. An agency page SHALL include only cases linked to that agency's own assignments; a person's cases from assignments at other agencies SHALL NOT count for it. A place, administrative-area, or state page SHALL include the cases linked to assignments at every agency whose `location_path_id` path lies within that location, not the case's own incident location. A federal agency SHALL include the cases linked to assignments at its listed child agencies, and its totals and the all-federal totals SHALL count each case once.

#### Scenario: Person moved between agencies

- **WHEN** a person has a case linked to an assignment at agency A and also has an assignment at agency B
- **THEN** the case counts on the person's page and on agency A
- **AND** the case does not count on agency B

#### Scenario: Case names personnel at two agencies in one place

- **WHEN** one case links to assignments at two agencies located in the same place
- **THEN** the case counts once on each agency page and once on the place, administrative-area, and state pages
