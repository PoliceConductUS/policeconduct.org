## ADDED Requirements

### Requirement: Roster filters cover every page of a paged roster

For an agency roster of more than 50 rows, the name search, "With discipline actions" checkbox, result summary, empty state and A–Z jump SHALL apply to every row on the roster, not only to the rows of the current page. While any filter is active, results SHALL show 50 per view with Previous and Next controls. Clearing every filter SHALL restore the server-rendered page.

#### Scenario: Roster page routes exist for later pages

- **WHEN** an agency roster has 51 or more rows
- **THEN** `<agency>/personnel/` lists rows 1-50 with a pager
- **AND** `<agency>/personnel/page/{n}/` exists for every later page

#### Scenario: Summary shows whole-roster staff counts on every page

- **WHEN** a visitor opens any page of a paged roster with no filter active
- **THEN** the summary shows the agency's staff counts as stored in the intake view `site_agency_count`, the same on every page

#### Scenario: An A–Z letter links to the page where it starts

- **WHEN** no filter is active and a visitor picks a letter whose first row is on a later page
- **THEN** the link opens that page at the anchor for that letter group

#### Scenario: A filter matches rows on a later roster page

- **WHEN** a visitor on page 1 of a roster of more than 50 rows searches for a name that appears only on a later page
- **THEN** that row appears in the results
- **AND** the summary counts matches across the whole roster

#### Scenario: Filters combine

- **WHEN** discipline-only and a name search are selected
- **THEN** the results contain only rows matching both

#### Scenario: A–Z while filtering moves the view

- **WHEN** a filter is active and the visitor picks a letter
- **THEN** the filtered view moves to the 50-row view that holds the first result starting with that letter
- **AND** the filter stays active and the visitor stays on the same page

#### Scenario: Letters with no result dim

- **WHEN** a filter is active and no result starts with a letter
- **THEN** that letter is dimmed in the A–Z jump

#### Scenario: Server pager hides while filtering

- **WHEN** a filter is active on a paged roster
- **THEN** the server pager is hidden
- **AND** when the visitor clears every filter, the page shows its own 50 server-rendered rows and its pager again

#### Scenario: Roster data file is loading

- **WHEN** a visitor first uses a filter and the roster data file has not loaded yet
- **THEN** the summary says the full roster is loading
- **AND** filter input typed meanwhile is applied when the file arrives

#### Scenario: Roster data file fails to load

- **WHEN** the roster data file fails to load
- **THEN** the summary says the full roster could not be loaded and offers a "Try again" button
- **AND** the page keeps its server-rendered rows
- **AND** the page never shows one page's rows as whole-roster results

#### Scenario: Roster data file is from a newer build

- **WHEN** the roster data file's data version differs from the page's data version
- **THEN** the summary asks the visitor to reload the page to see the full roster
- **AND** the page keeps its server-rendered rows

#### Scenario: A filtered row matches the server row

- **WHEN** a row appears in filtered results
- **THEN** the result row shows the same label, link, context line and discipline count as that row's server-rendered version

### Requirement: Filtered roster view controls

The filtered roster view SHALL use buttons named "Previous results" and "Next results", disabled at the first and last view. After each, focus SHALL move to the "Matching personnel" heading, and one polite live region SHALL announce the range and total. The view SHALL return to the first view when a filter changes.

#### Scenario: Filtered view controls follow the local-pager rules

- **WHEN** a visitor uses Previous results, Next results or an A–Z letter in the filtered view
- **THEN** focus moves to the "Matching personnel" heading
- **AND** the one polite live summary announces the range and total
- **AND** Previous results is disabled on the first view and Next results on the last view

#### Scenario: Changing a filter returns to the first view

- **WHEN** a visitor is on a later filtered view and changes a filter
- **THEN** the filtered view shows its first 50 results

### Requirement: Small rosters stay one page

Rosters of 50 or fewer rows SHALL render as one page, filter their rendered rows, and SHALL NOT have a roster data file.

#### Scenario: A small roster has no data file

- **WHEN** an agency roster has 50 or fewer rows
- **THEN** it renders as one page with no pager
- **AND** no roster data file is built or requested for it

### Requirement: Roster pages are not in the site search index

Every agency roster page, including `<agency>/personnel/page/{n}/` and `/federal/{slug}/personnel/`, SHALL be left out of the site search index. Other agency topic pages SHALL keep their current search index setting.

#### Scenario: A roster page is built

- **WHEN** the build renders any agency roster page or `/federal/{slug}/personnel/`
- **THEN** the page has no `data-pagefind-body` marker
- **AND** the site search returns no roster page
