## Design Summary

Update Civic Index landing pages so they preview the future data product around fixed visitor-intent bands. The pages should help residents, journalists, researchers, organizers, defense attorneys, funders, and grant reviewers understand what the jurisdiction page will eventually show as more source records are collected.

The page structure should move away from implementation categories such as "graphs," "metrics," and "datasets." Top metric cards should remain as the primary page orientation surface. Below that, the page should organize metrics, graphs, existing detail links, and browse CTAs to scoped sub-pages under seven visitor-intent bands:

- What brings police into contact with people here?
- Do policing contacts, fines, charges, searches, force, and outcomes disproportionately affect certain groups compared with the general population?
- What does policing cost the public?
- What happens after complaints, discipline, force, lawsuits, or credibility concerns?
- What records may affect officer credibility, search validity, force justification, or impeachment?
- Are policies, safeguards, and accountability systems producing better outcomes?
- Where are outcomes improving, and who appears to be getting better results?

Graphs remain central to the experience, but they should appear inside the relevant visitor-intent bands rather than under a generic "Graphs" heading. Charts should include enough title, band summary, caption, scope, denominator, grouping, comparison, or time-window context to make the future measurement intent clear without explaining every chart. Top metric cards should generally include "View details" when an applicable scoped detail sub-page exists and a default CTA to an existing child, region, place, agency, or related scoped browse sub-page where useful. If data is unavailable, the landing page should still show the intended measurement surface without defensive missing-data copy. Civic Index landing pages must not render collection CTAs.

The design must keep Civic Index landing pages focused on overview and preview behavior. It must not add child entity lists, maps, browse tables, direct drill-down sections, "Top 5 things to know," or standalone "Who is most affected" editorial sections. Landing pages may link to scoped browse sub-pages through metric CTAs, but child lists, maps, browse tables, and direct drill-down surfaces may exist only on scoped sub-pages, if they exist at all.

## Alternatives Considered

### Approach A: Visitor-intent data preview

- **Approach**: Keep top metric cards, then organize the page into seven visitor-intent bands. Put metric cards, graph previews, existing detail links, and scoped browse CTAs inside each visitor-intent band.
- **Pros**:
  - Matches the attached prompt directly.
  - Keeps graphs visible without creating a generic graph bucket.
  - Helps different visitor types scan for the question they care about.
  - Supports future data without implying current findings.
- **Cons**:
  - Requires a larger content catalog than the existing Civic Index overview.
  - Needs careful level filtering so state, county, place, agency, and personnel pages do not show wrong-scope metrics or top-level summaries that could mislead users about what the data directly supports.
- **Why chosen**: This is the smallest design that satisfies the requested user outcome and the hard constraints.

### Approach B: Metric-family dashboard

- **Approach**: Keep the current metric-catalog model but expand each metric family with graph previews.
- **Pros**:
  - Easier to map to existing implementation concepts.
  - Lower risk of very long pages.
- **Cons**:
  - Keeps the page organized around implementation categories.
  - Leaves graphs and future-data surfaces without enough surrounding context to make the intended civic measurement clear.
  - Makes visitors translate metric families into their own questions before they can understand whether the page is relevant to them.
- **Why not chosen**: It asks the visitor to do too much interpretive work. The chosen visitor-intent structure starts with what the visitor is trying to understand, then uses metrics and graphs as supporting evidence.

### Approach C: Detail-first browse hub

- **Approach**: Treat landing pages as browse hubs by centering child entity lists, maps, tables, and drill-down sections alongside the new data previews.
- **Pros**:
  - Could reuse existing browse-oriented page patterns.
  - Would make child navigation highly visible.
- **Cons**:
  - Moves the page in the opposite direction from the requested experience.
  - Pulls attention away from the civic questions the page is supposed to preview.
  - Violates the hard constraint against child entity lists, maps, browse tables, and direct drill-down sections on landing pages.
  - Would expand scope beyond the Civic Index page UI.
- **Why not chosen**: This is the rejected anti-pattern. Civic Index landing pages should preview visitor-intent civic measurements, not become child-entity browse pages.

## Agreed Approach

Use Approach A: visitor-intent data preview.

The Civic Index landing page should become a structured preview of the future records experience. It should keep the top metrics, then use seven fixed visitor-intent bands to show the intended metrics and graph previews with visible context where needed. Top metric cards should include "View details" links when applicable and default CTAs to existing scoped browse sub-pages where useful. No new sub-pages are created for this change.

Level rules are part of the design. Personnel records and officer-level complaint, force, discipline, credibility, and positive-conduct indicators appear only at the agency and personnel detail levels. State, county, and place landing pages must not show personnel records as top-level metrics.

Positive indicators must be framed as evidence-backed comparative signals. They must state the comparison group or time period, the affected group, the metric, whether improvement is sustained, whether another outcome worsened, and any known related policy, practice, workflow, or supervision change. They must not be unsupported praise, rankings, or endorsements.

## Key Decisions

- Keep all implementation work scoped to Civic Index landing-page UI; do not create new sub-pages, routes, data contracts, migrations, or seed data unless a later approval expands scope.
- Do not update implementation tests until the revised pages are approved; this OpenSpec change only prepares the specification and plan.
- Keep graphs on the landing pages and place them under user-visitor-intent bands.
- Do not add child entity lists, maps, browse tables, direct drill-down sections, "Top 5 things to know," or standalone "Who is most affected" sections to landing pages; those browse surfaces belong only on scoped sub-pages if they exist at all.
- Avoid hedging or defensive missing-data copy. Present the intended data product directly.
- Show missing data as an opportunity to help collect records through small non-primary CTAs.
- Give every visible metric card a distinct icon within the same page.
- Make metric and graph scope, denominator, grouping, comparison, source-basis, or time-window context visible where needed to avoid ambiguity.
- Include "View details" only when an applicable scoped detail sub-page already exists.
- Give top metric cards default CTAs to existing child, region, place, agency, or related scoped browse sub-pages where useful.
- Keep state top-level metrics limited to county count, report count, budget, civil cases, liability costs, and decertification law context.
- Keep agency-level-only metrics, including personnel records and officer-level indicators, out of state, county, and place top-level metric sets.

## Open Questions

- Implementation must confirm existing detail routes before adding any "View details" links; this change must not create new sub-pages.
- The implementation should inspect the current icon set and choose distinct non-duplicative icons from what is already available.
