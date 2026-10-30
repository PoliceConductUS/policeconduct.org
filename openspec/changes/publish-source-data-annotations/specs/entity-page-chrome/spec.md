## MODIFIED Requirements

### Requirement: Grouped contact identity

The page SHALL group a name and email as one contact identity only when the source explicitly associates them. Independent agency contact-name and contact-email fields SHALL render separately and SHALL NOT imply a person/address pairing.

#### Scenario: Agency page renders independent name and email fields

- **WHEN** an agency has independent contact-name and contact-email fields
- **THEN** the name and agency email addresses render on separate labelled rows
- **AND** the site does not infer an association from address spelling or field order

#### Scenario: Agency page renders a contact person with an email

- **WHEN** a source explicitly associates a contact person with an email address
- **THEN** the page groups that verified pair as one contact identity
