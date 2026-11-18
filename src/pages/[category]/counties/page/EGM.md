# State `counties` index, pages 2 and up

## Overview

Static Astro page for the route `/[category]/counties/page/[...page]/`. It paginates the rows of the state civic index model and renders each page after the first with the shared `CivicChildIndexPage` component.

## Interface

- Route `/[category]/counties/page/[...page]/`; route params: `category`, plus the rest param `page`. `[[...page].astro:params: path.params,]`
- `getStaticPaths({ paginate })` enumerates locations with `loadStateScopedPaths()`, and for each one builds the model with `buildStateCivicIndex(await loadRequiredLocationByPath(path, "state"))`. `[[...page].astro:const paths = await loadStateScopedPaths();]`
- Pagination: `paginate(model.rows, { pageSize: PAGE_SIZE, params: path.params, props })`, with `PAGE_SIZE` imported from `#src/lib/pagination.js`. `[[...page].astro:pageSize: PAGE_SIZE,]`
- Pages whose `page` param is empty or equal to `"1"` are filtered out, so this file emits only page 2 and later; page 1 is served by `../index.astro`. `[[...page].astro:pageParam !== "1"]`
- Props set in `getStaticPaths()` for every page: `label: "Counties"`, `model`, and `pagePath` (`model.pagePath` followed by `counties/`). Astro adds the `page` prop. `[[...page].astro:label: "Counties",]`
- The page body reads `label`, `model`, `page` and `pagePath` from `Astro.props` and passes all four, unchanged, to `CivicChildIndexPage` (`#src/components/CivicChildIndexPage.astro`). `[[...page].astro:const { label, model, page, pagePath } = Astro.props;]`

## Invariants

- The location is loaded by exact path with type `"state"` inside `getStaticPaths()` only. The render does not reload it: `model` and `pagePath` reach the page through `getStaticPaths()` props. `[[...page].astro:const { label, model, page, pagePath } = Astro.props;]`
- Both shapes of the `page` param are checked: an array is kept only when it is non-empty and its first item is not `"1"`; a string is kept only when it is non-empty and not `"1"`. `[[...page].astro:return pageParam.length > 0 && pageParam[0] !== "1";]`
- `pagePath` is always the base path `counties/` under `model.pagePath`, without the page number. `[[...page].astro:model.pagePath}counties/]`
- The file contains no `throw` of its own. `[[...page].astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadStateScopedPaths`, `loadRequiredLocationByPath` and `buildStateCivicIndex`, once per location while static paths are built. No writes, network calls or client script in this file. `[[...page].astro:for (const path of paths) {]`

## Verification

- Run: `npm run build`
