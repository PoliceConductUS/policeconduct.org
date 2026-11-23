# Licensing authority data notes page

## Overview

Static Astro catch-all page for the route `/[category]/licensing-authority/data-annotations/[...parts]/`. It shows the data annotations for one state licensing authority, one page per annotation view, using the shared `DataAnnotationIndex` component.

## Interface

- Route `/[category]/licensing-authority/data-annotations/[...parts]/` (file `[...parts].astro`); route params `category` and the rest param `parts`. No props are read. `[[...parts].astro:Astro.params.parts]`
- `getStaticPaths()` loads all entries with `loadDataAnnotations()` (`#src/lib/data/data-annotations.js`), then for each path from `loadStateAuthorityPaths()` loads the authority with `loadStateAuthority("/<category>/")` (all from `#src/lib/data/licensing-authority.js`). `[[...parts].astro:annotationPages(entries, authority.id)]`
- One path is emitted per view from `annotationPages(entries, authority.id)` (`#src/lib/data/annotation-views.js`); `parts` is the view's `parts`, or `undefined` when that is empty. `[[...parts].astro:return annotationPages(entries, authority.id).map(]`
- Render: reloads the authority by path with `loadStateAuthority`, reloads the entries, and picks the view whose `parts` equals `Astro.params.parts` (or the empty string). `[[...parts].astro:(view) => view.parts === (Astro.params.parts || ""),]`
- `base` is `<authority.statePath>licensing-authority/data-annotations/`. `[[...parts].astro:authority.statePath}licensing-authority/data-annotations/]`
- `PageShell` (`#src/layouts/PageShell.astro`) props: `robots="noindex,follow"`, `searchable={false}`, `title` and `heading` (`<authority.name>: data notes`), `pagePath` and `canonicalUrl` (both `annotationHref(base, view.parts)`), and `breadcrumbs` (state, authority, `Data notes`). `[[...parts].astro:pagePath={annotationHref(base, view.parts)}]` `[[...parts].astro:canonicalUrl={annotationHref(base, view.parts)}]`
- `DataAnnotationIndex` (`#src/components/DataAnnotationIndex.astro`) props: `base`, `view`, and `filters={annotationFilters(entries, authority.id)}`. `[[...parts].astro:filters={annotationFilters(entries, authority.id)}]`
- Pagination, if any, is whatever `annotationPages` encodes in `parts`; this file adds none of its own.
- Subdirectory: [[...parts]](./[...parts]/EGM.md) - `data.csv` endpoint that downloads the notes of one filter as CSV.

## Invariants

- Throws `Unknown authority annotation view.` when no view matches `Astro.params.parts`. `[[...parts].astro:if (!view) throw new Error("Unknown authority annotation view.");]`
- Every page is rendered with `robots="noindex,follow"`. `[[...parts].astro:robots="noindex,follow"]`
- Every page is rendered with `searchable={false}`. `[[...parts].astro:searchable={false}]`
- The authority path is always `/<category>/`, built from the `category` param. `[[...parts].astro:Astro.params.category]`

## Side Effects

- Build-time data loading only, through `loadDataAnnotations`, `loadStateAuthorityPaths` and `loadStateAuthority`. No writes, network calls or client script in this file. `[[...parts].astro:const entries = await loadDataAnnotations();]`

## Verification

- Run: `npm run test:e2e`
