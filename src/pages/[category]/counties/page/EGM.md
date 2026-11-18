# State `counties` index, pages 2 and up

## Overview

Static Astro page for the route `/[category]/counties/page/[...page]/`. It renders each page of the state civic index rows after the first with the shared `CivicChildIndexPage` component.

## Interface

- Route `/[category]/counties/page/[...page]/`; route params: `category`, plus the rest param `page`. No props are read. `[[...page].astro:params: { ...path.params, page: String(pageNumber) }]`
- `getStaticPaths()` enumerates locations with `loadStateScopedPaths()`, builds each model with `buildStateCivicIndex(await loadRequiredLocationByPath(path, "state"))`, and returns params only: one entry per page number from 2 to `Math.ceil(model.rows.length / PAGE_SIZE)`. `PAGE_SIZE` comes from `#src/lib/pagination.js`. `[[...page].astro:const lastPage = Math.ceil(model.rows.length / PAGE_SIZE);]`
- The render parses `Astro.params.page` as a number, reloads the location with `loadRequiredLocationByPath(path, "state")`, where `path` is `/${Astro.params.category}/`, and builds the model with `buildStateCivicIndex(location)`. `[[...page].astro:const currentPage = Number(Astro.params.page);]` `[[...page].astro:const model = await buildStateCivicIndex(location);]`
- Renders `CivicChildIndexPage` with `currentPage`, `label="Counties"`, `model` and a `pagePath` of `model.pagePath` followed by `counties/`. `[[...page].astro:label="Counties"]` `[[...page].astro:model.pagePath}counties/]`

## Invariants

- Route identity and page data never travel through `getStaticPaths()` props; the render reloads the location by exact path. `[[...page].astro:// Enumerates params only.]`
- The page throws when `page` is not a whole number written without extra characters, or is less than 2; page 1 is served by `../index.astro`. `[[...page].astro:Invalid counties page number]`
- `CivicChildIndexPage` throws when `currentPage` is past the last page. `[[...page].astro:currentPage={currentPage}]`

## Side Effects

- Build-time data loading only, through `loadStateScopedPaths`, `loadRequiredLocationByPath` and `buildStateCivicIndex`, once per location while static paths are built and again on each render. No writes, network calls or client script in this file. `[[...page].astro:for (const path of paths) {]`

## Verification

- Run: `npm run build`
