## MODIFIED Requirements

### Requirement: Useful public records are available on visitor pages

The site SHALL account for every public table in a coverage audit and expose useful records through the existing entity pages, without exposing internal bookkeeping as public content. Agency generation SHALL preserve linked-record eligibility: agencies with current or former personnel assignments qualify; agencies without assignments SHALL be excluded.

#### Scenario: Agency has current personnel

- **WHEN** an agency has valid required database identity, a place location and at least one current personnel assignment with no end date
- **THEN** it receives its canonical agency page and appears in location navigation

#### Scenario: Agency has an imported arrest profile

- **WHEN** an agency has an `agency_arrest_profile` linked by `agency_id`
- **THEN** its canonical agency page does not display arrest profiles while the agency presentation is deferred
- **AND** imported agency profiles remain available in the data layer and personnel arrest profiles remain visible on personnel pages

#### Scenario: Agency has linked personnel

- **WHEN** an agency has valid required database identity, a place location and at least one current or former personnel assignment
- **THEN** it receives its canonical agency page and appears in location navigation

#### Scenario: Agency has no qualifying links

- **WHEN** an agency has no personnel assignments, including a federal office
- **THEN** it receives no agency build projection and does not appear in generated location navigation
- **AND** root federal agencies always receive detail pages and Federal directory entries, even without qualifying offices

#### Scenario: Personnel has arrest profiles

- **WHEN** arrest profiles are linked to a person's agency assignments
- **THEN** the personnel page renders each profile's agency, source, covered months, recorded total, and every stored one-dimensional count breakdown among the sixteen supported dimensions
- **AND** counts have shares using their respective arrest, charge-row, or distinct reported charge-record totals; district codes retain source meaning; residential tracts do not represent arrest locations; and no causal claim is made

#### Scenario: Stored optional public facts exist

- **WHEN** a report has narrative facts or a requested outcome, a civil case has a closing date, or a personnel record has a death source
- **THEN** the corresponding page shows those facts with clear labels and source links
- **AND** absent optional facts are omitted
