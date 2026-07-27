# Redesign Civic Index to Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the approved civic-index redesign (mockups/civic-index-redesign/, PRODUCTION-HANDOFF.md) into shared Astro components applied uniformly site-wide, add self-hosted Pagefind search, and complete the interaction→experience rename — releasable only when all gates pass.

**Architecture:** Map mockup tokens onto the canonical `--ipc-*` system, extract each repeated pattern into a shared component under `src/components/`, switch `SiteLayout.astro` chrome first and page templates second, add Pagefind as a post-build indexing step, then rename terminology in one commit. No new routes, no schema changes, no redirects.

**Tech Stack:** Astro, TypeScript, external CSS with `--ipc-*` tokens, Pagefind (static search), Playwright e2e, existing validation gates (`validate`, `build` with `validate:no-inline-css`, `audit:seo`/`audit:a11y`).

## Global Constraints

- No parallel token vocabulary: every color/size ships as an `--ipc-*` token (DESIGN.md).
- No inline CSS in generated HTML (`npm run validate:no-inline-css` gate); no per-page inline scripts — shared behavior ships once.
- No third-party requests on any page: fonts, icons, styles, scripts, and search assets are self-hosted.
- WCAG 2.1 AA: text contrast ≥4.5:1 (3:1 large/non-text) on every background including hover washes and empty states; visible focus on every control; keyboard operability; accessible names.
- Missing-data copy: neutral `--`/`$--` + subtle `Help collect this →` to `/volunteer/`; the words "not yet collected", "not yet available", "not on this site yet" must not appear.
- Terminology: "experience", never "interaction", in public copy, analytics event names, structured data.
- Records separation: experience reports and civil cases never share a list/section.
- Data rules: entity IDs from explicit database/seed values; no silent fallbacks; missing required data fails builds.
- Reference designs: `mockups/civic-index-redesign/*.html` latest versions; decisions in `PRODUCTION-HANDOFF.md`; delta specs in this change's `specs/`.

---

## File Structure

- Modify: `src/styles/` global stylesheet(s) and the `--ipc-*` token definitions (locate exact file in Task 1 inspection)
  - Owns all tokens; gains role-accent/interactive tokens and the corrected faint-text value.
- Modify: `src/layouts/SiteLayout.astro`
  - Masthead chrome (wordmark, search, actions), skip link, `<main id="main">`, self-hosted font loading.
- Create: `src/components/MastheadSearch.astro`
  - Labelled `role="search"` form; Pagefind UI mount; no-JS action to `/find-records/`.
- Create: `src/components/EntityActionBar.astro`
  - Primary/secondary actions + native `<details>` "More actions" menu.
- Create: `src/components/StatStrip.astro` and `src/components/StatCell.astro`
  - Ledger metric strip; empty-state rendering (neutral value, muted accent, gloss, help-collect link); drill "Start here" variant.
- Create: `src/components/TableScroll.astro`
  - `overflow-x: auto` wrapper for `record-table` surfaces.
- Create: `src/components/SocialLink.astro`
  - Icon social link with accessible name; composes the existing inline-SVG icon approach.
- Create or modify: `src/components/Breadcrumb.astro`
  - `<nav aria-label="Breadcrumb">` + `aria-current="page"` (Task 1 inspection decides create vs modify).
- Modify: `src/components/CivicIndexPage.astro` and the agency/personnel/civil-case page templates under `src/pages/**`
  - Adopt the shared components; split record sections; drill cell on geography pages.
- Modify: `package.json`
  - Pagefind devDependency + post-build indexing in the `build` script.
- Create: `public/fonts/` Public Sans WOFF2 subset + `@font-face` rules in the global stylesheet.
- Modify: `tests/e2e/` — add search e2e spec; update affected page specs.
- Modify: `openspec/changes/redesign-civic-index-to-production/tasks.md` — mark tasks complete as work lands.

---

## Task 1: Token Mapping and Foundations (tasks.md §1)

**Files:**
- Modify: global stylesheet / token file (locate first), `src/layouts/SiteLayout.astro`
- Create: `public/fonts/public-sans-*.woff2`

**Interfaces:**
- Produces: canonical tokens later tasks style against — `--ipc-color-paper`, `--ipc-color-ink`, `--ipc-color-ink-faint`, `--ipc-color-teal`, `--ipc-color-teal-wash`, `--ipc-color-deep-red`, `--ipc-role-budget|liability|civil`, `--ipc-type-h1` (exact names confirmed/extended in Step 2 — reuse existing `--ipc-*` names wherever they exist).

- [ ] **Step 1: Inspect current tokens and styles**

```bash
rg -n --no-heading "\-\-ipc-" src/styles src/layouts src/components | head -50
rg -l "cdn|fonts.googleapis|jsdelivr|unpkg" src public astro.config.mjs
```

Expected: the file that defines `--ipc-*` tokens; any third-party asset references to remove.

