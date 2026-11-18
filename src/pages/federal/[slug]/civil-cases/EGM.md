# Federal agency civil cases page (`src/pages/federal/[slug]/civil-cases`)

## Overview

Astro dynamic page for the routes `/federal/{slug}/civil-cases/`, one per federal agency. It reloads the agency by slug, builds the `civil-cases` topic model for that agency and hands it to one shared component. The page has no pagination, no form and no client script of its own.

## Interface

- Route `/federal/{slug}/civil-cases/`: `getStaticPaths` loads all federal agency summaries with `loadFederalAgencySummaries()` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgencies = await loadFederalAgencySummaries();]`
- `getStaticPaths` emits one path per federal agency, with the single param `slug` taken from `agency.slug` and no props. `[index.astro:params: { slug: agency.slug },]`
- The only route param is `slug`. `[index.astro:const { slug } = Astro.params;]`
- The render reloads the agency with `loadFederalAgencyDetailBySlug(slug)` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgency = await loadFederalAgencyDetailBySlug(slug);]`
- Builds the page model with `buildFederalAgencyDetailTopicIndexModel` from `src/lib/data/federal-agencies.js`, passing the loaded agency and a topic key. `[index.astro:const model = buildFederalAgencyDetailTopicIndexModel(]`
- The topic key passed to the model builder is the fixed string `civil-cases`. `[index.astro:"civil-cases"]`
- Renders `CivicAgencyHierarchyPage` from `src/components/CivicAgencyHierarchyPage.astro` with the props `model` and `site` (`Astro.site`). `[index.astro:<CivicAgencyHierarchyPage model={model} site={Astro.site} />]`

## Invariants

- The render throws when the `slug` param is missing. `[index.astro:throw new Error("Federal civil cases route is missing slug.");]`
- The render throws when no federal agency is found for the slug. ``[index.astro:throw new Error(`Federal agency ${slug} was not found`);]``
- Route identity is carried only by the `slug` param; `getStaticPaths` passes no props. `[index.astro:return federalAgencies.map((agency) => ({]`

## Side Effects

- Calls `loadFederalAgencySummaries()` in `getStaticPaths` and `loadFederalAgencyDetailBySlug()` for each rendered page; any data access happens inside those loaders. `[index.astro:loadFederalAgencyDetailBySlug,]`

## Verification

- Run: `npm run build`
