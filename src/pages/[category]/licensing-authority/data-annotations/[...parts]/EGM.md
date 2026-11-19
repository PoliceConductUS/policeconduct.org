# Licensing authority data notes CSV endpoint

## Overview

Static Astro endpoint for the route `/[category]/licensing-authority/data-annotations/[...parts]/data.csv`. It returns the data annotations of one filter view for a state licensing authority as a CSV download.

## Interface

- `GET` (`APIRoute`): route `/[category]/licensing-authority/data-annotations/[...parts]/data.csv`; route params `category` and the rest param `parts`. `[data.csv.ts:export const GET: APIRoute = async ({ params }) => {]`
- `getStaticPaths()` loads all entries with `loadDataAnnotations()` (`#src/lib/data/data-annotations.js`), then for each path from `loadStateAuthorityPaths()` loads the authority with `loadStateAuthority("/<category>/")` and its namespaces with `loadAuthorityNamespaces(authority.id)` (all from `#src/lib/data/licensing-authority.js`). `[data.csv.ts:(await loadStateAuthorityPaths()).map(async ({ params }) => {]`
- One path is emitted per filter from `annotationFilters(entries, namespaces, authority.id)` (`#src/lib/data/annotation-views.js`); `parts` is the filter's `parts`, or `undefined` when that is empty. `[data.csv.ts:params: { ...params, parts: parts || undefined },]`
- `GET` reloads the authority by path with `loadStateAuthority("/<category>/")`, recomputes the filters, and picks the one whose `parts` equals `params.parts` (or the empty string). `[data.csv.ts:).find((filter) => filter.parts === (params.parts || ""));]`
- Response: `new Response(annotationsCsv(filter.entries), { headers })`, with `annotationsCsv` from `#src/lib/data/annotation-values.js`. No explicit status is set. `[data.csv.ts:return new Response(annotationsCsv(filter.entries), {]`
- Response headers: `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename=data-notes.csv`. `[data.csv.ts:"Content-Disposition": "attachment; filename=data-notes.csv",]`
- No pagination.

## Invariants

- Throws `Unknown authority annotation export.` when no filter matches `params.parts`. `[data.csv.ts:if (!filter) throw new Error("Unknown authority annotation export.");]`
- The download file name is always `data-notes.csv`, for every authority and filter. `[data.csv.ts:filename=data-notes.csv]`
- The content type is always `text/csv; charset=utf-8`. `[data.csv.ts:"Content-Type": "text/csv; charset=utf-8",]`
- Static paths are enumerated from `annotationFilters`, not from `annotationPages` (which the sibling page `../[...parts].astro` uses). `[data.csv.ts:return annotationFilters(]`
- The authority path is always `/<category>/`, built from the `category` param. `[data.csv.ts:params.category]`

## Side Effects

- Build-time data loading only, through `loadDataAnnotations`, `loadStateAuthorityPaths`, `loadStateAuthority` and `loadAuthorityNamespaces`. The handler writes nothing and makes no network call; its only output is the CSV `Response`. `[data.csv.ts:const entries = await loadDataAnnotations();]`

## Verification

- Run: `npm run test:e2e`
