# Preview Civic Index Data Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Civic Index landing pages so they preview the future data experience through visitor-visitor-intent bands with scoped metrics, graph previews, existing detail links, and collection actions.

**Architecture:** Keep the existing route ownership and database-backed path loading. Refactor the shared Civic Index presentation model in `src/lib/data/civic-index.ts` and rendering in `src/components/CivicIndexPage.astro` so landing pages render visitor-intent bands instead of browse-oriented or generic dashboard sections.

**Tech Stack:** Astro, TypeScript, existing local data loaders, OpenSpec, and Playwright e2e tests only after page approval.

---

## File Structure

- Modify: `src/lib/data/civic-index.ts`
  - Owns the Civic Index model types, question-group catalog, level filtering, detail-link destinations, graph-preview definitions, and icon assignments.
- Modify: `src/components/CivicIndexPage.astro`
  - Renders the visitor-intent landing-page UI, scoped metric cards, graph previews, existing "View details" links, scoped collection CTAs, and neutral empty measurement surfaces.
- Modify: agency landing route/component if inspection shows agency pages do not use `CivicIndexPage`
  - Keeps agency-level Civic Index landing pages aligned with the approved visitor-intent pattern without creating new routes.
- Modify: `src/lib/metric-vocabulary.ts`
  - Adds any missing metric labels or icon visual entries using the existing icon vocabulary only.
- Modify: `src/components/MetricCard.astro` or `src/components/metric-card-types.ts` only if the current metric card type cannot expose stable icon metadata for tests or rendering.
- Modify: `tests/e2e/civic-index.spec.ts`
  - Update only after page approval; tests should cover the approved visitor-intent preview behavior.
- Modify: `openspec/changes/preview-civic-index-data-experience/tasks.md`
  - Mark tasks complete as implementation proceeds.

---

## Task 1: Data Model and Content Catalog

**Files:**
- Modify: `src/lib/data/civic-index.ts`
- Modify: `src/lib/metric-vocabulary.ts`
- Modify: `openspec/changes/preview-civic-index-data-experience/tasks.md`

- [ ] **Step 1: Inspect current fields and detail routes**

Run:

```bash
rg -n "thingsToKnow|trendPanels|dataPanels|chartCards|Top 5|Trends over time|Explore within|View details|metricVisuals|CivicIndexPage|agencyMetrics" src/lib/data/civic-index.ts src/components/CivicIndexPage.astro src/lib/metric-vocabulary.ts 'src/pages/[category]' tests/e2e/civic-index.spec.ts
```

Expected: identify all current fields and UI/test references that must be replaced, and identify whether the agency landing page uses `CivicIndexPage` or a separate implementation path.

- [ ] **Step 2: Define the question-group types**

In `src/lib/data/civic-index.ts`, replace the generic guidance/trend/data panel types with these focused types:

```ts
export type CivicIndexScope =
  | "state"
  | "administrative_area"
  | "place"
  | "agency";

export type CivicIndexPreviewMetric = {
  detail: string;
  detailHref?: string;
  icon: import("../metric-vocabulary.js").MetricIcon;
  label: string;
  scope: string;
  value: string;
  window?: string;
};

export type CivicIndexGraphPreview = {
  caption?: string;
  detailHref?: string;
  label: string;
  metadata?: string[];
  scope: string;
  seriesLabel: string;
  window?: string;
};

export type CivicIndexVisitorIntentBand = {
  graphs: CivicIndexGraphPreview[];
  metrics: CivicIndexPreviewMetric[];
  summary?: string;
  title: string;
};
```

Then update `CivicIndexModel` so it contains visitor-intent bands while preserving any fields still required by scoped subpage components.

- [ ] **Step 3: Add the visitor-intent band catalog**

In `src/lib/data/civic-index.ts`, add a helper with the seven fixed visitor-intent bands from the spec. Exact heading text can be tuned during page approval; do not hard-code long question strings as the only approved labels.

```ts
const visitorIntentBands = {
  contacts: "Police contact and enforcement activity",
  disparateImpact: "Disparate impact and community outcomes",
  publicCost: "Public cost and litigation",
  accountability:
    "Complaints, discipline, force, lawsuits, and accountability outcomes",
  credibility:
    "Officer credibility, search validity, force justification, and impeachment records",
  safeguards: "Policy safeguards and accountability systems",
  betterOutcomes: "Better outcomes and positive-deviance signals",
} as const;
```

- [ ] **Step 4: Build level-aware visitor-intent bands**

