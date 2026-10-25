## ADDED Requirements

### Requirement: Redirect semantics are shared across environments

Production and preview SHALL use the same redirect routing implementation and build-artifact map format, with environment-specific storage selection only.

#### Scenario: A mapped legacy URL is requested

- **WHEN** a request matches the environment's exact redirect entry or terminal wildcard prefix
- **THEN** the router returns HTTP 301 to the mapped path on that environment's host, preserving query parameters
- **AND** exact entries take precedence over wildcard entries

#### Scenario: A current page is requested

- **WHEN** no redirect entry matches
- **THEN** the request resolves to its current environment's file layout

### Requirement: Local publication loads redirects safely

Local production and preview publication SHALL load their own build's validated redirect map and preserve unrelated map namespaces.

#### Scenario: A map is malformed

- **WHEN** the redirect artifact is malformed or exceeds the store limits
- **THEN** publication fails before changing redirect keys

#### Scenario: Preview redirects are verified

- **WHEN** the shared router is enabled on preview
- **THEN** representative legacy production paths return the expected HTTP redirect and resolve to available preview destinations

### Requirement: Coverage includes generated noindex pages

The coverage checker SHALL recognize generated HTML routes omitted from the sitemap, including submission forms, while rejecting missing redirect destinations and redirect chains.

#### Scenario: A redirect targets a noindex form

- **WHEN** a redirect destination has generated HTML but is excluded from the sitemap
- **THEN** the coverage checker accepts the destination without changing its indexing policy

### Requirement: Approved duplicate agency URLs retain navigation

The redirect generator SHALL map approved legacy duplicate agency paths to the retained agency identity, resolving the destination from its database-backed location path and slug. Missing retained identities SHALL fail generation.

#### Scenario: A reader follows an approved duplicate URL

- **WHEN** the legacy duplicate agency URL is requested
- **THEN** it redirects directly to the retained agency canonical path

### Requirement: Legacy agency collections reach existing civic indexes

Legacy state and federal agency collection URLs and their pagination SHALL redirect to the corresponding civic index only when its HTML exists in the build. Exact agency pagination entries SHALL cover pages derived from eligible agency counts at 50 records per page, alongside the scoped pagination wildcard. The federal civil litigation collection SHALL redirect to the existing federal index. Agency record destinations SHALL resolve through `agency.location_path_id` joined to `location_path`, using the stored agency slug; build projections select eligibility only.

#### Scenario: A collection index exists

- **WHEN** the corresponding state or federal civic index has generated HTML
- **THEN** legacy agency collection and pagination URLs redirect directly to that index

#### Scenario: A state index is absent

- **WHEN** the civic index has no generated HTML
- **THEN** no collection redirect is emitted to that missing destination
- **AND** individual record URLs are not redirected to unrelated indexes