- [ ] **Step 2: Map mockup tokens onto canonical tokens**

Build the mapping table from `mockups/civic-index-redesign/shared-v5.css` `:root` → existing/new `--ipc-*` names. Add missing tokens to the canonical token file (role accents, teal trio, paper/ink neutrals). Set the faint neutral to `oklch(52% 0.016 258)` and H1 to `3rem` (desktop) / `2.25rem` (≤560px) on the existing `--ipc-type-h1`. Do not keep any mockup-named token.

- [ ] **Step 3: Verify contrast for every token pair**

Compute WCAG ratios for each text token on paper, paper-raised, and teal-wash (script from the mockup cycle: oklch→sRGB→luminance). Expected: all normal-text pairs ≥4.5:1. Record ratios for the PR.

- [ ] **Step 4: Self-host Public Sans and icons**

Subset Public Sans (weights actually used) to WOFF2 in `public/fonts/`; add `@font-face` with `font-display: swap`. Standardize icons on the existing inline-SVG Bootstrap Icons pattern (as in `SiteLayout.astro`/`RatingBadge.astro`); remove every CDN reference found in Step 1.

- [ ] **Step 5: Build and commit**

```bash
npm run build && rg -l "cdn|googleapis|jsdelivr" dist | wc -l
```

Expected: build passes; 0 files reference third-party hosts.

```bash
git add -A && git commit -m "feat(tokens): map redesign tokens onto --ipc-*, self-host fonts/icons"
```

## Task 2: Shared Chrome Components (tasks.md §2)

**Files:**
- Modify: `src/layouts/SiteLayout.astro`
- Create: `src/components/MastheadSearch.astro`, `src/components/EntityActionBar.astro`, `src/components/SocialLink.astro`; create/modify `src/components/Breadcrumb.astro`
- Create: one shared client script (e.g. `src/scripts/site.ts`) for copy-link + jump enhancement

**Interfaces:**
- Produces: `<EntityActionBar primary={{label, href}} actions={[{label, href}]} more={[{label, href}]} />`; `<Breadcrumb items={[{label, href?}]} />` (last item current); `<SocialLink platform="youtube" href entityName />`; `<TableScroll>` slot wrapper.
- Consumes: Task 1 tokens.

- [ ] **Step 1: Rebuild the masthead in `SiteLayout.astro`**

Wordmark → home; `<MastheadSearch />`; `Share an experience` (deep-red primary) → the existing report/submission route; `Volunteer` ghost action → `/volunteer/`. Remove "Find an agency". Add the skip link as first focusable element targeting `<main id="main">`; ensure the layout wraps content in that landmark. Match `mockups/civic-index-redesign/texas-v9.html` masthead structure.

- [ ] **Step 2: EntityActionBar with native `<details>` menu**

Port the mockup pattern (`agency-entity-v8.html` + `entity-actions.css`): `<details class="entity-menu"><summary class="entity-action entity-menu-toggle">More actions…</summary><ul class="entity-menu-list">…</ul></details>`. Marker hidden, chevron rotates via `.entity-menu[open]`, items get a visible `:focus` ring (2px teal, inset). Menu items: Copy link (`data-copy-link` handled by the shared script, `navigator.clipboard` with a select-fallback) and View sources & methodology → `/data-and-methods/`. No inline scripts.

- [ ] **Step 3: Breadcrumb and SocialLink components**

Breadcrumb renders `<nav aria-label="Breadcrumb"><ol>…</ol></nav>` with `aria-current="page"` on the last crumb. SocialLink renders the platform's inline-SVG icon, `aria-hidden` glyph, `aria-label="{entityName} on {Platform}"`, brand tint on hover/focus.

- [ ] **Step 4: Grouped contact identity**

In the agency entity hero, render the contact person's name and linked email as one visual group (single row/definition pair); phone and social links must not sit between them. Update the hero template accordingly.

- [ ] **Step 5: Validate and commit**

```bash
npm run validate:types && npm run build && npm run validate:no-inline-css
```

Expected: pass; generated pages show the new chrome.

```bash
git add -A && git commit -m "feat(chrome): shared masthead, skip link, action bar, breadcrumb, social links"
```

## Task 3: Entity and Geography Surfaces (tasks.md §3)

**Files:**
- Create: `src/components/StatStrip.astro`, `src/components/StatCell.astro`, `src/components/TableScroll.astro`
- Modify: `src/components/CivicIndexPage.astro`; agency template(s) under `src/pages/[category]/**` and `src/pages/federal/**`; personnel and civil-case templates

**Interfaces:**
- Produces: `<StatCell value label meta? href? role? empty? gloss? helpCollectHref?>`; drill variant `<StatCell drill childCount childLabel jumpOptions browseHref>`.
- Consumes: Task 1 tokens, Task 2 components.

- [ ] **Step 1: StatStrip/StatCell with empty-state rendering**

