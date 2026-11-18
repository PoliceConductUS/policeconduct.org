# Agency reports, pages 2 and up

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/reports/page/[...page]/`. It paginates an agency's `reportedReports` and renders each page after the first with the shared `AgencyReportsPage` component.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/reports/page/[...page]/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`, plus the rest param `page`. `[[...page].astro:params: agencyPath.params,]`
- `getStaticPaths({ paginate })` enumerates agencies with `loadAgencyLocationStaticPathsForTopic("reports")`, loads each with `loadAgencyDetailByRouteParams(agencyPath.params)`, and calls `paginate(data.reportedReports, { pageSize: PAGE_SIZE, params })`. No extra props are set. `[[...page].astro:paginate(data.reportedReports, {]`
- The whole `getStaticPaths()` body runs inside `timeBuildStep("agency reports pagination static paths", ...)` from `#src/lib/build-timing.js`. `[[...page].astro:return timeBuildStep("agency reports pagination static paths", async () => {]`
- Pages whose `page` param is empty or `"1"` are filtered out; page 1 is served by `../index.astro`. `[[...page].astro:pageParam !== "1"]`
- Render: reads the Astro `page` prop and reloads the agency with `loadAgencyDetailByRouteParams(Astro.params)`. `[[...page].astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- Renders `AgencyReportsPage` (`#src/components/AgencyReportsPage.astro`) with `currentPage={page.currentPage}`, `data`, `lastPage={page.lastPage}` and `pageReports={page.data}`. `[[...page].astro:pageReports={page.data}]`

## Invariants

- Page size is `PAGE_SIZE` from `#src/lib/pagination.js`. `[[...page].astro:pageSize: PAGE_SIZE,]`
- An array `page` param is kept only when non-empty and its first item is not `"1"`; a string only when non-empty and not `"1"`. `[[...page].astro:return pageParam.length > 0 && pageParam[0] !== "1";]`
- The agency detail (`data`) is reloaded from route params at render time; only the page slice (`page`) comes from `getStaticPaths()` props. `[[...page].astro:const { page } = Astro.props as {]`
- The file contains no `throw` of its own. `[[...page].astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading: one `loadAgencyDetailByRouteParams` call per agency while static paths are built, and one more per rendered page. `[[...page].astro:const data = await loadAgencyDetailByRouteParams(agencyPath.params);]`
- Static path generation is wrapped in `timeBuildStep`, which is given the step label `agency reports pagination static paths`. `[[...page].astro:agency reports pagination static paths]`

## Verification

- Run: `npm run build`
