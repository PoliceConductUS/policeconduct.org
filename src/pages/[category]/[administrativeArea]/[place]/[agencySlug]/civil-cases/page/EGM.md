# Agency civil cases, pages 2 and up

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page]/`. It paginates the agency's civil case rows and renders each page after the first as its own table inside `PageShell`, with `Pagination` and `CivilCaseScopeNote`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/page/[...page]/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`, plus the rest param `page`. `[[...page].astro:params: agencyPath.params,]`
- `getStaticPaths({ paginate })` enumerates agencies with `loadAgencyLocationStaticPathsForTopic("civil-cases")`, loads each with `loadAgencyDetailByRouteParams(agencyPath.params)`, and calls `paginate(buildAgencyCivilCaseRows(data), { pageSize: PAGE_SIZE, params })`. No extra props are set. `[[...page].astro:paginate(buildAgencyCivilCaseRows(data), {]`
- The `getStaticPaths()` body runs inside `timeBuildStep("agency civil case pagination static paths", ...)` from `#src/lib/build-timing.js`. `[[...page].astro:"agency civil case pagination static paths",]`
- Pages whose `page` param is empty or `"1"` are filtered out; page 1 is served by `../index.astro`. `[[...page].astro:pageParam !== "1"]`
- Render: reads the Astro `page` prop (`Page<CivilCaseRow>`), reloads the agency with `loadAgencyDetailByRouteParams(Astro.params)`, and rebuilds all rows with `buildAgencyCivilCaseRows(data)` for the total count. `[[...page].astro:const caseRows = buildAgencyCivilCaseRows(data);]`
- `pagePath` is `<agencyPath>civil-cases/page/<currentPage>/`; it is passed to `PageShell` as `pagePath` and `canonicalUrl`. `[[...page].astro:agencyPath}civil-cases/page/]`
- `PageShell` props: `title` (`<agencyName> Civil Cases - Page <n>`), `description` and `lede` (the same sentence), `pagePath`, `canonicalUrl`, `breadcrumbs`, `heading` (`<agencyName> Civil Cases`). `[[...page].astro:lede={pageDescription}]`
- Breadcrumbs: Home, category, administrative area, place, agency, "Civil cases" (the index path), and `Page <n>` marked `current`. `[[...page].astro:{ label: "Civil cases", href: civilCasesIndexPath },]`
- Header slot: the place label and the total number of rows with the caption `case links`. `[[...page].astro:<span>case links</span>]`
- Table columns: Case (link to `caseUrl`), Type, Filed, Court, Outcome, Cause, Personnel (comma-separated links from `caseItem.personnel`). `[[...page].astro:<th scope="col">Personnel</th>]`
- `Pagination` (`#src/components/Pagination.astro`) receives `basePath={civilCasesIndexPath}`, `currentPage` and `lastPage`; `CivilCaseScopeNote` renders after it with no props. `[[...page].astro:basePath={civilCasesIndexPath}]`

## Invariants

- Page size is `PAGE_SIZE` from `#src/lib/pagination.js`. `[[...page].astro:pageSize: PAGE_SIZE,]`
- An array `page` param is kept only when non-empty and its first item is not `"1"`; a string only when non-empty and not `"1"`. `[[...page].astro:return pageParam.length > 0 && pageParam[0] !== "1";]`
- The header count is the total row count (`caseRows.length`), not the number of rows on the current page. `[[...page].astro:{caseRows.length.toLocaleString("en")}]`
- A row with no title is shown with the link text `Civil case`; missing court and cause number render as empty strings. `[[...page].astro:caseItem.title || "Civil case"]`
- Filed dates are formatted with `Intl.DateTimeFormat("en", ...)` and no explicit time zone; a missing date renders an empty string. `[[...page].astro:new Intl.DateTimeFormat("en", {]`
- The file contains no `throw` of its own. `[[...page].astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading: one `loadAgencyDetailByRouteParams` call per agency while static paths are built, and one more per rendered page. `[[...page].astro:const data = await loadAgencyDetailByRouteParams(agencyPath.params);]`
- Static path generation is wrapped in `timeBuildStep`. `[[...page].astro:return timeBuildStep(]`
- Ships a component-scoped `<style>` block for the `agency-cases-*` classes with hard-coded colour values. `[[...page].astro:.agency-cases-table-wrap {]`

## Verification

- Run: `npm run build`
