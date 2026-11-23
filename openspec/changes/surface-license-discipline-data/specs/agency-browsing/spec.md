## MODIFIED Requirements

### Requirement: Personnel can be filtered by discipline

Agency personnel rosters SHALL offer a checkbox labeled "With discipline actions". Which rows it retains, and the roster counts and agency total, follow `roster-discipline-filter`. It SHALL combine with the name filter, update the result summary and empty state, and work on small rosters.

#### Scenario: Filters combine

- **WHEN** discipline-only and a name search are selected
- **THEN** only rows matching both remain visible

#### Scenario: Checkbox is cleared

- **WHEN** the visitor clears the discipline checkbox
- **THEN** rows matching the remaining filters become visible again

## ADDED Requirements

### Requirement: Roster license per assignment

Each agency personnel roster row SHALL show, in the person's context line, the type and status, as stored, of the license tied to that assignment through `agency_personnel.license_id`. A row whose `agency_personnel.license_id` is null SHALL show no license. The roster SHALL NOT pick a license from the person's other licenses.

#### Scenario: Assignment has a license link

- **WHEN** a roster row's `agency_personnel.license_id` is set
- **THEN** the context line shows that license's type and status

#### Scenario: Assignment has no license link

- **WHEN** a roster row's `agency_personnel.license_id` is null
- **THEN** the context line shows no license, even when the person holds other licenses

#### Scenario: Assignment points at a missing license

- **WHEN** a roster row's `agency_personnel.license_id` has no `license` row
- **THEN** the build fails and names the assignment
