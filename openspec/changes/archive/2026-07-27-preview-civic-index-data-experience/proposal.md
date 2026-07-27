## Why

Civic Index pages should show what residents, journalists, researchers, organizers, defense attorneys, funders, and grant reviewers will be able to understand as more records are collected. The current pattern needs stronger visitor-intent structure so future metrics and graphs read as a clear data-product roadmap, not implementation categories.

## What Changes

**Visitor-intent page structure**

- From: Civic Index landing pages present indicator categories and availability states without a required user-question information architecture.
- To: Civic Index landing pages keep the top metric cards and group metric and graph previews under seven fixed visitor-intent bands about police contact, disparate impact, public cost, complaints and discipline, officer credibility, policy safeguards, and better outcomes. The exact headings are not prescribed.
- Reason: Visitors and funders should be able to scan the intended future data experience even before all source data exists.
- Impact: User-visible page structure change; no route compatibility break intended.

**Graph previews**

- From: Graphs may be present as indicator surfaces, but the spec does not require them to be embedded inside visitor-intent bands.
- To: Graphs remain central and appear inside the relevant visitor-intent bands, with no generic "Graphs" heading. Chart titles, band headings, nearby summaries, or captions provide enough context to make the future measurement intent clear; the spec does not require every chart to explain how to read it.
- Reason: Graphs should communicate the intended data product without turning the landing page into a dense dashboard manual.
- Impact: User-visible content and layout change.

**Metric scope, time windows, details, and browse CTAs**

- From: Existing requirements cover scope and availability states, including "not collected yet" labels.
- To: Metrics and graphs provide scope, denominator, grouping, comparison, source-basis, or time-window context when needed to avoid ambiguity; top metric cards include "View details" when an applicable scoped detail sub-page already exists; top metric cards may also include a default CTA to an existing child/region/place/agency or related scoped browse subpage; missing data uses muted sample charts or neutral values without defensive missing-data copy or collection CTAs on landing pages.
- Reason: The page should preview the intended data product directly while preserving neutral, evidence-backed interpretation.
- Impact: User-visible copy and component behavior change.

**Level-appropriate personnel and positive indicators**

- From: The existing catalog says personnel metrics appear only on agency pages unless separately approved.
- To: The page structure explicitly keeps personnel records and officer-level complaint, force, discipline, credibility, and positive-conduct indicators at agency/personnel scope, not state, county, or place top-level metrics. Positive indicators must show "better than what" comparison context where possible.
- Reason: Personnel-level signals can be misleading when shown as top-level geography metrics, and positive-deviance signals require evidence-backed comparative framing.
- Impact: User-visible metric filtering and framing requirements; no data contract break intended.

**Landing-page browse surface prohibition**

- From: Civic Index requirements keep browse surfaces on subpages, but this change needs the prohibition stated directly for the new preview layout.
- To: Civic Index landing pages must not render child entity lists, maps, browse tables, or direct drill-down sections alongside data previews. Landing pages may link to those existing scoped sub-pages through metric-card CTAs or text links, but the browse surfaces themselves may exist only on scoped sub-pages, if they exist at all.
- Reason: Landing pages should preview visitor-intent civic measurements, not become child-entity browse pages.
- Impact: User-visible landing-page layout constraint; scoped sub-pages remain the destination for browse surfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `civic-index-pages`: Modify Civic Index landing-page requirements to organize future-data previews by seven visitor-intent bands, preserve top metrics and graphs, prohibit landing-page browse surfaces, strengthen contextual/detail-link rules, and add evidence-backed framing for positive indicators.

## Impact

- Affects Civic Index landing page UI and shared Civic Index presentation components.
- Affects state, administrative-area/county, place, and agency-level Civic Index rendering rules.
- Does not create new scoped sub-pages or routes.
- Does not intentionally change database-backed routes, slugs, entity IDs, seed data, migrations, or downstream data contracts.
- Does not intentionally add new dependencies or external network calls.
- Positive-deviance and public-trust claims must remain evidence-backed, scoped, comparative, and non-endorsement language.
