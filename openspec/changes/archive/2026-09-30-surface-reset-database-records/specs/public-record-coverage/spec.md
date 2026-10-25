## ADDED Requirements

### Requirement: Useful public records are available on visitor pages

The site SHALL account for every public table in a coverage audit and expose useful records through the existing entity pages, without exposing internal bookkeeping as public content.

#### Scenario: Agency has no linked personnel

- **WHEN** an agency has valid required database identity and a place location
- **THEN** it receives its canonical agency page and appears in location navigation regardless of linked personnel or cases

#### Scenario: Personnel has arrest profiles

- **WHEN** arrest profiles are linked to a person's agency assignments
- **THEN** the personnel page renders each profile's agency, source, covered months, recorded total, and every stored breakdown among the seven supported dimensions
- **AND** counts have shares and time context, district codes retain source meaning, and no causal or unique-agency-total claim is made

#### Scenario: Stored optional public facts exist

- **WHEN** a report has narrative facts or a requested outcome, a civil case has a closing date, or a personnel record has a death source
- **THEN** the corresponding page shows those facts with clear labels and source links
- **AND** absent optional facts are omitted

### Requirement: Preview release is fully verified

The release SHALL preserve required-data failures and canonical routing, pass format and aggregate validation, finish the full static build, and publish that build to the existing PR preview.

#### Scenario: Preview is ready for review

- **WHEN** publication is reported complete
- **THEN** committed and synced source matches the published build, expected record pages and assets respond successfully, and coverage evidence accounts for the database tables
