## ADDED Requirements

### Requirement: Footer build commit

The shared footer SHALL show the first 12 characters of the commit SHA the page was built from, followed by "-dirty" when the build had uncommitted changes. A build with no commit SHA SHALL fail instead of rendering a placeholder.

#### Scenario: Page built from a commit

- **WHEN** any page is built
- **THEN** its footer shows that build's 12-character commit SHA

#### Scenario: Build has no commit SHA

- **WHEN** a build runs with no commit SHA available
- **THEN** the build fails and no page shows "unknown"
