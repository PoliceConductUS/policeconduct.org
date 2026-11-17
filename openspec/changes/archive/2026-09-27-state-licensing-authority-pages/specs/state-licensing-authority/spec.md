## ADDED Requirements

### Requirement: State authority route

The website MUST expose a recorded state's single licensing authority at its exact database-backed state path followed by licensing-authority/. Page rendering MUST reload by exact state path and reject missing, non-state or duplicate authority matches. Static path enumeration MUST pass params only.

#### Scenario: Recorded authority

- **WHEN** a state has one licensing authority linked by location_path_id
- **THEN** the route shows its stored name and official website with canonical metadata and state breadcrumbs

#### Scenario: Invalid authority identity

- **WHEN** a route has no exact state authority or multiple authorities
- **THEN** resolution fails rather than guessing or selecting the first record

### Requirement: Attributed authority records

The page MUST show license counts and action summaries through authority_license and directly attributed discipline through discipline.licensing_authority_id. Discipline MUST link to its personnel and available source documents. Empty sections MUST be omitted. Education MUST NOT be attributed to an authority without an explicit stored relationship. Counts and labels MUST describe recorded facts without causal or evaluative claims.

#### Scenario: Discipline records

- **WHEN** directly attributed discipline exists
- **THEN** the page displays the recorded action, supplied dates/case/source and a personnel profile link

#### Scenario: Identity-only authority

- **WHEN** an authority has no linked records
- **THEN** its identity and official website appear without fabricated activity or empty-value claims

### Requirement: Authority discovery

State pages and personnel license authority labels MUST link to the authority page using its database-backed state path.

#### Scenario: State or personnel navigation

- **WHEN** the page has a linked authority
- **THEN** a reader can navigate to that authority's internal page

### Requirement: Sourced manual authorities

Manual authorities MUST have verified official names/websites and exact existing state references, and MUST use intake's persisted source identity and mutation pipeline. Existing authority IDs MUST be preserved. Evidence URLs MUST remain auditable. Only verified general police officer licensing/certification bodies SHALL be added; unresolved identities SHALL be reported rather than invented.

#### Scenario: Manual authority import

- **WHEN** a verified missing authority is acquired and applied
- **THEN** its durable manual record, canonical mapping, database authority row and state route agree
