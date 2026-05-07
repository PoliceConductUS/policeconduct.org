## ADDED Requirements

### Requirement: Candidate Dataset Evaluation
PoliceConduct.org SHALL evaluate candidate datasets before import or publication.

#### Scenario: Reviewing a local candidate dataset
- **WHEN** a dataset is found in local storage or an external source
- **THEN** the system SHALL capture file path/source URL, row count, fields, jurisdiction, record type, license/terms, sensitivity risks, publication status, and import recommendation.

### Requirement: Candidate Source Preparation Tasks
PoliceConduct.org SHALL create preparation tasks for candidate sources that are promising but not yet import-ready.

#### Scenario: Candidate source needs crawl or extraction work
- **WHEN** a source is likely relevant but does not yet provide a clean importable file
- **THEN** the evaluation SHALL create or reference a preparation task identifying required work, such as full indexing, bounded crawl, API investigation, file download, PDF/table extraction, schema discovery, field mapping, deduplication, license review, sensitivity review, or entity-resolution planning.

#### Scenario: Candidate source may contain court or litigation records
- **WHEN** a source may help identify qualified-immunity cases, civil-rights lawsuits, suppressed evidence, reversed convictions, settlements, Monell facts, or officer/agency litigation history
- **THEN** the evaluation SHALL capture court/source identifiers, likely linkage fields, claim/outcome classification needs, and whether the source should feed the evidence graph, officer profiles, agency report cards, or transparency index.

### Requirement: Import Manifest
PoliceConduct.org SHALL preserve an import manifest for every imported dataset.

#### Scenario: Importing CSV or XLSX data
- **WHEN** a dataset is imported
- **THEN** the system SHALL record original filename, SHA-256 hash, import timestamp, parser/transform version, source fields, normalized fields, rejected rows, and validation errors.

### Requirement: Publication Controls
PoliceConduct.org SHALL not publish sensitive or unverified datasets without review controls.

#### Scenario: Dataset contains reporter contact fields
- **WHEN** a dataset includes reporter contact, victim details, minors, medical data, addresses, or other sensitive fields
- **THEN** the system SHALL mark the dataset as non-public by default and require sanitization or aggregation before publication.

### Requirement: Comparative Dataset Labeling
PoliceConduct.org SHALL clearly distinguish comparative external datasets from local agency facts.

#### Scenario: Importing the PPD complaint bundle
- **WHEN** a non-Irving comparative dataset is imported
- **THEN** the public UI and API SHALL identify its source jurisdiction and SHALL NOT imply the records describe Irving officers or incidents.
### Requirement: Officer-Level Complaint Mapping
PoliceConduct.org SHALL support complaint and allegation imports that preserve officer-level links and organizational context.

#### Scenario: Importing complaint discipline rows
- **WHEN** a complaint dataset contains complaint IDs, allegation rows, officer IDs, units, findings, or discipline outcomes
- **THEN** the import SHALL preserve complaint-to-officer-to-allegation links and SHALL store officer ID, unit/assignment, finding, discipline outcome, and timeline fields so preferential treatment by unit, assignment, supervisor, or organizational segment can be analyzed.

#### Scenario: Complaint dataset lacks supervisor or assignment history
- **WHEN** a complaint dataset identifies officers but lacks contemporaneous supervisor, assignment, or chain-of-command fields
- **THEN** the dataset SHALL be marked as requiring roster/assignment enrichment before publishing organization-preference analysis.