Empty cells render `--` (or `$--` for currency), muted role accent (`.is-pending[data-role]::before { background: var(--ipc-color-rule) }`), optional gloss line, and `Help collect this →` linking to `/volunteer/?source={pagePath}&scope={scopeType}&{entityParam}` (query context per the spec delta).

- [ ] **Step 2: Drill "Start here" cell on geography pages**

First-cell variant with teal wash, "Start here" eyebrow, child count, `<form>` jump select + Go submitting to the selected child path (works no-JS), and "Browse all →" to the scoped child sub-page. Apply to state, administrative-area, and place landing templates. Reference `texas-v9.html` stat strip.

- [ ] **Step 3: Split record sections everywhere**

Agency (state/local + federal), and any surface listing records: "Recent experience reports" (public accounts) and "Recent civil cases" (court records) as separate sections. Grep for combined surfaces:

```bash
rg -in "reports and civil" src | grep -v mockups
```

Expected after: no combined headings remain.

- [ ] **Step 4: Federal field offices + TableScroll**

Federal agency template renders the "Field offices" `record-table` inside `<TableScroll>`, fed by explicit seed/database values (replace all mockup placeholder names/counts; no silent fallbacks — missing required values fail the build). Wrap all wide record-tables site-wide in `<TableScroll>`; add `scope="col"` to column headers.

- [ ] **Step 5: Validate and commit**

```bash
npm run validate && npm run build
```

Expected: pass, including e2e.

```bash
git add -A && git commit -m "feat(surfaces): shared stat strip, drill cell, split records, field offices"
```

## Task 4: Pagefind Search (tasks.md §4)

**Files:**
- Modify: `package.json` (devDependency `pagefind`; build script), `src/components/MastheadSearch.astro`, `src/layouts/SiteLayout.astro` (indexing attributes)
- Create: `tests/e2e/site-search.spec.ts`

**Interfaces:**
- Consumes: `<MastheadSearch />` shell from Task 2.
- Produces: `/pagefind/` assets in `dist`; search UI on every page.

- [ ] **Step 1: Add the indexing step**

```bash
npm i -D pagefind
```

Append to the `build` script after `astro build`: `npx pagefind --site dist`. Mark indexable regions with `data-pagefind-body` on main content; exclude chrome with `data-pagefind-ignore` on masthead/breadcrumb/action elements.

- [ ] **Step 2: Wire the masthead UI**

Load Pagefind's JS from the self-hosted `/pagefind/` output inside `MastheadSearch.astro`; labelled input; results list with titles/paths; `aria-live="polite"` result count; keyboard operable. Form `action="/find-records/"` as the no-JS fallback.

- [ ] **Step 3: e2e test**

`tests/e2e/site-search.spec.ts`: from a generated agency page, type a known agency name → a result appears → activating it navigates to that agency page. Second test with JS disabled: submitting the form lands on `/find-records/`.

```bash
npm run test:e2e -- site-search
```

Expected: PASS.

- [ ] **Step 4: Measure and commit**

Record `pagefind` runtime from the build log and index size (`du -sh dist/pagefind`) for the PR.

```bash
git add -A && git commit -m "feat(search): self-hosted Pagefind index and masthead search"
```

## Task 5: Terminology Rename (tasks.md §5)

**Files:**
- Modify: templates/components/content with "interaction" wording; analytics event definitions; structured-data builders

- [ ] **Step 1: Inventory**

```bash
rg -in "interaction" src content public --glob '!mockups/**' | grep -iv "interaction-submission-flow"
```

Expected: full list of copy, event names, structured-data fields to rename (route/slug hits require a stop-and-confirm — none expected).

- [ ] **Step 2: Rename and verify output**

Apply "experience" wording in one commit. Then:

```bash
npm run build && rg -il "interaction" dist | wc -l
```

Expected: 0 public-output files (allowing legal/quoted text explicitly reviewed). List old→new analytics event names in the PR description.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(copy): rename interaction to experience site-wide"
```

## Task 6: Gates and Release (tasks.md §6)

- [ ] **Step 1: Full gate run**

```bash
npm run validate
npm run build
npm run audit
```

Expected: all pass — format, lint, `astro check`, schema, openspec, e2e; `validate:no-inline-css`; `audit:seo` + `audit:a11y` with zero violations. Fix and re-run until clean.

- [ ] **Step 2: Manual verification pass**

Keyboard-only: skip link → search → details menu (focus ring visible) → drill jump (no-JS submission). Mobile width (~360px): table scrolling, metric band stacking, masthead wrap. Spot-check each page type renders the uniform chrome.

- [ ] **Step 3: OpenSpec closure**

```bash
npx openspec validate --all
```

Expected: pass (after `preview-civic-index-data-experience` archives, deltas apply cleanly). Mark all boxes in this change's `tasks.md`.

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore(release): civic-index redesign gates green"
```
