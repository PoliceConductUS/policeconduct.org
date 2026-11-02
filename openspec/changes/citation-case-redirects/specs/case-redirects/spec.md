## ADDED Requirements

### Requirement: Historical case URL redirects

The site SHALL redirect historical case paths to the current database slug of the same case.

#### Scenario: Citation migration changes the slug

- **WHEN** intake retains an old case path
- **THEN** the build emits a direct 301 to that case's current built page
- **AND** missing destinations or conflicting ownership fail the build
