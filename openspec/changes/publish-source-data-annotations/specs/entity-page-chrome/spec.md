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

### Requirement: Homepage clearly identifies independent ownership

The homepage SHALL display the approved independence statement immediately after its introduction. The existing hero image SHALL span the viewport width, with the introduction, independence statement and calls to action remaining inside the hero over the image.

#### Scenario: Homepage introduction

- **WHEN** a visitor opens the homepage on desktop or mobile
- **THEN** the hero image spans the viewport without horizontal overflow
- **AND** the introduction states: “We are independent. PoliceConduct.org is not the police or a government agency. We are not part of, controlled by, or affiliated with any police department or government agency.”

- **AND** the hero text and calls to action sit on a padded, near-opaque white panel so the background image does not impair readability
