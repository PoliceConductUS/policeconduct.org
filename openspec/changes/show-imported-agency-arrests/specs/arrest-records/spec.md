## ADDED Requirements

### Requirement: Agency arrest profiles use imported agency totals

The agency page SHALL load agency_arrest_profile through agency_id after canonical route resolution and SHALL display its recorded total and coverage without summing personnel profiles.

#### Scenario: Irving has an imported profile

- **WHEN** a visitor opens the Irving agency page
- **THEN** its arrest section shows the stored agency total, dates, and one-dimensional count breakdowns

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render stored one-dimensional count maps using the correct arrest, charge-row, or distinct reported charge-record denominator. Unknown groups SHALL remain visible.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals
