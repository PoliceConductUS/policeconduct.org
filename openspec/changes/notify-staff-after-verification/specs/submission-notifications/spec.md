## ADDED Requirements

### Requirement: Staff notifications require verification

The forms API SHALL notify staff only for verified submissions.

#### Scenario: A submission is received

- **WHEN** a submission is stored before verification
- **THEN** no staff email or SNS notification is sent
- **AND** no notification delivery failure alarm or notification receipt is generated

#### Scenario: Verification succeeds

- **WHEN** verification succeeds and the verified record and review status are persisted
- **THEN** the existing staff notification and delivery receipt are produced

#### Scenario: An unsupported notification event is supplied

- **WHEN** the notification coordinator receives an event other than verified
- **THEN** it produces no notification side effects
