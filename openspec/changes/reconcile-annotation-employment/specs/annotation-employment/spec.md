## ADDED Requirements

### Requirement: Employment assertions preserve uncertain source dates

The site SHALL classify an assignment as current only when its effective separation date is absent and its reported start date is absent or a valid calendar date no later than today. It SHALL classify an assignment as ended only when its effective separation date is a valid calendar date before today and no reported start date is invalid, future, or later than the separation date. Other retained separation values SHALL produce uncertain status without a current-employer structured-data assertion.

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
