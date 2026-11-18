# Place `agencies` index, pages 2 and up

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/agencies/page/[...page]/`. It renders each page of the place civic index rows after the first with the shared `CivicChildIndexPage` component.

## Interface

- Route `/[category]/[administrativeArea]/[place]/agencies/page/[...page]/`; route params: `category`, `administrativeArea`, `place`, plus the rest param `page`. No props are read. `[[...page].astro:params: { ...path.params, page: String(pageNumber) }]`
- `getStaticPaths()` enumerates locations with `loadPlaceScopedPaths()`, builds each model with `buildPlaceCivicIndex(await loadRequiredLocationByPath(path, "place"))`, and returns params only: one entry per page number from 2 to `Math.ceil(model.rows.length / PAGE_SIZE)`. `PAGE_SIZE` comes from `#src/lib/pagination.js`. `[[...page].astro:const lastPage = Math.ceil(model.rows.length / PAGE_SIZE);]`
- The render parses `Astro.params.page` as a number, reloads the location with `loadRequiredLocationByPath(path, "place")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/${Astro.params.place}/`, and builds the model with `buildPlaceCivicIndex(location)`. `[[...page].astro:const currentPage = Number(Astro.params.page);]` `[[...page].astro:const model = await buildPlaceCivicIndex(location);]`
- Renders `CivicChildIndexPage` with `currentPage`, `label="Agencies"`, `model` and a `pagePath` of `model.pagePath` followed by `agencies/`. `[[...page].astro:label="Agencies"]` `[[...page].astro:model.pagePath}agencies/]`

## Invariants

- Route identity and page data never travel through `getStaticPaths()` props; the render reloads the location by exact path. `[[...page].astro:// Enumerates params only.]`
- The page throws when `page` is not a whole number written without extra characters, or is less than 2; page 1 is served by `../index.astro`. `[[...page].astro:Invalid agencies page number]`
- `CivicChildIndexPage` throws when `currentPage` is past the last page. `[[...page].astro:currentPage={currentPage}]`

## Side Effects

- Build-time data loading only, through `loadPlaceScopedPaths`, `loadRequiredLocationByPath` and `buildPlaceCivicIndex`, once per location while static paths are built and again on each render. No writes, network calls or client script in this file. `[[...page].astro:for (const path of paths) {]`

## Verification

- Run: `npm run build`
