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

Preview deployment SHALL use the configured preview environment and a real intake database dump. Copilot setup SHALL prepare dependencies and browsers. SEO host checks SHALL treat hostname dots as literal characters.

#### Scenario: Preview data is absent

- **WHEN** no published intake dump is configured
- **THEN** preview deployment fails visibly without substituting fabricated or empty data

#### Scenario: A lookalike hostname is supplied

- **WHEN** a robots sitemap URL substitutes characters for dots in the canonical hostname
- **THEN** the SEO audit rejects it
