## ADDED Requirements

### Requirement: Stable Publish Ownership Boundary

The architecture MUST define a stable ownership boundary between the future pipeline repository and `policeconduct.org`.

#### Scenario: Pipeline repository owns upstream preparation
- **WHEN** data is ingested, normalized, linked, or used to compute derived stats
- **THEN** that work is owned by the pipeline repository rather than the web app repository

#### Scenario: Web app owns public rendering
- **WHEN** publish-facing data is ready for public use
- **THEN** `policeconduct.org` consumes stable read models and route inputs without owning ingestion runtime behavior

### Requirement: Publish-Facing Read Models

The pipeline MUST emit stable publish-facing schemas or tables for the site.

#### Scenario: Site reads publish-safe models
- **WHEN** the web app reads pipeline-produced data
- **THEN** it reads publish-oriented models that isolate raw and normalized source volatility from route generation

#### Scenario: Publish models preserve route identity
- **WHEN** publish-facing rows are generated
- **THEN** they include the route identifiers needed to preserve current public URL conventions for personnel, agency, and report pages

### Requirement: Route-Change Manifest

The pipeline MUST emit a route-change manifest for targeted site rebuilds.

#### Scenario: Delta publish declares changed routes
- **WHEN** a pipeline run changes public-facing data without requiring a full rebuild
- **THEN** the manifest lists the changed personnel slugs, agency routes, report routes, affected categories, and whether sitemap updates are required

#### Scenario: Full rebuild is explicit
- **WHEN** a pipeline run includes deletions, pagination churn, or another broad publish reshape
- **THEN** the manifest marks `fullRebuildRequired` so the site can perform full reconciliation instead of unsafe partial publishing

### Requirement: Current URL Conventions Remain Contractual

The publish contract MUST preserve current route structure expectations.

#### Scenario: Agency routes retain category and slug
- **WHEN** agency data is emitted for public publishing
- **THEN** agency route inputs include both category and slug for `/law-enforcement-agency/{category}/{slug}/`

#### Scenario: Personnel routes retain slug identity
- **WHEN** personnel data is emitted for public publishing
- **THEN** personnel route inputs include the stable slug used by `/personnel/{slug}/`

#### Scenario: Report routes retain category and slug
- **WHEN** report data is emitted for public publishing
- **THEN** report route inputs include category and slug for the current report page route structure
