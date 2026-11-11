## ADDED Requirements

### Requirement: Advertising opt-out for every visitor

The shared analytics component SHALL deny advertising storage, advertising user data and advertising personalization before loading the Google tag. It SHALL set allow_google_signals and allow_ad_personalization_signals to false for G-40S6M70XP7.

#### Scenario: A visitor opens a page

- **WHEN** the analytics component loads
- **THEN** advertising consent defaults are denied before the external tag executes
- **AND** the page-view configuration disables both advertising signal flags
- **AND** ordinary analytics events remain available
