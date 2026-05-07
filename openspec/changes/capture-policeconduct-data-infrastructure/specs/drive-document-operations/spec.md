## ADDED Requirements

### Requirement: Hash-Verified Document Operations
PoliceConduct.org SHALL preserve hash-verified manifests for document organization, deduplication, and ingestion operations.

#### Scenario: Moving a Google Drive source document
- **WHEN** a document is moved, copied, deduplicated, or ingested
- **THEN** the operation SHALL record original path, destination path, SHA-256, action, classification, rationale, verification status, and blocker/error if any.

### Requirement: Duplicate Handling
PoliceConduct.org SHALL remove or skip duplicate documents only after content-hash verification.

#### Scenario: Destination already contains identical content
- **WHEN** a source document has the same SHA-256 as an existing destination document
- **THEN** the operation MAY remove or skip the duplicate original and SHALL record the retained destination path.

### Requirement: Non-Destructive Blockers
PoliceConduct.org SHALL leave unverified or ambiguous files in place unless explicitly reviewed.

#### Scenario: File cannot be hashed or copied
- **WHEN** a file operation cannot verify the destination hash or classify the file safely
- **THEN** the operation SHALL mark the file as blocked and SHALL NOT delete the source.

### Requirement: Importable Provenance
PoliceConduct.org SHALL make document-operation manifests available for later import into the source registry or document registry.

#### Scenario: Organization manifest exists
- **WHEN** a manifest is created during Drive cleanup or organization
- **THEN** it SHALL be stored in a known `manifests` location and SHALL be parseable as structured JSON or CSV.
