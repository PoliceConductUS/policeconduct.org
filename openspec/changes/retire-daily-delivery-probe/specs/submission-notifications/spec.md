## ADDED Requirements

### Requirement: No scheduled monitoring

The notification stack SHALL contain no scheduled checks or resources dedicated to monitoring. Actual verified-submission notifications SHALL remain.

#### Scenario: Removal is deployed

- **WHEN** the approved removal plan is applied
- **THEN** the monitor, schedule, monitoring role, alert topic, and monitoring alarms are absent
- **AND** verified-submission notifications remain configured

### Requirement: Staff alerts require verification

Staff notifications SHALL occur only after successful email verification.

#### Scenario: Unverified request is stored

- **WHEN** an initial request is stored
- **THEN** only the submitter verification email is sent

#### Scenario: Verification succeeds

- **WHEN** the submitter verifies their email
- **THEN** staff notification and its verification-status S3 backstop run
