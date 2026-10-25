## Why

The Search Console 404 export contains /privacy-policy and /partner/prosecutor. Existing redirects cover only trailing-slash versions.

## What Changes

Add those two exact no-slash aliases to the build-time map, targeting /legal-notice/privacy/ and /partner/ with status 301. Preserve the existing slash forms.

## Capabilities

### New Capabilities

- `legacy-static-search-aliases`: Exact redirects for the two verified legacy static paths with either slash form.

### Modified Capabilities

None.

## Impact

Only scripts/generate-redirect-map.mjs and its test change. No HTML, database identity, runtime router, dependency, or broad normalization change. No incompatible existing behavior is retained or added. No public-trust claims.
