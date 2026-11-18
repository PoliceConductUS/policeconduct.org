# Cookie Policy Page

## Overview

Static Astro page for the route `/legal-notice/cookie/`: the cookie policy text. It has one file, `index.astro`. It passes no `canonicalUrl`, `robots` or `lede` prop to `PageShell`, calls no data loader, has no form and ships no client script.

## Interface

- Route `/legal-notice/cookie/`, a static page with no `getStaticPaths` and no route parameters. [index.astro:const pagePath = "/legal-notice/cookie/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is the literal `Cookie | PoliceConduct.org`. [index.astro:title="Cookie | PoliceConduct.org"]
- `PageShell` prop `description` is the `pageDescription` constant defined in the frontmatter. [index.astro:description={pageDescription}]
- `PageShell` prop `pagePath` is the `pagePath` constant. [index.astro:pagePath={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Legal Notice` linking to `/legal-notice/`, then `Cookie Policy` marked `current`. [index.astro:{ label: "Cookie Policy", href: pagePath, current: true }]
- `PageShell` prop `heading` is `COOKIE POLICY`. [index.astro:heading="COOKIE POLICY"]
- The body is static policy text placed in the default slot; it shows a last-updated date of January 14, 2026. [index.astro:January 14, 2026]
- The text links out to browser help pages for cookie settings. [index.astro:https://support.google.com/chrome/answer/95647]
- The text links out to advertising opt-out sites. [index.astro:https://www.aboutads.info/choices/]
- The text links out to two Flash Player storage settings pages on the Macromedia site. [index.astro:https://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager07.html]
- The text links to the site root. [index.astro:href="/"]
- The page ends with a postal contact block in an `address` element. [index.astro:address>]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Cookie | PoliceConduct.org",]
- The structured-data `description` and the `description` prop both use `pageDescription`. [index.astro:description: pageDescription,]
- The parent breadcrumb points to the legal notices index. [index.astro:{ label: "Legal Notice", href: "/legal-notice/" }]

## Side Effects

- None

## Verification

- Run: `npm run build`
