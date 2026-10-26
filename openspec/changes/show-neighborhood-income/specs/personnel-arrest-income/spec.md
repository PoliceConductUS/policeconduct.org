## ADDED Requirements

### Requirement: Readable neighborhood income distribution

The personnel arrest display SHALL group arrests by Census neighborhood median household income into under $25,000, $25,000–$49,999, $50,000–$74,999, $75,000–$99,999, $100,000–$149,999, $150,000 or more, and Unknown. It SHALL display Estimated household income, Count, Percentage, and Agency Percentage, plus a Total row. Percentage SHALL divide by all arrests in the personnel profile, including Unknown. Agency Percentage SHALL divide by agency arrests in the same range, source, and inclusive recorded-month interval. A zero agency denominator SHALL display an em dash, not an invented percentage. Missing comparison data or inconsistent matched income evidence SHALL fail visibly. Original breakdowns SHALL remain unchanged.

#### Scenario: Same-range comparison

- **WHEN** personnel have 100 arrests in a range out of 370 total and the agency has 2500 arrests in that range in the same months
- **THEN** Count is 100, Percentage is 27.0%, and Agency Percentage is 4.0%

#### Scenario: Unknown income

- **WHEN** the home neighborhood or its income cannot be determined
- **THEN** the arrest contributes to Unknown and the total denominator

#### Scenario: Public explanation

- **WHEN** the table is displayed
- **THEN** its note explains that income is a neighborhood household estimate rather than personal income and defines both percentage columns and the comparison period

### Requirement: Public breakdowns omit internal geography diagnostics

The public arrest display SHALL omit arrest-location matching results and residential census tract code tables. Stored breakdowns SHALL remain unchanged.

#### Scenario: Internal geography data

- **WHEN** a profile includes by_beat_status and by_residential_tract
- **THEN** neither is rendered as a public table
