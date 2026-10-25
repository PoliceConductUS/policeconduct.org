## ADDED Requirements

### Requirement: Reconciliation without synthetic delivery probing

The scheduled reconciliation job SHALL NOT send synthetic mail, query delivery status, or receive a mail-provider credential. It SHALL retain key-only reconciliation, metrics, and independent alerts.

#### Scenario: A notification receipt is missing

- **WHEN** reconciliation finds a submission without its expected receipt
- **THEN** it emits the missing-receipt metric and independent alert without calling a mail provider

#### Scenario: Infrastructure retirement

- **WHEN** the reviewed retirement plan is deployed
- **THEN** the delivery-only alarm is removed and the shared schedule, reconciliation alarm, and intake notification paths remain
