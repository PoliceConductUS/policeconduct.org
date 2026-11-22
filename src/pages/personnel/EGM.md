# Personnel index (`src/pages/personnel`)

## Overview

Static Astro page for the route `/personnel/`. It shows a count of listed personnel, a count of states with personnel and a United States map that links each state to its state page, plus a panel of federal agencies. It does not list individual people in the page body. The page has no route params, no `getStaticPaths`, no pagination, no form and no client script of its own. The subdirectories hold the personnel profile page and the two personnel forms.

## Interface

- Route `/personnel/`: the page path is a fixed string. `[index.astro:const pagePath = "/personnel/";]`
- Loads personnel summaries with `loadPersonnelSummaries()` from `src/lib/data/summaries.js`. `[index.astro:const personnelRows = await loadPersonnelSummaries();]`
- Loads federal agency summaries with `loadFederalAgencySummaries()` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgencies = await loadFederalAgencySummaries();]`
- Builds one stat per entry of `US_STATE_TILES` (from `src/lib/geo/states.js`): the state code, a count and a link. `[index.astro:const stateStats = US_STATE_TILES.map((state) => {]`
- A state's count comes from `loadPersonnelCountsByStatePath()`: distinct people with any assignment at an agency located within the state, through `public.location_path_closure`; a person with assignments in two states counts in both. `[index.astro:personnelCountsByStatePath.get(]`
- A state's link is `/{lowercase state code}/`. ``[index.astro:href: `/${state.code.toLowerCase()}/`,]``
- The header slot shows the total personnel count. `[index.astro:{totalPersonnel} personnel]`
- The header slot shows the number of states with at least one person. `[index.astro:{statesWithPersonnel} states covered]`
- Structured data is built with `buildWebPage` from `src/lib/structured-data.js` as a `CollectionPage` named "Personnel". `[index.astro:type: "CollectionPage",]`
- The structured data item list covers only the first 25 personnel rows. `[index.astro:const personnelItems = personnelRows.slice(0, 25).map((person, index) => ({]`
- Each item is a `Person` with a name built from `firstName`, `lastName` and optional `nameSuffix`, and the URL `/personnel/{slug}/`. ``[index.astro:url: new URL(`/personnel/${person.slug}/`, siteUrl).toString(),]``
- A `Person` item has `name` and `url` only; it carries no `worksFor`. ``[index.astro:url: new URL(`/personnel/${person.slug}/`, siteUrl).toString(),]``
- The item list from `buildItemList` is attached as `mainEntity` only when it is not empty. `[index.astro:structuredData.mainEntity = personnelItemList;]`
- `PageShell` (`src/layouts/PageShell.astro`) receives `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `heading` and `lede`. `[index.astro:canonicalUrl={pagePath}]`
- `PageShell` prop `title` is "Personnel". `[index.astro:title="Personnel"]`
- `PageShell` prop `description` is "Personnel profiles currently listed on PoliceConduct.org." `[index.astro:description="Personnel profiles currently listed on PoliceConduct.org."]`
- `PageShell` prop `breadcrumbs` is Home, then the current page "Personnel". `[index.astro:{ label: "Personnel", href: pagePath, current: true },]`
- `PageShell` prop `lede` is "Profiles of law enforcement personnel with listed agencies." `[index.astro:lede="Profiles of law enforcement personnel with listed agencies."]`
- Renders `UsaChoroplethMap` (`src/components/UsaChoroplethMap.astro`) with the props `stats`, `title`, `subtitle`, `emptyLabel`, `interactionLabel`, `headerAction` and `federalPanel`. `[index.astro:<UsaChoroplethMap]`
- `UsaChoroplethMap` prop `stats` is the per-state stat list. `[index.astro:stats={stateStats}]`
- `UsaChoroplethMap` prop `emptyLabel` is "No personnel yet". `[index.astro:emptyLabel="No personnel yet"]`
- `UsaChoroplethMap` prop `headerAction` links to `/personnel/new/` with the label "Suggest new person" and target `_self`. `[index.astro:label: "Suggest new person",]`
- `UsaChoroplethMap` prop `federalPanel` has the title "Federal agencies" and the federal agency count as its value. `[index.astro:value: federalAgencies.length,]`
- Each federal panel item uses the agency `name` as label, the agency `path` as link and "`branchCount` locations" as badge text. ``[index.astro:badgeText: `${agency.branchCount} locations`,]``
- [Personnel profile (`[slug]`)](./[slug]/EGM.md): route `/personnel/{slug}/` and its topic pages.
- [Suggest new personnel (`new`)](./new/EGM.md): form page `/personnel/new/`.
- [Suggest a personnel edit (`suggest-edit`)](./suggest-edit/EGM.md): form page `/personnel/suggest-edit/`.

## Invariants

- The canonical URL equals the page path `/personnel/`. `[index.astro:canonicalUrl={pagePath}]`
- Personnel rows without an `agencyState` are counted in the total but in no state. `[index.astro:const totalPersonnel = personnelRows.length;]`

## Side Effects

- Calls the `loadPersonnelSummaries()` and `loadFederalAgencySummaries()` loaders once per build of this page; any data access happens inside those loaders. `[index.astro:import { loadPersonnelSummaries } from "#src/lib/data/summaries.js";]`

## Verification

- Run: `npm run test:e2e`
