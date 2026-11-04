## ADDED Requirements

### Requirement: Agency arrest display is deferred

The agency page SHALL omit the arrest display while its presentation is deferred. Imported agency profiles SHALL remain available in the data layer without summing personnel profiles.

#### Scenario: Irving has an imported profile

- **WHEN** a visitor opens the Irving agency page
- **THEN** the page does not render an arrest section
- **AND** related personnel arrest sections remain visible

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render stored one-dimensional count maps using the correct arrest, charge-row, or distinct reported charge-record denominator. Unknown groups SHALL remain visible.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals
