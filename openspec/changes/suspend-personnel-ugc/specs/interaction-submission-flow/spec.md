## ADDED Requirements

### Requirement: Personnel pages carry no user-generated content while intake is suspended

While personnel user-generated content is suspended, the system MUST NOT render
a comment thread, a personnel submission form, or a link to a personnel
submission form on any generated `/personnel/` page.

#### Scenario: Reader opens a personnel profile

- **WHEN** a reader opens a page under `/personnel/`
- **THEN** the page renders no Disqus comment thread
- **AND** the page renders no link to the personnel intake form or the
  personnel edit form
- **AND** the page renders no officer-prefilled entry into the report form
- **AND** the page states that community submissions are paused and links to
  the correction and removal request form

#### Scenario: A redesign reintroduces a comment thread

- **WHEN** the site is built and a `/personnel/` page contains a comment
  thread, a personnel submission form, or a link to one
- **THEN** the build fails and names the offending file and surface

### Requirement: The forms API refuses suspended personnel submissions

The system MUST reject suspended personnel form submissions before verifying
reCAPTCHA and before writing anything, so a suspended submission is never
stored.

#### Scenario: Client posts a suspended personnel form

- **WHEN** a client posts `personnelNew` or `officerEdit` to `/forms/submit`
- **THEN** the API responds with HTTP 403
- **AND** the response explains that personnel submissions are paused and
  points to the correction and removal request form
- **AND** nothing is written to the submissions bucket
- **AND** the rejection is logged as `forms.submit.suspended_form_name`

#### Scenario: Client posts a form that is not suspended

- **WHEN** a client posts `agencyEdit`, `agencyNew`, `reportNew`,
  `civilLitigationNew`, `civilLitigationEdit`, `contact`, `volunteer`, or
  `dataSubjectAccessRequest`
- **THEN** the request proceeds through the existing verification and storage
  path unchanged

### Requirement: Suspended personnel intake pages stay reachable

The system SHALL keep `/personnel/new/` and `/personnel/suggest-edit/`
reachable at their existing URLs while intake is suspended.

#### Scenario: Visitor opens a suspended intake page

- **WHEN** a visitor opens `/personnel/new/` or `/personnel/suggest-edit/`
- **THEN** the page returns successfully at its existing URL
- **AND** the page renders no submission form
- **AND** the page explains that submissions are paused and offers the
  correction and removal request form, the agency edit form, and contact
- **AND** the page keeps its existing `noindex,follow` robots directive

### Requirement: The suspension does not change what is published or indexed

The suspension MUST NOT change which `/personnel/` URLs exist, their robots
directives, their canonical URLs, `robots.txt`, or the sitemaps.

#### Scenario: Build output is compared against the unsuspended build

- **WHEN** the site is built with the suspension active and compared against a
  build without it
- **THEN** the set of generated URLs is identical
- **AND** the sitemaps are identical
- **AND** `robots.txt` is identical
- **AND** personnel profile pages keep `index,follow` and their self-referencing
  canonical

### Requirement: The suspension is reversible in one edit per deployable unit

The system SHALL express the suspension as a single named constant in the site
and a single named list in the forms API, so it can be lifted the same day.

#### Scenario: Operator lifts the suspension

- **WHEN** an operator sets `PERSONNEL_UGC_SUSPENDED` to false in
  `src/lib/ugc-policy.ts` and empties `SUSPENDED_FORM_NAMES` in the forms API
- **THEN** the personnel submission entry points render again
- **AND** the forms API accepts `personnelNew` and `officerEdit` again
- **AND** the build-time personnel UGC check reports that it is skipped
