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
