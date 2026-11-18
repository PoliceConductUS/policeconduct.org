# Administrative area `budget` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/budget/`. It is a thin wrapper: it builds the administrative_area civic index model for the location in the URL and hands it to the shared `CivicScopedIndexPage` component with `kind="budget"`.

## Interface

- Route `/[category]/[administrativeArea]/budget/` (from the file location `index.astro`); route params: `category`, `administrativeArea`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns the result of `loadAdministrativeAreaScopedPathsForTopic("budget")` from `#src/lib/data/civic-scoped-routes.js` unchanged; that loader decides which locations get this topic page. `[index.astro:return loadAdministrativeAreaScopedPathsForTopic("budget");]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "administrative_area")`, where `path` is the exact path `/${Astro.params.category}/${Astro.params.administrativeArea}/` built from the route params. `[index.astro:"administrative_area",]`
- The model is `await buildAdministrativeAreaCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildAdministrativeAreaCivicIndex(location);]`
- Renders exactly one component, `CivicScopedIndexPage` (`#src/components/CivicScopedIndexPage.astro`), with props `model={model}` and `kind="budget"`. No slot content is passed. `[index.astro:<CivicScopedIndexPage model={model} kind="budget" />]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"administrative_area"`. `[index.astro:"administrative_area",]`
- The topic string passed to `loadAdministrativeAreaScopedPathsForTopic` and the `kind` prop are the same literal, `"budget"`. `[index.astro:kind="budget"]`
- The page contains no `throw` of its own; a missing or wrong-type location is handled inside `loadRequiredLocationByPath`. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadAdministrativeAreaScopedPathsForTopic`, `loadRequiredLocationByPath` and `buildAdministrativeAreaCivicIndex`. The file has no writes, no network calls and no client script of its own. `[index.astro:#src/lib/data/civic-scoped-routes.js]`

## Verification

- Run: `npm run build`
