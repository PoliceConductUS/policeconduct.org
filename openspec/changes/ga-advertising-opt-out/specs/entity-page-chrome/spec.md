## ADDED Requirements

### Requirement: Footer build commit

The shared footer SHALL show the first 12 characters of the release ID (the full commit SHA the page was built from), followed by "-dirty" when the build had uncommitted changes. A build with no commit SHA SHALL fail instead of rendering a placeholder.

#### Scenario: Page built from a commit

- **WHEN** any page is built
- **THEN** its footer shows that build's 12-character release ID

#### Scenario: Page built from uncommitted changes

- **WHEN** a page is built from uncommitted changes
- **THEN** its footer shows the 12-character release ID followed by -dirty

#### Scenario: Build has no commit SHA

- **WHEN** a build runs with no commit SHA available
- **THEN** the build fails and no page shows "unknown"
