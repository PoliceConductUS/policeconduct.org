## Why

The deployed GA4 configuration does not explicitly disable advertising signals.
Four requesters have asked for an advertising opt-out (INS-121).

## What Changes

- Deny advertising storage, advertising user data and personalization before loading gtag.js.
- Disable ad-personalization signals and Google signals for the existing stream.
- Apply this to all visitors through the shared component, with no requester identity matching.

## Capabilities

### New Capabilities

- `analytics-privacy`: site-wide advertising opt-out.

## Impact

Ordinary analytics remains enabled. No data, routing, publication, or layout changes.
GA Admin values and deployed verification are separate outstanding requirements.
