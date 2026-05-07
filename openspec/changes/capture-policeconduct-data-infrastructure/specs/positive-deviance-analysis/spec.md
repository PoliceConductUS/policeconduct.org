## ADDED Requirements

### Requirement: Positive-Deviance Analysis
PoliceConduct.org SHALL support identifying positive-deviance candidates: agencies, officers, supervisors, units, policies, practices, and community workflows that produce unusually good public-trust or public-safety outcomes under comparable constraints.

#### Scenario: Identifying a positive-deviance candidate
- **WHEN** an analysis labels an entity or practice as a positive-deviance candidate
- **THEN** the system SHALL store the defined problem, desired outcome, comparison group, date range, outcome metrics, source records, constraints considered, confidence level, and limitations.

### Requirement: Positive-First Comparative Framing
PoliceConduct.org SHALL analyze high-performing agencies, officers, supervisors, or units as deliberately as it analyzes failures, misconduct, or weak accountability.

#### Scenario: Reviewing agency performance
- **WHEN** comparable agencies show different outcomes for force, complaints, records responsiveness, training, enforcement, litigation, or community trust indicators
- **THEN** the system SHOULD identify unusually strong performers and preserve hypotheses about the practices, policies, supervision routines, training, or community workflows that may explain the difference.

### Requirement: Practice-Level Discovery
PoliceConduct.org SHALL distinguish positive outcomes from the practices that may produce them.

#### Scenario: Capturing a candidate practice
- **WHEN** a positive outcome appears credible
- **THEN** the system SHOULD record candidate explanatory practices such as supervision routines, dispatch protocols, crisis-response models, training completion patterns, policy language, disclosure habits, complaint-intake design, diversion workflows, or community partnerships.

### Requirement: Community-Informed Inquiry
PoliceConduct.org SHALL allow positive-deviance findings to be informed by community members, residents, journalists, attorneys, researchers, agency staff, and other stakeholders while preserving source provenance and confidence.

#### Scenario: Adding stakeholder evidence
- **WHEN** a stakeholder contributes evidence or context about a candidate positive practice
- **THEN** the system SHALL preserve contributor type, source record, date, claim summary, verification status, and any sensitivity or publication limits.

### Requirement: Positive-Deviance Publication Guardrails
PoliceConduct.org SHALL avoid presenting positive-deviance findings as unsupported praise or blanket endorsements.

#### Scenario: Publishing a positive-deviance candidate
- **WHEN** a page presents a positive-deviance candidate
- **THEN** the page SHALL show the specific problem, metric, comparison context, sources, limitations, and review status, and SHALL NOT imply the entity is safe or exemplary across unrelated domains.

### Requirement: Iterative Monitoring
PoliceConduct.org SHALL monitor positive-deviance findings over time and revise or withdraw them when later evidence changes the analysis.

#### Scenario: New evidence contradicts a positive-deviance finding
- **WHEN** new data, litigation, complaints, discipline, public-records responses, or community evidence materially changes a positive-deviance analysis
- **THEN** the system SHALL update the finding, preserve revision history, and mark the prior finding as revised, superseded, or withdrawn.
