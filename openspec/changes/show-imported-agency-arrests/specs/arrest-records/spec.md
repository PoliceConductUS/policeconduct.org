## ADDED Requirements

### Requirement: Agency arrest display is deferred

The agency page SHALL omit the full arrest breakdown display while its presentation is deferred. The personnel-and-agency beat map in map-arrests-by-beat SHALL be displayed independently. Imported agency profiles SHALL remain available in the data layer without summing personnel profiles.

#### Scenario: Irving has an imported profile

- **WHEN** a visitor opens the Irving agency page
- **THEN** the page does not render the full arrest breakdown section
- **AND** related personnel arrest sections remain visible

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render public count maps using the correct arrest, charge-row, or distinct reported charge-record denominator. Income matching status SHALL be presented as income ranges including Unknown, as specified in show-neighborhood-income. Internal arrest-location matching results and residential census tract code tables SHALL be omitted from the public display. Arrest beat codes SHALL be presented as named count maps under map-arrests-by-beat. Other Unknown groups SHALL remain visible.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals
