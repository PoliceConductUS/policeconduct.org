# Verification Report

**Change:** `add-home-introduction-video`

**Date:** 2026-11-13

**Current HEAD:** `7f8d6780c0ef6a4edef64687aaa61c44a0b3383f`

**State:** Follow-up summary, VideoObject, and stable thumbnail are uncommitted on
`feat/publish-source-data-annotations` in `.worktrees/publish-source-data-annotations`.
No commit, push, merge, or deployment is part of this verification.

## Completeness, Correctness, and Coherence

The original embed was extended after the user explicitly approved a readable
summary, accurate video metadata, stable thumbnail, reviewed captions, and Search
Console monitoring. Repo implementation covers summary, existing internal links,
metadata, and thumbnail. Captions and Search Console account work are coordinated
separately. This active change has not been archived.

All four requirements map to `src/pages/index.astro` and the approved thumbnail.
The player remains after `#top` and before `#overview`; other home sections and
shared styles are unchanged. One page-local object supplies iframe title and
embed URL, visible summary, and VideoObject metadata. No new dependency, CSS,
component, route, database change, crawl rule, or unrelated AI/SEO file was added.

## Runtime and Dependencies

- Node `v24.21.0`; npm `11.19.0`, selected through mise.
- Fresh root `npm ci --no-audit --no-fund`: exit 0; 511 installed packages.
- Installed package versions match both lockfiles: 511 root and 123 Lambda
  package entries, zero mismatches. 108 root and 18 Lambda optional platform
  package entries are absent on this machine.
- Doctor with required local/network access: exit 0; Docker, schema, and OpenSpec
  checks passed. Standard agent-skill reminder is resolved by the applied skills.
- Preflight schemas, change status, and apply instructions were reviewed.
  `npm run validate:openspec`: 39 items passed, zero failures.

## Targeted Checks

- A direct generated-HTML assertion first failed because VideoObject was absent.
- Home-only production Astro rendering passed with the actual home source and
  external CSS. Temporary configuration omitted full-corpus sitemap work only;
  committed Astro configuration is unchanged. Full build/sitemap validation
  remains a production-release gate.
- Actual rendered JSON-LD parses and includes the exact title, matching visible
  summary, `https://www.youtube.com/embed/xA6z1L-MG_k`, `PT1M41.68S`, `en`, and
  the existing organization publisher reference. No false `contentUrl` is emitted.
- `uploadDate` is `2026-11-13T20:20:02-08:00`, observed in the public YouTube
  page's `datePublished` and `uploadDate` metadata by the coordinating agent.
  The measured source duration is 101.680181 seconds; public YouTube rounds it
  to 1 minute 42 seconds.
- Thumbnail is the approved JPEG, copied unchanged to
  `public/img/policeconduct-introduction-thumbnail.jpg`: 1280×720, 344400 bytes.
  Rendered URL is absolute under the site's canonical origin.
- The home canonical URL remains `https://www.policeconduct.org/` without noindex.
  Existing robots rules permit the home page and image. Form crawl restrictions
  remain intact; no crawler settings changed.
- Rendered visible summary and links to `/find-records/`, `/report/new/`, and
  `/data-and-methods/` passed. A rendered-text assertion reproduced missing spaces
  at Astro link boundaries, then passed after explicit whitespace was added.
- Desktop 1440×1000 and mobile 390×844 browser checks passed: section order,
  correct embed/title, lazy/fullscreen/focus support, no autoplay, 16:9 player,
  and no horizontal overflow. Player dimensions are 1196.8×673.2 and 366×205.9.
  One H1 remains; the section H2 is the shared 24px token and body text is 16px.
- Desktop/mobile screenshots were visually reviewed. Shared foreground and
  background colors remain; no new color pair or stylesheet was introduced.
- `npm run validate:no-inline-css -- .cache/home-intro/dist`: exit 0, two HTML
  files checked with zero violations. Mechanical design check found no findings.
- Temporary rendering configuration and server are removed before aggregate
  browser tests, preventing changes to their running environment.

## Aggregate Validation

Final working-tree `npm run validate` is pending. The coordinating agent will
review the diff, commit, and rerun aggregate validation on the final commit.
CI for these uncommitted changes has not run. This is not merge or release evidence.

## Release and Search Console Follow-up

- After an approved deployment, inspect the public home page and its thumbnail
  URL, confirm summary/player/JSON-LD rendering, and inspect the home URL in
  Search Console against the deployed version.
- Review Search Console's Videos report after Google recrawls. The coordinating
  agent observed 8 indexed videos and 0 not indexed, with no active issues, in
  a report last updated November 11, 2026. This predates the new home video;
  it is a monitoring baseline, not proof that the new video is indexed.
- Reviewed captions are account work still pending with the coordinating agent.
- No recurring automation or index/rich-result guarantee is introduced.
