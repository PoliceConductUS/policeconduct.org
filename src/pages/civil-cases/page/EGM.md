# Civil cases list, later pages (`src/pages/civil-cases/page`)

## Overview

Astro rest-param page for the routes `/civil-cases/page/{number}/`. It serves page 2 and later of the site-wide civil case list; page 1 is `/civil-cases/`. The page has no form and no client script.

## Interface

- Route `/civil-cases/page/{page}/`: the path is built from the current page number. ``[[...page].astro:const pagePath = `/civil-cases/page/${page.currentPage}/`;]``
- `getStaticPaths({ paginate })` loads every civil case with `loadCivilCaseList()` from `src/lib/data/civil-cases.js`. `[[...page].astro:const civilCases = await loadCivilCaseList();]`
- `getStaticPaths` splits the list with Astro `paginate` using `CIVIL_CASES_PAGE_SIZE` as the page size. `[[...page].astro:pageSize: CIVIL_CASES_PAGE_SIZE,]`
- `getStaticPaths` drops any generated page whose `page` param is empty or `"1"`, for both the array and the string form of the param. `[[...page].astro:return pageParam.length > 0 && pageParam[0] !== "1";]`
- The only route param is `page`. `[[...page].astro:const pageParam = page.params?.page;]`
- The page reads the Astro `page` prop produced by `paginate`; the case list is not loaded again during render. `[[...page].astro:const { page } = Astro.props as { page: PaginatedCivilCasesPage };]`
- The local type `PaginatedCivilCasesPage` declares the prop fields the page uses: `data`, `currentPage` and `lastPage`. `[[...page].astro:type PaginatedCivilCasesPage = {]`
- The page heading is "Civil cases - Page N". ``[[...page].astro:const title = `Civil cases - Page ${page.currentPage}`;]``
- `PageShell` prop `title` is that heading followed by `| PoliceConduct.org`. ``[[...page].astro:title={`${title} | PoliceConduct.org`}]``
- Page description text is "Civil litigation records involving law enforcement, sorted by filing date." `[[...page].astro:"Civil litigation records involving law enforcement, sorted by filing date.";]`
- `PageShell` (`src/layouts/PageShell.astro`) receives `title`, `description`, `pagePath`, `canonicalUrl`, `breadcrumbs`, `heading` and `lede`; it receives no `structuredData`. `[[...page].astro:canonicalUrl={pagePath}]`
- `PageShell` prop `breadcrumbs` is Home, Civil cases (`/civil-cases/`), then the current page "Page N". ``[[...page].astro:{ label: `Page ${page.currentPage}`, href: pagePath, current: true },]``
- The `actions` slot renders `EntityActionBar` (`src/components/EntityActionBar.astro`) with one action, "Submit civil case", linking to `/civil-cases/new/`. `[[...page].astro:actions={[{ label: "Submit civil case", href: "/civil-cases/new/" }]}]`
- Rows come from `page.data`. `[[...page].astro:{page.data.map((caseItem) => (]`
- Each case row shows the filed date formatted with `formatLongDate` from `src/lib/format.js`. `[[...page].astro:<span>{formatLongDate(caseItem.filed_date)}</span>]`
- Each case row links its title to `/civil-cases/{slug}/`. ``[[...page].astro:<a href={`/civil-cases/${caseItem.slug}/`}>{caseItem.title}</a>]``
- A row shows `court` only when present. `[[...page].astro:{caseItem.court ? <span>{caseItem.court}</span> : null}]`
- A row shows `cause_number` only when present. `[[...page].astro:<span>{caseItem.cause_number}</span>]`
- A row shows `claims_summary` only when present. `[[...page].astro:<span>{caseItem.claims_summary}</span>]`
- Renders `Pagination` (`src/components/Pagination.astro`) with `basePath="/civil-cases/"`, `currentPage` and `lastPage` from the `page` prop. `[[...page].astro:basePath="/civil-cases/"]`
- The page ships a scoped `<style>` block for the `profile-record` list classes, the same rules as the page 1 file. `[[...page].astro:.profile-record-list {]`

## Invariants

- No `/civil-cases/page/1/` page is generated; page 1 is the base path. `[[...page].astro:typeof pageParam === "string" && pageParam.length > 0 && pageParam !== "1"]`
- The pagination base path is `/civil-cases/`, not the `/civil-cases/page/` prefix. `[[...page].astro:basePath="/civil-cases/"]`

## Side Effects

- Calls the `loadCivilCaseList()` loader in `getStaticPaths`; any data access happens inside that loader. `[[...page].astro:loadCivilCaseList,]`

## Verification

- Run: `npm run build`
