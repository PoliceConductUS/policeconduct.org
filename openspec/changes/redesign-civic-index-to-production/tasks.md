## 1. Design Tokens and Foundations

- [x] 1.1 Inventory mockup tokens (`mockups/civic-index-redesign/shared-v5.css`, `entity-actions.css`) against the canonical `--ipc-*` set; map each mockup token to an existing `--ipc-*` token or add a new canonical token (role accents, teal/interactive, paper/ink neutrals) — no parallel vocabulary.
- [x] 1.2 Land the WCAG-driven values on the canonical tokens: neutral faint text at oklch(52% 0.016 258) (≥4.5:1 on paper and teal-wash hover) and fixed rem H1 sizes (3rem desktop / 2.25rem mobile via media query) on `--ipc-type-h1`.
- [x] 1.3 Verify every text/background token pair (including faint text, empty states, and hover washes) meets WCAG 2.1 AA contrast; record ratios in the PR description.
- [x] 1.4 Self-host Public Sans: build a WOFF2 subset from a glyph inventory, add `@font-face` with `font-display: swap`, and remove any system-fallback-only stack reliance.
- [x] 1.5 Self-host icons: standardize on the existing inline-SVG Bootstrap Icons approach via a shared `Icon` component (youtube, chevron-down, and any others used); remove all CDN icon references site-wide.
- [ ] 1.6 Confirm zero third-party requests on a sample of generated pages (fonts, icons, styles, scripts all same-origin).

## 2. Shared Chrome Components

- [x] 2.1 Update `src/layouts/SiteLayout.astro` masthead to the redesign chrome: wordmark, persistent labelled search input (`role="search"`), "Share an experience" primary action, "Volunteer" ghost action → `/volunteer/`; remove "Find an agency" (folds into search).
- [x] 2.2 Add the skip-to-content link as the first focusable element in the layout, targeting `<main id="main">`; ensure every page's main content is inside that landmark.
- [ ] 2.3 Create/update a shared `Breadcrumb` component wrapping trails in `<nav aria-label="Breadcrumb">` with `aria-current="page"` on the final crumb; adopt it on all entity and geography pages.
- [x] 2.4 Create the shared `EntityActionBar` component with the native `<details>/<summary>` "More actions" menu (no JS, marker hidden, chevron rotates on `[open]`, visible `:focus` ring on items); include only actions with working destinations: Copy link (shared script, clipboard with fallback), View sources & methodology → `/data-and-methods/`.
- [x] 2.5 Create the shared social-link pattern (icon + `aria-label` "<Entity> on <Platform>", `aria-hidden` glyph, brand tint on hover/focus) and adopt it wherever entities have social links.
- [x] 2.6 Group contact identity: where an entity's contact person and email are linked in the data model, render name + email as one visual group, not separated by unrelated links (phone, social).
- [x] 2.7 Consolidate all shared client behavior (copy-link, county jump enhancement) into one shared script; remove any per-page inline scripts; keep all styles in external stylesheets.

## 3. Civic Index and Entity Page Surfaces

- [x] 3.1 Create the shared `StatStrip`/`StatCell` components matching the redesign (ledger values, labels, meta, role accents via `data-role`, muted accents + neutral `--` when empty).
- [x] 3.2 Add the drill-down "Start here" cell variant for geography landing pages: teal-washed first cell with eyebrow, child-entity count, jump select + Go (working form submission without JS), and "Browse all →" link to the existing scoped child sub-page; apply to state, administrative-area, and place pages.
- [x] 3.3 Replace hedging missing-data copy site-wide with the neutral pattern: `--`/`$--` value, muted role accent, plain-language gloss under unfamiliar labels (e.g. "Outcomes by income" → "Case results by neighborhood income"), and a subtle `Help collect this →` link to `/volunteer/` carrying source-path and scope query context.
- [x] 3.4 Split every combined records surface: agency (state/local and federal) and any other page renders "Recent experience reports" (public accounts) and "Recent civil cases" (court records) as separate sections; verify no surface mixes the two classes.
- [x] 3.5 Apply the shared components to the agency profile template (state/local), including the entity hero, action bar, stat strip, and split record sections.
- [x] 3.6 Apply the same shared components to federal agency pages, adding the uniform "Field offices" table (record-table pattern) fed by manual data; replace all placeholder office names/counts with real values sourced per repo data rules (explicit seed or database values, no silent fallbacks).
- [x] 3.7 Apply the shared components to personnel and civil-case detail templates (action bar, split sections, table-scroll wrappers).
- [x] 3.8 Wrap all wide `record-table` instances in the shared `TableScroll` component (`overflow-x: auto`) so tables scroll instead of breaking mobile layout; add `scope="col"` to column headers.

## 4. Site Search (Pagefind)

- [ ] 4.1 Add Pagefind to the build: post-`astro build` indexing step in the `build` script; scope indexing with `data-pagefind-body` to meaningful content regions and exclude chrome (masthead, breadcrumbs, action labels).
- [ ] 4.2 Build the masthead search UI on Pagefind's API: labelled input, results with titles/paths, keyboard operability, `aria-live` result count announcements; styles from the site's tokens (no default third-party look).
- [ ] 4.3 Implement the no-JS fallback: the search form submits to `/find-records/`.
- [ ] 4.4 Verify all Pagefind assets are self-hosted and measure the indexing step's build-time impact on the full page set; record the numbers in the PR.
- [ ] 4.5 Add an e2e test covering: search from an entity page returns a known agency and navigates to it; fallback navigation works with JS disabled.

## 5. Terminology Rename

- [ ] 5.1 Rename "interaction" → "experience" in all public-facing copy across templates, components, and content (chrome actions, buttons, prose).
- [ ] 5.2 Rename analytics event names and structured-data fields to "experience" wording; list the old→new event names in the PR for downstream dashboard updates.
- [ ] 5.3 Verify zero "interaction" occurrences remain in generated public output (grep the `dist` HTML); confirm no route or slug changes occurred (no redirect work expected).

## 6. Validation and Release Gates

- [ ] 6.1 Run `npm run validate` (format, lint, `astro check`, shell, schema, openspec, e2e) and fix all failures.
- [ ] 6.2 Run `npm run build` and confirm `validate:no-inline-css` passes over the generated output, projections refresh cleanly, and the Pagefind index builds.
- [ ] 6.3 Run `npm run audit` (`audit:seo` + `audit:a11y`) on generated pages; fix all reported violations, including contrast on de-emphasized text and focus indicators.
- [ ] 6.4 Manual verification pass: keyboard-only walkthrough (skip link, search, details menu, drill jump), a mobile-width check of table scrolling and the 9-cell metric band, and a spot-check that every page type renders the uniform chrome.
- [ ] 6.5 Run `openspec validate --all`; confirm this change's deltas apply cleanly against the `civic-index-pages` baseline (after `preview-civic-index-data-experience` archives).
