# current-schema-consumers Specification

## Purpose

Keep site consumers aligned with the current database schema while preserving canonical identity, surviving public records, and strict required-data validation.

## Requirements

### Requirement: Site consumers use the current database schema

The site MUST build and render without querying the ten tables dropped by migration `20260928234246_drop_empty_tables.sql`. It SHALL remove obsolete fields and displays, preserve surviving evidence and identity sources, and retain strict validation for still-required tables.

#### Scenario: Current database lacks retired tables

- **WHEN** schema checks, projection refresh, redirects, and affected pages run against the current database
- **THEN** they do not query dropped tables
- **AND** surviving agency, personnel, report, and civil-case information remains available
- **AND** no inferred relationships or fabricated counts are introduced

#### Scenario: A still-required table is missing

- **WHEN** a required surviving table is absent
- **THEN** validation fails explicitly

#### Scenario: Personnel contribution forms are opened

- **WHEN** a visitor opens the personnel suggestion or edit form
- **THEN** the existing form remains enabled

### Requirement: Federal offices use the direct parent relationship

The site MUST identify federal branch agencies through `agency.parent_federal_agency_id` referencing `federal_agency.id`. Federal listings, counts, parent links, and legacy redirects SHALL use this replacement relationship, subject to the same current-personnel eligibility rule as all other agencies.

#### Scenario: Federal office has no current personnel

- **WHEN** an agency has a parent_federal_agency_id and no current personnel assignments
- **THEN** it is excluded from agency generation and federal directories
- **AND** root federal agencies always receive detail pages and Federal directory entries, even without qualifying offices

#### Scenario: Reader browses federal offices

- **WHEN** a federal directory or detail page is loaded
- **THEN** branch counts and office lists match qualifying direct FK relationships
- **AND** each office links to its database-backed canonical agency path
- **AND** its agency page links back to its federal parent
