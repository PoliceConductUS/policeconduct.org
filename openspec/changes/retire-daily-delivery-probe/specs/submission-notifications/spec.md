## ADDED Requirements

### Requirement: Reconciliation without synthetic delivery probing

The scheduled reconciliation job SHALL NOT send synthetic mail, query delivery status, or receive a mail-provider credential. It SHALL retain key-only reconciliation, metrics, and independent alerts.

#### Scenario: A notification receipt is missing

- **WHEN** reconciliation finds a submission without its expected receipt
- **THEN** it emits the missing-receipt metric and independent alert without calling a mail provider

#### Scenario: Infrastructure retirement

- **WHEN** the reviewed retirement plan is deployed
- **THEN** the delivery-only alarm is removed and the shared schedule, reconciliation alarm, and intake notification paths remain

### Requirement: Staff alerts require verification across every path

Staff notification infrastructure SHALL NOT alert on initial submission writes. Key reconciliation SHALL require a verification status key and a verified-event receipt.

#### Scenario: Unverified request is stored

- **WHEN** a request has no verification status key
- **THEN** no S3 notification is triggered by its initial write and reconciliation does not flag it for a missing staff receipt

#### Scenario: Verified request lacks its receipt

- **WHEN** a verification status key exists without a verified-event receipt
- **THEN** reconciliation reports the request using metadata only
