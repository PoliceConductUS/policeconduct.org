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

### Requirement: Excluded agencies remain recorded in personnel history

Personnel pages SHALL load assignment agency identity from agency and its exact location_path, independently of page eligibility. They SHALL retain historical assignments for excluded agencies, display those agency names without page links, and continue failing if the required agency identity is missing.

#### Scenario: Former agency has no current personnel

- **WHEN** a personnel profile has a recorded assignment at an agency without a generated page
- **THEN** its profile and agency-history page show the recorded assignment without linking to an ungenerated agency page
