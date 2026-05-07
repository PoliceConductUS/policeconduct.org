## ADDED Requirements

### Requirement: Incident Evidence Graph

PoliceConduct.org SHALL model incidents as evidence graphs linking source-system records rather than as isolated reports.

#### Scenario: Building an incident graph

- **WHEN** an incident has CAD, 911, dispatch, BWC, MVR, report, arrest, force, complaint, evidence, lab, court, DA, EMS, ME, claim, IA, or litigation-hold records
- **THEN** the system SHALL preserve each record as a node with source-system IDs and SHALL store typed links between related records.

### Requirement: Stable Identifier Preservation

PoliceConduct.org SHALL preserve original identifiers and join keys from source systems.

#### Scenario: Importing CAD-linked data

- **WHEN** CAD data links to case, arrest, citation, force, BWC, or unit records
- **THEN** the system SHALL retain original CAD event IDs, unit IDs, timestamps, case numbers, arrest IDs, citation IDs, officer IDs, and other join keys.

### Requirement: Missing-Link Quality Findings

PoliceConduct.org SHALL identify expected-but-missing evidence links as data-quality findings.

#### Scenario: Force report without supervisor review

- **WHEN** a force event exists but no supervisor review, BWC record, or retention event is linked
- **THEN** the system SHALL flag the missing link with source notes and SHALL NOT infer misconduct solely from absence.

### Requirement: Civilian Evidence Compatibility

PoliceConduct.org SHALL allow civilian-collected evidence to be compared against agency timelines.

#### Scenario: Civilian video exists for an incident

- **WHEN** civilian video, photographs, witness statements, or scene notes are available
- **THEN** the evidence graph SHALL allow those records to be linked to agency events with timestamps, location notes, and provenance.
