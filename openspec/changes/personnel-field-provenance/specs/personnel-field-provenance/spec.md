## ADDED Requirements

### Requirement: Every rendered personnel field carries its citation

A personnel field SHALL render only with the dataset it came from, what that dataset attests, and how the row was matched to its source record.

#### Scenario: A field whose row traces to a source dataset

- **WHEN** the row is covered by provenance for the field being rendered
- **THEN** the value renders with its source, its dataset identifier, its records-request identifier or URL, and how far the evidence goes

#### Scenario: A field whose row traces to nothing

- **WHEN** no provenance covers the row and enforcement is on
- **THEN** the value is absent from the projection and the page renders without it

#### Scenario: A dataset that does not contain the field

- **WHEN** a row cites a dataset that cannot source the field being rendered
- **THEN** the value is withheld, even though the row carries a citation

#### Scenario: A withheld field

- **WHEN** a field is withheld
- **THEN** no placeholder, dash or "not listed" text renders in its place

### Requirement: A citation never claims more than is attested

A citation SHALL state what is missing rather than imply it is present.

#### Scenario: No attested retrieval date

- **WHEN** a dataset records no date the source produced it
- **THEN** the field renders with the retrieval date stated as not recorded, and the dataset is never classified as fully traceable

#### Scenario: A name shared by more than one person in the source

- **WHEN** the row was matched to its source record by name
- **THEN** the page says so, and a match decided by arbitrary row order renders nothing at all

### Requirement: Roster records and submitted content are distinct

A page SHALL NOT let a record an authority keeps and content a member of the public sent in read alike.

#### Scenario: A value from a records request or official roster

- **WHEN** the value's source is a government record
- **THEN** it is marked as such in the markup, in words, and visually

#### Scenario: Content sent in through a form on this site

- **WHEN** the value or count comes from a public submission
- **THEN** it is labelled as sent in by the public and not checked by us

### Requirement: A value that is wrong is withheld even when its lineage is perfect

A field SHALL be withheld when the source value is a placeholder, a coerced literal, or a sentinel standing in for a missing value.

#### Scenario: A placeholder published as data

- **WHEN** a name part or job title holds a source placeholder such as "N/A"
- **THEN** the field is withheld rather than published as a fact about the person

#### Scenario: A name coerced from a literal

- **WHEN** a name column holds a value coerced from a source literal such as "True"
- **THEN** no field of that row is attributed to its source

#### Scenario: A sentinel date

- **WHEN** an assignment start date holds the epoch sentinel
- **THEN** the date is withheld rather than published
