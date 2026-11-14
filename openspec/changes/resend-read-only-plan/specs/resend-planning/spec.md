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

### Requirement: Tracking DNS belongs to Terraform

The lookup SHALL include provider-returned Tracking records in the existing Route 53 record map.

#### Scenario: Provider requires a tracking CNAME

- **WHEN** Resend returns a Tracking CNAME
- **THEN** Terraform receives its qualified name, exact target, and TTL 600 alongside sending and receiving records

### Requirement: DNS creation preserves existing ownership

The PoliceConduct bootstrap SHALL reject creation over an existing DNS record that is absent from its state. Existing records SHALL be imported before management. Managed updates remain supported.

#### Scenario: A DNS record exists outside the selected state

- **WHEN** Terraform tries to create a record whose name and type already exist
- **THEN** creation fails instead of overwriting the existing record

#### Scenario: Existing managed records retain their values

- **WHEN** creation overwrite permission is disabled on adopted records
- **THEN** DNS names, types, values, aliases, routing settings, and TTLs remain unchanged

### Requirement: Iceconduct apply verifies account ownership

Iceconduct apply SHALL verify successful AWS identity and state reads and require the caller to match the single managed AWS account before applying.

#### Scenario: Identity or state cannot be verified

- **WHEN** a read fails or the caller differs from managed state ownership
- **THEN** the wrapper exits without invoking Terraform apply

### Requirement: Iceconduct declares its existing redirect origin

The redirect distribution SHALL declare its existing example.com placeholder origin without ignoring origin changes. The viewer-request function SHALL continue returning the configured redirect before origin access.

#### Scenario: Existing distribution is planned

- **WHEN** the recovered Iceconduct state is refreshed and planned
- **THEN** its origin requires no remote change

### Requirement: Iceconduct redirects to the existing ICE page

The Iceconduct redirect SHALL send all requests to https://www.policeconduct.org/federal/u-s-immigration-and-customs-enforcement/ with HTTP 301.

#### Scenario: A visitor uses either Iceconduct host

- **WHEN** a visitor requests the apex or www host with any path or query
- **THEN** the response redirects to the existing ICE agency page without appending the incoming path or query
