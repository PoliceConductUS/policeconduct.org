# layouts

## Overview

Astro layouts that wrap every page. `SiteLayout.astro` renders the HTML
document: `<head>` metadata, the masthead, the footer and the shared client
scripts. `PageShell.astro` wraps `SiteLayout` with the standard page body:
breadcrumb, page header and content slots. `Layout.astro` is a bare starter
document with no props.

Citations use the form `[file:text]`, where `text` appears verbatim in that file
of this directory.

## Interface

### `PageShell.astro`

- `Props` passed through to `SiteLayout`: `title` (required), `description`,
  `pagePath`, `canonicalUrl`, `robots`, `socialImage`, `structuredData`.
  `[PageShell.astro:// SiteLayout passthrough]`
- `Props` for the shell and header: `breadcrumbs` (required; items of `label`,
  optional `href`, optional `current`), `heading`, `eyebrow`, `lede`,
  `searchable` (default `true`). `[PageShell.astro:searchable = true]`
- Slots: default (page body), `header` (rich content under the heading),
  `actions` (header actions), `aside` (right-hand rail), `hero` (replaces the
  default header). `[PageShell.astro:<slot name="hero" />]`
- Imports `SiteLayout`, `Breadcrumb` and `PageHeader`; it passes `breadcrumbs`
  to `Breadcrumb` with `className="mb-2"`, and passes `eyebrow`, `heading` (as
  `title`) and `lede` (as `description`) to `PageHeader`.
  `[PageShell.astro:<Breadcrumb items={breadcrumbs} className="mb-2" />]`
- Renders the body inside `<main id="main" class="civic-index-page">`.
  `[PageShell.astro:id="main"]`

### `SiteLayout.astro`

- Props (read from `Astro.props`, no declared interface): `title`,
  `description`, `pagePath`, `canonicalUrl`, `robots`, `structuredData`,
  `socialImage`. `[SiteLayout.astro:socialImage,]`
- Slot: default, rendered between the masthead and the footer.
  `[SiteLayout.astro:<slot />]`
- Imports `AnalyticsConsent`, `GoogleAnalytics` and `MastheadSearch` from
  `#src/components/`, `releaseId` from `#src/lib/release-id.js`, the
  organization constants `ORG_ADDRESS`, `ORG_EIN`, `ORG_LEGAL_NAME` and
  `ORG_SOCIAL_LINKS` from `#src/lib/org.js`, and `#src/styles/theme.css`.
  `[SiteLayout.astro:ORG_SOCIAL_LINKS]`
- `<head>` output: canonical link, sitemap link (`/sitemap-index.xml`),
  `llms.txt` alternate link, description, robots, author, Open Graph and
  Twitter card tags, one JSON-LD script per structured-data entry, the title,
  and `GoogleAnalytics`. `[SiteLayout.astro:/sitemap-index.xml]`
- Masthead: site mark linking to `/`, `MastheadSearch`, and primary nav links
  to `/news/`, `/donate/`, `/report/new/` and `/volunteer/`.
  `[SiteLayout.astro:masthead-nav]`
- Footer: organization social links, five link columns (About, Data and
  methods, Partner, Support, Legal notices), a "Cookie settings" button
  (`data-privacy-settings`, rendered `hidden`), a data-removal request link,
  the site-wide information notice, a notice that connections between records
  are computer-generated and may be incorrect, the organization name and
  address, the build commit, and `AnalyticsConsent`. The About column also
  carries the nonprofit status text and the EIN (`ORG_EIN`), and a second
  "Report a site issue" link and a copyright line sit under the address.
  `[SiteLayout.astro:data-privacy-settings]`
  `[SiteLayout.astro:Federal Tax ID (EIN): {ORG_EIN}]`
  `[SiteLayout.astro:All rights reserved.]`
  `[SiteLayout.astro:computer-generated and may be incorrect]`
- The `<html>` element carries `data-release-id`.
  `[SiteLayout.astro:data-release-id={releaseId}]`
- A skip link targets `#main`. `[SiteLayout.astro:skip-link]`

