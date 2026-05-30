# civic-index-pages Specification

## Purpose

Define the shared Civic Index landing-page pattern for state, administrative-area, place, and agency pages so jurisdiction pages present neutral civic indicator summaries, availability states, detail-page links, and scoped volunteer paths while preserving database-backed routing conventions.

## Requirements

### Requirement: Shared Civic Index pattern

The system SHALL render state, administrative-area, place, and agency landing pages with a shared Civic Index page pattern.

#### Scenario: User opens a location landing page

- **WHEN** a user opens a state, administrative-area, place, or agency landing page
- **THEN** the page uses the shared Civic Index visual system
- **AND** the page identifies the current jurisdiction and location level
- **AND** the page provides jurisdiction-scoped civic indicators, metric availability states, detail-page links, persona action paths, and scoped volunteer paths

#### Scenario: Page visual system is rendered

- **WHEN** a Civic Index page is rendered
- **THEN** the visual design uses a light-mode-first civic/editorial style with thin rules, compact tables, restrained deep red accents, and muted teal accents
- **AND** the page does not use marketing hero hype, gradients, glassmorphism, nested cards, decorative blobs, or sensational language

---

### Requirement: Route and location identity preservation

The system MUST preserve existing database-backed slug, route, and location-path conventions for Civic Index pages.

#### Scenario: Location pages are generated

- **WHEN** the build generates state, administrative-area, and place pages
- **THEN** route parameters are derived from existing database-backed location paths
- **AND** agency canonical links use database-backed agency paths from the existing location/agency data source
- **AND** the implementation does not compute slugs from names or parallel agency columns at runtime

#### Scenario: Required schema is missing

- **WHEN** an expected required database table or field for Civic Index current data is missing
- **THEN** the build fails rather than silently rendering empty fallback data

---

### Requirement: Civic indicator catalog

The system SHALL render a level-appropriate catalog of desired civic indicators on Civic Index landing pages.

#### Scenario: State indicator catalog is rendered

- **WHEN** a state Civic Index page is rendered
- **THEN** the page may include top-level metrics for county count, report count, budget by source, civil cases, liability costs, decertification law context, and policy rating
- **AND** the page does not render personnel metrics unless they are explicitly modeled as state-level records rather than child agency personnel

#### Scenario: County, place, or agency indicator catalog is rendered

- **WHEN** an administrative-area, place, or agency Civic Index page is rendered
- **THEN** the page may include metrics for calls for service or incidents, offenses by type, revenue by offense type, offenses by race, revenue by income, outcomes by income, use of force by type, stops by race with day-versus-night comparison, searches by race, searches by income, searches by offense type, budget by source, overtime hours per sworn officer, complaints by allegation, commendations or awards or positive conduct, policy safeguards, policy rating, civil cases, and liability costs
- **AND** personnel metrics appear only on agency pages unless another approved spec defines a non-agency personnel scope
- **AND** budget by source includes civil forfeiture only as a budget or revenue source, not as a separate Civic Index metric family

#### Scenario: Policy and accountability context is rendered

- **WHEN** policy safeguards are rendered
- **THEN** the page may summarize available safeguards such as de-escalation requirements, duty to intervene, neck-restraint limits, shooting-at-vehicles limits, force reporting requirements, force review process, complaint intake accessibility, anonymous complaint acceptance, body-camera activation or retention or release rules, stop or search documentation requirements, and public reporting requirements
- **AND** each safeguard is labeled as present, absent, partially identified, not collected yet, or unavailable for the current scope according to the source data

#### Scenario: Accountability barriers are rendered

- **WHEN** accountability barriers are rendered
- **THEN** each barrier identifies a specific public-information obstacle such as unavailable complaint process, unpublished complaint outcomes, unpublished force data, incomplete stop or search fields, overly aggregated budget records, unlinked settlement records, unavailable or unversioned policy manual, state-law discipline-record limits, or decertification records not linked to agency or personnel records
- **AND** the page does not summarize those barriers as a general conclusion that an agency or jurisdiction is unsafe, unaccountable, or intentionally withholding information

#### Scenario: Positive conduct indicators are rendered

- **WHEN** commendations, awards, positive conduct, or positive-deviance indicators are rendered
- **THEN** the page labels the exact source type and scope
- **AND** the page does not present unsupported praise, rankings, endorsements, or overall findings
- **AND** any positive-deviance finding is clearly identified as a derived evidence-backed analysis with methodology and limitations

---

### Requirement: Metric scope and neutrality

The system MUST make every displayed civic indicator explicit and neutral.

#### Scenario: Direct metric is rendered

- **WHEN** a Civic Index page renders a direct metric
- **THEN** the metric states what is counted or measured
- **AND** the metric states the geographic, agency, or entity scope
- **AND** the metric states the source basis
- **AND** the metric states the date window when the metric is time-based

#### Scenario: Time-based metric is rendered

- **WHEN** a metric describes a rate, trend, comparison over time, or recent activity
- **THEN** the metric defaults to the previous 12 months unless the metric label states a different date range
- **AND** the date range is visible near the metric value or metric label

#### Scenario: All data copy is rendered

- **WHEN** Civic Index data, metric labels, captions, summaries, empty states, or calls to action are rendered
- **THEN** the copy remains descriptive and neutral
- **AND** the copy does not imply quality, danger, intent, causation, accountability, safety, misconduct, or improvement unless an approved methodology directly supports that statement

---

