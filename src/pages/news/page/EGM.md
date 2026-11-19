# News Pagination Pages

## Overview

Paginated news list pages for the route `/news/page/{number}/`. The one file, `[...page].astro`, builds its paths with Astro `paginate` over the articles returned by `loadNewsArticles()` and drops page 1, which is served by `/news/`. The page passes no `robots` prop, has no form, ships no client script and does not render the prefill components.

## Interface

- Route `/news/page/{number}/` from a rest parameter named `page`. [[...page].astro:const pagePath = `/news/page/${page.currentPage}/`;]
- `getStaticPaths` receives Astro `paginate` and returns the paginated article pages after filtering. [[...page].astro:export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {]
- `getStaticPaths` loads the articles with `loadNewsArticles()` from the shared news module. [[...page].astro:const articles = loadNewsArticles();]
- The page size is the shared `PAGE_SIZE` constant. [[...page].astro:pageSize: PAGE_SIZE,]
- The page reads the paginated data from `Astro.props.page`, typed locally as `PaginatedNewsPage` with `data`, `currentPage` and `url.prev` / `url.next`. [[...page].astro:const { page } = Astro.props as { page: PaginatedNewsPage };]
- The page renders through the `PageShell` layout. [[...page].astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is the computed title followed by the site name. [[...page].astro:title={`${title} | PoliceConduct.org`}]
- `PageShell` prop `description` is a literal string. [[...page].astro:description="News and updates from PoliceConduct.org."]
- `PageShell` props `pagePath` and `canonicalUrl` are the computed `pagePath`. [[...page].astro:canonicalUrl={pagePath}]
- `PageShell` prop `structuredData` is a `buildCollectionPage` object whose `items` are the `href` and `title` of each article on the page. [[...page].astro:const structuredData = buildCollectionPage({]
- `PageShell` prop `breadcrumbs` has three entries: `Home`, `News` linking to `/news/`, then the page label marked `current`. [[...page].astro:label: `Page ${page.currentPage}`,]
- `PageShell` prop `heading` is the computed title, and a `lede` string is passed. [[...page].astro:heading={title}]
- Each article renders as a link to `article.href` showing the formatted date, the title and the description. [[...page].astro:{page.data.map((article: NewsMeta) => (]
- Dates are formatted with `formatNewsDate`. [[...page].astro:{formatNewsDate(article.date)}]
- An article badge is shown only when `article.badge` is set, with a class from `newsBadgeClassName`. [[...page].astro:class={newsBadgeClassName(article.badge)}]
- A `Newer News` link is shown when a previous URL exists; otherwise an empty `span` holds its place. [[...page].astro:Newer News]
- An `Older News` link is shown only when a next URL exists. [[...page].astro:Older News]

## Invariants

- `getStaticPaths` removes the path whose `page` parameter is empty or `1`, so no `/news/page/1/` page is built. [[...page].astro:typeof pageParam === "string" && pageParam.length > 0 && pageParam !== "1"]
- The same filter handles an array-valued `page` parameter. [[...page].astro:return pageParam.length > 0 && pageParam[0] !== "1";]
- On page 2 the `Newer News` link goes to `/news/`, not to a page-1 URL. [[...page].astro:const prevUrl = page.currentPage === 2 ? "/news/" : page.url.prev?.toString();]
- The next URL is `null` when there is no later page. [[...page].astro:const nextUrl = page.url.next?.toString() || null;]
- The title is `News – Page N` for pages after the first and `News` otherwise. [[...page].astro:page.currentPage > 1 ? `News – Page ${page.currentPage}` : "News";]
- The structured-data page URL is `pagePath` resolved against `getSiteUrl(Astro.site)`. [[...page].astro:pageUrl: new URL(pagePath, siteUrl).toString(),]
- Route data reaches the render through `Astro.props`, set by `paginate` in `getStaticPaths`. [[...page].astro:return paginate(articles, {]

## Side Effects

- None

## Verification

- Run: `npm run build`