### `Layout.astro`

- No props; one default slot inside `<body>`; fixed title `Astro Basics`.
  `[Layout.astro:Astro Basics]`

## Invariants

- `PageShell` renders the `hero` slot instead of `PageHeader` when that slot is
  filled; `heading` is then unused. `[PageShell.astro:hasHero]`
- `PageShell` applies the two-column `entity-hero` classes only when the
  `aside` slot is filled. `[PageShell.astro:hasAside]`
- `PageShell` marks `<main>` with `data-pagefind-body` when `searchable` is
  true, and with `data-pagefind-ignore="all"` when it is false.
  `[PageShell.astro:data-pagefind-ignore={searchable ? undefined : "all"}]`
- `PageShell` passes an empty string as the header title when `heading` is not
  set. `[PageShell.astro:title={heading ?? ""}]`
- `SiteLayout` resolves the page path as `pagePath`, else the request
  pathname, else `/`. `[SiteLayout.astro:const resolvedPath]`
- `SiteLayout` builds the canonical URL from `canonicalUrl` (else the resolved
  path) against `Astro.site`, falling back to
  `https://www.policeconduct.org/`; an invalid canonical source falls back to
  the resolved path. `[SiteLayout.astro:const canonicalHref]`
- The social image defaults to `/img/webp/usa-1778524_1280.webp`, and robots
  defaults to `index,follow`. `[SiteLayout.astro:index,follow]`
- `structuredData` may be one object or an array; each entry becomes its own
  JSON-LD script, with `<` escaped. `[SiteLayout.astro:serializeStructuredData]`
- The masthead and footer are marked `data-pagefind-ignore`, and the footer is
  hidden in print. `[SiteLayout.astro:d-print-none]`
- The footer shows the first 12 characters of the commit SHA, with a `-dirty`
  suffix for a dirty build, or `unknown` when no SHA is available.
  `[SiteLayout.astro:commitDisplay]`
- Footer legal notices are listed in lexical order, from Acceptable Use Policy
  to Terms of Service. `[SiteLayout.astro:/legal-notice/acceptable-use]`
- The limit on what the site checks is stated once, in the footer notice.
  `[SiteLayout.astro:We do not verify information on]`

## Side Effects

- In dev mode `SiteLayout` runs `git rev-parse HEAD` and
  `git status --porcelain` through `execFileSync` on every render.
  `[SiteLayout.astro:execFileSync("git", ["rev-parse", "HEAD"]]`
- Outside dev mode `SiteLayout` reads the environment variables
  `GIT_COMMIT_SHA`, `GITHUB_SHA` and `GIT_COMMIT_DIRTY`.
  `[SiteLayout.astro:process.env.GIT_COMMIT_DIRTY]`
- `SiteLayout` loads the shared client script `#src/lib/client/site.js` on
  every page. `[SiteLayout.astro:import "#src/lib/client/site.js";]`
- `SiteLayout` adds an inline script with a document click handler: a click on
  an anchor with `data-issue-message` opens `window.__IPC_SENTRY_FEEDBACK__`
  with that message and cancels the navigation; when the feedback widget is
  absent the link navigates to `/about/contact/` as normal.
  `[SiteLayout.astro:__IPC_SENTRY_FEEDBACK__]`
- Through `GoogleAnalytics` and `AnalyticsConsent`, every page using
  `SiteLayout` starts the analytics and consent client code.
  `[SiteLayout.astro:<GoogleAnalytics />]`
- `Layout.astro` and `PageShell.astro` have no side effects of their own.
  `[PageShell.astro:Astro.slots.has("aside")]`

## Verification

- Run: `npm run test:client` (`scripts/canonical-metadata.test.mjs` and
  `scripts/public-claims.test.mjs` build fixture pages through the layouts).
- Run: `npm run test:e2e` (`scripts/run-e2e.mjs` starts the dev server; the
  specs under `tests/e2e/` that load its pages render through `SiteLayout` in
  dev mode; specs that call `page.setContent` or query the database do not).
- Run: `npm test` for the full chain.