### Requirement: Metric availability states

The system SHALL show desired Civic Index metrics with explicit availability states instead of hiding missing applicable data.

#### Scenario: Metric data is available

- **WHEN** a desired metric has scoped source data
- **THEN** the page shows the metric value or summary
- **AND** the metric is labeled as available
- **AND** the metric includes a "View details" link to the relevant scoped subpage

#### Scenario: Metric data is partially available

- **WHEN** a desired metric has incomplete scoped source data
- **THEN** the page may show the available value or summary
- **AND** the metric is labeled as partially available
- **AND** the metric states the known limitation without implying the missing data is zero
- **AND** the metric includes a "View details" link when underlying data exists

#### Scenario: Metric data is not collected yet

- **WHEN** a desired metric applies to the current scope but has no collected data
- **THEN** the page labels the metric as not collected yet
- **AND** the page does not render a numeric zero unless source data directly establishes zero
- **AND** the page identifies the source type needed to calculate or summarize the metric
- **AND** the page may show a small non-primary volunteer CTA scoped to the current area and dataset

#### Scenario: Metric is unavailable for the current scope

- **WHEN** a desired metric does not apply to the current level, geography, agency, or entity scope
- **THEN** the page labels the metric as unavailable for this scope or omits it according to the approved metric catalog
- **AND** the page does not invite volunteers to collect inapplicable data

---

### Requirement: Detail subpages own browse surfaces

The system MUST keep Civic Index landing pages focused on overview metrics and route users to scoped subpages for maps, lists, tables, search, sort, pagination, and row-level browsing.

#### Scenario: Location index page is rendered

- **WHEN** a user opens a state, administrative-area, place, or agency Civic Index landing page
- **THEN** the page does not render a map
- **AND** the page does not render child entity lists, child entity tables, searchable browse tables, paginated child results, or row-level child entity links
- **AND** the page links to scoped subpages for browseable counties, places, agencies, personnel, reports, civil cases, budget, liability costs, calls for service or incidents, offenses, revenue, outcomes, use of force, stops, searches, overtime, complaints, commendations, policies, policy safeguards, and accountability barriers when those subpages have available data

#### Scenario: State landing page is rendered

- **WHEN** a state Civic Index landing page is rendered
- **THEN** the page does not list counties, places, agencies, personnel, reports, or civil cases
- **AND** any county browse experience is rendered only on a scoped subpage

#### Scenario: Administrative-area landing page is rendered

- **WHEN** an administrative-area Civic Index landing page is rendered
- **THEN** the page does not list places, agencies, personnel, reports, or civil cases
- **AND** any place or agency browse experience is rendered only on a scoped subpage

#### Scenario: Place landing page is rendered

- **WHEN** a place Civic Index landing page is rendered
- **THEN** the page does not list agencies, personnel, reports, or civil cases
- **AND** any agency browse experience is rendered only on a scoped subpage

---

### Requirement: Derived civic indicators

The system MUST distinguish direct source metrics from derived comparison metrics.

#### Scenario: Derived metric is rendered

- **WHEN** a Civic Index page renders a derived metric such as force-to-complaint mismatch, policy-to-outcome comparison, positive-to-negative conduct ratio, search disparity indicator, revenue burden indicator, complaint-to-discipline gap, or liability-to-policy gap
- **THEN** the metric labels the comparison inputs
- **AND** the metric states the date window
- **AND** the metric links to a methodology or detail page when source data exists
- **AND** the metric does not state or imply causation, intent, safety, accountability, misconduct, or improvement unless the approved methodology directly supports that conclusion

#### Scenario: Force-to-complaint mismatch is rendered

- **WHEN** force-to-complaint mismatch is rendered
- **THEN** the metric compares force incidents or force types with complaint allegations or complaint counts for the same approved scope and date window
- **AND** the metric states that mismatch may reflect reporting access, classification differences, under-reporting, data availability, or actual record differences

#### Scenario: Policy-to-outcome comparison is rendered

- **WHEN** policy-to-outcome comparison is rendered
- **THEN** the metric compares policy safeguards or policy rating with outcome metrics such as force, complaints, killings, civil cases, or payouts
- **AND** the metric labels the result as a comparison or correlation unless an approved causal method supports stronger wording

#### Scenario: Positive-to-negative conduct ratio is rendered

- **WHEN** positive-to-negative conduct ratio is rendered
- **THEN** the metric compares commendations, awards, or positive conduct records with complaints, force, discipline, civil cases, or liability costs for the same approved scope and date window
- **AND** the metric states that reporting practices and award practices may affect the ratio

---

### Requirement: Persona action paths

The system SHALL provide clear action paths for residents, defense attorneys, and volunteers on Civic Index pages.

#### Scenario: Resident reviews action options

- **WHEN** a resident views a Civic Index page
- **THEN** the page provides actions to find scoped detail pages, share an interaction, and get notified when records change
- **AND** each action uses an existing route or an approved route added by another change

#### Scenario: Defense attorney reviews action options

- **WHEN** a defense attorney views a Civic Index page
- **THEN** the page provides actions to check agency-level personnel history, review civil litigation, and submit missing source records
- **AND** each action uses an existing route or an approved route added by another change

#### Scenario: Volunteer reviews missing data option

- **WHEN** a desired applicable metric is not collected yet or partially available
- **THEN** the page may provide a small non-primary action to help collect source records for that metric and scope
- **AND** the action preserves the current page path and dataset context
