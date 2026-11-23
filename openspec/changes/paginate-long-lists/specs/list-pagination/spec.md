## ADDED Requirements

### Requirement: Long lists show 50 rows per page

Every server-rendered public page whose main content is a list SHALL, when the
list has more than 50 rows, show 50 rows per page. Page 1 SHALL use the list's
base path and later pages SHALL use `/page/{n}/`. Every page of a paged list
SHALL show a pager. A list of 50 or fewer rows SHALL render as one page with no
pager and SHALL NOT generate `/page/{n}/` routes. The exclusions in "Some lists
are not paged" apply.

#### Scenario: A list has 254 rows

- **WHEN** a list has 254 rows
- **THEN** page 1 lists rows 1-50 with a pager
- **AND** `/page/6/` lists rows 251-254

#### Scenario: A list has 50 rows

- **WHEN** a list has exactly 50 rows
- **THEN** its base path lists all 50 rows without a pager
- **AND** no `/page/2/` route is generated for it

#### Scenario: The global civil-case list shows 50 per page

- **WHEN** a visitor opens `/civil-cases/`
- **THEN** the page lists the first 50 cases and shows a pager

### Requirement: Some lists are not paged

The in-page browsers governed by `authority-discipline-browsing`, filtered
roster views (see `agency-browsing`), and preview excerpts on another page SHALL
NOT be paged by this standard. Each preview excerpt SHALL link to the page that
holds the complete list.

#### Scenario: A preview links to its full list

- **WHEN** a page shows a preview of a longer list
- **THEN** the preview links to the page that lists every row

### Requirement: Pages of a list show every row once

Together, the pages of a list SHALL show every row exactly once, in the list's
sort order.

#### Scenario: Rows tie on every sort column

- **WHEN** two rows tie on every sort column
- **THEN** each still appears on exactly one page

### Requirement: Later pages are self-canonical

Page 2 and later of a paged list SHALL be self-canonical and SHALL add "Page N"
to the page title and breadcrumb.

#### Scenario: Later pages are self-canonical

- **WHEN** a visitor opens `/page/{n}/` of a paged list, with n of 2 or more
- **THEN** the canonical URL is that `/page/{n}/` URL
- **AND** the page title and breadcrumb include "Page N"

### Requirement: No list shows only part of its rows without a pager

A public list SHALL NOT show only part of its rows unless it offers a pager
that reaches every row. The exclusions in "Some lists are not paged" apply.

#### Scenario: A county has more than 50 linked civil cases

- **WHEN** a county's civil-case list has 120 cases
- **THEN** its pages together list all 120 cases, 50 per page
- **AND** no page describes its rows as only the most recent

### Requirement: Removed page numbers return 404

A `/page/{n}/` URL beyond a list's last page SHALL return 404 with no redirect,
and SHALL be recorded in `route-absences.json` when it appeared in the sitemap of
the production release that was live before the change.

#### Scenario: The global civil-case list shrinks to fewer pages

- **WHEN** the global civil-case list moves from 25 to 50 rows per page
- **THEN** page numbers above the new last page return 404
- **AND** each one that was in the sitemap of the production release live before
  the change has a `route-absences.json` entry
