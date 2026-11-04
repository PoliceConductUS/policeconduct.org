# Brainstorm — redesign-civic-index-to-production

## Design Summary

Port the finished civic-index redesign (validated as static mockups in
`mockups/civic-index-redesign/`, decisions recorded in
`mockups/civic-index-redesign/PRODUCTION-HANDOFF.md`) into the production Astro
site as shared components, applied uniformly across every affected page type:
home, state/county/place civic index, agency (state/local + federal), personnel,
civil-case, and collection sub-pages.

The design exploration happened across an extended mockup-iteration session:
nine+ mockup versions per page type, a structured design critique, a technical
audit (a11y/perf/responsive/theming), and a 12-point production Q&A with the
site owner. The mockups are the approved visual/UX target; this change is the
engineering port plus one new feature (site search) required for release.

Core elements of the validated design:

- Editorial "public ledger" aesthetic: paper/ink palette, hairline rules,
  tabular figures, role-coded accents (budget/liability/civil), teal =
  interactive, deep red = primary civic action.
- Uniform entity-page chrome: masthead (wordmark + persistent search + Share an
  experience + Volunteer), breadcrumb nav landmark, shared action bar with a
  native `<details>` "More actions" menu, stat strip with a teal "Start here"
  drill-down panel on geography pages.
- Experience reports and civil cases are never mixed in one list; empty metrics
  render neutral `--` plus a subtle `Help collect this →` link to `/volunteer/`
  (no hedging copy) — codified in `DESIGN.md` and `.impeccable.md`.
- WCAG 2.1 AA baseline (also codified): AA contrast including faint/empty
  states, skip link, visible focus, keyboard operability, labelled controls.
- Terminology: "experience", not "interaction", site-wide.

## Alternatives Considered

### Option A: Wholesale stylesheet port

- **Approach**: Ship the mockup CSS (`shared-v5.css`, `entity-actions.css`)
  as-is into the site and point pages at the new classes.
- **Pros**: Fastest path; pixel-identical to the approved mockups.
- **Cons**: Creates a second token vocabulary alongside the canonical `--ipc-*`
  system, violating `DESIGN.md` ("do not copy/paste page-local versions");
  guarantees drift across 100k+ generated pages; duplicates styles the site
  already tokenizes.
- **Why not chosen**: The mockup tokens were always scaffolding. A parallel
  vocabulary is the exact failure mode `DESIGN.md` exists to prevent.

### Option B: Token-mapped shared components (chosen)

- **Approach**: Map mockup tokens onto the canonical `--ipc-*` system, convert
  each bespoke pattern (stat strip, entity action bar, `<details>` menu, drill
  panel, masthead search, breadcrumb, table-scroll) into shared Astro
  components, and roll them out uniformly to all page types.
- **Pros**: One vocabulary, one component per pattern, uniform site; satisfies
  `DESIGN.md` component and no-inline-CSS rules; a11y fixes land once and apply
  everywhere.
- **Cons**: More upfront work than A; requires touching every page template.
- **Why chosen**: It is the only approach consistent with the repo's own
  standards, and uniformity is the stated goal of the redesign.

### Option C: Incremental page-by-page restyle

- **Approach**: Restyle one page type at a time against the mockups without
  extracting shared components first.
- **Pros**: Smaller individual PRs; earliest visible progress.
- **Cons**: Interim state shows two designs at once on a public trust-focused
  site; copy-pasted styles per page violate the shared-component rule; the
  rename and masthead changes are inherently site-wide and cannot ship
  per-page.
- **Why not chosen**: The chrome (masthead/search/footer) and terminology
  changes force a coordinated rollout anyway; phasing lives in the task order,
  not the release.

## Agreed Approach

Option B — token-mapped shared components, shipped as one coordinated release,
with tasks phased internally (tokens → components → page templates → search →
rename → gates). Search is implemented with **Pagefind**: a post-build static
index, fully self-hosted (satisfies the no-third-party-requests rule), loading
small index chunks on demand — built for large static sites; the no-JS fallback
links to the existing `/find-records/` page.

## Key Decisions

1. Map mockup tokens → canonical `--ipc-*`; no parallel vocabulary. The
   WCAG-driven neutral (`--ink-faint` at oklch 52%) and fixed H1 rem sizes land
   on the real tokens.
2. Every repeated pattern becomes a shared Astro component; no page-local
   copies. All styles in external stylesheets (`validate:no-inline-css` gate);
   shared behavior ships as one script, not per-page.
3. "More actions" is a native `<details>/<summary>` disclosure — no JS, works
   with JS disabled.
4. Site search ships with this release, using Pagefind (static, self-hosted).
5. `Help collect this →` and Volunteer link to `/volunteer/`. Empty metrics
   render neutral `--` + that link; no hedging copy anywhere.
6. Experience reports and civil cases are separate sections on every page.
7. Manual field-office data is acceptable for now; mockup placeholder values
   must be replaced with real ones.
8. Self-host all assets: subset Bootstrap Icons (the site already inlines
   SVGs — standardize via component), self-host Public Sans WOFF2. No CDN or
   third-party requests.
9. Carry all mockup WCAG 2.1 AA fixes into components and pass
   `npm run audit:a11y` on real pages.
10. Rename "interaction" → "experience" site-wide (copy, analytics event names,
    structured data). No backward-compatibility work needed.
11. Release gates: `npm run validate`, `npm run build`, `npm run audit` must
    all pass.

## Open Questions

- Final destinations for the remaining placeholder actions: "More actions"
  items (Copy link = clipboard behavior; View sources & methodology →
  `/data-and-methods/`; Report a data problem → destination TBD) and the
  hero/side actions (Suggest edit, Add a civil case, Claim this profile, Get
  updates) — wire to existing routes where they exist; anything without a route
  is explicitly out of scope for this change.
- Where manual field-office data lives (seed file vs. database rows) — decide
  during implementation within existing data rules (no silent fallbacks).
- Public Sans subsetting details (weights/ranges) — decide during asset work.
