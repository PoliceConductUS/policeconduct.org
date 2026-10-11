<!--
Delta written against the civic-index-pages baseline as it will stand after
the active `preview-civic-index-data-experience` change archives (this change
lands after it). MODIFIED sections reproduce and extend that text in full.
-->

## ADDED Requirements

### Requirement: Separate record-class surfaces

The system SHALL present experience reports and civil cases as separate
surfaces and MUST NOT mix the two record classes in a single list, table, or
combined "reports and civil cases" section on any page.

#### Scenario: Entity page renders recent records

- **WHEN** an agency, personnel, or geography page renders recent-record
  surfaces
- **THEN** experience reports appear in their own titled section described as
  public accounts
- **AND** civil cases appear in their own titled section described as court
  records
- **AND** no section, list, or table mixes the two record classes

### Requirement: Geography drill-down entry point

Geography landing pages (state, administrative-area, place) SHALL lead the
top metric strip with a visually distinct drill-down cell that presents the
child-entity count and navigation to existing scoped child sub-pages as the
page's primary next action.

#### Scenario: Geography landing page renders the metric strip

- **WHEN** a state, administrative-area, or place landing page renders its top
  metric strip
- **THEN** the first visual cell is the child-entity drill-down cell with a
  "Start here" affordance, the child-entity count, a jump-navigation control,
  and a "Browse all" link to the existing scoped child sub-page
- **AND** the cell is styled with the interactive accent so it reads as the
  primary next action without overpowering the page

#### Scenario: Jump navigation is used without JavaScript

- **WHEN** a user submits the jump-navigation control with JavaScript disabled
- **THEN** the control navigates to the selected child sub-page through a
  standard form submission or falls back to the "Browse all" link

### Requirement: Metric label glosses

Unavailable metrics whose labels use unfamiliar terms SHALL include a
plain-language gloss beneath the label describing what the metric will hold.

#### Scenario: Unavailable metric with an unfamiliar label is rendered

- **WHEN** an unavailable metric such as "Outcomes by income" renders on a
  landing page
- **THEN** a one-line plain-language gloss (for example "Case results by
  neighborhood income") renders beneath the label
- **AND** the gloss meets WCAG 2.1 AA text contrast

## MODIFIED Requirements

### Requirement: Metric availability states

The system SHALL show desired Civic Index metrics and graphs with explicit availability behavior instead of hiding missing applicable source data.

#### Scenario: Metric or graph data is available

- **WHEN** a desired metric or graph has scoped source data
- **THEN** the page shows the metric value, graph, or summary
- **AND** the metric or graph includes a "View details" link when a relevant scoped subpage already exists

#### Scenario: Metric or graph data is partially available

- **WHEN** a desired metric or graph has incomplete scoped source data
- **THEN** the page may show the available value, graph, or summary
- **AND** the metric or graph states the known limitation without implying the missing data is zero
- **AND** the metric or graph includes a "View details" link when a relevant scoped subpage already exists

#### Scenario: Source data is absent for an applicable metric or graph

- **WHEN** a desired metric or graph applies to the current scope but has no collected source data
- **THEN** the page does not render a numeric zero unless source data directly establishes zero
- **AND** the metric renders a neutral empty value such as `--` or `$--` with no hedging copy such as "not yet collected", "not yet available", or "not on this site yet"
- **AND** the metric's role accent is muted while the value is empty so color marks present data only
- **AND** the metric or graph includes a "View details" link when a relevant scoped subpage already exists
- **AND** each empty metric may show a subtle, non-primary `Help collect this` link to the volunteer page
- **AND** the contribution link includes enough query context for the volunteer page to prefill the related geography, agency, or personnel record
- **AND** the contribution link includes the source page path and the applicable scope type such as state, county, place, agency, or personnel
- **AND** the page does not use public-facing implementation or defensive missing-data copy

#### Scenario: Metric or graph is unavailable for the current scope

- **WHEN** a desired metric or graph does not apply to the current level, geography, agency, personnel, or entity scope
- **THEN** the page omits it according to the approved metric catalog
- **AND** the page does not invite volunteers to collect inapplicable data

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
- **AND** personnel records associated with more than one distinct agency may still link to and generate `/personnel/{slug}/agencies/`
