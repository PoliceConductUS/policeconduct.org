## REMOVED Requirements

### Requirement: Show findings where reported data appears

**Reason**: Record pages no longer show source-reported values, source record IDs or evidence beside an annotation. Its scenario "Warning or error includes evidence" required the opposite.

**Migration**: Replaced by "Record pages show annotation label and message only" and "Annotated dates show without calculated tenure". The reported value, source record ID and evidence stay on the data-annotations listings and CSV.

### Requirement: Licensing authority annotation subpage

**Reason**: The licensing-authority page no longer lists annotations itself. The requirement is restated with annotation wording and an accurate empty-result scenario.

**Migration**: Replaced by "Licensing authority annotations page" and "Authority annotation ownership", which keep the same paginated subpage, ownership rules, filters and CSV.

## ADDED Requirements

### Requirement: Record pages show annotation label and message only

A record page SHALL show each annotation filed on that record with only its label and message. A record page SHALL NOT show an annotation's field name, reported value, replacement value, source provider, source record ID or evidence; the data-annotations listings and their CSV downloads keep them.

#### Scenario: Record page omits annotation evidence and source values

- **WHEN** a warning or error annotation supplies evidence
- **THEN** its record page SHALL show the annotation's label and message and SHALL NOT show the evidence, the reported value or the source record ID
- **AND** the data-annotations listing and CSV SHALL still show that evidence, reported value and source record ID

#### Scenario: Excluded record annotation on a record page

- **WHEN** a record page shows an `excluded_records` annotation
- **THEN** the page SHALL show "Excluded record" or "Excluded duplicate" and the message
- **AND** the page SHALL NOT show the field name `excluded_records` or the annotation's JSON value

### Requirement: Annotated dates show without calculated tenure

The site SHALL display reported dates without calculated tenure totals or assignment durations. An unparseable annotated date SHALL display its original literal value without treating an empty typed end date as current employment.

#### Scenario: Negative tenure

- **WHEN** the supplied dates produce a duration of minus 12 days
- **THEN** the page SHALL show the supplied dates and the end-before-start error without a calculated duration

#### Scenario: Long tenure

- **WHEN** the supplied dates produce 125 years
- **THEN** the page SHALL show the supplied dates and the unusual-duration warning, without a calculated duration

### Requirement: Licensing authority annotations page

Each licensing-authority page SHALL link to a paginated annotations subpage listing annotations originating from that authority's data. The subpage SHALL share the central index's entries, type filtering and full-result CSV downloads. The licensing-authority page SHALL NOT list annotations itself; annotations filed on the authority SHALL appear on its paginated subpage.

#### Scenario: Authority without annotations

- **WHEN** an authority has no annotations in the current build
- **THEN** its subpage SHALL display an empty result state and its CSV SHALL contain the header without fabricated entries

#### Scenario: Annotations filed on the authority

- **WHEN** an authority has more than 50 annotations filed on its `LicensingAuthority` record
- **THEN** the licensing-authority page SHALL list none of them and SHALL link to the subpage
- **AND** the subpage SHALL list them 50 per page with type filters and a CSV of all matching annotations

### Requirement: Authority annotation ownership

Source ownership of an authority's annotations SHALL use explicit source-to-authority metadata. Membership SHALL NOT depend on a person's current employer or merely holding a license from that authority.

#### Scenario: Authority data spans record types

- **WHEN** an authority supplies personnel, employment and license records with annotations
- **THEN** its subpage SHALL include annotations from all those records
- **AND** annotations contributed by unrelated providers SHALL not be attributed to that authority

## MODIFIED Requirements

### Requirement: Publish applied correction provenance

Central and authority listings, type filters and CSV downloads SHALL include correction annotations alongside warnings and errors. Listing and CSV correction entries SHALL show original and replacement values, our explanation and evidence when supplied without attributing our override to the source provider. Record pages SHALL show a correction annotation's label and message only, and SHALL NOT show its original or replacement values. This drops the earlier requirement that profiles show correction original and replacement values. Multiple types on a field SHALL remain visible.

#### Scenario: Corrected address still has a warning

- **WHEN** an address has an applied correction and its effective value triggers a warning
- **THEN** the profile SHALL show both annotations' labels and messages, and the listings SHALL show both entries
- **AND** the download SHALL include both
- **AND** filtering to correction SHALL return its original value, replacement value, explanation and supplied evidence

### Requirement: Public annotations omit internal identifiers

The index and CSV SHALL show source record IDs but SHALL NOT expose canonical reference values. Record pages SHALL show neither. Administrative-area corrections SHALL use the label “Administrative area” instead of `location_path_id` in the index and CSV, omit internal before/after IDs, and display the supplied explanation. Internal audit records SHALL remain intact. Duplicate exclusions SHALL describe the duplicate without internal maintenance identifiers.

#### Scenario: Administrative area correction

- **WHEN** an annotation corrects an internal location reference
- **THEN** the index and CSV show its administrative-area explanation and source record ID, and the record page shows its label and explanation
- **AND** canonical values and internal reference evidence keys are omitted from public displays and CSV
