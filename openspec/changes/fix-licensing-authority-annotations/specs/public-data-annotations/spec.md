## ADDED Requirements

### Requirement: Record pages show annotation label and message only

A record page is the public page of the record named by an annotation's `record_url`. A record page SHALL show each annotation whose `record_url` is that page, with only its label and message. When `record_url` is a data-annotations listing, the annotation appears on no record page. A record page SHALL NOT show an annotation's field name, reported value, replacement value, source provider, source record ID or evidence; the data-annotations listings and their CSV downloads keep them.

#### Scenario: Record page omits annotation evidence and source values

- **WHEN** a warning or error annotation supplies evidence
- **THEN** its record page SHALL show the annotation's label and message and SHALL NOT show the evidence, the reported value or the source record ID
- **AND** the data-annotations listing and CSV SHALL keep that evidence, reported value and source record ID, as "One public annotation index" and "Complete filtered CSV download" require

### Requirement: Annotation labels

The label SHALL be "Warning" for a warning, "Data error" for an error and "Correction" for a correction. Every annotation is the site's own, so no label SHALL say "our" or "ours". The site SHALL NOT choose a label by matching message text.

#### Scenario: Labels do not say whose annotation it is

- **WHEN** a warning or correction annotation is shown with a label
- **THEN** the label SHALL be "Warning" or "Correction", not "Our warning" or "Our correction"

#### Scenario: Excluded record annotation

- **WHEN** an `excluded_records` annotation is shown on a record page
- **THEN** the page SHALL show the label for its type and its message
- **AND** the page SHALL NOT show the field name `excluded_records` or the annotation's JSON value

### Requirement: Annotation messages come from message codes

The message SHALL be the `message` of the `data_annotation_message` row that the annotation's `message_code` names, shown as stored. The site SHALL NOT rewrite a message or match its text. Message wording is intake's: intake's change `supply-site-display-data` (requirement "Public messages hold no internal identifiers") requires each message to tell a reader what is wrong and with which value.

#### Scenario: The message comes from its message code

- **WHEN** an annotation has `message_code` `excluded_duplicate`
- **THEN** every page and CSV that shows the annotation SHALL show the `message` stored for `excluded_duplicate`, unchanged

#### Scenario: Message table or code is missing

- **WHEN** `data_annotation.message_code` or `data_annotation_message` does not exist, or an annotation's code has no `data_annotation_message` row
- **THEN** the build SHALL fail and name the missing table, column or code

### Requirement: Annotated dates show without calculated tenure

The site SHALL display reported dates without calculated tenure totals or assignment durations. An unparseable annotated date SHALL display its original literal value without treating an empty typed end date as current employment.

#### Scenario: Negative tenure

- **WHEN** the supplied dates produce a duration of minus 12 days
- **THEN** the page SHALL show the supplied dates and the end-before-start error without a calculated duration

#### Scenario: Long tenure

- **WHEN** the supplied dates produce 125 years
- **THEN** the page SHALL show the supplied dates and the unusual-duration warning, without a calculated duration

### Requirement: Agencies without public pages keep their annotations without a link

Annotations SHALL NOT change agency-page eligibility. When an agency has no built page (no `build_page_payload` row of page type `agency`), its annotations SHALL stay in the central annotation listing and CSV, and on the subpage of any authority they are attached to. Each entry SHALL keep the agency's label, source record ID, public value and explanation, and SHALL have an empty `record_url`. The site SHALL NOT send such an entry to another page.

#### Scenario: Agency without a built page has an annotation

- **GIVEN** an agency with no built page and an active annotation whose record is that agency
- **WHEN** annotation pages are generated
- **THEN** the annotation appears in the central listing and download with no record link
- **AND** no agency page is created because the annotation exists

#### Scenario: Required annotation data is missing

- **WHEN** an annotation's record row is missing, or a field the owner lookup requires is empty
- **THEN** collection SHALL fail and name the record, rather than discard the annotation or invent a record URL

### Requirement: The personnel publication switch hides only personnel pages

The `NO_PERSONNEL` environment variable hides personnel pages and nothing else. When it is set, every annotation SHALL stay in the central and authority listings and CSV downloads. An annotation whose record resolves through its parent records to a person SHALL have an empty `record_url`, because that person's page is not built.

#### Scenario: Annotation about a person with personnel pages hidden

- **WHEN** `NO_PERSONNEL` is set and an annotation's record is a `License` of a person
- **THEN** the annotation appears in the listings and CSV with an empty `record_url`
- **AND** annotation listing routes are excluded from search indexes and the sitemap

## MODIFIED Requirements

### Requirement: Licensing authority annotation subpage

Each licensing-authority page SHALL link to a paginated annotations subpage listing the annotations attached to that authority, as "Annotations attach to one licensing authority" defines. The subpage SHALL share the central index's entries, type filtering and full-result CSV downloads. The licensing-authority page SHALL NOT list annotations itself.

#### Scenario: Authority without findings

- **WHEN** an authority has no annotations in the current build
- **THEN** its subpage SHALL display an empty result state and its CSV SHALL contain the header without fabricated entries

#### Scenario: Annotations attached to the authority

- **WHEN** annotations are attached to an authority
- **THEN** the licensing-authority page SHALL list none of them and SHALL link to the subpage
- **AND** the subpage SHALL list them 50 per page, with page links when there are more than 50, type filters and a CSV of all matching annotations

#### Scenario: Index links authority annotations to the subpage

- **WHEN** an annotation's record is a licensing authority, or an authority license whose `licensing_authority_id` names that authority
- **THEN** its index entry and CSV `record_url` SHALL be that authority's `licensing-authority/data-annotations/` page

