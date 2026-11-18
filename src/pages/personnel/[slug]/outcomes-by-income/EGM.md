# Personnel outcomes by income page (`src/pages/personnel/[slug]/outcomes-by-income`)

## Overview

Astro dynamic page file at the route pattern `/personnel/{slug}/outcomes-by-income/`. Its `getStaticPaths` returns an empty list, so the build generates no page from this file. The render code below it expects an `officerId` prop that no path supplies. The page has no form, no pagination and no client script of its own.

## Interface

- `getStaticPaths` returns an empty array; no path, param or prop is enumerated. `[index.astro:return [];]`
- The render reads `officerId` from `Astro.props`, not from a route param. `[index.astro:const { officerId } = Astro.props;]`
- The render queries `public.personnel` by `id` through `withDb` from `src/lib/db.js`, selecting `id`, `first_name`, `middle_name`, `last_name`, `suffix` and `slug`. ``[index.astro:`select id, first_name, middle_name, last_name, suffix, slug]``
- The displayed name joins first name, middle name, last name and suffix, skipping empty parts. `[index.astro:.join(" ");]`
- The officer path is `/personnel/{slug}/` using the slug from the loaded row. ``[index.astro:const officerPath = `/personnel/${officer.slug}/`;]``
- The page path is the officer path plus `outcomes-by-income/`. ``[index.astro:const pagePath = `${officerPath}outcomes-by-income/`;]``
- The title is the officer name followed by `metricLabels.outcomesByIncome` from `src/lib/metric-vocabulary.js`. ``[index.astro:const title = `${officerName} ${metricLabels.outcomesByIncome}`;]``
- The description is "Case outcomes by income band for" plus the officer name. ``[index.astro:const description = `Case outcomes by income band for ${officerName}.`;]``
- Renders `OutcomesByIncomePage` (`src/components/OutcomesByIncomePage.astro`) with the props `title`, `description`, `pagePath` and `breadcrumbs`. `[index.astro:<OutcomesByIncomePage]`
- `breadcrumbs` is Home, Personnel (`/personnel/`), the officer name, then the current page labelled with `metricLabels.outcomesByIncome`. `[index.astro:{ label: metricLabels.outcomesByIncome, href: pagePath, current: true },]`

## Invariants

- The render throws when no personnel row matches the given id. ``[index.astro:throw new Error(`Personnel ${officerId} was not found.`);]``
- No page is generated from this file while `getStaticPaths` returns an empty array. `[index.astro:export async function getStaticPaths() {]`

## Side Effects

- When rendered, reads the database table `public.personnel` through `withDb`. `[index.astro:const officer = await withDb(async (client) => {]`

## Verification

- Run: `npm run build`
