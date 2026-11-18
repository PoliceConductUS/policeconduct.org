# News Pages

## Overview

Pages under `/news/`. `index.astro` is the first page of the news list. It loads every post record with `loadNewsArticles()` from the shared news module and shows the first `PAGE_SIZE` of them. Older posts are on the paginated pages in `page/`. Each post lives in a `{year}/{month}/{day}/{slug}/` directory that holds an `index.astro` page and a `_metadata.ts` record. The index page passes no `robots` prop, has no form and has no page-specific client script.

## Interface

- Route `/news/`, a static page with no `getStaticPaths`. [index.astro:pagePath="/news/"]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- The page loads post records with `loadNewsArticles()` at build time. [index.astro:const articles = loadNewsArticles();]
- The page imports `formatNewsDate`, `loadNewsArticles`, `PAGE_SIZE` and `newsBadgeClassName` from the shared news module. [index.astro:from "#src/lib/news.js";]
- `PageShell` prop `title` is `News | PoliceConduct.org`. [index.astro:title="News | PoliceConduct.org"]
- `PageShell` prop `description` is a literal string. [index.astro:description="News and updates from PoliceConduct.org."]
- `PageShell` prop `canonicalUrl` is `/news/`. [index.astro:canonicalUrl="/news/"]
- `PageShell` prop `structuredData` is a `buildCollectionPage` object named `News` whose `items` are the `href` and `title` of each article on the page. [index.astro:const structuredData = buildCollectionPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Home` linking to `/`, then `News` marked `current`. [index.astro:{ label: "News", href: "/news/", current: true }]
- `PageShell` prop `heading` is `News`, and a `lede` string is passed. [index.astro:heading="News"]
- The `actions` slot holds a `PrefillNavButton` with `to="/about/contact/"`, a bell icon and the label `Notify me about news updates`. [index.astro:Notify me about news updates]
- The button `payload` sets `whoami` to `Subscriber` and a message asking for news updates. [index.astro:whoami: "Subscriber",]
- The `PrefillBootstrap` component is rendered in the default slot. [index.astro:PrefillBootstrap />]
- Each article renders as a link to `article.href` showing the formatted date, the title and the description. [index.astro:{pageArticles.map((article) => (]
- Dates are formatted with `formatNewsDate`. [index.astro:{formatNewsDate(article.date)}]
- An article badge is shown only when `article.badge` is set, with a class from `newsBadgeClassName`. [index.astro:class={newsBadgeClassName(article.badge)}]
- An `Older News` link is shown only when there is more than one page. [index.astro:{totalPages > 1 ? (]
- Child contract: [page](./page/EGM.md) - Paginated older news list at `/news/page/{n}/` for page 2 and later, built with Astro `paginate` over `loadNewsArticles()`.
- Child contract: [2025](./2025/EGM.md) - Year folder holding one 2025 news post.
- Child contract: [2026](./2026/EGM.md) - Year folder holding three 2026 news posts.

## Invariants

- The page shows only the first `PAGE_SIZE` articles of the loaded list. [index.astro:const pageArticles = articles.slice(0, PAGE_SIZE);]
- The page count is at least 1. [index.astro:const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));]
- The `Older News` link always points to `/news/page/2/`. [index.astro:const nextUrl = totalPages > 1 ? "/news/page/2/" : null;]
- The structured-data page URL is `/news/` resolved against `getSiteUrl(Astro.site)`. [index.astro:pageUrl: new URL("/news/", siteUrl).toString(),]
- The structured-data items cover only the articles shown on this page. [index.astro:items: pageArticles.map((article) => ({]

## Side Effects

- None

## Verification

- Run: `npm run test:e2e`
