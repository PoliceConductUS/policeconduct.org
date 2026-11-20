# State `counties` index

## Overview

Static Astro page for the route `/[category]/counties/`. It shows page 1 of the child rows of the state civic index model (label "Counties") through the shared `CivicChildIndexPage` component. Later pages live in `./page/`.

## Interface

- Route `/[category]/counties/`; route params: `category`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadStateScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadStateScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "state")`, where `path` is `/${Astro.params.category}/`. `[index.astro:"state",]`
- The model is `await buildStateCivicIndex(location)`. `[index.astro:const model = await buildStateCivicIndex(location);]`
- Renders `CivicChildIndexPage` (`#src/components/CivicChildIndexPage.astro`) with `currentPage={1}`, `label="Counties"`, `model` and a `pagePath` of `model.pagePath` followed by `counties/`. `[index.astro:currentPage={1}]` `[index.astro:label="Counties"]` `[index.astro:model.pagePath}counties/]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the same list.

## Invariants

- `CivicChildIndexPage` shows the first `PAGE_SIZE` rows on this page and links to later pages at `counties/page/{n}/` when there are more. `[index.astro:currentPage={1}]`
- Route identity comes only from `Astro.params`; the location type is the literal `"state"`. `[index.astro:"state",]`
- The page contains no `throw` of its own. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadStateScopedPaths`, `loadRequiredLocationByPath` and `buildStateCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run build`
