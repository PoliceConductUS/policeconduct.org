# State licensing authority pages

## Why

Residents need one place to view the state licensing authority and its recorded licensing and discipline activity, with links to the people and sources involved.

## What Changes

Add /<state>/licensing-authority/ backed by exact state location identity, link it from the state page and personnel license authority labels, and add verified manual authority records through intake. Preserve existing MN POST and TCOLE identities. One authority per state; duplicate matches fail loudly. No fabricated education attribution or records. No external network calls during website build/runtime.

## Capabilities

### New Capabilities

- state-licensing-authority: authority identity, summaries, discipline records, discovery links and sourced manual records.

## Impact

Website route, data loader, state-page link and personnel license links; schema contract and tests. Intake manual source must accept LicensingAuthority. No schema migration or seed-ID generation in the website. Manual data stays in the intake workspace with its source mappings and mutation chain. No deployment requested. No public-trust or causal claims.
