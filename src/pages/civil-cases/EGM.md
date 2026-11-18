# Civil cases list (`src/pages/civil-cases`)

## Overview

Static Astro page for the route `/civil-cases/`, the first page of the site-wide civil case list. It loads the full civil case list, shows the first page of it and links to the later pages. The page has no route params, no `getStaticPaths`, no form and no client script. The subdirectories hold the later list pages, the case detail page and the two civil case forms.

## Interface

- Route `/civil-cases/`: the page path is a fixed string. `[index.astro:const pagePath = "/civil-cases/";]`
- Loads every civil case with `loadCivilCaseList()` from `src/lib/data/civil-cases.js`. `[index.astro:const civilCases = await loadCivilCaseList();]`
- Shows only the first `CIVIL_CASES_PAGE_SIZE` cases (constant imported from `src/lib/data/civil-cases.js`). `[index.astro:const pageCases = civilCases.slice(0, CIVIL_CASES_PAGE_SIZE);]`
- Computes the page count as the case count divided by `CIVIL_CASES_PAGE_SIZE`, rounded up, with a minimum of 1. `[index.astro:Math.ceil(civilCases.length / CIVIL_CASES_PAGE_SIZE),]`
- Page description text is "Civil litigation records involving law enforcement, sorted by filing date." `[index.astro:"Civil litigation records involving law enforcement, sorted by filing date.";]`
- `PageShell` (`src/layouts/PageShell.astro`) receives `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `heading` and `lede`. `[index.astro:canonicalUrl={pagePath}]`
- `PageShell` prop `breadcrumbs` is Home, then the current page "Civil cases". `[index.astro:{ label: "Civil cases", href: pagePath, current: true },]`
- Structured data is a schema.org `@graph` with a `WebSite` node, a `CollectionPage` node and, when present, an item list. `[index.astro:"@type": "CollectionPage",]`
- The item list is built with `buildItemList` from `src/lib/structured-data.js`, and the site URL comes from `getSiteUrl(Astro.site)`. `[index.astro:const caseItemList = buildItemList(caseItems);]`
- Each list item is a `LegalCase` with `name`, `url` (`/civil-cases/{slug}/`) and `dateFiled`. `[index.astro:"@type": "LegalCase",]`
- `identifier` is added to a `LegalCase` item only when the case has a `cause_number`. `[index.astro:...(caseItem.cause_number ? { identifier: caseItem.cause_number } : {}),]`
- `court` is added to a `LegalCase` item only when the case has a `court`. `[index.astro:...(caseItem.court ? { court: caseItem.court } : {}),]`
- The `CollectionPage` node gets `mainEntity` only when the item list exists. `[index.astro:...(itemListId ? { mainEntity: { "@id": itemListId } } : {}),]`
- The `actions` slot renders `EntityActionBar` (`src/components/EntityActionBar.astro`) with one action, "Submit civil case", linking to `/civil-cases/new/`. `[index.astro:actions={[{ label: "Submit civil case", href: "/civil-cases/new/" }]}]`
- Each case row shows the filed date formatted with `formatLongDate` from `src/lib/format.js`. `[index.astro:<span>{formatLongDate(caseItem.filed_date)}</span>]`
- Each case row links its title to `/civil-cases/{slug}/`. ``[index.astro:<a href={`/civil-cases/${caseItem.slug}/`}>{caseItem.title}</a>]``
- A row shows `court` only when present. `[index.astro:{caseItem.court ? <span>{caseItem.court}</span> : null}]`
- A row shows `cause_number` only when present. `[index.astro:<span>{caseItem.cause_number}</span>]`
- A row shows `claims_summary` only when present. `[index.astro:<span>{caseItem.claims_summary}</span>]`
- Renders `Pagination` (`src/components/Pagination.astro`) with `basePath` `/civil-cases/`, `currentPage` 1 and `lastPage` set to the computed page count. `[index.astro:<Pagination basePath={pagePath} currentPage={1} lastPage={totalPages} />]`
- Renders `CivilCaseScopeNote` (`src/components/CivilCaseScopeNote.astro`) with no props after the pagination. `[index.astro:<CivilCaseScopeNote />]`
- The page ships a scoped `<style>` block for the `profile-record` list classes. `[index.astro:.profile-record-list {]`
- [Civil case detail (`[slug]`)](./[slug]/EGM.md): route `/civil-cases/{slug}/` and its video watch pages.
- [Suggest a new civil case (`new`)](./new/EGM.md): form page `/civil-cases/new/`.
- [Later list pages (`page`)](./page/EGM.md): routes `/civil-cases/page/{number}/` for page 2 and later.
- [Suggest a civil case edit (`suggest-edit`)](./suggest-edit/EGM.md): form page `/civil-cases/suggest-edit/`.

## Invariants

- This page is always list page 1; later pages are served from `page/`. `[index.astro:currentPage={1}]`
- Every listed case's `filed_date` is converted with `new Date(...).toISOString()` with no fallback value. `[index.astro:dateFiled: new Date(caseItem.filed_date).toISOString(),]`
- The canonical URL equals the page path `/civil-cases/`. `[index.astro:canonicalUrl={pagePath}]`

## Side Effects

- Calls the `loadCivilCaseList()` loader once per build of this page; any data access happens inside that loader. `[index.astro:loadCivilCaseList,]`

## Verification

- Run: `npm run test:e2e`
