# Data notes CSV endpoint

## Overview

Static Astro endpoint for the route `/data-annotations/[...parts]/data.csv`. It returns the data annotations of one site-wide filter view as a CSV download.

## Interface

- `GET` (`APIRoute`): route `/data-annotations/[...parts]/data.csv`; the only route param is the rest param `parts`. `[data.csv.ts:export const GET: APIRoute = async ({ params }) => {]`
- `getStaticPaths()` loads all entries with `loadDataAnnotations()` (`#src/lib/data/data-annotations.js`) and emits one path per filter from `annotationFilters(entries)` (`#src/lib/data/annotation-views.js`). `[data.csv.ts:return annotationFilters(await loadDataAnnotations()).map(({ parts }) => ({]`
- `parts` is the filter's `parts`, or `undefined` when that is empty, so the unfiltered export is `/data-annotations/data.csv`. `[data.csv.ts:params: { parts: parts || undefined },]`
- `GET` reloads the entries, recomputes the filters, and picks the one whose `parts` equals `params.parts` (or the empty string). `[data.csv.ts:(filter) => filter.parts === (params.parts || ""),]`
- Response: `new Response(annotationsCsv(filter.entries), { headers })`, with `annotationsCsv` from `#src/lib/data/annotation-values.js`. No explicit status is set. `[data.csv.ts:return new Response(annotationsCsv(filter.entries), {]`
- Response headers: `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename=data-notes.csv`. `[data.csv.ts:"Content-Disposition": "attachment; filename=data-notes.csv",]`
- No pagination; only `params` is taken from the request context, so no request body and no query parameters are read. `[data.csv.ts:async ({ params }) =>]`

## Invariants

- Throws `Unknown data notes export.` when no filter matches `params.parts`. `[data.csv.ts:if (!filter) throw new Error("Unknown data notes export.");]`
- The download file name is always `data-notes.csv`, for every filter. `[data.csv.ts:filename=data-notes.csv]`
- The content type is always `text/csv; charset=utf-8`. `[data.csv.ts:"Content-Type": "text/csv; charset=utf-8",]`
- Static paths are enumerated from `annotationFilters`, not from `annotationPages` (which the sibling page `../[...parts].astro` uses), so there is one CSV per filter and none per page number. `[data.csv.ts:import { annotationFilters } from "#src/lib/data/annotation-views.js";]`
- `annotationFilters` is called with the entries only: no namespace list and no authority id. `[data.csv.ts:const filter = annotationFilters(await loadDataAnnotations()).find(]`

## Side Effects

- Build-time data loading through `loadDataAnnotations()`, called once in `getStaticPaths` and once per `GET`. The handler writes nothing and makes no network call; its only output is the CSV `Response`. `[data.csv.ts:import { loadDataAnnotations } from "#src/lib/data/data-annotations.js";]`

## Verification

- Run: `npm run test:e2e`
