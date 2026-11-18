# Federal agency detail page (`src/pages/federal/[slug]`)

## Overview

Astro dynamic page for the routes `/federal/{slug}/`, one per federal agency. It reloads the agency by slug, builds the agency detail model and hands it to one shared component, with the record data notes in its default slot. The page has no pagination, no form and no client script of its own. The subdirectories hold the per-agency topic pages.

## Interface

- Route `/federal/{slug}/`: `getStaticPaths` loads all federal agency summaries with `loadFederalAgencySummaries()` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgencies = await loadFederalAgencySummaries();]`
- `getStaticPaths` emits one path per federal agency, with the single param `slug` taken from `agency.slug` and no props. `[index.astro:params: { slug: agency.slug },]`
- The only route param is `slug`. `[index.astro:const { slug } = Astro.params;]`
- The render reloads the agency with `loadFederalAgencyDetailBySlug(slug)` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgency = await loadFederalAgencyDetailBySlug(slug);]`
- Builds the page model with `buildFederalAgencyDetailIndexModel(federalAgency)` from `src/lib/data/federal-agencies.js`. `[index.astro:const model = buildFederalAgencyDetailIndexModel(federalAgency);]`
- Renders `CivicAgencyHierarchyPage` from `src/components/CivicAgencyHierarchyPage.astro` with the props `model` and `site` (`Astro.site`). `[index.astro:<CivicAgencyHierarchyPage model={model} site={Astro.site}>]`
- Passes `RecordDataNotes` from `src/components/RecordDataNotes.astro` as the default slot content, with `recordPath` set to `model.pagePath`. `[index.astro:<RecordDataNotes recordPath={model.pagePath} />]`
- [Agency budget (`budget`)](./budget/EGM.md): route `/federal/{slug}/budget/`.
- [Agency civil cases (`civil-cases`)](./civil-cases/EGM.md): route `/federal/{slug}/civil-cases/`.
- [Agency liability costs (`liability-costs`)](./liability-costs/EGM.md): route `/federal/{slug}/liability-costs/`.
- [Agency outcomes by income (`outcomes-by-income`)](./outcomes-by-income/EGM.md): route `/federal/{slug}/outcomes-by-income/`.
- [Agency personnel (`personnel`)](./personnel/EGM.md): route `/federal/{slug}/personnel/`.
- [Agency reports (`reports`)](./reports/EGM.md): route `/federal/{slug}/reports/`.

## Invariants

- The render throws when the `slug` param is missing. `[index.astro:throw new Error("Federal agency route is missing slug.");]`
- The render throws when no federal agency is found for the slug. ``[index.astro:throw new Error(`Federal agency ${slug} was not found`);]``
- Route identity is carried only by the `slug` param; `getStaticPaths` passes no props. `[index.astro:return federalAgencies.map((agency) => ({]`
- The record path given to `RecordDataNotes` comes from the built model, not from the route param. `[index.astro:recordPath={model.pagePath}]`

## Side Effects

- Calls `loadFederalAgencySummaries()` in `getStaticPaths` and `loadFederalAgencyDetailBySlug()` for each rendered page; any data access happens inside those loaders. `[index.astro:loadFederalAgencyDetailBySlug,]`

## Verification

- Run: `npm run test:e2e`
