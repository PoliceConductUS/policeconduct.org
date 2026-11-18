# Agency civil cases, pages 2 and up

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page]/`. It renders each page of the agency's civil case rows after the first through the shared `AgencyCivilCasesPage` component, the same component page 1 uses.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page]/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`, plus the rest param `page`. No props are read. `[[...page].astro:params: { ...agencyPath.params, page: String(pageNumber) },]`
- `getStaticPaths()` enumerates agencies with `loadAgencyLocationStaticPathsForTopic("civil-cases")`, loads each with `loadAgencyDetailByRouteParams(agencyPath.params)`, and returns params only: one entry per page number from 2 to the row count of `buildAgencyCivilCaseRows(data)` divided by `CIVIL_CASES_PAGE_SIZE` (from `#src/lib/data/civil-cases.js`), rounded up. `[[...page].astro:buildAgencyCivilCaseRows(data).length / CIVIL_CASES_PAGE_SIZE,]`
- The `getStaticPaths()` body runs inside `timeBuildStep("agency civil case pagination static paths", ...)` from `#src/lib/build-timing.js`. `[[...page].astro:"agency civil case pagination static paths",]`
- The render parses `Astro.params.page` as a number, reloads the agency with `loadAgencyDetailByRouteParams(Astro.params)`, and renders `AgencyCivilCasesPage` with `currentPage`, `data` and `rows={buildAgencyCivilCaseRows(data)}`. `[[...page].astro:const currentPage = Number(Astro.params.page);]` `[[...page].astro:currentPage={currentPage}]`

## Invariants

- Route identity and page data never travel through `getStaticPaths()` props. `[[...page].astro:// Enumerates params only.]`
- The page throws when `page` is not a whole number written without extra characters, or is less than 2; page 1 is served by `../index.astro`. `AgencyCivilCasesPage` throws when the page is past the last page. `[[...page].astro:Invalid civil cases page number]`

## Side Effects

- Build-time data loading: one `loadAgencyDetailByRouteParams` call per agency while static paths are built, and one more per rendered page. `[[...page].astro:const data = await loadAgencyDetailByRouteParams(agencyPath.params);]`
- Static path generation is wrapped in `timeBuildStep`. `[[...page].astro:return timeBuildStep(]`

## Verification

- Run: `npm run build`
