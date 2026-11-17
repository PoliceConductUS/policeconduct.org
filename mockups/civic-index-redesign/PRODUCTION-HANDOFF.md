# Civic Index Redesign — Production Handoff

These mockups (`mockups/civic-index-redesign/`) settle the visual + UX design.
This is the checklist for porting them into the Astro site and releasing. The
mockups are static HTML/CSS/JS references — production is component-based Astro
generating 100k+ pages, so several things must change on the way in.

Decisions below were made with the site owner; treat them as the spec.

## Design-system integration

- [ ] **Map mockup tokens → the canonical `--ipc-*` system** (DESIGN.md). The
      mockups use ad-hoc tokens (`--ink`, `--teal`, `--h1`, `--ink-faint@52%`);
      do not ship a second vocabulary. Fold the fixed H1 (3rem/2.25rem) onto
      `--ipc-type-h1` and the darkened neutral onto the real neutral token.
- [ ] **Turn bespoke classes into shared components.** `.stat-cell`,
      `.entity-menu` (now `<details>`), `.entity-actions`, `.table-scroll`,
      `.masthead-search`, breadcrumb, drill "Start here" panel, etc. become
      reusable Astro components used site-wide — no page-local copies.
- [ ] **No inline CSS/JS at scale.** Everything moves to external stylesheets
      (DESIGN.md rule; `validate:no-inline-css` gate). The menu is now a native
      `<details>` (no JS); `app.js` behaviors ship as one shared script/island,
      not per-page.

## Features to build (not just styling)

- [ ] **Search is required for release.** The masthead search is a mockup form
      to `#`; production needs a real search index/endpoint + accessible results
      experience. Scope this into the release.
- [ ] **Real routes for actions.** `Help collect this →` and `Volunteer` now
      point to **`/volunteer/`** (done in the mockups). Still placeholder (`#`):
      the "More actions" items (Copy link = JS clipboard; View sources →
      likely `/data-and-methods/`; Report a data problem → a form), and the
      hero/side actions (Share an experience, Suggest edit, Add a civil case,
      Claim this profile, Get updates).

## Data

- [ ] Field offices: **manual data is acceptable for now** (placeholder CBP
      names/counts in the mockup must be replaced with real values before ship).
- [ ] Reports vs civil cases are **already split** in the data model — keep the
      two-section layout.
- [ ] Empty metrics (budget/liability/fatal-force/outcomes) **may stay empty**
      when absent from the DB; render the neutral `--` + subtle
      `Help collect this →` (per DESIGN.md / .impeccable.md — no hedging copy).

## Assets & privacy

- [ ] **Self-host everything currently on a CDN.** Subset/self-host Bootstrap
      Icons (the mockup loads the whole font from jsdelivr for 2 glyphs — a
      third-party request that leaks visitor IPs; the site already uses
      Bootstrap Icons as inline SVGs). Self-host Public Sans (WOFF2, subset,
      `font-display`) instead of the system fallback. No other CDN calls.

## Accessibility (WCAG 2.1 AA — now codified in DESIGN.md + .impeccable.md)

- [ ] Carry the mockup fixes into the components: AA contrast (incl. faint/empty
      states), skip-to-content link, breadcrumb `<nav>`, `th scope`, wrapped
      scrollable tables, visible keyboard focus on all controls, `<details>`
      menu, labelled search + jump inputs.
- [ ] Run the site's own **`npm run audit:a11y`** (axe-core/Playwright) on real
      pages; do real screen-reader + real-device mobile testing (search bar,
      "Start here" drill panel, field-offices table scroll, 9-cell metric band).
- [ ] Content note: DB is confirmed clean of names/data that would breach the
      editorial rules — keep the "allegations, not findings" framing on cases.

## Rollout mechanics

- [ ] **"experience" not "interaction" — site-wide.** The rename must cover
      copy, any routes/slugs (+ `generate-redirect-map`), analytics event names,
      structured data, and existing content — and remove leftover "experience"
      in the old `agency-entity.html`.
- [ ] **Apply uniformly to every page**, not just the mocked ones: home, federal
      index, collection/sub-pages (budget, liability, outcomes, fatal-force,
      reports pagination), about, downloads, donate. Masthead/search/footer and
      heading tokens touch all pages; DESIGN.md requires shared heading tokens
      across home/civil-case/civic-index/agency/personnel/collection pages.
- [ ] **Progressive enhancement.** Menu is now no-JS (`<details>`). Ensure the
      county jump (`select` + Go) and search submit to real URLs so they work
      without JS.

## Gates (must pass before release)

- [ ] `npm run validate` — format, lint, `astro check` (types), schema, openspec, e2e
- [ ] `npm run build` — env/schema validation, projections, `validate:no-inline-css`, redirect map
- [ ] `npm run audit` — `audit:seo` + `audit:a11y`
