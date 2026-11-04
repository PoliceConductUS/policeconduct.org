## ADDED Requirements

### Requirement: Personnel licenses and certification

Personnel pages SHALL present the individual's licensing record from the
`license` and `licensing_authority` tables, and MUST NOT conflate an assignment
role with a license type.

#### Scenario: Personnel holds one or more licenses

- **WHEN** a personnel page renders for someone with rows in `license`
- **THEN** a "Licenses & certification" section lists one card per license
- **AND** each card shows the normalized license type, normalized status,
  first-awarded date, and the issuing authority linked to its website
- **AND** the assignment role field (`agency_personnel.title`) is labeled "Role",
  not "License Type"

#### Scenario: Status and type values are normalized for display

- **WHEN** license `status` or `license_type` values differ only by casing or
  known synonym (e.g. `ACTIVE`/`Active`, `Peace Officer`/`Peace Officer License`)
- **THEN** they render as a single normalized display value

### Requirement: License action timeline

Personnel pages SHALL present the individual's license history as a single
merged, newest-first vertical timeline of `license_action` rows across all of
their licenses.

#### Scenario: Personnel has license actions across one or more licenses

- **WHEN** a personnel page renders for someone with `license_action` rows
- **THEN** all actions across every license appear in one newest-first timeline
- **AND** each entry shows the action date, action, the license it belongs to,
  and status
- **AND** adverse actions (reprimands, administrative holds, noncompliance,
  inactive/out-of-compliance, revocations) are visually distinguished from
  routine actions such as "Granted"

### Requirement: Personnel discipline records

Personnel pages SHALL present disciplinary/administrative certification actions
from `discipline` when, and only when, the individual has them.

#### Scenario: Personnel has discipline records

- **WHEN** a personnel page renders for someone linked through
  `discipline_agency_personnel`
- **THEN** a discipline section shows each action, effective and expiration
  dates, case number, and the attributed agency assignment

#### Scenario: Personnel has no discipline records

- **WHEN** a personnel page renders for someone with no discipline links
- **THEN** no discipline section is rendered

### Requirement: Agency-specific discipline counts

Agency personnel rosters SHALL append a linked discipline record count to the existing personnel context line when positive. Counts SHALL include distinct discipline IDs explicitly linked through `discipline_agency_personnel → agency_personnel` to that person at that agency, across the person's assignments there. Counts SHALL link to `/personnel/{stored-slug}/#discipline`. Zero counts SHALL omit the label. Personnel discipline sections SHALL have the `discipline` fragment ID.

#### Scenario: Person has records linked to multiple agencies

- **WHEN** the person appears in an agency roster
- **THEN** only records explicitly linked to that agency's assignments count
- **AND** repeated links to the same discipline ID count once

#### Scenario: Agency total

- **WHEN** an agency has explicitly linked discipline records
- **THEN** its page shows a distinct-record count linked to its personnel roster
- **AND** the total is not the sum of per-person roster counts
