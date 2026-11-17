# civil-case-dates Specification

## Purpose

Show dates that describe the court case without presenting internal record maintenance as a court event.

## Requirements

### Requirement: Case dates describe court events

Civil case detail pages SHALL show the filed date and the closed date when present. They SHALL NOT display the internal database updated_at timestamp as an Updated row. Internal timestamps SHALL remain available to existing auditing and metadata consumers.

#### Scenario: Case record has an internal update timestamp

- **WHEN** a visitor opens a case detail page with an updated_at value
- **THEN** the facts list omits the Updated row and preserves the filed and available closed dates
