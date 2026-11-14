## ADDED Requirements

### Requirement: Advanced consent with independent advertising denial

The site SHALL default analytics storage to denied unless a valid saved choice
grants it. The site SHALL load Google Analytics in both states for advanced
consent measurement. Consent defaults SHALL precede tag loading. Advertising
storage, user data and personalization SHALL remain denied in all states, and
both advertising-related configuration flags SHALL remain false.

#### Scenario: First visit or declined choice

- **WHEN** no valid accepted choice is stored
- **THEN** analytics storage is denied before loading Google
- **AND** cookieless measurement remains enabled

#### Scenario: Visitor accepts or withdraws

- **WHEN** the visitor uses the Allow or Decline analytics cookies button
- **THEN** the site sends the corresponding analytics storage consent update
- **AND** saves the choice where browser storage is available
- **AND** advertising remains denied
- **AND** declining removes first-party GA cookies

#### Scenario: Storage unavailable

- **WHEN** the browser cannot save the choice
- **THEN** the current page applies it and explains that it could not be saved
- **AND** a later visit defaults to denied

#### Scenario: Change in another tab

- **WHEN** a saved choice changes or is cleared in another tab
- **THEN** this tab applies the new choice, defaulting to denied when cleared
