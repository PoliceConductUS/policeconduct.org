# civil-case-content Specification

## Purpose

Describe case content and notifications without unsupported claims.

## Requirements

### Requirement: Case descriptions reflect their source

Case pages SHALL NOT present the mixed legacy claims_summary field as a complaint narrative or an AI-generated summary, including in page descriptions. A future AI summary SHALL be grounded in an identified complaint, link that filing, disclose AI generation, and distinguish allegations from findings.

#### Scenario: Legacy value contains only a cause code

- **WHEN** a case has a cause code or title in claims_summary
- **THEN** the case page does not display it as a complaint narrative

### Requirement: Case notification guidance is external

Case pages SHALL direct visitors to CourtListener for notifications and link its alert guidance. They SHALL use an existing CourtListener docket URL when available and otherwise link CourtListener. They SHALL NOT promise automatic site updates or claim that every filing is publicly available.

#### Scenario: Case has a retained CourtListener docket URL

- **WHEN** the visitor views notification guidance
- **THEN** the link opens that retained docket URL and alert guidance is available
