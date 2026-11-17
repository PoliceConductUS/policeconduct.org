## ADDED Requirements

### Requirement: Display stored agency status and date

The agency overview MUST display each supplied status and status_date near the agency name, with a prominent notice for any non-active status. Active matching MUST ignore case. Null values MUST be omitted independently without implying active status. Dates MUST preserve the database calendar day and use the label Status date.

#### Scenario: Inactive agency

- **WHEN** an agency has INACTIVE status and status_date 2004-01-07
- **THEN** its header prominently displays Inactive and Status date: January 7, 2004 with a time datetime of 2004-01-07

#### Scenario: Active agency

- **WHEN** an agency has ACTIVE status and a date
- **THEN** both values appear near its name as compact metadata

#### Scenario: Optional data

- **WHEN** either or both fields are null
- **THEN** only supplied values appear, with no fallback value or inferred status

### Requirement: Match agency search metadata to displayed status

Page and social descriptions and ProfilePage/GovernmentOrganization structured descriptions MUST include the supplied status and date. Non-active status MUST also appear in page and social titles. Canonical URLs and organization names MUST remain unchanged. Status dates MUST NOT become founding, dissolution, or modified dates.

#### Scenario: Non-active search result

- **WHEN** an agency is non-active
- **THEN** its title includes that status and descriptions include supplied status and date

### Requirement: Require status schema columns

Schema validation and agency detail queries MUST require agency.status and agency.status_date while allowing null values.

#### Scenario: Missing schema

- **WHEN** either column is missing
- **THEN** schema validation and the detail query fail
