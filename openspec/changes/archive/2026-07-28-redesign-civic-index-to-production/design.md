## Context

The civic-index redesign was developed and validated as static mockups in
`mockups/civic-index-redesign/` over an extended iteration cycle (nine+
versions per page type, a structured design critique, a technical a11y/perf
audit, and a 12-point production Q&A recorded in
`mockups/civic-index-redesign/PRODUCTION-HANDOFF.md`). The visual/UX design is
settled; this change is the engineering port into the Astro site plus one new
feature (site search).

Current state: production pages render the pre-redesign design with
Bootstrap-based chrome, hedging missing-data copy, "interaction" terminology,
no persistent search, and some CDN-loaded assets. The canonical design system
lives in `DESIGN.md` (tokens `--ipc-*`, heading rules, no-inline-CSS, shared
components) and `.impeccable.md` (brand/audience, WCAG 2.1 AA, neutral
empty-metric standard) — both updated during the mockup cycle to codify the new
decisions. The site statically generates 100k+ pages; the build enforces
`validate:no-inline-css`, schema contracts, and e2e tests.

Constraints: no third-party requests (visitor privacy), WCAG 2.1 AA, no
parallel token vocabularies, no page-local component copies, database-backed
slugs and explicit entity IDs, no silent data fallbacks.

## Goals / Non-Goals

**Goals:**

- Uniform site: every page type (home, state/county/place, agency incl.
  federal, personnel, civil-case, collection sub-pages) uses the same shared
  chrome, tokens, and components matching the approved mockups.
- Ship self-hosted static site search (Pagefind) in the masthead.
- Carry the mockup WCAG 2.1 AA fixes into components and pass
  `npm run audit:a11y` on generated pages.
- Complete the "interaction" → "experience" rename across copy, analytics
  event names, and structured data.
- Zero third-party requests: subset self-hosted icons and fonts.

**Non-Goals:**

- No new routes or slugs, and therefore no redirect work.
- No database schema changes; no automated field-office ingestion (manual data
  acceptable for now).
- No implementation of actions that lack existing routes (e.g., "Claim this
  profile", "Report a data problem" destination) — they remain visible but
  wired only where routes already exist.
- No dark mode; light-mode-first per `DESIGN.md`.
- No changes to the interaction-submission-flow requirements (its spec already
  frames experience-first submission).

## Decisions

1. **Token mapping over parallel vocabulary.** Mockup tokens (`--ink`,
   `--teal`, `--h1`, `--ink-faint@52%`) map onto `--ipc-*` equivalents; new
   role/accent tokens are added to the canonical set where missing. Rationale:
   `DESIGN.md` treats a single vocabulary as part of the trust model.
   Alternative (shipping mockup CSS as-is) rejected — guarantees drift.
2. **Shared Astro components per pattern.** StatStrip (+ drill "Start here"
   cell variant), EntityActionBar (+ `<details>` overflow menu), MastheadSearch,
   Breadcrumb, TableScroll, social-link icons. One component, used everywhere;
   agency (state/local + federal), personnel, and civil-case pages compose the
   same parts. Alternative (page-by-page restyle) rejected — chrome and rename
   are inherently site-wide.
3. **Native `<details>/<summary>` for "More actions".** No JS, works with JS
   disabled, removes per-page scripts. Keyboard focus ring on items via
   `:focus` (menu focus is programmatic-free now, plain links). Alternative
   (WAI-ARIA JS menu) was built first in mockups and replaced — heavier, no-JS
   dead end, inline-script conflict with the no-inline-JS rule.
4. **Pagefind for search.** Post-build static index over generated HTML,
   self-hosted assets, lazy-loaded index chunks; masthead input on every page;
   accessible results (labelled input, announced result counts); no-JS fallback
   links to `/find-records/`. Alternatives rejected: server endpoint (adds
   runtime infra to a static deploy), client JSON index (index size prohibitive
   at 100k+ pages).
5. **Neutral empty metrics with recruiting link.** `--`/`$--` + subtle
   `Help collect this →` → `/volunteer/`; plain-language gloss under unfamiliar
   labels; role-accent bars muted while a metric is empty. Per codified
   `DESIGN.md` rule — no hedging copy. Missing required data still fails
   builds; this rendering applies only to approved-optional metrics.
6. **Drill panel is a metric-cell CTA, not a browse surface.** The "Start
   here" cell (count + jump select + Go + "Browse all →") links to existing
   scoped sub-pages. The spec delta states this boundary explicitly so it
   composes with the landing-page browse-surface prohibition introduced by
   `preview-civic-index-data-experience`.
7. **Self-hosted subset assets.** Bootstrap Icons subset (or standardized
   inline SVG component — site already inlines SVGs); Public Sans WOFF2 subset
   with `font-display: swap`. Zero external requests.
8. **Rename without redirects.** "experience" replaces "interaction" in copy,
   analytics event names, and structured data. URLs are unchanged by decision,
   so no redirect map work; downstream analytics dashboards must track the new
   event names.

## Risks / Trade-offs

- [Pagefind index size/build time on 100k+ pages] → Index at build in CI,
  scope indexing to meaningful content regions (`data-pagefind-body`), and
  measure build-time impact before release; Pagefind chunks the index so
  client cost stays small.
- [Analytics continuity breaks at the event rename] → Coordinate the rename
  with dashboard updates; capture the cutover date in the release notes.
- [Active `preview-civic-index-data-experience` change touches the same spec]
  → Land this change after it; write the `civic-index-pages` delta against
  that baseline; re-validate with `openspec validate --all` before apply.
- [Token remap subtly shifts colors/sizes on pages not covered by mockups] →
  Visual spot-check per page type; `audit:a11y` contrast checks run on real
  generated pages.
- [Font/icon subsetting drops a needed glyph] → Subset from an inventory of
  actually-used glyphs; e2e smoke checks render pages with icons.
- [Uniform rollout is a large single release] → Phase tasks internally
  (tokens → components → templates → search → rename → gates) and keep the
  branch releasable only when all gates pass; no partial visual states ship.

## Migration Plan

1. Land design-token mapping and shared components behind existing templates
   (no visual change yet).
2. Switch page templates (layout chrome first, then per-page-type surfaces) to
   the shared components.
3. Add the Pagefind build step + masthead search UI.
4. Execute the terminology rename (copy, analytics, structured data) in one
   commit.
5. Swap CDN/system assets for self-hosted subsets.
6. Run all gates (`validate`, `build`, `audit`); fix regressions; release.

Rollback: revert the release commit(s); no data or URL migrations exist, so
rollback is a pure redeploy.

## Open Questions

- Destination for "Report a data problem" (form vs. mailto vs. existing help
  route) — wire when a route exists; out of scope otherwise.
- Storage location for manual field-office data (seed file vs. database rows)
  — decide during implementation within existing data rules.
- Public Sans subset ranges/weights — finalize during asset work from a glyph
  inventory.
