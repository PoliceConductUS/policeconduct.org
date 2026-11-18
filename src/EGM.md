# src Blueprint

## System Overview

`src/` is the Astro site for PoliceConduct.org. Route files under `pages/` call loaders in `lib/` at build time, pass the loaded data to components, and wrap the result in a layout. `assets/` and `styles/` hold images and stylesheets and have no contract file.

Citations use the form `[path:text]`, where the path is relative to this directory and the text appears verbatim in that file.

## Subdirectories & System Boundaries

- components: [./components/EGM.md](./components/EGM.md) - Shared Astro components and the metric-card type module. Most take loaded data through props; a few load data at build time or ship client scripts.
- layouts: [./layouts/EGM.md](./layouts/EGM.md) - The layouts that wrap every page: `SiteLayout` renders the HTML document, and `PageShell` wraps it with a breadcrumb, page header and content slots. `Layout.astro` is a bare starter document that no page imports. `[layouts/Layout.astro:Astro Basics]`
- lib: [./lib/EGM.md](./lib/EGM.md) - The shared library: the database pool, build helpers, structured-data builders, and the `client`, `coverage`, `data`, `forms` and `geo` subdirectories.
- pages: [./pages/EGM.md](./pages/EGM.md) - The route tree: the home and not-found pages and 19 child route directories.
- types: [./types/EGM.md](./types/EGM.md) - One ambient TypeScript declaration for the `aos` module.

## Global Invariants

- Database access goes through `withDb` in `lib/db.js`, which needs `DATABASE_URL`. `[lib/db.js:withDb]` `[lib/db.js:DATABASE_URL]`
- List pages use the shared page size of 50, except the civil-case list, which uses its own page size of 25. `[lib/pagination.ts:PAGE_SIZE = 50]` `[lib/data/civil-cases.ts:CIVIL_CASES_PAGE_SIZE = 25]`
- `PageShell` renders inside `SiteLayout`, so a page that uses `PageShell` gets the document head, masthead and footer from one place. `[layouts/PageShell.astro:import SiteLayout]`
- Setting `NO_PERSONNEL` at build time leaves person-owned data annotations out. `[lib/data/data-annotations.ts:process.env.NO_PERSONNEL]`
- `NO_PERSONNEL` also makes the personnel detail route and the personnel topic route build no pages, and makes `CoverageLinks` render personnel names as plain text instead of links. `[pages/personnel/[slug]/index.astro:process.env.NO_PERSONNEL]` `[pages/personnel/[slug]/[topic]/index.astro:process.env.NO_PERSONNEL]` `[components/CoverageLinks.astro:process.env.NO_PERSONNEL]`

## Global Side Effects

- The build reads the database through the loaders; see [./lib/data/EGM.md](./lib/data/EGM.md) for the tables each one reads.
- The release ID comes from `RELEASE_ID`, or from git when it is unset. `[lib/release-id.js:RELEASE_ID]`
- Every page that uses `SiteLayout` loads the shared client script. `[layouts/SiteLayout.astro:#src/lib/client/site.js]`
- Forms post to the forms API from the browser. `[lib/client/forms.ts:/api/forms/submit]`

## System Verification

- Run: `npm test`
- Run: `npm run test:e2e` for the routes under `pages/`.
