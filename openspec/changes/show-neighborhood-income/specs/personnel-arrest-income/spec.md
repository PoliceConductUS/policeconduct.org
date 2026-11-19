## ADDED Requirements

### Requirement: Neighborhood income distribution table

When a personnel arrest profile has a stored `by_income_status` breakdown, the personnel arrest display SHALL group its arrests by the median household income of each arrested person's home census tract into fixed ranges, Unknown, and No recorded date, with the columns Estimated household income, Count, Percentage, and Share of agency arrests, plus a Total row. Missing or inconsistent income evidence SHALL fail the build. Stored `breakdowns` data SHALL NOT be changed.

#### Scenario: Census point estimate

- **WHEN** a dated arrest has a matched home census tract with an income estimate
- **THEN** it is placed in a range by the Census American Community Survey 5-year point estimate
- **AND** the margin of error is not used or shown

#### Scenario: Income ranges

- **WHEN** a personnel arrest profile has a stored `by_income_status` breakdown
- **THEN** its rows are Under $25,000, $25,000–$49,999, $50,000–$74,999, $75,000–$99,999, $100,000–$149,999, $150,000 or more, Unknown, No recorded date, and Total

#### Scenario: No income evidence stored

- **WHEN** a personnel arrest profile has no stored `by_income_status` breakdown
- **THEN** no income table is shown for that profile

#### Scenario: Same-range comparison

- **WHEN** a personnel member has 100 arrests in a range out of 370 total and the agency has 2500 arrests in that range in the same months
- **THEN** Count is 100, Percentage is 27.0%, and Share of agency arrests is 4.0%
- **AND** Percentage divides by all arrests in the personnel profile, including Unknown and No recorded date
- **AND** Share of agency arrests divides by agency arrests in the same range, source, and inclusive recorded-month interval

#### Scenario: Zero agency denominator

- **WHEN** the agency count and the personnel count in a row are both 0 for the same source and recorded-month interval
- **THEN** Share of agency arrests displays `--`, not a percentage

#### Scenario: Unknown income

- **WHEN** the home neighborhood or its income cannot be determined for a dated arrest
- **THEN** the arrest contributes to Unknown and the total denominator
- **AND** the page does not show why the income could not be determined; the stored `by_income_status` reasons are unchanged

#### Scenario: Arrests with no recorded date

- **WHEN** an arrest has no recorded date (its evidence cell month is `unknown`)
- **THEN** it counts in the No recorded date row, not in an income range or Unknown, and it counts in the Total row
- **AND** the No recorded date row's Share of agency arrests divides the personnel count by the agency arrests with no recorded date from the same source
- **AND** the row counts add up to all arrests in the personnel profile

#### Scenario: Profile with only undated arrests

- **WHEN** every arrest in a personnel arrest profile has no recorded date, so the profile has no recorded months
- **THEN** every income range row and Unknown show Count 0, and the No recorded date row and Total show all of the profile's arrests
- **AND** the note does not name a month range

#### Scenario: Data note for undated agency arrests

- **WHEN** an agency arrest profile has one or more arrests with no recorded date
- **THEN** intake attaches one data note to that agency saying how many recorded arrests have no date and that they are counted only in the No recorded date row
- **AND** when it has none, no such note is attached

#### Scenario: Total row

- **WHEN** a personnel arrest profile has a stored `by_income_status` breakdown
- **THEN** the Total row shows Count equal to all arrests in the personnel profile and Percentage 100.0%
- **AND** its Share of agency arrests divides that Count by the sum of the agency counts in all other rows, and shows `--` when that sum is 0

#### Scenario: Personnel counts exceed agency counts

- **WHEN** a personnel count is greater than the agency count in any row or in Total, or a census tract in both the personnel and agency evidence has different income estimates
- **THEN** the build fails with an error that names the personnel arrest profile

#### Scenario: Missing income evidence

- **WHEN** a personnel arrest profile or its agency comparison has no `cells` list or no `residential_income_by_tract` map, or the profile has no single matching agency comparison
- **THEN** the build fails with an error that names the arrest profile

#### Scenario: Share of agency arrests explanation

- **WHEN** the table is displayed
- **THEN** the Share of agency arrests header has an info icon that a visitor can open by mouse, touch, or keyboard
- **AND** the icon has an accessible name and shows this short explanation: "This person's arrests as a share of all agency arrests in the same row and months. It uses a different total than Percentage, so do not compare the two columns."

#### Scenario: Public explanation

- **WHEN** the table is displayed
- **THEN** its note explains that income is a neighborhood household estimate rather than personal income, defines Percentage, Share of agency arrests, and the Total row, says that the two percentage columns divide by different totals, and names the comparison months
- **AND** it says `--` means the agency has no recorded arrests in that row
