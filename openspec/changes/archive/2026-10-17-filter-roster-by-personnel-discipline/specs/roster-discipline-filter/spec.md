## ADDED Requirements

### Requirement: Filter by discipline applying to personnel

Agency personnel rosters SHALL retain a person when the With discipline actions checkbox is selected if any discipline record directly references that personnel ID, regardless of agency attribution. Existing name and employment-status filters SHALL continue to combine with the checkbox. Agency-linked roster labels and department discipline totals SHALL retain their existing attribution rules.

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
