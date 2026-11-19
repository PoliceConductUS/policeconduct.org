## ADDED Requirements

### Requirement: Jump navigation opens only web pages

When JavaScript runs, a jump-navigation control SHALL open the selected option only if its value resolves to an `http:` or `https:` URL. Option values are server-rendered, site-relative paths, so a rejected value can occur only if someone changes the page.

#### Scenario: Script destination is selected

- **WHEN** a user submits the control with an option whose value is a `javascript:` URL
- **THEN** no script runs, the page stays where it is, and no status message is shown

#### Scenario: Site page is selected

- **WHEN** a user submits the control with an option whose value is a site-relative path such as `/`
- **THEN** the browser opens that path
