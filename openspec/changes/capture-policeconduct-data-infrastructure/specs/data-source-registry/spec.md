## ADDED Requirements

### Requirement: Data Source Records

PoliceConduct.org SHALL maintain records for public data sources, APIs, downloads, portals, request paths, and archive locations that may support police accountability research.

#### Scenario: Adding a discovered data source

- **WHEN** an operator records a discovered source such as PDAP, OpenPoliceData, an agency portal, or a public dataset
- **THEN** the system SHALL store source name, source URL, jurisdiction, agency, record type, access method, coverage dates, license/terms, source owner, provenance notes, and status.

### Requirement: Source Health and Archival Tracking

PoliceConduct.org SHALL track whether a source is reachable, when it was last checked, whether it was archived, and whether its schema or availability changed.

#### Scenario: Source check runs

- **WHEN** a source check is performed
- **THEN** the system SHALL record check time, HTTP/status result where applicable, archive URL if created, detected schema/hash changes, and any blocker or access limitation.

### Requirement: Crawl and Index Source Records

PoliceConduct.org SHALL support source records for pages, portals, sites, APIs, document libraries, and dataset directories that need crawl, indexing, mirroring, or manual extraction before they become importable datasets.

#### Scenario: Registering a source for crawl or indexing

- **WHEN** an operator records a candidate site such as ICPSR NACJD, NIJ datasets, a police transparency portal, an academic journal, a nonprofit methodology page, or a federal document library
- **THEN** the registry SHALL capture seed URL(s), canonical URL, crawl scope, likely data domains, access constraints, terms/robots notes, refresh cadence, expected output type, and whether the source is intended for full indexing, bounded indexing, API import, download mirroring, manual extraction, or citation-only reference.

### Requirement: Source-to-Metric Coverage Mapping

PoliceConduct.org SHALL map each data source to the report-card, evidence-graph, transparency-index, and officer-profile metrics it may support.

#### Scenario: Source supports multiple metric families

- **WHEN** a candidate source contains information about funding, arrests, complaints, training, court cases, public-records releases, or custody outcomes
- **THEN** the registry SHALL record the supported metric families, entity level (agency, officer, incident, court case, custody event, funding stream, training event), expected identifiers, linkage value, sensitivity risks, and import priority.

### Requirement: Data Request Linkage

PoliceConduct.org SHALL link data sources to public-records requests, productions, and derived datasets.

#### Scenario: A TPIA production creates a dataset

- **WHEN** a public-records request produces files or structured data
- **THEN** the source registry SHALL link the request, production files, source agency, record type, derived dataset, and provenance notes.

### Requirement: Positive-Deviance Source Classification

PoliceConduct.org SHALL classify sources that may support positive-deviance analysis, not only sources that support misconduct or risk analysis.

#### Scenario: Registering a source with positive-practice evidence

- **WHEN** a source contains commendations, training completion, crisis-diversion outcomes, public-records response logs, audit improvements, policy changes, community feedback, low-force peer comparisons, or other positive-practice evidence
- **THEN** the registry SHALL mark the supported positive-deviance domains, related comparison group, source limitations, and whether the evidence is self-reported, independently verified, community-contributed, or derived from structured public data.
