## ADDED Requirements

### Requirement: Long lists show 50 rows per page

Every public list of more than 50 rows SHALL show 50 rows per page. Page 1 SHALL
use the list's base path and later pages SHALL use `/page/{n}/`. Every page of a
paginated list SHALL show a pager. A list of 50 or fewer rows SHALL render as one
page with no pager and SHALL NOT generate `/page/{n}/` routes. Page 1 and later
pages SHALL load their rows from the same loader, so no row appears on two
pages.

#### Scenario: A state has 254 counties

- **WHEN** a visitor opens `/tx/counties/`
- **THEN** the page lists the first 50 counties and shows a pager
- **AND** `/tx/counties/page/6/` lists counties 251 to 254

#### Scenario: A list has 50 rows

- **WHEN** a list has exactly 50 rows
- **THEN** its base path lists all 50 rows without a pager
- **AND** no `/page/2/` route is generated for it

### Requirement: No list drops rows without a pager

A public list SHALL NOT show only part of its rows unless it offers a pager
that reaches every row.

#### Scenario: A county has more than 50 linked civil cases

- **WHEN** a county's civil-case list has 120 cases
- **THEN** its pages together list all 120 cases, 50 per page
- **AND** no page describes its rows as only the most recent

### Requirement: Removed page numbers return 404

A `/page/{n}/` URL beyond a list's last page SHALL return 404 and SHALL be
recorded in `route-absences.json` when it appeared in the previous production
sitemap.

#### Scenario: The global civil-case list shrinks to fewer pages

- **WHEN** the global civil-case list moves from 25 to 50 rows per page
- **THEN** page numbers above the new last page return 404
- **AND** each one that was in the previous sitemap has a `route-absences.json`
  entry
