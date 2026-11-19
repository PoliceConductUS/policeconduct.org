## ADDED Requirements

### Requirement: Regenerate a page from its original release and saved parts

The publisher SHALL merge new data into the selected release's saved object, apply every keyed part to the original release HTML and publish a complete replacement at the corresponding path. Each entry SHALL identify its target, a template taken from the original page, and its rendering data.

#### Scenario: Second update changes a different part

- **WHEN** one part already has a saved update and another part receives new data
- **THEN** the new full document includes both updates and all unaffected original content

#### Scenario: News appears in a previously empty section

- **WHEN** the selected release's original news section has no stories and a qualifying article is added
- **THEN** the resulting page renders the article once at the intended location

#### Scenario: A better copy appears

- **WHEN** the preferred URL of an already matched article changes
- **THEN** the article keeps its ID and associated assignments, and its updated fields appear in each applicable page

### Requirement: Keep saved records and extracted article bodies private

Access to saved records and extracted article bodies SHALL be limited to the services that discover, render and import coverage.

#### Scenario: A visitor requests the data behind a published story

- **WHEN** a visitor requests saved page data or an extracted article body directly through the production or preview host
- **THEN** the response reveals none of the requested records or body text
- **AND** the rendered page shows its source link and summary and carries the source IDs in `data-source-namespace`/`data-source-id` without embedding the private records or extracted body

#### Scenario: Notes

- **WHEN** an article has public notes and an assignment relationship has notes
- **THEN** the page shows the article notes and does not contain the relationship notes

### Requirement: Schedule daily discovery and release publication

The news-discovery GitHub Action SHALL be scheduled for 7:00 a.m. every day in `America/Chicago`. The Action SHALL write discovery evidence and release outputs without issuing database mutations.

#### Scenario: The scheduled run finds a preferred copy of an existing article

- **WHEN** the daily search finds a preferred URL for an article already present in the database
- **THEN** it updates the saved evidence, release JSON and affected HTML, keeping the article ID and relationship source identities and adding the new occurrence's normalized-URL source ID

### Requirement: Persist the identity assigned by the daily Action

Daily SHALL use each occurrence’s normalized publisher URL as its source ID in the `com/serpapi/landing-page-search` namespace. Daily SHALL write confirmed duplicate-to-target source IDs under `CoverageLink` in the release’s private `data/alias.json`.

#### Scenario: Two record kinds use the same source ID

- **WHEN** `alias.json` contains the same key under `CoverageLink` and another record kind
- **THEN** Daily preserves both mappings and uses the `CoverageLink` target to resolve the article

#### Scenario: Preferred copy changes after discovery

- **WHEN** Daily accepts URL A, then groups a qualifying duplicate B with it
- **THEN** the saved data carries both normalized URL source keys, and the rendered article carries the source pair for the occurrence shown
- **AND** article-to-assignment relationship IDs persist across updates

### Requirement: Build agency coverage from personnel assignments

Coverage links SHALL attach to `AgencyPersonnel` assignments. Each agency page SHALL list the distinct articles linked through its own personnel assignments.

#### Scenario: One article is linked through multiple assignments

- **WHEN** a story links to two personnel assignments at agency A and no assignment at agency B
- **THEN** the story appears once on A’s agency page and is absent from B’s agency page

#### Scenario: A syndicated copy supplies an assignment’s link

- **WHEN** a syndicated copy supplies the link for the only assignment connecting an article to an agency
- **THEN** the agency entry uses that assignment’s source link

### Requirement: Attribute submissions to the originating form

The website SHALL embed its release identity in each built form and submit it as `releaseId` through the configured environment-specific submission path. The Forms API SHALL save every submission, preserve its `releaseId` when present, log a mismatch when the release ID is missing or unknown, and record the Forms API version that processed it.

#### Scenario: An old form submits after deployment

- **WHEN** a form opened under release A submits after release B becomes active
- **THEN** the stored submission identifies A

#### Scenario: Preview and production use the same commit

- **WHEN** a preview form built at the production commit submits with a custom payload
- **THEN** the preview Forms API stores that commit as `releaseId` and the production Forms API receives nothing

