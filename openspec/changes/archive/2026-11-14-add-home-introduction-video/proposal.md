## Why

People visiting the home page need a simple way to watch the introduction to
PoliceConduct.org. Embedding the published video beside the existing home-page
content makes the explanation available before visitors explore the national map.

## What Changes

- Add an introduction section between the home hero and National overview.
- Present a short sentence and a responsive, accessible YouTube embed.
- Preserve existing home-page content and shared styles.
- Following the user’s explicit follow-up approval, add a readable video summary
  with existing record, reporting, and data-and-methods links.
- Add accurate VideoObject metadata and a stable local copy of the approved thumbnail.

## Capabilities

### New Capabilities

- `home-introduction-video`: home-page access to the published introduction.

### Modified Capabilities

None.

## Impact

Changes `src/pages/index.astro`, a thumbnail under `public/img/`, and this change's artifacts. No database, routing,
dependency, data contract, or downstream consumer changes. No backward
compatibility break or public-trust finding is introduced.
