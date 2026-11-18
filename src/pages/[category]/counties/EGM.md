# State `counties` index

## Overview

Static Astro page for the route `/[category]/counties/`. It lists the child rows of the state civic index model (label "Counties") through the shared `CivicChildIndexPage` component. Later pages live in `./page/`.

## Interface

- Route `/[category]/counties/`; route params: `category`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadStateScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadStateScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "state")`, where `path` is `/${Astro.params.category}/`. `[index.astro:"state",]`
- The model is `await buildStateCivicIndex(location)`. `[index.astro:const model = await buildStateCivicIndex(location);]`
- Renders `CivicChildIndexPage` (`#src/components/CivicChildIndexPage.astro`) with props `label="Counties"`, `model`, `page` and `pagePath`. `[index.astro:const label = "Counties";]`
- `pagePath` is `model.pagePath` followed by `counties/`. `[index.astro:model.pagePath}counties/]`
- `page` is a hand-built object, not an Astro `paginate()` page: `{ currentPage: 1, data: model.rows, lastPage: 1 }`. `[index.astro:data: model.rows,]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the same list, paginated by `PAGE_SIZE`.

## Invariants

- This page passes every row of `model.rows` in one `page` object and always reports `lastPage: 1`; it does not slice by `PAGE_SIZE` and does not import it. `[index.astro:lastPage: 1,]`
- `currentPage` is always `1`. `[index.astro:currentPage: 1,]`
- Route identity comes only from `Astro.params`; the location type is the literal `"state"`. `[index.astro:"state",]`
- The page contains no `throw` of its own. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadStateScopedPaths`, `loadRequiredLocationByPath` and `buildStateCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run build`
