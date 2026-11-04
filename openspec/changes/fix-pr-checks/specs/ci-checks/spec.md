## ADDED Requirements

### Requirement: Jump navigation rejects executable URLs

Jump controls SHALL navigate only to HTTP or HTTPS URLs.

#### Scenario: Executable destination is selected

- **WHEN** a selected option contains a javascript URL
- **THEN** submitting the jump form does not execute it

#### Scenario: Normal destination is selected

- **WHEN** a selected option contains a valid relative page URL
- **THEN** the jump form navigates to that page

### Requirement: CI checks enforce their intended responsibilities

Preview builds and publication SHALL run from the local environment, without an automatic GitHub preview deployment workflow. Copilot setup SHALL prepare dependencies and browsers. SEO host checks SHALL treat hostname dots as literal characters.

#### Scenario: A pull request is updated

- **WHEN** a pull request is opened or updated
- **THEN** GitHub does not automatically build or publish its preview

#### Scenario: A lookalike hostname is supplied

- **WHEN** a robots sitemap URL substitutes characters for dots in the canonical hostname
- **THEN** the SEO audit rejects it
