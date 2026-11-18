# Legal Notices Pages

## Overview

Static pages under `/legal-notice/`. `index.astro` is the index page that lists ten legal documents from a frontmatter array and links to each one. Each document lives in its own child directory. The index page calls no data loader, has no form and has no page-specific client script; it uses the prefill components to pass a starting message to the contact page.

## Interface

- Route `/legal-notice/`, a static page with no `getStaticPaths`. [index.astro:const pagePath = "/legal-notice/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Legal Notices | PoliceConduct.org`. [index.astro:title="Legal Notices | PoliceConduct.org"]
- `PageShell` props `description`, `pagePath` and `canonicalUrl` come from the `pageDescription` and `pagePath` constants. [index.astro:canonicalUrl={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Home` linking to `/`, then `Legal Notice` marked `current`. [index.astro:{ label: "Legal Notice", href: pagePath, current: true }]
- `PageShell` prop `heading` is `Legal Notices`, and a `lede` string is passed. [index.astro:heading="Legal Notices"]
- The frontmatter defines `documents`, an array of ten objects with `slug`, `title`, `summary` and `category`. [index.astro:const documents = []
- The page renders one card per `documents` entry showing the category badge, the path text, the linked title and the summary. [index.astro:{documents.map((doc) => (]
- Each card links to `/legal-notice/{slug}/`. [index.astro:href={`/legal-notice/${doc.slug}/`}]
- The `PrefillBootstrap` component is rendered once in the page. [index.astro:PrefillBootstrap />]
- The `actions` slot holds a `PrefillNavButton` with `to="/about/contact/"` and a `payload` of `whoami: "Other"` plus a message about legal policies, so the contact form preselects `Other`. [index.astro:message: "I have a question about your legal policies.",]
- The `actions` slot also holds a plain link to the data request page. [index.astro:href="/legal-notice/data-subject-access-request/"]
- Child contract: [acceptable-use](./acceptable-use/EGM.md) - Static `/legal-notice/acceptable-use/` page: the acceptable use policy text.
- Child contract: [comment-policy](./comment-policy/EGM.md) - Static `/legal-notice/comment-policy/` page: the comment policy text with a short question-and-answer section.
- Child contract: [community-guidelines](./community-guidelines/EGM.md) - Static `/legal-notice/community-guidelines/` page: the community guidelines text.
- Child contract: [cookie](./cookie/EGM.md) - Static `/legal-notice/cookie/` page: the cookie policy text.
- Child contract: [data-subject-access-request](./data-subject-access-request/EGM.md) - Static `/legal-notice/data-subject-access-request/` page (noindex) with the `dataSubjectAccessRequest` form submitted through `submitJsonForm` with reCAPTCHA.
- Child contract: [disclaimer](./disclaimer/EGM.md) - Static `/legal-notice/disclaimer/` page: the site disclaimer text.
- Child contract: [eula](./eula/EGM.md) - Static `/legal-notice/eula/` page: the end user license agreement text.
- Child contract: [privacy](./privacy/EGM.md) - Static `/legal-notice/privacy/` page: the privacy policy text, including a list of personal-information categories rendered from a frontmatter array.
- Child contract: [refund](./refund/EGM.md) - Static `/legal-notice/refund/` page: the refund policy text.
- Child contract: [terms-of-service](./terms-of-service/EGM.md) - Static `/legal-notice/terms-of-service/` page: the terms of service text.

## Invariants

- The `documents` slugs are the child directory names: `acceptable-use`, `comment-policy`, `community-guidelines`, `cookie`, `data-subject-access-request`, `disclaimer`, `eula`, `privacy`, `refund` and `terms-of-service`. [index.astro:slug: "terms-of-service",]
- The `category` values used are `Use of services`, `Privacy`, `Notices`, `Core terms` and `Transactions`. [index.astro:category: "Transactions",]
- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Legal Notices | PoliceConduct.org",]

## Side Effects

- None

## Verification

- Run: `npm run test:e2e`
