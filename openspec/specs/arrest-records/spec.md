# arrest-records Specification

## Purpose

Keep the full agency arrest breakdown off agency pages while its presentation is deferred, and show personnel arrest counts with the correct unit for each share.

## Requirements

### Requirement: Agency arrest display is deferred

The agency page SHALL omit the full arrest breakdown display while its presentation is deferred. The personnel-and-agency beat map in map-arrests-by-beat SHALL be displayed independently. Imported agency profiles SHALL remain available in the data layer without summing personnel profiles.

#### Scenario: Irving has an imported profile

- **WHEN** a visitor opens the Irving agency page
- **THEN** the page does not render the full arrest breakdown section
- **AND** related personnel arrest sections remain visible

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render public count maps using the correct arrest, charge-row, or distinct reported charge-record denominator.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals

#### Scenario: Income matching status is shown

- **WHEN** a profile includes income matching status
- **THEN** the display presents it as income ranges including Unknown, as specified in show-neighborhood-income

#### Scenario: Internal matching data is present

- **WHEN** a profile includes internal arrest-location matching results or residential census tract code tables
- **THEN** the public display omits them

#### Scenario: Arrest beat codes are present

- **WHEN** a profile includes arrest beat codes
- **THEN** the display presents them as named count maps under map-arrests-by-beat

#### Scenario: A count map has other Unknown groups

- **WHEN** a count map other than income ranges has an Unknown group
- **THEN** the Unknown group remains visible
