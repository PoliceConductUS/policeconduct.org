## ADDED Requirements

### Requirement: Agency offices require current personnel

Agency office generation, office navigation and legacy redirects SHALL require at least one personnel assignment with `end_date IS NULL`, regardless of federal affiliation. Root federal agencies SHALL always receive detail pages and directory entries. Former-only offices SHALL be excluded. Rosters of qualifying agencies SHALL retain current and former personnel.

#### Scenario: Office has only former assignments

- **WHEN** every assignment at an office has an end date
- **THEN** that office is excluded from generated agency routes, office directories and redirects
- **AND** its root federal parent remains included if present

### Requirement: Personnel can be filtered by discipline

Agency personnel rosters SHALL offer a checkbox labeled "With discipline actions" that retains only rows with positive agency-linked discipline counts. It SHALL combine with existing status and name filters, update the result summary and empty state, and work on small rosters.

#### Scenario: Filters combine

- **WHEN** discipline-only, current status and a name search are selected
- **THEN** only rows matching all three criteria remain visible

#### Scenario: Checkbox is cleared

- **WHEN** the visitor clears the discipline checkbox
- **THEN** rows matching the remaining filters become visible again
