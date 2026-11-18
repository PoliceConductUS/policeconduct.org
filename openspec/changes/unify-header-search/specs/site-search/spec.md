## ADDED Requirements

### Requirement: One header search for the site

The header search SHALL be the site's single search. It SHALL NOT return people
until a later change decides otherwise, and it SHALL offer a state filter and no
place or agency filter.

#### Scenario: A visitor searches by state

- **WHEN** a visitor types an agency name and chooses Texas in the state filter
- **THEN** results come only from Texas pages

#### Scenario: A visitor types an officer's name

- **WHEN** a visitor types a name that appears only on personnel pages or
  agency rosters
- **THEN** the header search returns no person results
