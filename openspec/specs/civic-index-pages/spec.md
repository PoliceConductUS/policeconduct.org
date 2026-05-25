# civic-index-pages Specification

## Purpose

Define the shared Civic Index landing-page pattern for state, administrative-area, and place pages so jurisdiction pages present current record coverage, one-level-down navigation, persona action paths, and clearly labeled future datasets while preserving database-backed routing conventions.

## Requirements

### Requirement: Shared Civic Index pattern

The system SHALL render state, administrative-area, and place landing pages with a shared Civic Index page pattern.

#### Scenario: User opens a location landing page

- **WHEN** a user opens a state, administrative-area, or place landing page
- **THEN** the page uses the shared Civic Index visual system
- **AND** the page identifies the current jurisdiction and location level
- **AND** the page provides jurisdiction-scoped record coverage, one-level-down map/index navigation, persona action paths, and future-data placeholders

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

### Requirement: Current record coverage

The system SHALL display a current record coverage panel with counts scoped to the current jurisdiction.

#### Scenario: Current coverage data exists

- **WHEN** a Civic Index page is rendered for a jurisdiction with current local database data
- **THEN** the coverage panel shows available scoped counts for agencies, personnel, public reports, civil cases, and source or coverage links where a reliable existing local source exists
- **AND** the counts are scoped to the current state, administrative area, or place
- **AND** the panel labels the counts as current record coverage

#### Scenario: Optional coverage source is unavailable

- **WHEN** no reliable existing local source exists for a source-link or coverage-link count
- **THEN** the system does not fabricate that count
- **AND** the page still renders the other available current coverage counts

---

### Requirement: One-level-down map

The system SHALL render map points only for the next level below the current Civic Index page.

#### Scenario: State page map

- **WHEN** a state Civic Index page is rendered
- **THEN** the map points represent administrative areas or counties with available records
- **AND** the map does not render every agency in the state directly

#### Scenario: Administrative-area page map

- **WHEN** an administrative-area Civic Index page is rendered
- **THEN** the map points represent places within that administrative area

#### Scenario: Place page map

- **WHEN** a place Civic Index page is rendered
- **THEN** the map points represent agencies in that place with available map coordinates

---

### Requirement: Searchable and sortable index table

The system SHALL provide a searchable and sortable index table below the map on each Civic Index page.

#### Scenario: State index table

- **WHEN** a state Civic Index page is rendered
- **THEN** the table rows represent administrative areas or counties
- **AND** each row links to the corresponding administrative-area page using its database-backed path

#### Scenario: Administrative-area index table

- **WHEN** an administrative-area Civic Index page is rendered
- **THEN** the table rows represent places
- **AND** each row links to the corresponding place page using its database-backed path

#### Scenario: Place index table

- **WHEN** a place Civic Index page is rendered
- **THEN** the table rows represent agencies
- **AND** each row links to the corresponding agency profile using its database-backed canonical path

#### Scenario: User searches or sorts the table

- **WHEN** a user searches or sorts a Civic Index table
- **THEN** matching rows remain discoverable without changing canonical URLs
- **AND** the no-JavaScript baseline still renders the full table and links

---

### Requirement: Persona action paths

The system SHALL provide clear action paths for residents and defense attorneys on Civic Index pages.

#### Scenario: Resident reviews action options

- **WHEN** a resident views a Civic Index page
- **THEN** the page provides actions to find a local agency, share an interaction, and get notified when records change
- **AND** each action uses an existing route or an approved route added by another change

#### Scenario: Defense attorney reviews action options

- **WHEN** a defense attorney views a Civic Index page
- **THEN** the page provides actions to check personnel history, review civil litigation, and submit missing source records
- **AND** each action uses an existing route or an approved route added by another change

---

### Requirement: Future data placeholders

The system SHALL display future datasets as clearly labeled not-collected-yet placeholders.

#### Scenario: Future placeholder section is rendered

- **WHEN** a Civic Index page is rendered
- **THEN** the page includes a "Data not collected yet" section
- **AND** the section lists use-of-force policy checklist, settlement and payout history, complaint outcomes, civil forfeiture indicators, accountability barriers, and positive-deviance practices
- **AND** each item states that detailed data is not yet collected

#### Scenario: Positive-deviance placeholder is rendered

- **WHEN** the positive-deviance practices placeholder is rendered
- **THEN** the page does not present unsupported praise, rankings, endorsements, or findings
- **AND** the item is clearly framed as a future evidence-backed dataset
