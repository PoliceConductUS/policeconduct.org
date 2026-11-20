## Why

News discovered between builds should reach the relevant personnel and agency pages. It stays available after a later build once the manual `workspace:pull` and Intake import have brought it into the database. Submission processing also needs to identify the exact release that generated a form.

## What Changes

- The daily Action (Intake) searches Google All organic results through SerpApi for up to five distinct eligible terms per Chicago day. It ranks personnel query/profile pairs by impressions, waits at least seven days before searching a term again, and links the first qualifying current story. The full agency and officer sweep is outside this change. Intake owns these discovery and ranking requirements; they move to an Intake change (task 7.1).
- Link articles through officer-at-agency assignments. Keep the source that supports each assignment so personnel and agency pages can cite the coverage that connects them. Keep saved records and extracted article bodies private.
- Show up to 25 distinct homepage stories in the order Intake supplies. Intake orders them by combined seven-day clicks for matched search terms and personnel landing pages.
- Publish release-specific source HTML and a snapshot of existing agencies, personnel assignments and page paths.
- Consume page data keyed by replaceable part and serve a complete regenerated document at the existing canonical path.
- Save every form submission with its originating release ID in production and preview. Log a missing or unknown release ID, and record the Forms API version that processed each submission.
- Use commit-hash release folders in the site buckets. Only `main` builds create releases. Release folders are kept; PR preview folders are deleted when the PR closes.
- Use normalized publisher URLs as Daily article source IDs. Write confirmed duplicate-to-target URL pairs under `CoverageLink` in private `data/alias.json`. Keep persistent source IDs for assignment links. Carry the originating namespace and source ID in JSON and HTML across searches. design.md "Release API and page-object contract" is the cross-repository contract. Intake owns its source, database and mutation changes.

## Capabilities

### New Capabilities

- `release-page-updates` covers saved page parts, rendering, publication to the current release and originating form identity.
- `release-deployment` covers commit-hash release folders, main-only releases, promotion and which folders are kept or deleted. It supersedes the overlapping `atomic-sha-deploys` tasks (task 7.2).

### Modified Capabilities

None.

## Impact

Affected consumers are readers, forms, website hosting and the Intake publisher/importer. Agency and personnel pages now always render a news section, hidden when it has no links. Form submissions now carry `releaseId`. Existing article and assignment IDs remain stable. No conclusions about an officer or agency follow from the presence of a link.
