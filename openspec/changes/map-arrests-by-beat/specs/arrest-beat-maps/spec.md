## ADDED Requirements

### Requirement: Named count maps

Personnel and agency pages SHALL display patrol polygons labeled with beat name and arrest count. Counts and the period SHALL come from the views `arrest_coverage` and `arrest_breakdown`, and boundaries from `police_beat`, as defined by the intake requirements in capability `arrest-records` (intake change `import-arrest-records`). Each map SHALL provide its recorded period and the count of arrests not mapped to a patrol beat. The count list SHALL remain available without JavaScript.

#### Scenario: Missing location

- **WHEN** an arrest cannot be assigned to a patrol beat
- **THEN** it remains in the total and is shown as the not-mapped count next to the total and in the count list

#### Scenario: Annotation for arrests with no beat

- **WHEN** intake records an active annotation whose subject is the agency because some of its arrests have no beat, and the agency has a page
- **THEN** the agency page shows that annotation through `RecordDataNotes`, with the message stored for its message code

#### Scenario: No beat data

- **WHEN** a scope has no arrest-beat rows in `arrest_breakdown`
- **THEN** no beat map is shown for that scope

#### Scenario: JavaScript off

- **WHEN** a visitor opens the page with JavaScript off
- **THEN** the visitor can open the count list and see every drawn beat with its count, the not-mapped count and the total, and sees no empty map box and no drag or zoom instructions

### Requirement: Beats drawn

A map SHALL draw exactly the beats in its scope's `arrest_breakdown` arrest-beat rows, whether the city marks the beat active or inactive. A grouped view has no row for a beat with no arrests.

#### Scenario: Beat with no arrests

- **WHEN** a `police_beat` row has no arrests in a map's scope
- **THEN** that map does not draw the boundary or list it in the count list

#### Scenario: Inactive beat with arrests

- **WHEN** the city marks a beat inactive and the map's scope has arrests in that beat
- **THEN** the map draws that beat with its name and count

#### Scenario: Every arrest is not mapped

- **WHEN** a scope has arrest-beat rows and every arrest is in the row for arrests with no beat
- **THEN** the panel shows the total and the not-mapped count, the count list shows Not mapped and Total, and no map box is shown

### Requirement: Map wording

Each map SHALL state that the boundaries are one supplied snapshot with no dates. Personnel maps SHALL describe their counts as recorded arrests linked to the agency assignment. Beat names SHALL be shown as stored in `police_beat.name`.

#### Scenario: Personnel map caption

- **WHEN** a visitor opens a personnel page with a beat map
- **THEN** the map describes its counts as recorded arrests linked to this agency assignment and states that the boundaries are one snapshot with no dates

#### Scenario: Agency map caption

- **WHEN** a visitor opens an agency page with a beat map
- **THEN** the map shows its recorded period as month and year (for example "January 2024 to December 2024") and states that the boundaries are one snapshot with no dates

### Requirement: Beat count checks

The beat counts plus the not-mapped count SHALL add up to the scope's distinct bookings in `arrest_coverage`. The site build SHALL stop with an error when they do not, when a beat count is below 1, or when an arrest-beat row has no `police_beat` row with a Polygon or MultiPolygon geometry.

#### Scenario: Counts do not add up

- **WHEN** the beat counts plus the not-mapped count differ from the scope's distinct bookings
- **THEN** the site build stops with an error

#### Scenario: Zero count

- **WHEN** an arrest-beat row has a count below 1
- **THEN** the site build stops with an error that names the beat code

#### Scenario: Missing boundary

- **WHEN** an arrest-beat row names no `police_beat` row, or that row has no Polygon or MultiPolygon geometry
- **THEN** the site build stops with an error that names the breakdown row

### Requirement: Personnel map scope

A personnel map SHALL show the counts of one `agency_personnel` row from the personnel scope of `arrest_coverage` and `arrest_breakdown`, with the boundaries of the `police_beat` rows those beat rows name. The site SHALL NOT match records by source, months, names, codes or any other value.

#### Scenario: Assignment with arrests

- **WHEN** a person has an `agency_personnel` row with arrest-beat rows in `arrest_breakdown`
- **THEN** the personnel page shows a map for that assignment with its own counts and the `police_beat` boundaries those rows name

#### Scenario: Assignment without arrests

- **WHEN** a person's `agency_personnel` row has no arrest-beat rows
- **THEN** the personnel page shows no beat map for that assignment

### Requirement: Agency totals and scope

Agency maps SHALL use the agency scope of `arrest_coverage` and `arrest_breakdown`, which counts every booking of the agency once, never the sum of personnel counts. Maps SHALL appear only on personnel and agency pages.

#### Scenario: Multi-person booking

- **WHEN** multiple personnel are linked to a booking
- **THEN** the agency map counts that booking once

#### Scenario: Booking with no identified officer

- **WHEN** a booking has no `arrest_agency_personnel` row
- **THEN** the agency map counts it and no personnel map counts it

#### Scenario: Geographic page

- **WHEN** a visitor opens a city, county, state, or federal index page
- **THEN** the page has no arrest beat map
