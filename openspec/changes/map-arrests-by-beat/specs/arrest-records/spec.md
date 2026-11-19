## MODIFIED Requirements

### Requirement: Agency arrest display is deferred

The agency page SHALL omit the full arrest breakdown display while its presentation is deferred. The personnel-and-agency beat map (capability `arrest-beat-maps`) SHALL be displayed independently. Imported agency profiles SHALL remain available in the data layer without summing personnel profiles.

#### Scenario: Irving has an imported profile

- **WHEN** a visitor opens the Irving agency page
- **THEN** the page does not render the full arrest breakdown section
- **AND** related personnel arrest sections remain visible

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render public count maps using the correct arrest, charge-row, or distinct reported charge-record denominator. Income matching status SHALL be presented as income ranges including Unknown (capability `personnel-arrest-income`). Internal arrest-location matching results and residential census tract code tables SHALL be omitted from the public display. Arrest beat codes SHALL be presented as named count maps (capability `arrest-beat-maps`). Other Unknown groups SHALL remain visible.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals

#### Scenario: Income matching status is shown

- **WHEN** a profile includes income matching status
- **THEN** the display presents it as income ranges including Unknown, as the personnel-arrest-income capability specifies

#### Scenario: Internal matching data is present

- **WHEN** a profile includes internal arrest-location matching results or residential census tract code tables
- **THEN** the public display omits them

#### Scenario: Arrest beat codes are present

- **WHEN** a profile includes arrest beat codes
- **THEN** the display presents them as named count maps, as the arrest-beat-maps capability specifies

#### Scenario: A count map has other Unknown groups

- **WHEN** a count map other than income ranges has an Unknown group
- **THEN** the Unknown group remains visible
