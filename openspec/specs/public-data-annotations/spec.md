# public-data-annotations Specification

## Purpose

Show the site's notes on source data (warnings, errors, corrections and excluded records) on record pages, in paged listings and in CSV downloads, each attached to the licensing authority whose data it is about.

## Requirements

### Requirement: Show findings where reported data appears

The site SHALL show source-reported values and their annotations together on the affected public record display. It SHALL identify the source provider and source record ID and distinguish our warning/error/correction from the provider's reported data. The site SHALL display reported dates without calculated tenure totals or assignment durations. An unparseable annotated date SHALL display its original literal value without treating an empty typed end date as current employment.

#### Scenario: Negative tenure

- **WHEN** the supplied dates produce a duration of minus 12 days
- **THEN** the page SHALL show the supplied dates and the end-before-start error without a calculated duration

#### Scenario: Long tenure

- **WHEN** the supplied dates produce 125 years
- **THEN** the page SHALL show the supplied dates with source attribution and the unusual-duration warning, without a calculated duration

#### Scenario: Warning or error includes evidence

- **WHEN** a warning or error supplies evidence
- **THEN** its record-page note SHALL preserve that evidence, independently of correction replacement values

### Requirement: Record routes own their annotation composition

Record routes SHALL explicitly compose their annotation notes. Shared page structure, including `PageShell` and generic civic wrappers, SHALL remain independent of annotation loading, rendering, and annotation-route checks.

#### Scenario: A route renders record findings

- **WHEN** a record page displays its source findings
- **THEN** the owning route composes the notes without annotation knowledge in its shared page structure

### Requirement: One public annotation index

The generated site SHALL provide `/data-annotations/` with pagination and filters by source provider and annotation type. Each entry SHALL show the affected person or agency, field, original reported value, type, explanation, source provider, source record ID and a link to the affected record display. All pages SHALL use one build-time collection of persisted annotations. Filtering SHALL precede pagination and page links SHALL preserve filters.

#### Scenario: Filtered multi-page results

- **WHEN** a provider has more than one page of warnings
- **THEN** selecting that provider and warning type SHALL show only its warnings across all result pages
- **AND** every entry SHALL link to the public display containing the annotated data

### Requirement: Complete filtered CSV download

Every annotation listing SHALL offer a CSV download of all matching entries across all pages, generated from the listing's data and filters without a runtime API. Original values SHALL survive serialization, including quotes, commas and newlines. Every cell is text: a cell whose text starts with `=`, `+`, `-` or `@` SHALL be written with one `'` added before it, so a spreadsheet does not run it as a formula. That added character is the only change, and removing it restores the original value.

#### Scenario: Export columns preserve source and correction evidence

- **WHEN** any annotation listing is downloaded
- **THEN** its columns SHALL be `source_provider,source_record_id,record_url,field,reported_value,type,message,replacement_value,evidence`
- **AND** corrections SHALL include replacement values and supplied evidence, except administrative-area corrections, whose internal values and reference evidence keys are omitted as required by "Public annotations omit internal identifiers"; those columns SHALL be empty for annotations without those values

#### Scenario: A cell starts with a formula character

- **WHEN** a reported value, message or other cell starts with `=`, `+`, `-` or `@`
- **THEN** the CSV cell SHALL hold that text with one `'` added before it
- **AND** a cell that starts with any other character SHALL be unchanged apart from CSV quoting

#### Scenario: Download exceeds visible page

- **WHEN** a filtered listing contains 125 annotations and the visible page shows 50
- **THEN** its download SHALL contain all 125 matching annotations and the column header

### Requirement: Licensing authority annotation subpage

Each licensing-authority page SHALL link to a paginated annotations subpage listing the findings attached to that authority, as "Annotations attach to one licensing authority" defines. The subpage SHALL share the central index's entries, type filtering and full-result CSV downloads.

#### Scenario: Authority without findings

- **WHEN** an authority has no annotations in the current build
- **THEN** its subpage SHALL display an empty result state and its CSV SHALL contain the header without fabricated entries

### Requirement: Annotations attach to one licensing authority

Every annotation SHALL be attached to exactly one licensing authority, the source of its data; sources are not separate records yet, so the licensing authority stands for the source. An authority's subpage SHALL list every annotation attached to it, whatever its subject kind. No authority SHALL claim a source namespace. Listings and CSV downloads SHALL show the attached authority's name as the source provider.

#### Scenario: Authority data spans record types

- **WHEN** an authority supplies personnel, employment and license records with annotations
- **THEN** its subpage SHALL include findings from all those records
- **AND** annotations attached to another authority SHALL NOT appear on it

#### Scenario: Attachment is not inferred

- **WHEN** an annotation names a source namespace, or its subject is a person employed by an agency or holding a license from an authority
- **THEN** none of those facts SHALL decide which authority the annotation is attached to

