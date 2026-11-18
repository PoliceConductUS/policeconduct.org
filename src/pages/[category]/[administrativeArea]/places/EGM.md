# Administrative area `places` index

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/places/`. It shows page 1 of the child rows of the administrative_area civic index model (label "Places") through the shared `CivicChildIndexPage` component. Later pages live in `./page/`.

## Interface

- Route `/[category]/[administrativeArea]/places/`; route params: `category`, `administrativeArea`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadAdministrativeAreaScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadAdministrativeAreaScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "administrative_area")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/`. `[index.astro:"administrative_area",]`
- The model is `await buildAdministrativeAreaCivicIndex(location)`. `[index.astro:const model = await buildAdministrativeAreaCivicIndex(location);]`
- Renders `CivicChildIndexPage` (`#src/components/CivicChildIndexPage.astro`) with `currentPage={1}`, `label="Places"`, `model` and a `pagePath` of `model.pagePath` followed by `places/`. `[index.astro:currentPage={1}]` `[index.astro:label="Places"]` `[index.astro:model.pagePath}places/]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the same list.

## Invariants

- `CivicChildIndexPage` shows the first `PAGE_SIZE` rows on this page and links to later pages at `places/page/{n}/` when there are more. `[index.astro:currentPage={1}]`
- Route identity comes only from `Astro.params`; the location type is the literal `"administrative_area"`. `[index.astro:"administrative_area",]`
- The page contains no `throw` of its own. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadAdministrativeAreaScopedPaths`, `loadRequiredLocationByPath` and `buildAdministrativeAreaCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run build`
