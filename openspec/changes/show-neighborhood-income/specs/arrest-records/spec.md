## MODIFIED Requirements

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render `by_year`, `by_month`, `by_iso_week`, and `by_day_of_week` as count tables, and SHALL render `by_hour`, `arrests_by_offense`, `arrests_by_level`, `charge_rows_by_offense`, `charge_rows_by_level`, `distinct_charge_records_by_offense`, `distinct_charge_records_by_level`, and `by_source_district` as count tables when stored. Each table SHALL use the correct arrest, charge-row, or distinct reported charge-record denominator. Income SHALL be presented as the stored income rows, including Unknown and No recorded date (capability `personnel-arrest-income`). `by_arrest_beat` SHALL be presented as named count maps (capability `arrest-beat-maps`). Internal arrest-location matching results (`by_beat_status`) and residential census tract code tables (`by_residential_tract`) SHALL NOT be rendered. Stored breakdowns SHALL remain unchanged. Other Unknown groups SHALL remain visible.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals

#### Scenario: Income matching status is shown

- **WHEN** an agency assignment has stored income rows
- **THEN** the display presents them as income ranges including Unknown and No recorded date, as the personnel-arrest-income capability specifies

#### Scenario: Internal matching data is present

- **WHEN** a profile includes internal arrest-location matching results or residential census tract code tables
- **THEN** the public display omits them

#### Scenario: Arrest beat codes are present

- **WHEN** a profile includes arrest beat codes
- **THEN** the display presents them as named count maps, as the arrest-beat-maps capability specifies

#### Scenario: A count map has other Unknown groups

- **WHEN** a count map other than income ranges has an Unknown group
- **THEN** the Unknown group remains visible
