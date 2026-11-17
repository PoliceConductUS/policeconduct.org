## ADDED Requirements

### Requirement: Workspace URL redirects

The generator SHALL read optional `INTAKE_WORKSPACE/redirects.json` as an old-path to new-path object and merge it as 301 redirects into the existing CloudFront redirect JSON. Configured destinations SHALL be built final pages. Conflicts, self redirects and loops SHALL fail generation. Stable IDs and automatic expiry SHALL NOT be required in the config.

#### Scenario: Historical URL has a configured destination

- **WHEN** a configured old path targets a built final page
- **THEN** the generated inventory contains exactly one matching redirect

#### Scenario: Operator retires a redirect

- **WHEN** the operator removes an entry and regenerates
- **THEN** that configured redirect is absent from the new inventory

#### Scenario: Invalid mapping

- **WHEN** the config has a missing target, conflicting mapping, self redirect or loop
- **THEN** generation fails without writing a new inventory
