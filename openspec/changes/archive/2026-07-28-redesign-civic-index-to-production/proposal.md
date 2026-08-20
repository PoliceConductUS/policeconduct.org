## Why

The civic-index redesign is finished and validated as static mockups
(`mockups/civic-index-redesign/`, decisions in `PRODUCTION-HANDOFF.md`), but the
production site still renders the old design with inconsistent chrome, hedging
missing-data copy, "interaction" terminology, no site search, and CDN-loaded
assets. Porting the approved design into shared Astro components makes the site
uniform, WCAG 2.1 AA accessible, privacy-clean (no third-party requests), and
searchable — all part of the trust model for a public-records product.

## What Changes

**Design tokens and components**

- From: Mockup styles use an ad-hoc token vocabulary (`--ink`, `--teal`,
  `--h1`) in standalone stylesheets; production pages carry page-local styles.
- To: Mockup tokens map onto the canonical `--ipc-*` system (including the
  WCAG-driven neutral at oklch 52% and fixed rem H1 sizes); every repeated
  pattern becomes a shared Astro component (stat strip, entity action bar,
  `<details>` "More actions" menu, drill "Start here" panel, masthead search,
  breadcrumb, table-scroll wrapper). All CSS ships in external stylesheets;
  shared behavior ships as one script, not per-page.
- Reason: `DESIGN.md` forbids parallel vocabularies, page-local component
  copies, and inline CSS at 100k+ page scale.
- Impact: Site-wide visual change; non-breaking for routes and data contracts.

**Site chrome**

- From: Masthead has "Find an agency" and a plain "Volunteer" text link; no
  persistent search; no skip link; breadcrumbs are unlandmarked; social links
  are text; "More actions" does not exist.
- To: Every page gets the shared masthead (wordmark + persistent search +
  "Share an experience" + Volunteer ghost action), a skip-to-content link,
  `<nav aria-label="Breadcrumb">`, the shared entity action bar with a native
  no-JS `<details>` overflow menu, and icon social links with accessible names.
- Reason: Uniform chrome is the redesign's core goal; a11y fixes land once.
- Impact: User-visible on every page; no route changes.

**Missing-data rendering**

- From: Availability states include "not collected yet" hedging copy.
- To: Unavailable metrics render a neutral `--`/`$--` plus a subtle
  `Help collect this →` link to `/volunteer/`, with a plain-language gloss
  under unfamiliar metric labels. No hedging language anywhere.
- Reason: Codified in `DESIGN.md`/`.impeccable.md`; hedging undermines trust.
- Impact: User-visible copy change on all pages with unavailable metrics.

**Records separation and terminology**

- From: Some surfaces mix experience reports and civil cases in one list;
  "interaction" wording persists in chrome copy, analytics event names, and
  structured data.
- To: Experience reports and civil cases are always separate sections;
  "experience" replaces "interaction" site-wide. No backward-compatibility or
  redirect work is required (no route/slug changes).
- Reason: Court records and public accounts are different evidence classes;
  terminology decision by site owner.
- Impact: User-visible; analytics event names change (downstream dashboards
  must follow); intentionally non-breaking for URLs.

**Site search (new)**

- From: No site search; lookup is browse-only via `/find-records/`.
- To: Pagefind static search — post-build index, fully self-hosted, masthead
  input on every page with an accessible results experience; no-JS fallback
  links to `/find-records/`.
- Reason: Required release feature for the researcher audience; static index
  fits the no-third-party rule and 100k+ page scale.
- Impact: New build step and UI; no server infrastructure.

**Self-hosted assets**

- From: Mockups reference Bootstrap Icons via CDN; Public Sans falls back to
  system fonts.
- To: All assets self-hosted: subset Bootstrap Icons (site already inlines
  SVGs — standardized via component), Public Sans WOFF2 subset with
  `font-display`. Zero third-party requests site-wide.
- Reason: Visitor privacy is a hard requirement for this audience.
- Impact: Asset pipeline change; removes external dependencies.

**Geography drill-down emphasis**

- From: Landing pages do not present a primary drill-down action.
- To: Geography landing pages lead the stat strip with a teal "Start here"
  panel (child-entity count, jump select, Go, "Browse all →" link). This is a
  metric-cell CTA to existing scoped sub-pages — not a browse surface — and the
  spec delta states that boundary explicitly to stay compatible with the
  landing-page browse prohibition from `preview-civic-index-data-experience`.
- Reason: Drilling into child entities is the page's ideal next action.
- Impact: User-visible layout change on state/county/place landing pages.

## Capabilities

### New Capabilities

- `site-search`: Self-hosted static site search (Pagefind) with a persistent
  masthead input, accessible results, and a no-JS fallback.
- `entity-page-chrome`: Shared site chrome and entity action surfaces —
  masthead with search and civic actions, skip link, breadcrumb landmark,
  shared action bar with native `<details>` overflow menu, icon social links,
  self-hosted assets, WCAG 2.1 AA behavior, and "experience" terminology.

### Modified Capabilities

- `civic-index-pages`: Replace the "not collected yet" availability copy with
  neutral empty values + `Help collect this →`; require experience reports and
  civil cases as separate surfaces; add the "Start here" drill-down stat cell
  (scoped as a metric-cell CTA, not a browse surface); require shared
  components/tokens for the page visual system.

## Impact

- **Code**: `src/components/**` (new shared components; `CivicIndexPage.astro`
  and agency/personnel/civil-case templates updated), `src/layouts/SiteLayout.astro`,
  site stylesheets/tokens, one shared client script, build pipeline (Pagefind
  post-build step), asset pipeline (fonts/icons).
- **Data**: No schema changes. Manual field-office data allowed for now
  (placeholder mockup values must be replaced with real ones; entity IDs from
  explicit seed/database values per repo data rules). Empty metrics stay empty
  when absent — no silent fallbacks.
- **Analytics/SEO**: Event names and structured data move to "experience"
  wording; downstream dashboards must be updated. No URL changes, so no
  redirects.
- **Backward compatibility**: Intentionally none required — no route/slug
  changes; visual and copy changes only.
- **Validation gates**: `npm run validate` (format, lint, `astro check`,
  schema, openspec, e2e), `npm run build` (`validate:no-inline-css`,
  projections), `npm run audit` (`audit:seo` + `audit:a11y`) must pass.
- **Downstream consumers**: The active `preview-civic-index-data-experience`
  change modifies the same `civic-index-pages` spec; this change lands after it
  and its delta is written against that baseline.
