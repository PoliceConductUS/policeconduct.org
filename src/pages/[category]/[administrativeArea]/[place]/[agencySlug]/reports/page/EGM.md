# Agency reports, pages 2 and up

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/reports/page/[...page]/`. It renders each page of an agency's `reportedReports` after the first with the shared `AgencyReportsPage` component.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/reports/page/[...page]/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`, plus the rest param `page`. `[[...page].astro:params: { ...agencyPath.params, page: String(pageNumber) },]`
- `getStaticPaths()` enumerates agencies with `loadAgencyLocationStaticPathsForTopic("reports")`, loads each with `loadAgencyDetailByRouteParams(agencyPath.params)`, and returns params only, for pages 2 through `ceil(reportedReports.length / PAGE_SIZE)`. Page 1 is served by `../index.astro`. `[[...page].astro:for (let pageNumber = 2; pageNumber <= lastPage; pageNumber += 1) {]`
- The whole `getStaticPaths()` body runs inside `timeBuildStep("agency reports pagination static paths", ...)` from `#src/lib/build-timing.js`. `[[...page].astro:return timeBuildStep("agency reports pagination static paths", async () => {]`
- Render: parses the `page` param, reloads the agency with `loadAgencyDetailByRouteParams(Astro.params)`, and slices `reportedReports` to that page. `[[...page].astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- Renders `AgencyReportsPage` (`#src/components/AgencyReportsPage.astro`) with `currentPage`, `data`, `lastPage` and the page's slice as `pageReports`. `[[...page].astro:pageReports={data.reportedReports.slice(start, start + PAGE_SIZE)}]`

## Invariants

- Page size is `PAGE_SIZE` from `#src/lib/pagination.js`. `[[...page].astro:import { PAGE_SIZE } from "#src/lib/pagination.js";]`
- Page identity and data come from the route params at render time; `getStaticPaths()` passes no props. `[[...page].astro:// Enumerates params only.]`
- The render throws when the `page` param is not a whole number of 2 or more, or is past the last page. `[[...page].astro:Invalid reports page number]` `[[...page].astro:is past the last page]`

## Side Effects

- Build-time data loading: one `loadAgencyDetailByRouteParams` call per agency while static paths are built, and one more per rendered page. `[[...page].astro:const data = await loadAgencyDetailByRouteParams(agencyPath.params);]`

## Verification

- Run: `npm run test:e2e`
