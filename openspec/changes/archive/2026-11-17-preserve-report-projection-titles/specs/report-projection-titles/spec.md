## ADDED Requirements

### Requirement: Report summaries retain distinct titles

Report projections SHALL preserve the report title independently of linked personnel job titles.

#### Scenario: A report has personnel with a job title

- **WHEN** report summaries are regenerated
- **THEN** the summary title equals the stored report title
- **AND** each linked personnel title remains the job title

### Requirement: Duplicate query columns fail closed

The report projection query SHALL reject duplicate output column names before derived rows are written.

#### Scenario: Two selected columns share a name

- **WHEN** the projection query returns duplicate column names
- **THEN** projection generation fails instead of silently overwriting a field
