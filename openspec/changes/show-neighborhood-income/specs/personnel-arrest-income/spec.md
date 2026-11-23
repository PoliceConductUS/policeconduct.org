## ADDED Requirements

### Requirement: Neighborhood income distribution table

When an agency assignment has stored income rows, the personnel arrest display SHALL show its stored rows in stored order, with the columns Estimated household income, Count, Percentage, and Share of agency arrests, plus a Total row. The display SHALL NOT count, filter, or label rows itself. A stored row without its label or counts, or stored rows without an agency total, SHALL fail the build.

#### Scenario: Income ranges

- **WHEN** an agency assignment has stored income rows
- **THEN** its rows are the stored rows in stored order, with their stored labels, then a Total row

#### Scenario: No income rows stored

- **WHEN** an agency assignment has no stored income rows
- **THEN** no income table is shown for it

#### Scenario: Same-range comparison

- **WHEN** a personnel member has 100 arrests in a range out of 370 total and the row's stored agency count is 2500
- **THEN** Count is 100, Percentage is 27.0%, and Share of agency arrests is 4.0%
- **AND** Percentage divides by all arrests of the agency assignment, including Unknown and No recorded date
- **AND** Share of agency arrests divides by the row's stored agency count

#### Scenario: Zero agency denominator

- **WHEN** the stored agency count in a row is 0
- **THEN** Share of agency arrests displays `--`, not a percentage

#### Scenario: Unknown income

- **WHEN** the stored rows include an Unknown row
- **THEN** it shows its stored count, and that count is part of the total denominator
- **AND** the page does not show why the income could not be determined

#### Scenario: Arrests with no recorded date

- **WHEN** the stored rows include a No recorded date row
- **THEN** it shows its stored count, and its Share of agency arrests divides that count by the row's stored agency count

#### Scenario: Assignment with only undated arrests

- **WHEN** every arrest of an agency assignment has no recorded date
- **THEN** the table shows the stored rows (intake supplies 0 in every range and Unknown, and all arrests in No recorded date)
- **AND** the header and the note show the stored first and last month as stored

#### Scenario: Agency annotations

- **WHEN** the agency has annotations recorded for it
- **THEN** its agency page shows them

#### Scenario: Total row

- **WHEN** an agency assignment has stored income rows
- **THEN** the Total row shows Count equal to all arrests of the agency assignment and Percentage 100.0%
- **AND** its Share of agency arrests divides that Count by the stored agency total (the agency's arrests in the recorded months plus all of its arrests with no recorded date), and shows `--` when it is 0

#### Scenario: Invalid income rows

- **WHEN** a stored row lacks its label or counts, or stored rows have no agency total
- **THEN** the build fails with an error that names the agency assignment's arrest scope

#### Scenario: Share of agency arrests explanation

- **WHEN** the table is displayed
- **THEN** the Share of agency arrests header has an info button that a visitor can open by mouse, touch, or keyboard
- **AND** the button has an accessible name and shows this short explanation: "Recorded arrests linked to this agency assignment, as a share of the agency's arrests in the same row. For rows with a date, only agency arrests in the same months count. This uses a different total than Percentage, so do not compare the two columns."

#### Scenario: Public explanation

- **WHEN** the table is displayed
- **THEN** its note explains that income is a neighborhood household estimate rather than personal income, defines Percentage, Share of agency arrests, and the Total row, says that the two percentage columns divide by different totals, and names the comparison months as stored
- **AND** it says `--` means the agency has no recorded arrests in that row

### Requirement: Income rows and agency comparison come from stored data

Income rows, their labels and their counts, including the agency counts and the agency total, SHALL come from stored data that intake supplies. The site SHALL NOT match records by source or months, count arrests, or filter by month.

#### Scenario: Stored labels

- **WHEN** intake supplies the income rows for an agency assignment
- **THEN** the table shows those labels in stored order, and the site adds no labels of its own

#### Scenario: Stored agency counts

- **WHEN** a stored row has an agency count
- **THEN** Share of agency arrests uses that count, and the site computes no agency count of its own
