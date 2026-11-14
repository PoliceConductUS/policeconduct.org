## ADDED Requirements

### Requirement: Advanced consent with independent advertising choices

The site SHALL default analytics storage to denied unless a valid saved choice
grants it. The site SHALL load Google Analytics in both states for advanced
consent measurement. Consent defaults SHALL precede tag loading. Advertising storage, user data and personalization SHALL default to denied and follow an independent advertising opt-in. Both advertising flags SHALL follow that choice on initial load and updates. Existing analytics-only choices SHALL never grant advertising.

#### Scenario: First visit or declined choice

- **WHEN** no valid accepted choice is stored
- **THEN** analytics storage is denied before loading Google
- **AND** cookieless measurement remains enabled

#### Scenario: Visitor accepts or withdraws

- **WHEN** the visitor uses the Allow all or Decline all button
- **THEN** the site sends the corresponding analytics storage consent update
- **AND** saves the choice where browser storage is available
- **AND** advertising follows the visitor’s explicit advertising choice
- **AND** declining removes first-party GA cookies

#### Scenario: Storage unavailable

- **WHEN** the browser cannot save the choice
- **THEN** the current page applies it and explains that it could not be saved
- **AND** a later visit defaults to denied

#### Scenario: Change in another tab

- **WHEN** a saved choice changes or is cleared in another tab
- **THEN** this tab applies the new choice, defaulting to denied when cleared

#### Scenario: Save category choices

- **WHEN** a visitor changes either category checkbox and saves preferences
- **THEN** the corresponding independent category consent is applied and remembered
- **AND** advertising follows the visitor’s explicit advertising choice
- **AND** the dialog closes and focus returns to Cookie settings
