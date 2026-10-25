# entity-page-chrome Specification

## Purpose

TBD - created by archiving change redesign-civic-index-to-production. Update Purpose after archive.

## Requirements

### Requirement: Shared masthead

Every page SHALL render the shared masthead containing the site wordmark, the
persistent search input, a "Share an experience" primary action, and a
"Volunteer" secondary action linking to `/volunteer/`.

#### Scenario: Any page is rendered

- **WHEN** any page on the site is rendered
- **THEN** the masthead renders the wordmark linking home, the search input,
  the "Share an experience" action, and the "Volunteer" action
- **AND** the masthead is produced by one shared component with no page-local
  copies

### Requirement: Skip-to-content link

Every page SHALL provide a skip-to-content link as the first focusable
element, visually hidden until focused, targeting the page's main landmark.

#### Scenario: Keyboard user tabs from the top of a page

- **WHEN** a keyboard user presses Tab on a freshly loaded page
- **THEN** the first focused element is the skip link
- **AND** activating it moves focus and scroll to the `<main>` landmark

### Requirement: Breadcrumb landmark

Pages with breadcrumbs SHALL wrap them in a navigation landmark labelled
"Breadcrumb" with the current page marked via `aria-current="page"`.

#### Scenario: Entity page with breadcrumbs is rendered

- **WHEN** a page renders its breadcrumb trail
- **THEN** the trail is inside `<nav aria-label="Breadcrumb">`
- **AND** the final crumb carries `aria-current="page"`

### Requirement: Shared entity action bar

Entity pages (agency, personnel, civil case) SHALL render a shared action bar
whose overflow "More actions" menu is a native `<details>/<summary>`
disclosure that works without JavaScript.

#### Scenario: Entity page renders its actions

- **WHEN** an agency, personnel, or civil-case page renders its action bar
- **THEN** the primary and secondary actions render from the shared component
- **AND** "More actions" is a `<details>` disclosure listing only actions with
  working destinations (for example copy link, view sources and methodology)
- **AND** the menu opens, closes, and its items remain reachable with
  JavaScript disabled

#### Scenario: Keyboard user operates the overflow menu

- **WHEN** a keyboard user opens the menu and moves through its items
- **THEN** every item shows a visible focus indicator meeting WCAG 2.1 AA
  focus-appearance expectations

### Requirement: Grouped contact identity

The page SHALL render an entity's contact person and contact email visibly
grouped as one contact identity whenever the two are linked in the data model,
rather than on unrelated rows.

#### Scenario: Agency page renders a contact person with an email

- **WHEN** an agency page renders a contact person whose email is linked in
  the data model
- **THEN** the contact name and email render together as one visual group
- **AND** unrelated links such as the agency phone number or social profiles
  do not visually separate the name from its email

### Requirement: Icon social links

Social-media links SHALL render as the platform's icon from the site's icon
set with an accessible name identifying the entity and platform.

#### Scenario: Agency page renders a social link

- **WHEN** an entity page renders a social-media link such as YouTube
- **THEN** the link renders the platform icon with `aria-hidden` on the glyph
- **AND** the anchor carries an accessible name such as
  "Irving Police Department on YouTube"

### Requirement: Experience terminology

Public-facing copy, analytics event names, and structured data SHALL use
"experience" wording (for example "Share an experience") and MUST NOT use
"interaction" wording.

#### Scenario: Site copy is audited

- **WHEN** the generated site output is searched for "interaction" wording in
  public copy, analytics event names, and structured data
- **THEN** no occurrences remain

### Requirement: Self-hosted assets

All fonts, icons, styles, and scripts SHALL be served from the site's own
origin; pages MUST NOT trigger requests to third-party hosts.

#### Scenario: Page network activity is inspected

- **WHEN** any generated page loads in a browser
- **THEN** all requests resolve to the site's own origin
- **AND** icon glyphs come from a self-hosted subset and Public Sans loads as
  self-hosted WOFF2

### Requirement: Externalized styles and shared script

All styling SHALL ship in external stylesheets with no inline CSS in generated
HTML, and shared client behavior SHALL ship as one shared script rather than
per-page inline scripts.

#### Scenario: Build output is validated

- **WHEN** `npm run build` runs `validate:no-inline-css` over the generated
  output
- **THEN** validation passes with no inline styles
- **AND** no page embeds a page-local copy of shared behavior

### Requirement: Accessible contrast for de-emphasized text

All text SHALL meet WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large text)
on every background it renders against, including hover states — explicitly
covering de-emphasized captions, metadata, glosses, and empty-state values.

#### Scenario: A11y audit runs on generated pages

- **WHEN** `npm run audit:a11y` runs against generated pages
- **THEN** no contrast violations are reported for any text tier
