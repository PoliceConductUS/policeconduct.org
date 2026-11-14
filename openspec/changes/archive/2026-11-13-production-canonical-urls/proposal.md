## Why

The production homepage contains a PR preview canonical URL because the shared layout prefers SITE_URL over the configured production site. Canonical metadata must identify production in every environment.

## What Changes

Use the configured Astro site for the shared layout's origin. Add a rendered metadata regression test with a preview SITE_URL.

## Capabilities

### New Capabilities

- `production-canonical-urls`: Production-origin canonical metadata across environments.

### Modified Capabilities

None.

## Impact

Shared layout metadata and its regression coverage. Preview-origin canonicals intentionally cease. No database, route, dependency, or public-trust claims change.
