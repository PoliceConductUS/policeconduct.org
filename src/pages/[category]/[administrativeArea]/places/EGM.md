# Administrative area `places` index

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/places/`. It lists the child rows of the administrative_area civic index model (label "Places") through the shared `CivicChildIndexPage` component. Later pages live in `./page/`.

## Interface

- Route `/[category]/[administrativeArea]/places/`; route params: `category`, `administrativeArea`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadAdministrativeAreaScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadAdministrativeAreaScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "administrative_area")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/`. `[index.astro:"administrative_area",]`
- The model is `await buildAdministrativeAreaCivicIndex(location)`. `[index.astro:const model = await buildAdministrativeAreaCivicIndex(location);]`
- Renders `CivicChildIndexPage` (`#src/components/CivicChildIndexPage.astro`) with props `label="Places"`, `model`, `page` and `pagePath`. `[index.astro:const label = "Places";]`
- `pagePath` is `model.pagePath` followed by `places/`. `[index.astro:model.pagePath}places/]`
- `page` is a hand-built object, not an Astro `paginate()` page: `{ currentPage: 1, data: model.rows, lastPage: 1 }`. `[index.astro:data: model.rows,]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the same list, paginated by `PAGE_SIZE`.

## Invariants

- This page passes every row of `model.rows` in one `page` object and always reports `lastPage: 1`; it does not slice by `PAGE_SIZE` and does not import it. `[index.astro:lastPage: 1,]`
- `currentPage` is always `1`. `[index.astro:currentPage: 1,]`
- Route identity comes only from `Astro.params`; the location type is the literal `"administrative_area"`. `[index.astro:"administrative_area",]`
- The page contains no `throw` of its own. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadAdministrativeAreaScopedPaths`, `loadRequiredLocationByPath` and `buildAdministrativeAreaCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run build`