#### Scenario: A form from an older release submits

- **WHEN** a form whose `releaseId` names no folder with `builds/<release-id>/data/dynamic.json` in that environment submits
- **THEN** the Forms API saves the submission, logs the release mismatch, and the stored record carries the Forms API version that processed it

#### Scenario: A form from a page without a release ID submits

- **WHEN** a form on a page that has no `data-release-id` submits
- **THEN** the submission is sent and saved without a `releaseId`, the Forms API logs the mismatch, and the stored record carries the Forms API version that processed it

#### Scenario: A form from the current release submits

- **WHEN** a form whose `releaseId` names a known release submits
- **THEN** the Forms API saves the submission with that `releaseId` and the Forms API version that processed it, and logs no mismatch

### Requirement: Publish a page only for the current release

The release-api `publish-page` operation SHALL write an `o:` marker and invalidate paths only for the release that KVS `current` selects, and only after the override object exists.

#### Scenario: The named release is not current

- **WHEN** `publish-page` names a release other than `current`
- **THEN** it fails, and no marker or invalidation is written

#### Scenario: The override object is missing

- **WHEN** `publish-page` is called and `<release-id>/override<path>index.html` does not exist
- **THEN** no `o:` marker is written

#### Scenario: The first article fills a hidden news section

- **WHEN** the first article is inserted into a hidden empty news section
- **THEN** the published page shows the section

### Requirement: Serve the override when present

The router SHALL serve `<release-id>/override<path>index.html` when the `o:<release-id>:<path>index.html` marker exists for the selected release, and `<release-id>/build<path>index.html` otherwise.

#### Scenario: A page has an override

- **WHEN** `o:<release-id>:<path>index.html` exists for the selected release
- **THEN** the router serves `<release-id>/override<path>index.html`

#### Scenario: A page has no override

- **WHEN** no `o:` marker exists for the path in the selected release
- **THEN** the router serves `<release-id>/build<path>index.html`

### Requirement: Refresh cached pages on publication

Publishing an override SHALL make the next request for that canonical path return the newest override.

#### Scenario: The original was cached

- **WHEN** a path's original was cached and then an override is published
- **THEN** the next request returns the override

#### Scenario: A later override replaces an earlier one

- **WHEN** a path's first override was cached and a second override is published
- **THEN** the next request returns the second override

### Requirement: Publish to one release

The daily Action SHALL publish every destination of a run to the release it pinned.

#### Scenario: Promotion changes `current` during a run

- **WHEN** promotion changes `current` while the daily Action is publishing
- **THEN** `publish-page` rejects the old release and nothing is written to the new one

### Requirement: Keep Action-created news across releases

News the daily Action adds SHALL be durable only after the manual `workspace:pull` and Intake import. When its pinned release is no longer `current`, the daily Action SHALL re-pin to `current`.

#### Scenario: Main is promoted before the import

- **WHEN** a newer release is promoted before the daily Action's news is imported into the database
- **THEN** the newer release shows only the coverage in its build-time baseline, and the news returns in a release built after the import

#### Scenario: The pinned release is no longer current

- **WHEN** the source checkpoint is pinned to a release that is no longer `current`
- **THEN** the daily Action closes that checkpoint, re-pins to `current` and re-derives its destinations from the new release

### Requirement: Replay all destinations

The daily Action SHALL advance its source checkpoint only after every destination of the matched article is rendered from saved data and made visible.

#### Scenario: The agency write fails after the profile write

- **WHEN** the profile write succeeds and the agency write fails
- **THEN** the next run re-renders both from saved data before the checkpoint advances

### Requirement: Reject stale writers

An older writer SHALL NOT replace a newer merged page.

#### Scenario: An older writer finishes last

- **WHEN** an older writer finishes after a newer one
- **THEN** its conditional write fails and the newer merged page stays served

### Requirement: Snapshot matches the router

The release-api `release-snapshot` operation SHALL report the release that the production router serves.

#### Scenario: The snapshot is requested

- **WHEN** `release-snapshot` is called
- **THEN** its `releaseId` equals the KVS `current` value that the production router uses
