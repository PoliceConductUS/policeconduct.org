# State licensing authority page

## Overview

Static Astro page for the route `/[category]/licensing-authority/`. It loads the licensing authority of the state in the URL and renders its records with the shared `LicensingAuthorityRecords` component inside `PageShell`.

## Interface

- Route `/[category]/licensing-authority/`; route param `category`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadStateAuthorityPaths()` from `#src/lib/data/licensing-authority.js` unchanged. `[index.astro:return loadStateAuthorityPaths();]`
- The authority is reloaded on every render with `loadStateAuthority("/<category>/")`; records come from `loadAuthorityRecords(authority.id)`. `[index.astro:const records = await loadAuthorityRecords(authority.id);]`
- `pagePath` is `<authority.statePath>licensing-authority/`. `[index.astro:authority.statePath}licensing-authority/]`
- `PageShell` (`#src/layouts/PageShell.astro`) props: `title` (`<authority.name> | PoliceConduct.org`), `description`, `pagePath` and `canonicalUrl` (both `pagePath`), `heading` (`authority.name`), and `breadcrumbs` (state name linking to `authority.statePath`, then `Licensing authority` marked current). `[index.astro:{ label: "Licensing authority", current: true },]` `[index.astro:canonicalUrl={pagePath}]`
- Actions slot: an `Official website` link to `authority.website` with `rel="noopener"`, only when `authority.website` is set. `[index.astro:{authority.website && (]`
- Body: a link to `<pagePath>data-annotations/` with the text `Source data notes and downloads`; `LicensingAuthorityRecords` (`#src/components/LicensingAuthorityRecords.astro`) with the loaded records spread as props; `RecordDataNotes` with `recordPath={pagePath}`. `[index.astro:<LicensingAuthorityRecords {...records} />]`
- No pagination in this file.
- Subdirectory: [data-annotations](./data-annotations/EGM.md) - data notes pages and CSV download for the authority.

## Invariants

- The authority path is always `/<category>/`, built from the `category` param; no other param is used. `[index.astro:const authority = await loadStateAuthority(]`
- The description always reads `Licenses, license actions, and discipline records from <authority.name>.` `[index.astro:Licenses, license actions, and discipline records from]`
- The page contains no `throw` of its own. `[index.astro:loadStateAuthority(]`

## Side Effects

- Imports the global stylesheet `#src/styles/civic-ledger.css`. `[index.astro:import "#src/styles/civic-ledger.css";]`
- Build-time data loading only, through `loadStateAuthorityPaths`, `loadStateAuthority` and `loadAuthorityRecords`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/licensing-authority.js]`

## Verification

- Run: `npm run test:e2e`
