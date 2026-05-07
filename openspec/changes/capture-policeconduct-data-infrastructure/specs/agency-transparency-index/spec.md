## ADDED Requirements

### Requirement: Agency Transparency Index
PoliceConduct.org SHALL maintain a fine-grained agency-level transparency index that measures whether an agency makes accountability-relevant information available without custom requests and whether requested information is released predictably, completely, and in usable formats.

#### Scenario: Scoring agency transparency
- **WHEN** an agency profile is evaluated
- **THEN** the transparency index SHALL store component scores, source evidence, date checked, reviewer or automation method, limitations, and confidence for each scored transparency dimension.

### Requirement: Transparency Dimensions
PoliceConduct.org SHALL score transparency across separate dimensions rather than only a single aggregate score.

#### Scenario: Evaluating transparency dimensions
- **WHEN** an agency is scored
- **THEN** the index SHALL evaluate, where applicable, publication of policies, officer roster or staffing data, pay or compensation data, budgets, grants, procurement, union contracts, use-of-force data, officer-involved shooting data, complaints, discipline, commendations, stops, searches, citations, arrests, charge dispositions, bail and custody data, in-custody injury or death data, juvenile-interaction data, training records, body-camera policy, surveillance technology, asset forfeiture, lawsuit and settlement data, public-records instructions, public-records logs, machine-readable downloads, metadata, update frequency, and archive availability.

### Requirement: Machine-Readable Data Weighting
PoliceConduct.org SHALL distinguish human-readable publication from machine-readable data access.

#### Scenario: Agency publishes only PDFs
- **WHEN** an agency publishes data only as PDFs, scanned documents, dashboards without downloads, or image-based reports
- **THEN** the relevant transparency component SHALL receive less credit than an agency publishing documented CSV, JSON, API, database export, or other reusable machine-readable data with stable field definitions.

### Requirement: Public-Records Responsiveness Scoring
PoliceConduct.org SHALL include public-records behavior as a transparency dimension.

#### Scenario: Evaluating public-records responsiveness
- **WHEN** public-records request history is available
- **THEN** the index SHALL score whether the agency provides clear request instructions, acknowledges requests promptly, provides tracking IDs, estimates costs, meets statutory deadlines, avoids improper delay, releases non-exempt records, provides useful formats, explains redactions, preserves appeal/ruling history, and complies with oversight rulings.

### Requirement: Granular Evidence for Each Score
PoliceConduct.org SHALL make transparency scoring auditable by tying each score to evidence.

#### Scenario: Viewing score evidence
- **WHEN** a visitor or operator reviews a transparency score
- **THEN** the system SHALL show or preserve the source URL, archive URL or local source path, date checked, relevant excerpt or field, scoring rule, score awarded, reviewer notes, and known limitations.

### Requirement: Score Confidence and Freshness
PoliceConduct.org SHALL label transparency scores by freshness and confidence.

#### Scenario: Source has not been rechecked recently
- **WHEN** a score depends on a source that has not been checked within the configured refresh window
- **THEN** the score SHALL be marked stale or needs recheck without silently presenting it as current.

### Requirement: Transparency Score Aggregation
PoliceConduct.org SHALL support aggregate transparency grades while preserving component-level detail.

#### Scenario: Showing aggregate transparency rating
- **WHEN** an agency has enough scored components
- **THEN** the report card MAY show an aggregate transparency grade or index value, but SHALL preserve component scores and SHALL NOT hide weak dimensions behind a strong aggregate score.

### Requirement: Comparable Agency Transparency Analysis
PoliceConduct.org SHALL compare transparency between agencies only within clearly defined comparison groups.

#### Scenario: Comparing agencies
- **WHEN** the site presents a transparency ranking or peer comparison
- **THEN** it SHALL identify the comparison group, such as state, agency type, population served, budget band, or staffing band, and SHALL disclose missing-data limitations.

### Requirement: Transparency Improvement Tracking
PoliceConduct.org SHALL track year-over-year transparency changes.

#### Scenario: Agency publishes new data
- **WHEN** an agency adds, removes, improves, degrades, or changes access to a transparency source
- **THEN** the index SHALL record the change, effective date or detection date, affected dimensions, prior evidence, new evidence, and resulting score change.

### Requirement: Non-Punitive Transparency Labels
PoliceConduct.org SHALL distinguish lack of discovered data from proof of non-publication.

#### Scenario: Data source has not been found
- **WHEN** a transparency component has not been verified
- **THEN** the system SHALL label it as unknown, not found, not published, request-required, published-but-not-machine-readable, or blocked-by-access-limits as appropriate, and SHALL preserve the basis for that label.
