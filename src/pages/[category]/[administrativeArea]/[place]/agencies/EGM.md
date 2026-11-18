# Place `agencies` index

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/agencies/`. It shows page 1 of the child rows of the place civic index model (label "Agencies") through the shared `CivicChildIndexPage` component. Later pages live in `./page/`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/agencies/`; route params: `category`, `administrativeArea`, `place`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadPlaceScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadPlaceScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "place")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/${Astro.params.place}/`. `[index.astro:"place",]`
- The model is `await buildPlaceCivicIndex(location)`. `[index.astro:const model = await buildPlaceCivicIndex(location);]`
- Renders `CivicChildIndexPage` (`#src/components/CivicChildIndexPage.astro`) with `currentPage={1}`, `label="Agencies"`, `model` and a `pagePath` of `model.pagePath` followed by `agencies/`. `[index.astro:currentPage={1}]` `[index.astro:label="Agencies"]` `[index.astro:model.pagePath}agencies/]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the same list.

## Invariants

- `CivicChildIndexPage` shows the first `PAGE_SIZE` rows on this page and links to later pages at `agencies/page/{n}/` when there are more. `[index.astro:currentPage={1}]`
- Route identity comes only from `Astro.params`; the location type is the literal `"place"`. `[index.astro:"place",]`
- The page contains no `throw` of its own. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadPlaceScopedPaths`, `loadRequiredLocationByPath` and `buildPlaceCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run build`
