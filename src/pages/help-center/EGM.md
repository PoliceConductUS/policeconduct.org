# Help Center page

## Overview

Static Astro page for the route `/help-center/`. It renders fixed guidance on writing reports in five numbered sections inside the shared page shell. It loads no data.

## Interface

- Route `/help-center/`, from `index.astro`; no `getStaticPaths` and no route params. `[index.astro:const pagePath = "/help-center/";]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `heading` and `lede`. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Help Center | PoliceConduct.org`; the canonical URL is the page path. `[index.astro:title="Help Center | PoliceConduct.org"]`
- The page heading differs from the title and the breadcrumb label. `[index.astro:heading="Write Reports That Stand Up to Scrutiny"]`
- Structured data: one object from `buildWebPage({ siteUrl, pageUrl, name, description })`, with `siteUrl` from `getSiteUrl(Astro.site)` (both from `#src/lib/structured-data.js`). `[index.astro:const structuredData = buildWebPage({]`
- Breadcrumbs: `Home` (`/`) then `Help Center` (current). `[index.astro:{ label: "Help Center", href: pagePath, current: true },]`
- Body: an audience card, then six `section.py-vh-2` blocks: the first holds only an alert, and the other five are numbered and use `ipc-section-title` (`h2`) and `ipc-subsection-title` (`h3`) headings. `[index.astro:<div class="alert alert-light border-dark rounded-0 mb-0">]`
- The last section is a two-column quick-links table (`Goal`, `Recommended action`) with four rows; it contains no links. `[index.astro:<th scope="col">Recommended action</th>]`
- The layout and the structured-data helpers are the only imports: no components from `src/components/`, no loaders, no forms, no client scripts and no page-local styles. `[index.astro:import { buildWebPage, getSiteUrl } from "#src/lib/structured-data.js";]`

## Invariants

- `pagePath` is the single source for the `pagePath` prop, the `canonicalUrl` prop, the breadcrumb `href` and the structured-data `pageUrl`. `[index.astro:canonicalUrl={pagePath}]`
- The same `pageDescription` constant feeds the `description` prop and the structured data. `[index.astro:description={pageDescription}]`

## Side Effects

- None

## Verification

- Run: `npm run build`
