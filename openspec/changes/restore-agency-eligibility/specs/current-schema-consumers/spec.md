## MODIFIED Requirements

### Requirement: Federal offices use the direct parent relationship

The site MUST identify federal branch agencies through `agency.parent_federal_agency_id` referencing `federal_agency.id`. Federal listings, counts, parent links, and legacy redirects SHALL use this replacement relationship, subject to the same personnel-linked eligibility rule as all other agencies.

#### Scenario: Federal office has no personnel or cases

- **WHEN** an agency has a parent_federal_agency_id and no linked personnel or cases
- **THEN** it is excluded from agency generation and federal directories
- **AND** root federal agencies always receive detail pages and Federal directory entries, even without qualifying offices

#### Scenario: Reader browses federal offices

- **WHEN** a federal directory or detail page is loaded
- **THEN** branch counts and office lists match qualifying direct FK relationships
- **AND** each office links to its database-backed canonical agency path
- **AND** its agency page links back to its federal parent
