# Agency reports, page 1

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/reports/`. It shows the first page of an agency's `reportedReports` with the shared `AgencyReportsPage` component. Later pages live in `./page/`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/reports/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPathsForTopic("reports")` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPathsForTopic("reports");]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`. `[index.astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- `pageReports` is the first `PAGE_SIZE` items of `data.reportedReports` (`PAGE_SIZE` from `#src/lib/pagination.js`). `[index.astro:const pageReports = data.reportedReports.slice(0, PAGE_SIZE);]`
- `lastPage` is `Math.max(1, Math.ceil(data.reportedReports.length / PAGE_SIZE))`. `[index.astro:Math.ceil(data.reportedReports.length / PAGE_SIZE),]`
- Renders `AgencyReportsPage` (`#src/components/AgencyReportsPage.astro`) with `currentPage={1}`, `data`, `lastPage` and `pageReports`. `[index.astro:currentPage={1}]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the same list.

## Invariants

- `lastPage` is never below 1, even when the agency has no reports. `[index.astro:const lastPage = Math.max(]`
- `currentPage` is always `1`. `[index.astro:currentPage={1}]`
- The page contains no `throw` of its own. `[index.astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading only, through `loadAgencyLocationStaticPathsForTopic` and `loadAgencyDetailByRouteParams`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/agency-detail.js]`

## Verification

- Run: `npm run build`
