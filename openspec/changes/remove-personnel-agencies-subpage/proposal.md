## Why

`/personnel/{slug}/agencies/` repeats data the personnel profile already shows. The profile's Agencies panel lists every known assignment with agency, role, license, start date, end date, and status; the subpage showed a strict subset of those columns for the same rows. The extra URL adds a navigation step and a second surface to keep correct without adding information.

## What Changes

- Retire the `agencies` topic of `/personnel/{slug}/[topic]/`. The build no longer generates `/personnel/{slug}/agencies/`.
- Point the profile's Agencies metric card at the on-page assignment table instead of the subpage, matching how the Arrests card already links to its on-page section.
- Redirect previously published `/personnel/{slug}/agencies/` URLs to `/personnel/{slug}/` so prior-sitemap coverage holds.

## Capabilities

### Modified Capabilities

- `civic-index-pages`: personnel agency assignments are presented only on the personnel profile.

## Impact

- `src/lib/data/personnel-topic-config.ts`, `src/pages/personnel/[slug]/[topic]/index.astro`, `src/pages/personnel/[slug]/index.astro`
- `scripts/generate-redirect-map.mjs`, `tests/e2e/civic-record-coverage.spec.ts`
- No database or data-shape change. No change to what assignment data is published.
