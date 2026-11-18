# Privacy Policy Page

## Overview

Static Astro page for the route `/legal-notice/privacy/`: the privacy policy text, including a list of personal-information categories rendered from a frontmatter array. It has one file, `index.astro`. It passes no `canonicalUrl`, `robots` or `lede` prop to `PageShell`, calls no data loader, has no form and ships no client script.

## Interface

- Route `/legal-notice/privacy/`, a static page with no `getStaticPaths` and no route parameters. [index.astro:const pagePath = "/legal-notice/privacy/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is the literal `Privacy | PoliceConduct.org`. [index.astro:title="Privacy | PoliceConduct.org"]
- `PageShell` prop `description` is the `pageDescription` constant defined in the frontmatter. [index.astro:description={pageDescription}]
- `PageShell` prop `pagePath` is the `pagePath` constant. [index.astro:pagePath={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Legal Notice` linking to `/legal-notice/`, then `Privacy Policy` marked `current`. [index.astro:{ label: "Privacy Policy", href: pagePath, current: true }]
- `PageShell` prop `heading` is `PRIVACY POLICY`. [index.astro:heading="PRIVACY POLICY"]
- The body is static policy text placed in the default slot; it shows a last-updated date of January 14, 2026. [index.astro:January 14, 2026]
- The frontmatter defines `privacyCategories`, an array of twelve objects with `category`, `examples` and `collected` fields. [index.astro:const privacyCategories = []
- The page maps over `privacyCategories` and renders one block per entry with the category as a heading. [index.astro:{privacyCategories.map((item) => (]
- Each block shows `examples`, or the text `Not listed.` when `examples` is empty. [index.astro:{item.examples || "Not listed."}]
- Each block shows `Collected: YES` or `Collected: NO` from the `collected` boolean. [index.astro:Collected: {item.collected ? "YES" : "NO"}]
- A table of contents links to in-page section anchors. [index.astro:href="#what-information-do-we-collect"]
- The key-points summary, the table of contents and all seventeen numbered section headings carry `id` attributes, ending at section 17. [index.astro:<h2 id="how-can-you-review-update-or-delete-the-data-we-collect-from-you">]
- The paragraph that starts `Withdrawing your consent:` carries `id="withdrawing-your-consent"`. [index.astro:<p id="withdrawing-your-consent">]
- Cross-references in the body text link to the section heading ids, for example the contact section. [index.astro:<a href="#how-can-you-contact-us-about-this-notice">]
- The text links to the site root. [index.astro:href="/"]
- The text links to the data request page. [index.astro:href="/legal-notice/data-subject-access-request/"]
- The text holds `mailto:` links for privacy contacts and regulators. [index.astro:href="mailto:]
- The text links out to third-party opt-out and regulator sites. [index.astro:https://tools.google.com/dlpage/gaoptout]
- The text links out to the Google API Services User Data Policy. [index.astro:https://developers.google.com/terms/api-services-user-data-policy]
- The page holds a postal contact block in an `address` element. [index.astro:address>]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Privacy | PoliceConduct.org",]
- The structured-data `description` and the `description` prop both use `pageDescription`. [index.astro:description: pageDescription,]
- The parent breadcrumb points to the legal notices index. [index.astro:{ label: "Legal Notice", href: "/legal-notice/" }]
- The entry with an empty `examples` string is the one that triggers the `Not listed.` fallback. [index.astro:examples: "",]

## Side Effects

- None

## Verification

- Run: `npm run build`
- Run: `npm run test:client` (its `scripts/public-claims.test.mjs` renders this page and checks its text for unsupported verification claims). [../../../../scripts/public-claims.test.mjs:"legal-notice/privacy",]
