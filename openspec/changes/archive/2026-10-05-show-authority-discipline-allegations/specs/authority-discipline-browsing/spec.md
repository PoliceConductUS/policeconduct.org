## ADDED Requirements

### Requirement: Scan allegations without expansion

Authority discipline rows SHALL display the complete supplied allegation with Record details closed and use compact spacing without reducing shared text sizes. Other optional details and source links SHALL be inside the disclosure. Source links SHALL open the stored URL in a new tab.

#### Scenario: Allegation and source supplied

- **WHEN** an authority discipline record has an allegation and document URL
- **THEN** its allegation is visible with details closed
- **AND** its source link is visible after expansion and targets a new tab

#### Scenario: Officer-page allegation supplied

- **WHEN** an officer discipline record has an allegation
- **THEN** its complete allegation is visible with Record details closed
- **AND** its remaining detail fields stay collapsed

#### Scenario: Officer-page source supplied

- **WHEN** an officer discipline record has a source document
- **THEN** its source link is hidden until Record details is expanded
- **AND** the source link opens its stored URL in a new tab
