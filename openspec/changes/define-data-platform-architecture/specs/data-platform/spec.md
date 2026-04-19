## ADDED Requirements

### Requirement: Per-Source Contracts

The data platform MUST define a source contract for each connector class before implementation.

#### Scenario: Source contract captures operational constraints
- **WHEN** a new source class is introduced
- **THEN** the platform defines its owner, access method, frequency, volume expectations, format, freshness, legal or policy constraints, and intended downstream use

#### Scenario: Source classes stay distinct
- **WHEN** FOIA, websites, CourtListener, OpenSalary, or manual uploads are modeled
- **THEN** each is treated as its own connector class with its own operational contract

### Requirement: Raw And Archive Retention

The data platform MUST preserve raw payloads and archive artifacts before business transforms.

#### Scenario: Raw payloads are retained for replay
- **WHEN** a source item is fetched successfully
- **THEN** the original payload or equivalent raw evidence bundle is retained in raw storage before downstream normalization

#### Scenario: Archive metadata is tracked
- **WHEN** an archive artifact is created or skipped
- **THEN** the platform records its storage location, status, and relevant failure or skip reason

### Requirement: Layered Data Model

The data platform MUST separate raw, normalized, and publish concerns.

#### Scenario: Raw layer preserves source fidelity
- **WHEN** data first lands in the system
- **THEN** it is stored in a raw layer that prioritizes provenance and replayability over stakeholder usability

#### Scenario: Normalized layer standardizes source data
- **WHEN** raw data is parsed and canonicalized
- **THEN** normalized records capture stable source-item identity, extracted entities, and source-item versioning

#### Scenario: Publish layer serves the public site
- **WHEN** data is prepared for `policeconduct.org`
- **THEN** the platform emits denormalized publish-facing rows and stats that are safe for public route generation and rendering

### Requirement: Idempotent And Backfillable Jobs

The data platform MUST support replay-safe execution and scoped backfills.

#### Scenario: Repeated runs do not duplicate outputs
- **WHEN** the same source batch or transform run is executed more than once
- **THEN** source items, entity links, and derived stats are not duplicated

#### Scenario: Backfills can be scoped
- **WHEN** a schema change, matching-rule change, or source correction requires reprocessing
- **THEN** the platform supports reprocessing by source, state, entity, or date range

### Requirement: Lineage And Quality Guarantees

The data platform MUST preserve minimum lineage and enforce core data quality assertions.

#### Scenario: Public data can be traced backward
- **WHEN** a published officer, agency, report, or state datum is questioned
- **THEN** the system can trace it through publish row, derived stat, entity link, and source item lineage

#### Scenario: Core quality assertions are enforced
- **WHEN** publish data is produced
- **THEN** required slugs are unique and non-null, agency category is present, references resolve to existing entities, and rating values remain within defined bounds

### Requirement: Batch-First Stat Recomputations

The data platform MUST default to scheduled batch jobs for rating and stat updates.

#### Scenario: Nightly stat refresh
- **WHEN** officer, agency, and state ratings or stats are refreshed
- **THEN** the platform runs them as scheduled batch recomputations unless a later product requirement establishes a stricter freshness target
