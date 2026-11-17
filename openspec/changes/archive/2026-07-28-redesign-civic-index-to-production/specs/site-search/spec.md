## ADDED Requirements

### Requirement: Self-hosted static search index

The system SHALL build a static full-text search index (Pagefind) over the
generated site at build time, served entirely from the site's own origin.

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

### Requirement: Persistent masthead search

Every page SHALL include the labelled masthead search input that lets a user
search agencies, officers, and cases from wherever they are.

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

### Requirement: No-JavaScript search fallback

The search experience SHALL degrade gracefully when JavaScript is disabled.

#### Scenario: User without JavaScript uses search

- **WHEN** a user with JavaScript disabled submits the masthead search form
- **THEN** the user lands on the existing `/find-records/` browse page as the
  fallback lookup path
