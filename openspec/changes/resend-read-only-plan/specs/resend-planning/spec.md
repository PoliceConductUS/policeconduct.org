## ADDED Requirements

### Requirement: Terraform domain lookup is read-only

Terraform domain evaluation SHALL only issue GET requests to Resend and preserve the existing external data string-map contract.

#### Scenario: Existing domain has tracking drift

- **WHEN** Terraform evaluates the domain with differing tracking settings
- **THEN** it returns existing settings and DNS records without changing settings or triggering verification

#### Scenario: Domain does not exist

- **WHEN** Terraform cannot find the configured domain
- **THEN** it fails without creating or verifying any domain

### Requirement: Manual apply is idempotent for matching tracking settings

An explicit apply SHALL NOT patch a domain already matching the existing update payload.

#### Scenario: Tracking settings already match

- **WHEN** apply reads disabled click/open tracking and tracking subdomain links
- **THEN** it performs no PATCH request
