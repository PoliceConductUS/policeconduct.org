# Administrative area `civil-cases` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/civil-cases/`. It is a thin wrapper: it builds the administrative_area civic index model for the location in the URL and hands it to the shared `CivicScopedIndexPage` component with `kind="civil-cases"`.

## Interface

- Route `/[category]/[administrativeArea]/civil-cases/` (from the file location `index.astro`); route params: `category`, `administrativeArea`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns the result of `loadAdministrativeAreaScopedPathsForTopic("civil-cases")` from `#src/lib/data/civic-scoped-routes.js` unchanged; that loader decides which locations get this topic page. `[index.astro:return loadAdministrativeAreaScopedPathsForTopic("civil-cases");]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "administrative_area")`, where `path` is the exact path `/${Astro.params.category}/${Astro.params.administrativeArea}/` built from the route params. `[index.astro:"administrative_area",]`
- The model is `await buildAdministrativeAreaCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildAdministrativeAreaCivicIndex(location);]`
- Renders exactly one component, `CivicScopedIndexPage` (`#src/components/CivicScopedIndexPage.astro`), with props `model={model}` and `kind="civil-cases"`. No slot content is passed. `[index.astro:<CivicScopedIndexPage model={model} kind="civil-cases" />]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"administrative_area"`. `[index.astro:"administrative_area",]`
- The topic string passed to `loadAdministrativeAreaScopedPathsForTopic` and the `kind` prop are the same literal, `"civil-cases"`. `[index.astro:kind="civil-cases"]`
- The page contains no `throw` of its own; `loadRequiredLocationByPath` throws when no location has that exact path or the location has a different type. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadAdministrativeAreaScopedPathsForTopic`, `loadRequiredLocationByPath` and `buildAdministrativeAreaCivicIndex`. The file has no writes, no network calls and no client script of its own. `[index.astro:#src/lib/data/civic-scoped-routes.js]`

## Verification

- Run: `npm run build`
