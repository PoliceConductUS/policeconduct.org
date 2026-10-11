# authority-discipline-browsing Specification

## Purpose

TBD - created by archiving change compact-authority-discipline. Update Purpose after archive.

## Requirements

### Requirement: Compact discipline summaries

Authority discipline records MUST retain person, action, supplied effective date, case number and complete supplied allegation in a compact summary. Additional optional facts and source links MUST be available through a keyboard-operable native disclosure without fabricated missing values. Source links MUST open the stored URL in a new tab. All records MUST remain accessible without JavaScript.

#### Scenario: Detailed record

- **WHEN** a record has additional recorded facts and a source URL
- **THEN** its summary exposes the complete supplied allegation, its details start collapsed and opening them reveals every supplied additional fact and the new-tab source link

### Requirement: Local discipline browsing

With JavaScript active, the collection MUST show at most ten matching records at a time and provide local previous/next page buttons, a result range, and case-insensitive person/case search across all records. A changed search MUST return to the first matching page. Controls MUST communicate boundaries and no results without trapping keyboard focus. These local controls SHALL NOT create pagination URLs.

#### Scenario: Find a later record

- **WHEN** a reader searches for a person or case outside the initial ten records
- **THEN** the matching record becomes visible and the count reflects the matches

#### Scenario: Page and reset

- **WHEN** a reader pages through the list and clears or changes the search
- **THEN** the list starts at the first matching page and Previous/Next accurately reflect available records

#### Scenario: No matches

- **WHEN** no person or case matches
- **THEN** the page shows a clear no-match message and permits clearing the search

### Requirement: Activity section navigation

The authority page MUST provide in-page links to its present activity sections and omit links to absent sections.

#### Scenario: Authority with discipline

- **WHEN** discipline records are present
- **THEN** a reader can jump directly to the discipline heading from the beginning of the content

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
