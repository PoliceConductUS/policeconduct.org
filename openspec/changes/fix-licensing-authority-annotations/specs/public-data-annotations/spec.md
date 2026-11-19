## ADDED Requirements

### Requirement: Record pages show annotation label and message only

A record page is the public page of the record named by an annotation's `record_url`. A record page SHALL show each annotation whose `record_url` is that page, with only its label and message. When `record_url` is a data-annotations listing, the annotation appears only in that listing. A record page SHALL NOT show an annotation's field name, reported value, replacement value, source provider, source record ID or evidence; the data-annotations listings and their CSV downloads keep them.

#### Scenario: Record page omits annotation evidence and source values

- **WHEN** a warning or error annotation supplies evidence
- **THEN** its record page SHALL show the annotation's label and message and SHALL NOT show the evidence, the reported value or the source record ID
- **AND** the data-annotations listing and CSV SHALL keep that evidence, reported value and source record ID, as "One public annotation index" and "Complete filtered CSV download" require

### Requirement: Annotation labels and messages

The label SHALL be "Warning" for a warning, "Data error" for an error, "Correction" for a correction, and "Excluded record" or "Excluded duplicate" for an `excluded_records` annotation. Every annotation is the site's own note, so no label SHALL say "our" or "ours". The message SHALL be the public display message, not the raw stored text. Each message SHALL say what is wrong and name the affected field in plain words.

#### Scenario: Excluded record annotation labels

- **WHEN** an `excluded_records` annotation is shown with a label, on a record page or a listing
- **THEN** the page SHALL show "Excluded record" or "Excluded duplicate" and the message
- **AND** the page SHALL NOT show the field name `excluded_records` or the annotation's JSON value

#### Scenario: Labels do not say whose note it is

- **WHEN** a warning or correction annotation is shown with a label
- **THEN** the label SHALL be "Warning" or "Correction", not "Our warning" or "Our correction"

#### Scenario: A message names the field

- **WHEN** an annotation reports a problem with one field
- **THEN** its message SHALL name that field in plain words and say what is wrong with it, for example "The end date is not a valid date."

#### Scenario: Internal wording is replaced

- **WHEN** a stored message uses internal wording, such as a duplicate or administrative-area message
- **THEN** the page SHALL show the public display message instead of the stored text

### Requirement: Annotated dates show without calculated tenure

The site SHALL display reported dates without calculated tenure totals or assignment durations. An unparseable annotated date SHALL display its original literal value without treating an empty typed end date as current employment.

#### Scenario: Negative tenure

- **WHEN** the supplied dates produce a duration of minus 12 days
- **THEN** the page SHALL show the supplied dates and the end-before-start error without a calculated duration

#### Scenario: Long tenure

- **WHEN** the supplied dates produce 125 years
- **THEN** the page SHALL show the supplied dates and the unusual-duration warning, without a calculated duration

## MODIFIED Requirements

### Requirement: Licensing authority annotation subpage

Each licensing-authority page SHALL link to a paginated annotations subpage listing the annotations attached to that authority, as "Annotations attach to one licensing authority" defines. The subpage SHALL share the central index's entries, type filtering and full-result CSV downloads. The licensing-authority page SHALL NOT list annotations itself. Every annotation whose `record_url` is the authority's subpage, whatever its subject kind or source namespace, SHALL appear on that subpage.

#### Scenario: Authority without findings

- **WHEN** an authority has no annotations in the current build
- **THEN** its subpage SHALL display an empty result state and its CSV SHALL contain the header without fabricated entries

#### Scenario: Annotations filed on the authority

- **WHEN** an authority has annotations filed on its `LicensingAuthority` record or its authority licenses
- **THEN** the licensing-authority page SHALL list none of them and SHALL link to the subpage
- **AND** the subpage SHALL list them 50 per page, with page links when there are more than 50, type filters and a CSV of all matching annotations

#### Scenario: Index links authority annotations to the subpage

- **WHEN** an annotation is filed on a licensing authority or one of its authority licenses
- **THEN** its index entry and CSV `record_url` SHALL be that authority's `licensing-authority/data-annotations/` page

### Requirement: Publish applied correction provenance

Central and authority listings, type filters and CSV downloads SHALL include correction annotations alongside warnings and errors. Listing and CSV correction entries SHALL show original and replacement values, the site's explanation and evidence when supplied without attributing the site's override to the source provider. Record pages SHALL show a correction annotation's label and message only, and SHALL NOT show its original or replacement values. Multiple types on a field SHALL remain visible.

#### Scenario: Corrected address still has a warning

- **WHEN** an address has an applied correction and its effective value triggers a warning
- **THEN** the record page SHALL show both annotations' labels and messages, and the listings SHALL show both entries
- **AND** the download SHALL include both
- **AND** filtering to correction SHALL return its original value, replacement value, explanation and supplied evidence

### Requirement: Public annotations omit internal identifiers

The index and CSV SHALL show source record IDs but SHALL NOT expose canonical reference values. Record pages SHALL show neither. Administrative-area corrections SHALL use the label “Administrative area” instead of `location_path_id` in the index and CSV, omit internal before/after IDs, and display the supplied explanation. Internal audit records SHALL remain intact. Duplicate exclusions SHALL describe the duplicate without internal maintenance identifiers.

#### Scenario: Administrative area correction

- **WHEN** an annotation corrects an internal location reference
- **THEN** the index and CSV show its administrative-area explanation and source record ID, and the record page shows its label and explanation
- **AND** canonical values and internal reference evidence keys are omitted from public displays and CSV

## REMOVED Requirements

### Requirement: Show findings where reported data appears

**Reason**: Record pages no longer show source-reported values, source record IDs or evidence beside an annotation. Its scenario "Warning or error includes evidence" required the opposite. Its rule that record pages distinguish "our" warning, error or correction from the provider's data is also dropped: every annotation is the site's own note, record pages no longer show the provider's value beside it, and notes appear in a separate "Data notes" region.

**Migration**: Replaced by "Record pages show annotation label and message only" and "Annotated dates show without calculated tenure". The reported value, source record ID and evidence stay on the data-annotations listings and CSV.
