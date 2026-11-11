## ADDED Requirements

### Requirement: Employment assertions preserve uncertain source dates

An assignment SHALL be current only when its effective end date is absent and its start date is absent or valid and no later than today. It SHALL be ended only when its end date is valid and before today, with no invalid/future start or reversed chronology. Other retained dates SHALL produce uncertain status and no current-employer structured-data assertion.

#### Scenario: Typed null retains an unreadable source value

- **WHEN** the typed separation column is null but source evidence retains an unreadable effective value
- **THEN** the assignment is neither current nor former and the source annotation remains available

#### Scenario: Future separation is reported

- **WHEN** a reported separation date is today or in the future
- **THEN** status is uncertain and no worksFor claim is emitted for that assignment

#### Scenario: Confirmed ended assignment

- **WHEN** every effective separation date is valid and in the past
- **THEN** the profile headlines the most recently ended assignment, displays its separation date, and withholds worksFor

#### Scenario: Effective correction clears the separation date

- **WHEN** an accepted correction explicitly sets the effective separation date to null
- **THEN** the assignment is open and the retained correction remains inspectable

#### Scenario: Calendar dates render across time zones

- **WHEN** a source reports a valid date-only separation value
- **THEN** headline, history, and metadata display that same calendar date regardless of the server time zone

#### Scenario: Contradictory chronology is retained

- **WHEN** a retained separation date precedes the reported start date, or the reported start is invalid or future
- **THEN** the assignment has uncertain status, both reported values remain visible, and no current-employer assertion is emitted

#### Scenario: Follow-up forms preserve uncertainty

- **WHEN** a profile has no confirmed current assignment
- **THEN** follow-up forms do not prefill a current employer
- **AND** only confirmed ended assignments prefill past employers
