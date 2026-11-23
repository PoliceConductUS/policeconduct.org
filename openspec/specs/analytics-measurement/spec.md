# analytics-measurement Specification

## Purpose

Measure how people use the site in Google Analytics without collecting private visitor data, and keep the Analytics property settings versioned in the repository.

## Requirements

### Requirement: Analytics collection protects private visitor data

The site SHALL collect production analytics only on its HTTPS production hosts, SHALL load the Google tag asynchronously after initializing its queue, and SHALL exclude verification tokens, raw search text, and other non-attribution query values from page, referrer, and link payloads.

#### Scenario: A visitor opens a verification link

- **WHEN** the visitor opens a token-bearing verification URL
- **THEN** every analytics URL excludes the token, including before verification completes

#### Scenario: A developer uses a preview or local site

- **WHEN** the site runs outside its HTTPS production hosts
- **THEN** it does not load or send events to the production Google tag

### Requirement: Measurements describe actual actions

The site SHALL track current masthead links, completed search outcomes and selected search results without visitor query text. Submission receipt SHALL remain distinct from verification-email failure. Donation clicks SHALL retain their selected amount and payment frequency.

#### Scenario: Search result selection

- **WHEN** a visitor selects a search result by keyboard or mouse
- **THEN** one selection event records a bounded destination category without the raw query or record label

#### Scenario: Search dataset cannot load

- **WHEN** a search dataset request or JSON decoding fails
- **THEN** analytics SHALL NOT count that failure as a completed search or a successful search with no matches

#### Scenario: Selected result is a listing

- **WHEN** a visitor selects an agency or civil-case listing in the masthead search
- **THEN** its bounded selection category SHALL NOT identify it as an agency profile or place

#### Scenario: Verification email cannot be sent

- **WHEN** the submission API acknowledges receipt but reports verification-email failure
- **THEN** analytics records receipt and the failed email outcome without claiming email delivery or verification

### Requirement: Analytics settings support the measurement contract

Analytics SHALL redact sensitive URL parameters, avoid automatic raw-search, history-update, outbound-link and download collection that bypasses the URL allowlist, expose bounded form reporting fields, limit collection to production HTTPS hosts, leave the internal-traffic filter inactive so team production visits remain included, and retain event data for fourteen months.

#### Scenario: Administrator reviews reporting settings

- **WHEN** the versioned settings are saved
- **THEN** donation key events and the per-form key events remain enabled, form dimensions are registered, and the configured event retention is fourteen months
- **AND** the generic submission-receipt event `form_submit_success` remains unmarked as a key event

#### Scenario: The generic submission event is marked in the Analytics UI

- **WHEN** `form_submit_success` is marked as a key event in the Analytics UI
- **THEN** `analytics:compare` reports the drift
- **AND** `analytics:push` un-marks it

### Requirement: Managed Analytics settings are versioned and repeatable

The repository SHALL version the existing property and web stream's managed settings. `analytics:compare` SHALL report Admin API differences without writes; `analytics:apply` SHALL apply and verify them. Credentials SHALL remain outside the repository. Unlisted resources and fields SHALL remain unchanged.

#### Scenario: Managed settings already match

- **WHEN** the comparison or apply command finds that all managed settings match
- **THEN** it reports the match without sending a mutation request

#### Scenario: Managed settings differ

- **WHEN** a managed setting is missing or has changed
- **THEN** comparison reports the managed differences without writing
- **AND** explicit apply creates or updates only the managed resource or fields and verifies the resulting settings

#### Scenario: Credentials or Google access are unavailable

- **WHEN** the access token is missing or a Google API request fails
- **THEN** the command fails clearly without exposing credentials or treating unavailable settings as an empty property

#### Scenario: Google omits defaults or paginates resources

- **WHEN** Google omits a default false value, returns equivalent unordered settings, or returns a continuation token
- **THEN** comparison uses the documented defaults and complete resource collection rather than reporting false differences or creating duplicate resources

#### Scenario: Production visits from the team

- **WHEN** the managed configuration is compared or applied
- **THEN** the manual internal-traffic settings remain unchanged and production visits from the team remain included

### Requirement: Analytics settings can be pulled and pushed

`analytics:pull` SHALL read every page of the managed collections and singleton settings, validate the result, and atomically replace `config/analytics.json`. A failed read SHALL leave the local file unchanged. Pull output SHALL be reviewed as a git diff before commit; the committed file remains the source of the managed settings. Pull SHALL keep every `unmarkedKeyEvents` entry, even when that event is marked remotely. `analytics:push` SHALL behave exactly as `analytics:apply`.

#### Scenario: Pull reads every page and writes atomically

- **WHEN** Google returns a continuation token
- **THEN** pull reads all pages before writing, and a following compare reports no differences

#### Scenario: Pull read fails

- **WHEN** any Google read fails
- **THEN** pull exits 2 and `config/analytics.json` is unchanged

#### Scenario: Pull keeps an unmarked key event

- **WHEN** `form_submit_success` is listed in `unmarkedKeyEvents` and is marked remotely
- **THEN** pull keeps it in `unmarkedKeyEvents`, and a following compare reports the drift

### Requirement: Google signals and manual observations

Google signals state SHALL be a managed singleton updated with an explicit update mask. `config/analytics-manual.json` SHALL record dated manual observations for settings the Admin API cannot change and SHALL never be applied.

#### Scenario: Google signals differ

- **WHEN** the managed Google signals state differs from the property
- **THEN** push updates only that state, with an update mask naming only the managed field, and reads it back

#### Scenario: Manual evidence file

- **WHEN** push runs
- **THEN** it does not read or apply `config/analytics-manual.json`
