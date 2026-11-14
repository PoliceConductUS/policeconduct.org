## ADDED Requirements

### Requirement: Terraform domain lookup is read-only

Terraform domain evaluation SHALL only issue GET requests to Resend and preserve the existing external data string-map contract.

#### Scenario: Existing domain has tracking drift

- **WHEN** Terraform evaluates the domain with differing tracking settings
- **THEN** it returns existing settings and DNS records without changing settings or triggering verification

#### Scenario: Domain does not exist

- **WHEN** Terraform cannot find the configured domain
- **THEN** it fails without creating or verifying any domain

### Requirement: Manual apply preserves existing domain configuration

An explicit apply SHALL create a missing domain only and SHALL NOT patch existing tracking settings, capabilities, or trigger verification.

#### Scenario: Tracking is enabled with a custom host

- **WHEN** apply reads an existing domain with enabled tracking and a custom tracking subdomain
- **THEN** it returns the current domain without PATCH or verification requests
