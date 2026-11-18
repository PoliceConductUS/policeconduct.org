# Agency civil cases topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/`. It renders page 1 of the agency's civil case rows through the shared `AgencyCivilCasesPage` component. Pages 2 and up live in `./page/` and use the same component, so every page has the same layout and columns.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPathsForTopic("civil-cases")` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPathsForTopic("civil-cases");]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`. `[index.astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- Renders `AgencyCivilCasesPage` (`#src/components/AgencyCivilCasesPage.astro`) with `currentPage={1}`, `data`, and `rows` from `buildAgencyCivilCaseRows(data)` (`#src/lib/data/agency-civil-case-rows.js`). `[index.astro:currentPage={1}]` `[index.astro:rows={buildAgencyCivilCaseRows(data)}]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the agency's civil case rows.

## Invariants

- `AgencyCivilCasesPage` shows the first `CIVIL_CASES_PAGE_SIZE` rows on this page and links to later pages at `civil-cases/page/{n}/` when there are more. `[index.astro:currentPage={1}]`
- The page contains no `throw` of its own. `[index.astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading only, through `loadAgencyLocationStaticPathsForTopic` and `loadAgencyDetailByRouteParams`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/agency-detail.js]`

## Verification

- Run: `npm run build`
