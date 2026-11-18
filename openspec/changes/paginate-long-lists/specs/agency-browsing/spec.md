## MODIFIED Requirements

### Requirement: Personnel can be filtered by discipline

Agency personnel rosters SHALL offer a checkbox labeled "With discipline actions" that retains only rows whose personnel have at least one direct discipline record, regardless of agency linkage. This checkbox rule is superseded by the approved `filter-roster-by-personnel-discipline` change; existing agency-linked count labels and agency totals retain their meaning. It SHALL combine with existing status and name filters, update the result summary and empty state, and work on small rosters. When a roster is split into pages, the name filter, status facets, discipline checkbox, result summary, empty state and A–Z jump SHALL apply to every person on the roster, not only to the rows of the current page. Filtered results SHALL show 50 rows per view with Previous and Next controls. Clearing every filter SHALL restore the server-rendered page.

#### Scenario: Filters combine

- **WHEN** discipline-only, current status and a name search are selected
- **THEN** only rows matching all three criteria remain visible

#### Scenario: Checkbox is cleared

- **WHEN** the visitor clears the discipline checkbox
- **THEN** rows matching the remaining filters become visible again

#### Scenario: A filter matches people on a later roster page

- **WHEN** a visitor on page 1 of a 6,030-person roster searches for a name
  that appears only on page 87
- **THEN** that person appears in the results
- **AND** the summary counts matches across the whole roster

#### Scenario: Filters are cleared on a paged roster

- **WHEN** the visitor clears every filter
- **THEN** the page shows its own 50 server-rendered rows and its pager again