### Requirement: Annotations attach to one licensing authority

An annotation is attached to a licensing authority when its record is that authority (`subject_kind` `LicensingAuthority` and `subject_id` that authority's ID), or when intake stores that authority's ID in `data_annotation.licensing_authority_id`. Intake stores it for every annotation about a person (intake change `supply-site-display-data`, requirement "Annotations about a person attach to the licensing authority"). Data sources are not separate records yet, so the licensing authority stands for the source. An authority's subpage SHALL list every annotation attached to it and no other annotation. The site SHALL read only those two stored facts. It SHALL NOT pick an authority from a source namespace, an employment, a license or any other fact. Listings and CSV downloads SHALL show the annotation's source namespace as the source provider. An annotation attached to no authority SHALL stay in the central index and its CSV.

#### Scenario: Authority data spans record types

- **WHEN** annotations whose record is an authority, and annotations about people whose `licensing_authority_id` names that authority, are active
- **THEN** the authority's subpage SHALL include all of them
- **AND** annotations attached to another authority SHALL NOT appear on it

#### Scenario: Annotation about a person

- **WHEN** an annotation's record is a person, or a record one person owns such as a `LicenseAction`, and `licensing_authority_id` names an authority
- **THEN** that authority's subpage SHALL list the annotation
- **AND** the annotation's `record_url` SHALL be the person's page when that page is built, and empty when it is not

#### Scenario: Attachment is not inferred

- **WHEN** an annotation names a source namespace, or its record is a person employed by an agency or holding a license from an authority
- **THEN** none of those facts SHALL decide which authority's subpage lists the annotation

#### Scenario: Agency annotation without an authority

- **WHEN** an annotation's record is an agency and its `licensing_authority_id` is empty
- **THEN** no authority's subpage SHALL list it, and the central index and CSV SHALL list it

#### Scenario: Attachment column is missing

- **WHEN** `data_annotation.licensing_authority_id` does not exist in the database
- **THEN** the build SHALL fail and name the missing column

### Requirement: Publish applied correction provenance

Central and authority listings, type filters and CSV downloads SHALL include correction annotations alongside warnings and errors. Listing and CSV correction entries SHALL show original and replacement values, the site's explanation and evidence when supplied without attributing the site's override to the source provider. Record pages SHALL show a correction annotation's label and message only, and SHALL NOT show its original or replacement values. Multiple types on a field SHALL remain visible.

#### Scenario: Corrected address still has a warning

- **WHEN** an address has an applied correction and its effective value triggers a warning
- **THEN** the record page SHALL show both annotations' labels and messages, and the listings SHALL show both entries
- **AND** the download SHALL include both
- **AND** filtering to correction SHALL return its original value, replacement value, explanation and supplied evidence

### Requirement: Public annotations omit internal identifiers

The index and CSV SHALL show source record IDs but SHALL NOT expose canonical reference values. Record pages SHALL show neither. For an annotation on a field that holds an internal reference (`id`, or a name ending in `_id` that does not start with `source_`), such as an administrative-area correction on `location_path_id`, the index and CSV SHALL leave the reported and replacement values empty and SHALL omit internal reference keys from evidence. Internal audit records SHALL remain intact.

#### Scenario: Administrative area correction

- **WHEN** an annotation corrects an internal location reference
- **THEN** the index and CSV show its message and source record ID, and the record page shows its label and message
- **AND** canonical values and internal reference evidence keys are omitted from public displays and CSV

### Requirement: Annotation listings remain discoverable without search indexing

The footer SHALL link to "Data annotations" under Data and methods. Global and licensing-authority annotation listings, including source filters, type filters and pagination, SHALL use `noindex,follow`, SHALL be excluded from on-site search, and SHALL be omitted from the sitemap.

#### Scenario: Browse annotations from the footer

- **WHEN** a visitor follows the "Data annotations" footer link
- **THEN** the global annotation listing remains browsable with pagination and filters

### Requirement: Preserve findings for locations without public pages

Location annotations SHALL link to the exact database path only when that path is in the existing location build inventory. Annotations on locations without pages SHALL stay in the central annotation listing and CSV, keeping their label, source identity and explanation, with an empty `record_url`. Annotation presence SHALL NOT change location-page eligibility.

#### Scenario: Location without a generated page

- **WHEN** an annotated location has no location build payload
- **THEN** its annotations stay in the listing and export with no record link instead of a link to a missing location page

## REMOVED Requirements

### Requirement: Show findings where reported data appears

**Reason**: Record pages no longer show source-reported values, source record IDs or evidence beside an annotation. Its scenario "Warning or error includes evidence" required the opposite. Its rule that record pages distinguish "our" warning, error or correction from the provider's data is also dropped: every annotation is the site's own, record pages no longer show the provider's value beside it, and annotations appear in a separate region.

**Migration**: Replaced by "Record pages show annotation label and message only" and "Annotated dates show without calculated tenure". The reported value, source record ID and evidence stay on the data-annotations listings and CSV.

### Requirement: Preserve findings for agencies without public pages

**Reason**: Agency annotations no longer link to an authority's listing. The site picked that authority from the source namespace, which the owner ruled out on 2026-11-22 (`2445cd6`).

**Migration**: Replaced by "Agencies without public pages keep their annotations without a link".

### Requirement: Annotations preserve the personnel publication switch

**Reason**: The owner ruled on 2026-11-22 that `NO_PERSONNEL` hides personnel pages only, so annotations about a person are no longer omitted (`cc0c973`).

**Migration**: Replaced by "The personnel publication switch hides only personnel pages".
