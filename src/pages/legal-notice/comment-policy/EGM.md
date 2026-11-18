# Comment Policy Page

## Overview

Static Astro page for the route `/legal-notice/comment-policy/`: the comment policy text with a short question-and-answer section. It has one file, `index.astro`. It passes no `canonicalUrl`, `robots` or `lede` prop to `PageShell`, calls no data loader, has no form and ships no client script.

## Interface

- Route `/legal-notice/comment-policy/`, a static page with no `getStaticPaths` and no route parameters. [index.astro:const pagePath = "/legal-notice/comment-policy/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is the literal `Comment Policy | PoliceConduct.org`. [index.astro:title="Comment Policy | PoliceConduct.org"]
- `PageShell` prop `description` is the `pageDescription` constant defined in the frontmatter. [index.astro:description={pageDescription}]
- `PageShell` prop `pagePath` is the `pagePath` constant. [index.astro:pagePath={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Legal Notice` linking to `/legal-notice/`, then `Comment Policy` marked `current`. [index.astro:{ label: "Comment Policy", href: pagePath, current: true }]
- `PageShell` prop `heading` is `COMMENT POLICY`. [index.astro:heading="COMMENT POLICY"]
- The body is static policy text placed in the default slot; it shows a last-updated date of January 25, 2026. [index.astro:January 25, 2026]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Comment Policy | PoliceConduct.org",]
- The structured-data `description` and the `description` prop both use `pageDescription`. [index.astro:description: pageDescription,]
- The parent breadcrumb points to the legal notices index. [index.astro:{ label: "Legal Notice", href: "/legal-notice/" }]

## Side Effects

- None

## Verification

- Run: `npm run build`
