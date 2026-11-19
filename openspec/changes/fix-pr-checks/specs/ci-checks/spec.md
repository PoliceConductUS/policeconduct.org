## ADDED Requirements

### Requirement: GitHub does not publish previews or releases

Until a change adds CI publication, no GitHub workflow SHALL build or publish a preview or a release. Previews and releases are published locally with `npm run deploy -- <environment>` (`scripts/deploy.sh`).

#### Scenario: A pull request is opened or updated

- **WHEN** a pull request is opened or updated
- **THEN** no workflow builds or uploads a preview of it

#### Scenario: A commit is pushed to main

- **WHEN** a commit is pushed to `main`
- **THEN** no workflow builds or uploads a release of it

### Requirement: Copilot setup only prepares tools

The Copilot Setup Steps workflow SHALL install Node 26.13.1, the locked npm dependencies, and the Playwright browsers. It SHALL NOT run a database-backed build.

#### Scenario: Copilot Setup Steps runs

- **WHEN** Copilot Setup Steps runs
- **THEN** it runs `npm ci` and `npx playwright install --with-deps`, and no build step
