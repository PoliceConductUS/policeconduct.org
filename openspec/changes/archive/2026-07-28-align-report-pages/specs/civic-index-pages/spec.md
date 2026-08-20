## ADDED Requirements

### Requirement: Record-count integrity

Displayed per-officer and per-agency record counts SHALL derive from live
record joins (or projections verified fresh at build time) and MUST NOT render
zero when source records exist.

#### Scenario: Agency personnel page renders report counts

- **WHEN** an agency personnel page renders an officer who has linked
  experience reports
- **THEN** the officer's report count reflects the live count of distinct
  linked reports
- **AND** a stale or unpopulated statistics projection cannot cause the count
  to render as zero
