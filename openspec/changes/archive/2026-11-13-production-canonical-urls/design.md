## Context

Astro already configures https://www.policeconduct.org. SiteLayout overrides it with SITE_URL during preview builds.

## Goals / Non-Goals

Use that production site in canonical metadata regardless of deployment environment. Deployment mechanics are unchanged.

## Decisions

Remove the SITE_URL override from the shared origin calculation. Preserve existing path resolution. The same origin also supplies social metadata.

## Risks / Trade-offs

Existing deployed HTML remains unchanged until rebuilt and released.
