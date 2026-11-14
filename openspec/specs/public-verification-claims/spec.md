# public-verification-claims Specification

## Purpose

Describe site information and email confirmation without claiming that reports, facts, sources, records or identities are verified.

## Requirements

### Requirement: Public content does not claim verification

Public pages, metadata, FAQ structured answers and site-authored messages SHALL NOT state or imply that the organization manually or automatically verifies reports, facts, sources or records. They SHALL NOT promise fact checking before publication. They SHALL NOT substitute a new unsupported review process for the removed claim.

#### Scenario: A visitor reads report or support information

- **WHEN** public report, FAQ, donation, volunteer or submission content is rendered
- **THEN** it contains no claim that site information is verified or fact checked

### Requirement: Email confirmation does not imply content verification

The existing email-confirmation flow SHALL retain its security and submission behavior. Public labels, responses and email text SHALL describe confirming the email address and SHALL NOT describe the submission or its contents as verified. Internal route/status names MAY remain unchanged.

#### Scenario: A submitter follows the email link

- **WHEN** the existing confirmation operation succeeds
- **THEN** the public result identifies email confirmation without claiming report accuracy or verification

### Requirement: State the verification limit once

Public pages SHALL state the absence of verification once in the shared footer. Page bodies, individual reports and records SHALL NOT repeat verification-limit disclaimers.

#### Scenario: A visitor reads a report or legal page

- **WHEN** the page is rendered
- **THEN** its footer contains the single sitewide limit and its body does not repeat that limit