Add `buildVisitorIntentBands(modelInput)` in `src/lib/data/civic-index.ts` near the other model helpers. Use existing count values, neutral `$--` placeholders, existing scoped detail routes such as `reports`, `budget`, `civil-cases`, and `liability-costs`, and default top-metric browse CTAs to existing child/region/place/agency or related scoped subpages. Do not create new sub-pages or routes for this change.

Keep state metrics limited to county count, report count, budget, civil cases, liability costs, and decertification law context. For state, administrative-area, and place models, do not include a `Personnel records` metric or officer-level indicators.

- [ ] **Step 4a: Confirm agency landing integration path**

If agency landing pages use `src/components/CivicIndexPage.astro`, document that in `tasks.md` and keep implementation in the shared component/model. If agency landing pages use a separate route or component, identify the exact file path and include it in Task 2 without creating new routes.

- [ ] **Step 5: Ensure visible icons are unique per page**

Assign icons in `buildVisitorIntentBands` from the existing `MetricIcon` values so the visible metric cards on one page do not duplicate icons. Reuse the closest non-duplicative icon rather than adding a new icon dependency.

- [ ] **Step 6: Typecheck the model change**

Run:

```bash
npm run astro -- check
```

Expected now: failures may point to `CivicIndexPage.astro` still reading removed fields. Use those errors to drive Task 2.

- [ ] **Step 7: Mark Task 1 complete and commit**

Update `openspec/changes/preview-civic-index-data-experience/tasks.md` for completed Task 1 items, then commit:

```bash
git add src/lib/data/civic-index.ts src/lib/metric-vocabulary.ts openspec/changes/preview-civic-index-data-experience/tasks.md
git commit -m "feat: define civic index visitor-intent bands"
```

---

## Task 2: Civic Index Page Rendering

**Files:**
- Modify: `src/components/CivicIndexPage.astro`
- Modify: agency landing route/component identified in Task 1, only if it is separate from `CivicIndexPage`
- Modify: `src/components/MetricCard.astro` or `src/components/metric-card-types.ts` only if needed
- Modify: `openspec/changes/preview-civic-index-data-experience/tasks.md`

- [ ] **Step 1: Remove old landing sections**

In `src/components/CivicIndexPage.astro`, remove rendering that depends on `model.thingsToKnow`, `model.trendPanels`, `model.dataPanels`, `chartCards`, maps, child entity lists, browse tables, direct drill-down blocks, and browse-style "Explore within" landing sections.

- [ ] **Step 2: Render visitor-intent bands**

Add a loop over the model's visitor-intent bands. Each section should render the band title as a semantic heading using the existing heading tokens/classes and should render metric previews and graph previews inside that section.

- [ ] **Step 2a: Align agency landing page if needed**

If Task 1 found a separate agency landing component or route, update that landing page to use the same visitor-intent preview rules, existing detail links and scoped browse CTAs only, no embedded browse surfaces, no new routes, and agency-level metric eligibility.

- [ ] **Step 3: Render metric previews**

For each `CivicIndexPreviewMetric`, render:

- label
- value
- detail text
- visible scope
- visible time window when `window` exists
- "View details" link when `detailHref` exists
- default scoped browse CTA when a useful existing subpage exists

Do not render numeric zero for absent source data unless the model explicitly gives `"0"`.

- [ ] **Step 4: Render graph previews**

For each `CivicIndexGraphPreview`, render a neutral graph-preview surface inside the same visitor-intent band. Include label, series label, scope, visible time window where needed, optional caption/metadata, and a "View details" link when `detailHref` exists. Do not require every graph to include a "how to read this" explanation.

Do not add a generic "Graphs" heading.

- [ ] **Step 5: Remove prohibited copy**

Search changed UI files:

```bash
rg -n "Top 5 things to know|Who is most affected|Graphs|Metrics|Datasets|will appear when verified|not collected yet|source needed|Explore within|child entity|browse table|drill-down|drilldown" src/components/CivicIndexPage.astro src/lib/data/civic-index.ts
```

Expected: no matches for prohibited Civic Index landing-page copy.

- [ ] **Step 6: Typecheck rendering**

Run:

```bash
npm run astro -- check
```

Expected: PASS, or only unrelated pre-existing failures that must be documented before proceeding.

- [ ] **Step 7: Mark Task 2 complete and commit**

Update `tasks.md`, then commit:

```bash
git add src/components/CivicIndexPage.astro src/components/MetricCard.astro src/components/metric-card-types.ts openspec/changes/preview-civic-index-data-experience/tasks.md
git commit -m "feat: render civic index question previews"
```

---

## Task 3: Copy, Scope, and Neutrality

**Files:**
- Modify: `src/lib/data/civic-index.ts`
- Modify: `src/components/CivicIndexPage.astro`
- Modify: `openspec/changes/preview-civic-index-data-experience/tasks.md`

