## MODIFIED Requirements

### Requirement: Personnel profiles preserve current import count units

Personnel arrest sections SHALL render `by_year`, `by_month`, `by_iso_week`, and `by_day_of_week` as count tables, and SHALL render `by_hour`, `arrests_by_offense`, `arrests_by_level`, `charge_rows_by_offense`, `charge_rows_by_level`, `distinct_charge_records_by_offense`, `distinct_charge_records_by_level`, and `by_source_district` as count tables when stored. Each table SHALL use the correct arrest, charge-row, or distinct reported charge-record denominator. `by_income_status` SHALL be presented as income ranges including Unknown and No recorded date (capability `personnel-arrest-income`). `by_arrest_beat` SHALL be presented as named count maps (capability `arrest-beat-maps`). Internal arrest-location matching results (`by_beat_status`) and residential census tract code tables (`by_residential_tract`) SHALL NOT be rendered. Stored breakdowns SHALL remain unchanged. Other Unknown groups SHALL remain visible.

#### Scenario: Imported charges have repeated rows

- **WHEN** a profile includes charge rows and distinct reported charge records
- **THEN** the display labels the different units and calculates shares against their respective stored totals

#### Scenario: Internal geography data

- **WHEN** a profile includes `by_beat_status` and `by_residential_tract`
- **THEN** neither is rendered as a public table
