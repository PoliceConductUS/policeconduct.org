## ADDED Requirements

### Requirement: Policy Topic Taxonomy
PoliceConduct.org SHALL maintain policy-topic domains that can classify data sources, incidents, requests, records, training, funding, audits, and documents.

#### Scenario: Seeding policy topics
- **WHEN** policy topics are imported from an external reference such as the IACP policy-topic directory
- **THEN** the system SHALL store topic name, source URL, priority tier, applicability notes, and a disclaimer that the external reference is a taxonomy aid rather than normative endorsement.

### Requirement: Priority Tiers
PoliceConduct.org SHALL support priority tiers for policy topics.

#### Scenario: Classifying a high-value accountability topic
- **WHEN** a topic directly maps to stops, arrests, searches, force, surveillance, misconduct, evidence, retaliation, litigation, funding, or officer accountability
- **THEN** the topic SHALL be assignable as Tier 1.

### Requirement: Cross-Domain Tagging
PoliceConduct.org SHALL allow a policy topic to be linked to records across multiple domains.

#### Scenario: Automated License Plate Readers topic
- **WHEN** a policy topic concerns a technology or unit
- **THEN** the topic MAY link to policies, procurement, grants, vendors, deployments, incidents, audits, complaints, and training records.
