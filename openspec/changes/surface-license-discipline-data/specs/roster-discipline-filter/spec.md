## MODIFIED Requirements

### Requirement: Filter by discipline applying to personnel

Agency personnel rosters SHALL retain a person when the With discipline actions checkbox is selected if any discipline record directly references that personnel ID, regardless of agency attribution. Existing name and employment-status filters SHALL continue to combine with the checkbox. Roster discipline count labels SHALL use the same rule as the checkbox. Department discipline totals SHALL retain their explicit-link attribution rule.

#### Scenario: Discipline has no agency attribution

- **WHEN** a roster person has a discipline record with no employment link
- **THEN** selecting the checkbox retains that person
- **AND** department discipline totals are unchanged

#### Scenario: Discipline is attributed elsewhere

- **WHEN** a roster person has discipline linked only to another agency
- **THEN** selecting the checkbox retains that person

#### Scenario: No discipline record

- **WHEN** a person has no discipline records
- **THEN** selecting the checkbox hides that person

## ADDED Requirements

### Requirement: Roster discipline counts

The agency personnel roster SHALL append a discipline count to the person's context line.

The count SHALL be the number of distinct discipline records whose `discipline.personnel_id` is that person, from any source, with or without agency links. This is the same rule the With discipline actions checkbox uses.

The count SHALL link to `/personnel/{stored-slug}/#discipline`.

A zero count SHALL omit the label.

A roster row whose person has no stored slug SHALL show no count.

#### Scenario: Discipline with no agency link

- **WHEN** a roster person directly owns a discipline record with no `discipline_agency_personnel` link
- **THEN** that record is included in the person's roster count

#### Scenario: Discipline linked to another agency

- **WHEN** a roster person directly owns a discipline record linked only to another agency
- **THEN** that record is included in the person's count on this agency's roster

#### Scenario: Repeated links

- **WHEN** one discipline record has several assignment links
- **THEN** it counts once

#### Scenario: Count matches the filter

- **WHEN** the With discipline actions checkbox retains a roster row
- **THEN** that row shows a positive count, unless the person has no stored slug

#### Scenario: Zero count

- **WHEN** a roster person directly owns no discipline records
- **THEN** no count label appears on that row

#### Scenario: No stored slug

- **WHEN** a roster row's person has no stored slug
- **THEN** no count label appears on that row

### Requirement: Agency discipline total

The agency page SHALL show the number of distinct discipline records explicitly linked through `discipline_agency_personnel → agency_personnel` to that agency's assignments, linked to its personnel roster. The total SHALL NOT be the sum of roster counts. A zero total SHALL omit the label.

#### Scenario: Agency total

- **WHEN** an agency has explicitly linked discipline records
- **THEN** its page shows a distinct-record count linked to its personnel roster
- **AND** a record linked to several of the agency's assignments counts once

#### Scenario: Discipline without agency links

- **WHEN** a roster person's discipline has no link to this agency's assignments
- **THEN** the agency total does not include it
