## MODIFIED Requirements

### Requirement: Self-hosted static search index

The system SHALL build a static full-text search index (Pagefind) over the
generated site at build time, served entirely from the site's own origin. No
page about a person SHALL be in the index.

#### Scenario: Site build completes

- **WHEN** `npm run build` completes
- **THEN** the search index exists in the build output
- **AND** all search assets (index chunks, scripts, styles) are self-hosted
  with no third-party requests

#### Scenario: Index scope is controlled

- **WHEN** pages are indexed
- **THEN** indexing covers meaningful content regions of entity and geography
  pages (names, titles, record summaries)
- **AND** chrome such as the masthead, breadcrumbs, and repeated action labels
  is excluded from the index

#### Scenario: Pages about people are not indexed

- **WHEN** the search index is built
- **THEN** no indexed URL is `/personnel/`, a `/personnel/{slug}/` profile, or
  a `/personnel/{slug}/{topic}/` page

### Requirement: Persistent masthead search

Every page SHALL include the labelled masthead search input that lets a user
search places, agencies, and cases from wherever they are. The masthead
search SHALL NOT return pages about individual people.

#### Scenario: User searches from any page

- **WHEN** a user types a query into the masthead search input
- **THEN** matching results appear with page titles and paths
- **AND** selecting a result navigates to that page

#### Scenario: Search input accessibility

- **WHEN** the search input renders
- **THEN** it has a programmatically associated label and `role="search"`
  landmark
- **AND** result updates are announced to assistive technology (for example an
  `aria-live` result count)

#### Scenario: A visitor types a person's name

- **WHEN** a visitor types a person's full name that appears only on pages
  about that person
- **THEN** the masthead search returns no results

## ADDED Requirements

### Requirement: State filter on the masthead search

The masthead search SHALL offer one state filter and no place or agency
filter. When no state is chosen, results SHALL NOT be filtered by state. When
a state is chosen, every result SHALL be a page whose state filter values
include that state, and pages with no state SHALL NOT be in the results.

#### Scenario: A visitor filters by state

- **WHEN** a visitor types an agency name and chooses Texas in the state filter
- **THEN** every result is a page whose state filter value is Texas
- **AND** a matching agency page outside Texas is not in the results

#### Scenario: No state is chosen

- **WHEN** a visitor types a query that matches pages in more than one state
  and leaves the state filter on "All states"
- **THEN** results from every matching state are shown

#### Scenario: A page with no state while a state is chosen

- **WHEN** a visitor types the name of a federal agency and chooses Texas
- **THEN** the federal agency page is not in the results

#### Scenario: A civil case linked to an agency in the chosen state

- **WHEN** a civil-case page is linked to a Texas agency and the visitor types
  its title with Texas chosen
- **THEN** the civil-case page is in the results

#### Scenario: No results in the chosen state

- **WHEN** a visitor types a query that matches only pages outside Texas and
  chooses Texas
- **THEN** the no-results message is shown
- **AND** the search status announces that there are no results

#### Scenario: Keyboard use of the state filter

- **WHEN** a keyboard user tabs from the search input to the state filter and
  chooses a state
- **THEN** the results update for the current query
- **AND** the new result count is announced through the search status live
  region

#### Scenario: Without JavaScript

- **WHEN** the masthead renders without JavaScript
- **THEN** no state label or select is shown
- **AND** submitting the form opens `/find-records/`

### Requirement: State filter value of a page

A page's state filter value SHALL come from the `location_path` record of the
page's own record, through its `location_path_id`. A civil-case page SHALL
take the state of every agency linked to the case through its personnel. Any
other page whose record has no `location_path_id` SHALL have no state filter
value.

#### Scenario: An agency page gets its state

- **WHEN** the index is built for an agency whose `location_path_id` lies in
  Texas
- **THEN** the agency page's state filter value is Texas

#### Scenario: A civil case linked to agencies in two states

- **WHEN** a civil case is linked to one agency in Texas and one in Oklahoma
- **THEN** the civil-case page has both Texas and Oklahoma as state filter
  values

### Requirement: Search analytics without query text

Every search analytics event (`search_results`, `search_result_selected` and
`coverage_search_no_results`) from the masthead search and from
`/find-records/` SHALL carry the result count of the search it belongs to.
Every masthead search event SHALL also carry the chosen state. No search
event SHALL carry the query text or any part of it.

#### Scenario: A settled masthead search with a state chosen

- **WHEN** a visitor chooses Texas and a masthead search settles
- **THEN** one `search_results` event is sent with the result count and the
  chosen state
- **AND** the event does not contain the query text

#### Scenario: A masthead search with no results

- **WHEN** a masthead search settles with no results
- **THEN** a `coverage_search_no_results` event is sent with a result count of
  0 and the chosen state
- **AND** the event does not contain the query text

#### Scenario: A visitor selects a result

- **WHEN** a visitor selects a masthead or `/find-records/` result
- **THEN** the `search_result_selected` event carries the result count of the
  search
- **AND** a masthead event also carries the chosen state

#### Scenario: A finder search with no results

- **WHEN** a `/find-records/` search has no results
- **THEN** a `coverage_search_no_results` event is sent with `search_source`
  `record_finder` and a result count of 0
- **AND** the event does not contain the query text
