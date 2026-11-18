# Administrative area `places` index, pages 2 and up

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/places/page/[...page]/`. It renders each page of the administrative_area civic index rows after the first with the shared `CivicChildIndexPage` component.

## Interface

- Route `/[category]/[administrativeArea]/places/page/[...page]/`; route params: `category`, `administrativeArea`, plus the rest param `page`. No props are read. `[[...page].astro:params: { ...path.params, page: String(pageNumber) }]`
- `getStaticPaths()` enumerates locations with `loadAdministrativeAreaScopedPaths()`, builds each model with `buildAdministrativeAreaCivicIndex(await loadRequiredLocationByPath(path, "administrative_area"))`, and returns params only: one entry per page number from 2 to `Math.ceil(model.rows.length / PAGE_SIZE)`. `PAGE_SIZE` comes from `#src/lib/pagination.js`. `[[...page].astro:const lastPage = Math.ceil(model.rows.length / PAGE_SIZE);]`
- The render parses `Astro.params.page` as a number, reloads the location with `loadRequiredLocationByPath(path, "administrative_area")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/`, and builds the model with `buildAdministrativeAreaCivicIndex(location)`. `[[...page].astro:const currentPage = Number(Astro.params.page);]` `[[...page].astro:const model = await buildAdministrativeAreaCivicIndex(location);]`
- Renders `CivicChildIndexPage` with `currentPage`, `label="Places"`, `model` and a `pagePath` of `model.pagePath` followed by `places/`. `[[...page].astro:label="Places"]` `[[...page].astro:model.pagePath}places/]`

## Invariants

- Route identity and page data never travel through `getStaticPaths()` props; the render reloads the location by exact path. `[[...page].astro:// Enumerates params only.]`
- The page throws when `page` is not a whole number written without extra characters, or is less than 2; page 1 is served by `../index.astro`. `[[...page].astro:Invalid places page number]`
- `CivicChildIndexPage` throws when `currentPage` is past the last page. `[[...page].astro:currentPage={currentPage}]`

## Side Effects

- Build-time data loading only, through `loadAdministrativeAreaScopedPaths`, `loadRequiredLocationByPath` and `buildAdministrativeAreaCivicIndex`, once per location while static paths are built and again on each render. No writes, network calls or client script in this file. `[[...page].astro:for (const path of paths) {]`

## Verification

- Run: `npm run build`
