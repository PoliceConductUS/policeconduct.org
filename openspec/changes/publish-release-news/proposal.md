## Why

News discovered between builds should reach the relevant personnel and agency pages. It stays available after a later build once the manual `workspace:pull` and Intake import have brought it into the database. Submission processing also needs to identify the exact release that generated a form.

## What Changes

- The daily Action (Intake) searches Google All organic results through SerpApi for up to five distinct eligible terms per Chicago day. It ranks personnel query/profile pairs by impressions, waits at least seven days before searching a term again, and links the first qualifying current story. The full agency and officer sweep is outside this change. Intake owns these discovery and ranking requirements; they move to an Intake change (task 7.1). Daily's scheduling, identity, checkpoint and conditional-write requirements move with them.
- Link articles through officer-at-agency assignments. Keep the source that supports each assignment so personnel and agency pages can cite the coverage that connects them. Keep saved records and extracted article bodies private.
- Show up to 25 distinct homepage stories in the order Intake supplies. Intake orders them by combined seven-day clicks for matched search terms and personnel landing pages.
- Publish release-specific source HTML. The build does not upload the data it read: no page data, no roster and no aliases.
- Keep build output and daily output apart. The build writes only `<commit>/build/` in the site bucket and `builds/<commit>/build/` in the release data bucket, ending with the completion marker `builds/<commit>/build/release.json`. The daily Action writes only `<commit>/override/`, `builds/<commit>/data/` and its evidence prefix. A rebuild of a commit never overwrites anything the daily Action wrote (owner decision, 2026-11-22).
- The daily Action rebuilds an override page from the original page in `<commit>/build/` as its only source. It keeps its own page data by replaceable part under `builds/<commit>/data/` and serves a complete regenerated document at the existing canonical path.
- Save every form submission with its originating release ID and the page's data version (`dataVersion`) in production and preview. Log a missing or unknown release ID or a missing data version, and record the Forms API version (the Git commit the Lambda was deployed from) that processed each submission.
- Release folders, previews and promotion follow the `deploy-hosting` capability in `atomic-sha-deploys`, the one release capability (owner decision Q13). This change adds no release-folder requirement.
- Use normalized publisher URLs as Daily article source IDs. Write confirmed duplicate-to-target URL pairs under `CoverageLink` in private `builds/<commit>/data/alias.json`, which only Daily writes. Keep persistent source IDs for assignment links. Carry the originating namespace and source ID in JSON and HTML across searches. design.md "Release API and page-object contract" is the cross-repository contract. Intake owns its source, database and mutation changes.

## Capabilities

### New Capabilities

- `release-page-updates` covers saved page parts, rendering, publication to the current release and originating form identity.

### Modified Capabilities

None.

## Impact

Affected consumers are readers, forms, website hosting and the Intake publisher/importer. Agency and personnel pages now always render a news section, hidden when it has no links. Form submissions now carry `releaseId` and `dataVersion`, the Forms API saves every submission, and each stored record carries the Forms API version that processed it. Existing article and assignment IDs remain stable. No conclusions about an officer or agency follow from the presence of a link.