### Requirement: Publish applied correction provenance

Profiles, central and authority listings, type filters and CSV downloads SHALL include correction annotations alongside warnings and errors. Correction displays SHALL show original and replacement values, our explanation and evidence when supplied without attributing our override to the source provider. Multiple types on a field SHALL remain visible.

#### Scenario: Corrected address still has a warning

- **WHEN** an address has an applied correction and its effective value triggers a warning
- **THEN** the profile and listings SHALL show both entries and the download SHALL include both
- **AND** filtering to correction SHALL return its original value, replacement value, explanation and supplied evidence

### Requirement: Preserve findings for agencies without public pages

Annotations SHALL NOT change agency-page eligibility. When an agency has no current personnel assignment and therefore no public page, its stored findings SHALL remain in the central and source-authority annotation listings and CSV exports. Each finding SHALL retain the affected agency label, source ID, public value and explanation, and link to the first page of the annotation listing of the licensing authority it is attached to.

#### Scenario: Fallback destination is an authority annotation index

- **WHEN** an excluded agency finding links to the authority annotation index
- **THEN** that index SHALL show the finding through its paginated listing without appending an unpaginated record-note block

#### Scenario: Required annotation destination is missing

- **WHEN** an annotation is attached to no licensing authority, or an eligible agency lacks its required page
- **THEN** collection SHALL fail rather than discard the finding or invent a record URL

#### Scenario: Agency without personnel has a source finding

- **GIVEN** an agency with no current personnel assignment and a stored annotation attached to the Texas Commission on Law Enforcement (TCOLE)
- **WHEN** annotation pages are generated
- **THEN** the finding appears in the central and TCOLE listings and downloads
- **AND** no agency page is created merely because the finding exists

### Requirement: Public annotations omit internal identifiers

The index, record notes and CSV SHALL show source record IDs but SHALL NOT expose canonical reference values. Administrative-area corrections SHALL use the label “Administrative area” instead of `location_path_id`, omit internal before/after IDs, and display the supplied explanation. Internal audit records SHALL remain intact. Duplicate exclusions SHALL describe the duplicate without internal maintenance identifiers.

#### Scenario: Administrative area correction

- **WHEN** an annotation corrects an internal location reference
- **THEN** public displays show its administrative-area explanation and source record ID
- **AND** canonical values and internal reference evidence keys are omitted from public displays and CSV

### Requirement: Annotation listings remain discoverable without search indexing

The footer SHALL link to Data notes under Data and methods. Global and licensing-authority annotation listings, including source filters, type filters and pagination, SHALL use `noindex,follow`, SHALL be excluded from on-site search, and SHALL be omitted from the sitemap.

#### Scenario: Browse annotations from the footer

- **WHEN** a visitor follows the Data notes footer link
- **THEN** the global annotation listing remains browsable with pagination and filters

### Requirement: Annotations preserve the personnel publication switch

When the `NO_PERSONNEL` environment variable is set (it hides personnel pages), public annotation collections and CSV exports SHALL omit every annotation whose subject resolves through its parent records to a person, and every exclusion whose excluded record's kind resolves to a person, even when the annotation is attached to a licensing authority. Agency exclusions SHALL remain visible.

#### Scenario: Authority owns mixed exclusion findings

- **WHEN** personnel publication is disabled and an authority owns agency and personnel exclusions
- **THEN** its public findings SHALL include the agency exclusions and omit the personnel exclusions
- **AND** annotation listing routes are excluded from search indexes and the sitemap

#### Scenario: License exclusion filed on an authority

- **WHEN** personnel publication is disabled and a `License` exclusion is filed on an authority
- **THEN** the exclusion is omitted from listings and CSV
- **AND** the same holds for `Personnel`, `AgencyPersonnel`, `Discipline`, `PersonnelEducation` and any other kind whose parent chain ends at `Personnel`

### Requirement: Preserve findings for locations without public pages

Location findings SHALL link to the exact database path only when that path is in the existing location build inventory. Findings for locations without pages SHALL remain in the complete data-note index and CSV, retaining their label, source identity and explanation, and SHALL link to `/data-annotations/`. Annotation presence SHALL NOT change location-page eligibility.

#### Scenario: Location without a generated page

- **WHEN** an annotated location has no location build payload
- **THEN** its findings remain in the index and export with a link to the complete data-note index instead of a missing location page

### Requirement: Only active annotations are published

Record pages, listings and CSV downloads SHALL include only annotations whose status is `active`. Resolved annotations SHALL remain stored and SHALL NOT appear publicly.

#### Scenario: An annotation is resolved

- **WHEN** an annotation's status changes from `active` to `resolved`
- **THEN** the next build omits it from record pages, listings and CSV
