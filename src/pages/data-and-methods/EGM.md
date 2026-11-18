# Data and Methods page

## Overview

Static Astro page for the route `/data-and-methods/`. It renders four fixed text cards (Records, Location Views, Outcome Views, Corrections) inside the shared page shell. It loads no data.

## Interface

- Route `/data-and-methods/`, from `index.astro`; no `getStaticPaths` and no route params. `[index.astro:const pagePath = "/data-and-methods/";]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `heading` and `lede`. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Data and Methods | PoliceConduct.org`; the canonical URL is the page path. `[index.astro:title="Data and Methods | PoliceConduct.org"]`
- Structured data: one object from `buildWebPage({ siteUrl, pageUrl, name, description })`, with `siteUrl` from `getSiteUrl(Astro.site)` (both from `#src/lib/structured-data.js`). `[index.astro:const structuredData = buildWebPage({]`
- Breadcrumbs: `Home` (`/`) then `Data and Methods` (current). `[index.astro:{ label: "Data and Methods", href: pagePath, current: true },]`
- Body: one `section.civic-section.civic-section--last` holding a `.data-methods-grid` of four `article` cards, each with an `h2`. `[index.astro:<section class="civic-section civic-section--last">]`
- Scoped styles for `.data-methods-grid`: one column, two columns from 768px. `[index.astro:@media (min-width: 768px) {]`
- The layout and the structured-data helpers are the only imports: no components from `src/components/`, no loaders, no forms and no client scripts. `[index.astro:import { buildWebPage, getSiteUrl } from "#src/lib/structured-data.js";]`

## Invariants

- `pagePath` is the single source for the `pagePath` prop, the `canonicalUrl` prop, the breadcrumb `href` and the structured-data `pageUrl`. `[index.astro:canonicalUrl={pagePath}]`
- The same `pageDescription` constant feeds the `description` prop and the structured data. `[index.astro:description={pageDescription}]`

## Side Effects

- None

## Verification

- Run: `npm run test:e2e`