- [ ] **Step 1: Add scope text to every preview item**

Audit every metric and graph preview object in `src/lib/data/civic-index.ts`. Ensure each object has `scope` text that names the current jurisdiction or agency/personnel scope without using implementation labels.

- [ ] **Step 2: Add time windows for over-time previews**

For every graph or metric label containing "over time", "rate", "trend", "current 12 months", "previous 12 months", or comparison language, set `window: "Previous 12 months"` unless the object states a different explicit range.

- [ ] **Step 3: Add comparative positive-indicator text**

For better-outcome preview items, include comparison detail such as "Compared with available peer median" or "Current 12 months compared with previous 12 months" only when the preview is framed as a comparison. Keep copy descriptive and avoid praise or endorsements.

- [ ] **Step 4: Add landing-page collection CTAs**

For absent source data, render a small non-primary "Help collect this data" action that preserves current scope and dataset context. Do not create a new sub-page to host that CTA.

- [ ] **Step 5: Re-run prohibited-copy search**

Run:

```bash
rg -n "Top 5 things to know|Who is most affected|Graphs|Metrics|Datasets|will appear when verified|not collected yet|source needed|best|safe|accountable|improved because" src/components/CivicIndexPage.astro src/lib/data/civic-index.ts tests/e2e/civic-index.spec.ts
```

Expected: no user-visible prohibited Civic Index landing-page copy. Investigate any positive-language match and keep only neutral, evidence-backed wording.

- [ ] **Step 6: Mark Task 3 complete and commit**

Update `tasks.md`, then commit:

```bash
git add src/lib/data/civic-index.ts src/components/CivicIndexPage.astro openspec/changes/preview-civic-index-data-experience/tasks.md
git commit -m "feat: scope civic index preview copy"
```

---

## Task 4: Tests and Verification

**Files:**
- Modify: `tests/e2e/civic-index.spec.ts`
- Modify: `openspec/changes/preview-civic-index-data-experience/tasks.md`

- [ ] **Step 1: Wait for page approval**

Run or preview the revised Civic Index landing pages and present the state, administrative-area, place, and agency landing-page behavior for approval. Do not update implementation tests until the revised pages are approved.

- [ ] **Step 2: Update state-page assertions after approval**

In `tests/e2e/civic-index.spec.ts`, replace assertions expecting "Top 5 things to know", "Trends over time", "Explore within Texas", maps, child entity lists, browse tables, direct drill-down blocks, and child-table browse headings with assertions for the seven visitor-intent bands and absence of prohibited landing-page browse surfaces.

- [ ] **Step 3: Add level-filter assertions after approval**

Add assertions that `/tx/`, `/tx/dallas-county/`, and `/tx/dallas-county/irving/` do not show `Personnel records` or officer-level credibility indicators as top-level metric cards.

- [ ] **Step 4: Add graph-preview assertions after approval**

Assert that at least one graph preview appears inside a visitor-intent band with enough visible context to make the future measurement intent clear, and assert the page does not render a generic heading named `Graphs`.

- [ ] **Step 5: Add icon uniqueness assertion after approval**

If metric icons are exposed with a stable class or data attribute, assert visible metric-card icon identifiers are unique on the page. If not, add a minimal `data-metric-icon` attribute to the metric preview markup and assert uniqueness from that attribute.

- [ ] **Step 6: Run focused e2e test after approval**

Run:

```bash
npm run test:e2e -- tests/e2e/civic-index.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run OpenSpec validation**

Run:

```bash
npx openspec validate --changes preview-civic-index-data-experience
npx openspec status --change preview-civic-index-data-experience
```

Expected: validation passes and OpenSpec shows apply progress accurately.

- [ ] **Step 8: Run full validation gate**

Run:

```bash
npm run validate
```

Expected: PASS before claiming implementation complete.

- [ ] **Step 9: Mark Task 4 complete and commit**

Update `tasks.md`, then commit:

```bash
git add tests/e2e/civic-index.spec.ts openspec/changes/preview-civic-index-data-experience/tasks.md
git commit -m "test: cover civic index question previews"
```

---

## Self-Review

- Spec coverage: The plan covers visitor-intent sections, graph previews, catalog mapping, icon uniqueness, positive framing, modified level-specific catalog rules, scope/time-window neutrality, availability behavior, and prohibited copy.
- Placeholder scan: No implementation step uses unresolved placeholders; route and icon details are intentionally inspected before implementation because the plan must use existing approved routes and icon vocabulary.
- Type consistency: New model names are `CivicIndexPreviewMetric`, `CivicIndexGraphPreview`, and `CivicIndexQuestionGroup`; later rendering and tests refer to those names consistently.
