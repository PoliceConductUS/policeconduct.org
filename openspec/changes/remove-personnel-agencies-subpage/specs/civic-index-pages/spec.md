## MODIFIED Requirements

### Requirement: Detail subpages own browse surfaces

The system MUST keep Civic Index landing pages focused on visitor-intent preview metrics and keep child entity lists, maps, browse tables, direct drill-down sections, search, sort, pagination, and row-level browsing on scoped subpages only, if those subpages already exist. A single jump-navigation control inside the child-entity metric cell is navigation, not a browse surface.

#### Scenario: Civic Index landing page is rendered

- **WHEN** a user opens a state, administrative-area, place, or agency Civic Index landing page
- **THEN** the page does not render child entity lists
- **AND** the page does not render maps
- **AND** the page does not render browse tables
- **AND** the page does not render direct drill-down sections
- **AND** the page does not render searchable browse tables, paginated child results, or row-level child entity links
- **AND** the page may render metric-card CTAs or text links to existing scoped browse subpages
- **AND** the page may render one jump-navigation control (a select of child-entity names with a submit action) inside the child-entity metric cell, which navigates to existing scoped sub-pages and shows no child-entity data beyond names for navigation
- **AND** those browse surfaces may exist only on scoped subpages, if they exist at all

#### Scenario: State landing page is rendered

- **WHEN** a state Civic Index landing page is rendered
- **THEN** the page does not list, map, table, or directly drill into counties, places, agencies, personnel, reports, or civil cases
- **AND** the page may link to an existing counties, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpage
- **AND** the page may render the county jump-navigation control inside the counties metric cell
- **AND** any county browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Administrative-area landing page is rendered

- **WHEN** an administrative-area Civic Index landing page is rendered
- **THEN** the page does not list, map, table, or directly drill into places, agencies, personnel, reports, or civil cases
- **AND** the page may link to an existing places, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpage
- **AND** the page may render the place jump-navigation control inside the places metric cell
- **AND** any place or agency browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Place landing page is rendered

- **WHEN** a place Civic Index landing page is rendered
- **THEN** the page does not list, map, table, or directly drill into agencies, personnel, reports, or civil cases
- **AND** the page may link to an existing agencies, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpage
- **AND** the page may render the agency jump-navigation control inside the agencies metric cell
- **AND** any agency browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Agency landing page is rendered

- **WHEN** an agency Civic Index landing page is rendered
- **THEN** the page does not render browse tables, maps, paginated personnel lists, paginated report lists, or paginated civil-case lists alongside the visitor-intent data previews
- **AND** the page may link to existing personnel, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpages
- **AND** any personnel, report, civil-case, budget, liability, or other browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Personnel agencies subpage is omitted for one agency

- **WHEN** a personnel record is associated with exactly one distinct agency
- **THEN** the personnel page does not link the Agencies metric card to `/personnel/{slug}/agencies/`
- **AND** the build does not generate `/personnel/{slug}/agencies/`

#### Scenario: Personnel agency assignments are rendered

- **WHEN** a personnel profile page is rendered
- **THEN** the page renders the full agency assignment table for that person
- **AND** the Agencies metric card links to that on-page table
- **AND** the build does not generate `/personnel/{slug}/agencies/` for any personnel record
- **AND** a previously published `/personnel/{slug}/agencies/` URL redirects to `/personnel/{slug}/`
