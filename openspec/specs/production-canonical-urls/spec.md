# production-canonical-urls Specification

## Purpose

Keep public canonical and Open Graph URLs on the configured production origin across local, preview and production rendering.

## Requirements

### Requirement: Canonical metadata uses production

The shared layout SHALL resolve canonical paths against https://www.policeconduct.org regardless of SITE_URL or the request origin.

#### Scenario: Preview environment

- **WHEN** a page renders with SITE_URL set to a PR preview address
- **THEN** its canonical link and Open Graph URL use https://www.policeconduct.org with the page's canonical path

#### Scenario: Local environment

- **WHEN** a page renders on localhost without SITE_URL
- **THEN** its canonical link uses the production origin and preserves its canonical path
