## ADDED Requirements

### Requirement: Historical case aliases preserve retained identity

The generator SHALL map the six evidenced historical case paths to the current stored slug of the retained case ID.

#### Scenario: Current slug differs

- **WHEN** the retained case ID exists with a changed stored slug and built HTML
- **THEN** each configured historical path produces one 301 directly to that stored slug

#### Scenario: Only an unrelated case has the expected slug

- **WHEN** the retained ID is absent
- **THEN** no alias is emitted for that identity and the prior-route coverage gate remains authoritative

#### Scenario: Resolved case has no built page

- **WHEN** the retained ID resolves but its destination HTML is missing
- **THEN** redirect generation fails
