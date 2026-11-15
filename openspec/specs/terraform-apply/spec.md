# terraform-apply Specification

## Purpose

Prevent infrastructure apply wrappers from operating without existing managed state and verified account identity, and make infrastructure discovery failures visible before any write.

## Requirements

### Requirement: Existing managed state before wrapper apply

Policeconduct and iceconduct apply wrappers SHALL refuse execution before environment loading or deployment work when state is unreadable, invalid, or contains no managed resource instances.

#### Scenario: State cannot establish managed instances

- **WHEN** state pull fails, yields invalid JSON, or yields no managed instances
- **THEN** the wrapper exits unsuccessfully without invoking apply or package installation

#### Scenario: Managed instances exist

- **WHEN** state pull succeeds with version 4 state containing managed instances
- **THEN** the state-presence guard succeeds without modifying state or cloud resources
- **AND** passing the guard does not certify recovery completeness or authorize apply

### Requirement: Infrastructure reads fail closed

AWS account preflight MUST reject failed or malformed caller/state reads and require the caller to match the single managed AWS account. CloudFront discovery MUST fail on API errors rather than report resources absent.

#### Scenario: CloudFront access denied

- **WHEN** a CloudFront discovery request fails
- **THEN** the external lookup exits nonzero without returning an empty resource map

#### Scenario: AWS identity cannot be verified

- **WHEN** STS or state pull fails or account evidence is missing or mismatched
- **THEN** the apply wrapper stops before applying infrastructure
