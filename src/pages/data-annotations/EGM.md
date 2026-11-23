# Data notes index page

## Overview

Static Astro page for the route `/data-annotations/[...parts]/`. It renders the site-wide index of data annotations ("Data notes"): one generated page per filter view and page number. The CSV export of each filter lives in the child directory.

## Interface

- Route `/data-annotations/[...parts]/`, from `[...parts].astro`; the only route param is the rest param `parts`. `[[...parts].astro:(view) => view.parts === (Astro.params.parts || ""),]`
- `getStaticPaths()` loads all entries with `loadDataAnnotations()` (`#src/lib/data/data-annotations.js`) and emits one path per view from `annotationPages(entries)` (`#src/lib/data/annotation-views.js`). `[[...parts].astro:return annotationPages(await loadDataAnnotations()).map(({ parts }) => ({]`
- `parts` is the view's `parts`, or `undefined` when that is empty, so the first unfiltered view is `/data-annotations/`. `[[...parts].astro:params: { parts: parts || undefined },]`
- The page render reloads the entries and finds its view again from `annotationPages(entries)`; nothing is passed through `getStaticPaths` props. `[[...parts].astro:const entries = await loadDataAnnotations();]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `robots`, `searchable`, `title`, `heading`, `pagePath`, `breadcrumbs` and `lede`. No `description`, `canonicalUrl` or `structuredData` prop is passed. `[[...parts].astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Data notes | PoliceConduct.org`, heading `Data notes`. `[[...parts].astro:title="Data notes | PoliceConduct.org"]`
- `pagePath` is `annotationHref(base, view.parts)` with `base` set to `/data-annotations/` (`annotationHref` from `#src/lib/data/annotation-views.js`). `[[...parts].astro:pagePath={annotationHref(base, view.parts)}]`
- Breadcrumbs: a single current item `Data notes`, with no `Home` item and no `href`. `[[...parts].astro:breadcrumbs={[{ label: "Data notes", current: true }]}]`
- Component: `DataAnnotationIndex` from `#src/components/DataAnnotationIndex.astro`, with props `base`, `view` and `filters` (`filters` is `annotationFilters(entries)`). `[[...parts].astro:filters={annotationFilters(entries)}]`
- Imports the shared stylesheet `#src/styles/civic-ledger.css`. `[[...parts].astro:import "#src/styles/civic-ledger.css";]`
- No forms and no client scripts in this file; the page body is the single `DataAnnotationIndex` element. `[[...parts].astro:<DataAnnotationIndex]`
- Subdirectory `[...parts]`: [CSV export endpoint](./[...parts]/EGM.md).

## Invariants

- Throws `Data notes route does not match a generated view.` when no view matches `Astro.params.parts`. `[[...parts].astro:if (!view) throw new Error("Data notes route does not match a generated view.");]`
- Every page is `noindex,follow`. `[[...parts].astro:robots="noindex,follow"]`
- Every page is excluded from site search. `[[...parts].astro:searchable={false}]`
- The base path passed to `annotationHref` and to `DataAnnotationIndex` is always `/data-annotations/`. `[[...parts].astro:const base = "/data-annotations/";]`
- `annotationPages` and `annotationFilters` are called with the entries only: no namespace list and no authority id. `[[...parts].astro:const view = annotationPages(entries).find(]`

## Side Effects

- Build-time data loading through `loadDataAnnotations()`, called once in `getStaticPaths` and once per rendered page. Nothing is written and no network call is made. `[[...parts].astro:import { loadDataAnnotations } from "#src/lib/data/data-annotations.js";]`

## Verification

- Run: `npm run test:e2e`
