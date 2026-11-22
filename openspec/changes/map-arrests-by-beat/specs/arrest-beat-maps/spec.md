## ADDED Requirements

### Requirement: Named count maps

Personnel and agency pages SHALL display patrol polygons labeled with beat name and arrest count, using the boundary and count contract (`breakdowns.arrest_beat_boundaries`, `breakdowns.by_arrest_beat`) defined by the intake change `map-arrests-by-beat`, capability `arrest-beat-maps`. Each map SHALL provide its recorded period and the count of arrests not mapped to a patrol beat. Counts and labels SHALL remain available without JavaScript.

#### Scenario: Missing location

- **WHEN** an arrest cannot be assigned to a patrol beat
- **THEN** it remains in the total and is shown as the not-mapped count next to the total and in the count list

#### Scenario: Data note for arrests with no beat

- **WHEN** intake attaches a data note to an agency because some of its arrests have no beat
- **THEN** the agency page shows that note through `RecordDataNotes`

#### Scenario: No beat data

- **WHEN** a profile has no `by_arrest_beat`
- **THEN** no beat map is shown for that profile

#### Scenario: JavaScript off

- **WHEN** a visitor opens the page with JavaScript off
- **THEN** the visitor can see every drawn beat with its count, the not-mapped count and the total, and sees no empty map box and no drag or zoom instructions

### Requirement: Beats drawn

A map SHALL draw only the beats whose count in that map is at least one, whether the city marks the beat active or inactive.

#### Scenario: Beat with no arrests

- **WHEN** a boundary has no arrests in a map's counts
- **THEN** that map does not draw the boundary or list it in the count list

#### Scenario: Inactive beat with arrests

- **WHEN** the city marks a beat inactive and the map's counts include arrests in that beat
- **THEN** the map draws that beat with its name and count

### Requirement: Map wording

Each map SHALL state that the boundaries are one supplied snapshot with no supplied dates. Personnel maps SHALL describe their counts as recorded arrests linked to the agency assignment.

#### Scenario: Personnel map caption

- **WHEN** a visitor opens a personnel page with a beat map
- **THEN** the map describes its counts as recorded arrests linked to this agency assignment and states that the boundaries are one snapshot with no dates

### Requirement: Beat count checks

The site build SHALL read `by_arrest_beat` keys as boundary codes plus the reserved key `unknown` for arrests not mapped to a patrol beat, and the beat counts plus `unknown` SHALL add up to `coverage.totalArrests`. The site build SHALL stop with an error when the boundary list is empty, when a boundary uses the code `unknown`, when two boundaries share a code, or when a counted beat code has no boundary.

#### Scenario: No boundaries

- **WHEN** an agency arrest profile has `by_arrest_beat` and an empty `arrest_beat_boundaries` list
- **THEN** the site build stops with an error

#### Scenario: Counts do not add up

- **WHEN** the beat counts plus `unknown` differ from the profile total
- **THEN** the site build stops with an error

#### Scenario: Duplicate or unmatched beat

- **WHEN** two boundaries share a code, a boundary uses the code `unknown`, or a counted beat code has no boundary
- **THEN** the site build stops with an error that names the beat code

### Requirement: Personnel map boundaries

A personnel map SHALL use the boundaries of the agency arrest profile named by `arrest_profile.agency_arrest_profile_id`, a foreign key that intake sets. The site SHALL NOT match agency profiles by source, months or any other value. If a personnel profile with `by_arrest_beat` has no link, the site build SHALL stop with an error.

#### Scenario: Linked agency profile

- **WHEN** a personnel profile with `by_arrest_beat` has `agency_arrest_profile_id` set
- **THEN** its map uses that agency profile's `arrest_beat_boundaries`

#### Scenario: Missing link

- **WHEN** a personnel profile with `by_arrest_beat` has no `agency_arrest_profile_id`
- **THEN** the site build stops with an error that names the profile

#### Scenario: Unlinked agency profile with matching source and months

- **WHEN** an agency profile has the same source and covering months as a personnel profile but is not the linked profile
- **THEN** the personnel map does not use it

### Requirement: Agency totals and scope

Agency maps SHALL use the agency booking aggregate once, never the sum of personnel profiles. Maps SHALL appear only on personnel and agency pages.

#### Scenario: Multi-person booking

- **WHEN** multiple personnel are linked to a booking
- **THEN** the agency map counts that booking once using the agency aggregate

#### Scenario: Geographic page

- **WHEN** a visitor opens a city, county, state, or federal index page
- **THEN** the page has no arrest beat map
