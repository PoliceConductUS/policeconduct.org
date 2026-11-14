## ADDED Requirements

### Requirement: Existing managed state before wrapper apply

Policeconduct and iceconduct apply wrappers SHALL refuse execution before environment loading or deployment work when state is unreadable, invalid, or contains no managed resource instances.

#### Scenario: State cannot establish managed instances

- **WHEN** state pull fails, yields invalid JSON, or yields no managed instances
- **THEN** the wrapper exits unsuccessfully without invoking apply or package installation

#### Scenario: Managed instances exist

- **WHEN** state pull succeeds with version 4 state containing managed instances
- **THEN** the state-presence guard succeeds without modifying state or cloud resources
- **AND** passing the guard does not certify recovery completeness or authorize apply
