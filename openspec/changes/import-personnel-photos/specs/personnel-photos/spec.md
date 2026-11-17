## ADDED Requirements

### Requirement: Render imported personnel portraits

Personnel profiles SHALL use explicit personnel_photo database associations and verified image files from INTAKE_WORKSPACE.

#### Scenario: Associated image

- **WHEN** a personnel has a photo association
- **THEN** its verified image is copied to static output and rendered on the profile

#### Scenario: Missing or altered associated image

- **WHEN** referenced bytes are missing or their hash or size differs
- **THEN** the build fails loudly

#### Scenario: No photo association

- **WHEN** a personnel has no photo association
- **THEN** the existing default portrait renders without an image in structured data
