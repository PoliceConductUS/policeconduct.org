## Context

Civic Index pages already have a shared specification for neutral jurisdiction landing pages, metric availability states, detail links, scoped volunteer actions on detail surfaces, and database-backed route identity. This change refines that pattern so the landing page previews the intended future data experience around fixed visitor-intent bands rather than implementation categories.

The attached prompt is constrained: keep the top metric cards, keep graphs, do not group content under a generic "Graphs" heading, do not add child entity lists, maps, browse tables, direct drill-down sections, "Top 5 things to know," or standalone "Who is most affected" editorial content to landing pages. Child lists, maps, browse tables, collection CTAs, and drill-down browse surfaces may exist only on scoped sub-pages or the volunteer flow, if they exist at all. The prompt also asks to avoid defensive missing-data copy.

## Goals / Non-Goals

**Goals:**

- Organize Civic Index page content into seven fixed visitor-intent bands that match real resident, researcher, organizer, journalist, defense attorney, funder, and grant-reviewer needs.
- Keep top metric cards as the primary page orientation surface.
- Keep graph previews central to the page and place them in the relevant visitor-intent bands.
- Make metric and graph intent clear enough to show the future data product before all source data is present.
- Make metric and graph scope, denominator, grouping, comparison, source-basis, or time-window context visible where needed to avoid ambiguity or unsupported interpretation.
- Do not repeat the current state, area, place, agency, or personnel name as metric or graph pills/tags. When scope is already clear from the page title or band context, do not render a separate scope label.
- Include "View details" only when an applicable scoped detail sub-page already exists.
- Include default top-metric CTAs to existing child, region, place, agency, or related scoped browse sub-pages where useful.
- Do not include collection CTAs on Civic Index landing pages.
- Do not render a right-side in-page section navigation rail on Civic Index landing pages.
- Keep visible metric icons distinct within the same page.
- Keep personnel records and officer-level indicators at agency/personnel scope only.
- Frame positive indicators as evidence-backed comparative signals, not praise or endorsement.

**Non-Goals:**

- Do not implement the UI in this proposal step.
- Do not add or change specs or tests outside this OpenSpec change.
- Do not add child entity lists, maps, browse tables, direct drill-down sections, or explore-child sections to Civic Index landing pages; those surfaces belong only on scoped sub-pages if they exist at all.
- Do not create new sub-pages or routes.
- Do not update implementation tests until the revised pages are approved.
- Do not create migrations, seed data, or data contracts unless separately approved.
- Do not preserve old page structure for backward compatibility if it conflicts with the new approved page behavior.

## Decisions

### Use a fixed visitor-intent band content model

Represent the landing page as ordered visitor-intent bands. Each band should have a concise label or short question-like heading, a scoped set of metric previews, graph previews, and detail links. The seven bands are fixed for this change so the page can communicate future intent for release, grants, and funding; exact heading text remains a design choice and should not be treated as a spec requirement.

The bands are:

1. Positive-deviance
2. Police contact and enforcement activity
3. Disparate impact and community outcomes
4. Public cost and litigation
5. Complaints, discipline, force, lawsuits, and accountability outcomes
6. Officer credibility, search validity, force justification, and impeachment records
7. Policy safeguards and accountability systems

### Use graph placeholders as first-class previews

Graph previews should be treated as part of the intended data product even when data is not available. The page should provide enough context through band labels, section summaries, chart titles, captions, or compact metadata for visitors and funders to understand what will be measured. The spec does not require every chart to include a "how to read this" explanation.

Charts and metric cards should show a visible time period near the label, value, caption, or card detail unless the item is a structural count, current status, or source/report-date context. Charts should also show scope, denominator, grouping, comparison, or source basis when that context is needed to avoid ambiguity. Scope context should come from the page title, band heading, label, detail text, or caption rather than a repeated jurisdiction-name pill or tag. "View details" should appear only when an applicable scoped detail sub-page already exists.

When reports are already represented by the top Reports metric, the contacts band should not render another reports metric card. It may keep one compact reports graph labeled "Reports" or "Reports by month" when the chart shows monthly report counts.

When a metric, graph, report-card item, policy item, or source-backed summary has a known update date, use the same public label everywhere: `Updated {date}`. Place it near the related item. If an update date does not exist, omit the update-date field entirely; do not show `--`, "pending", "unknown", "not available", or another placeholder for update metadata.

Empty graph surfaces may render as muted or disabled sample charts with explicit time window where relevant and neutral empty values such as `--`. Copy should present the measurement directly and avoid phrases such as "future source-record surface," "measurement preview," "will appear when verified," or "not collected yet." Do not show collection CTAs on Civic Index landing pages.

### Keep the landing page full-width

Civic Index landing pages should render the visitor-intent bands in a single content column below the top metrics. Do not add or keep a right-side "On this page" navigation rail, sticky in-page navigation, or separate page-section menu on Civic Index landing pages.

### Keep detail and browse actions scoped

Landing-page top metric cards should show "View details" when an applicable scoped detail sub-page already exists. Most top metric cards should also have a useful default CTA to an existing scoped browse sub-page, such as counties on a state page, places on an administrative-area page, agencies on a place page, or personnel/reports/civil cases on an agency page. These CTAs are links out to scoped sub-pages; they must not render child lists, maps, browse tables, row-level links, search, sorting, or pagination on the landing page itself.

Graph previews should show "View details" only when an applicable scoped detail sub-page already exists. Civic Index landing pages must not show collection CTAs or record-needed labels. When collection exists on scoped detail pages or in the volunteer flow, links must pass enough query context for the volunteer page to prefill the related geography, agency, or personnel record, including the source page path and the applicable scope type.

Budget and overtime should not be combined into one graph unless the graph is explicitly comparing them for a clear reason. Treat budget as its own metric. Treat overtime as its own metric when shown. Civil-case summary cards may show both cases filed in the selected time window and total cases found. Outcomes-by-income charts must name familiar outcome categories such as dismissed, convicted, plea deal, jail, probation, and deferred prosecution rather than using a generic "outcome" bucket.

Complaint outcome charts should separate investigation findings from actions taken. Use familiar public labels such as sustained, exonerated, unfounded, not proven, closed or withdrawn, discipline, training, coaching, mediation, and rapid resolution. Use "not proven" as the public label for formal terms such as "not sustained" or "insufficient facts." Coaching is a corrective action, not an investigation finding.

Use of force and fatal incidents should appear as distinct accountability measurements. Use "Fatal Force Incidents" for overview cards, chart labels, detail-page titles, and route slugs. The detail page may include fatal force, custody deaths, pursuit deaths, and other deaths involving police contact. Fatal force incident charts may break down people under 18, people 18 and older, dogs, and other animals. These records may be geography-scoped, agency-scoped, or personnel-linked depending on source relationships; geography landing pages show aggregate geography-scope metrics, while personnel-linked fatal/death records remain available at personnel scope.

### Filter metrics by page level

State, county, and place landing pages must not show personnel records or officer-level complaint, force, discipline, credibility, and positive-conduct indicators as top-level metrics. Agency pages may show personnel records and agency-level personnel indicators. Officer/personnel detail pages may show officer/personnel-level indicators, but those are outside Civic Index landing-page scope unless already present.

Existing personnel detail pages should keep their content model. This change may align their labels, graph styles, icons, time-window wording, and neutral availability states with the shared Civic Index presentation system, but it should not reorganize personnel pages into visitor-intent landing-page bands or add new personnel metrics without separate approval. Existing personnel-linked use-of-force and fatal-force records remain eligible for personnel-page display.

State top-level metrics should stay limited to county count, report count, budget, civil cases, liability costs, and fatal force incidents. Decertification law context belongs in the bottom state-context section, not as a repeated top-level metric. Use "Liability costs" for the public-facing overview label when the measurement concerns claims, settlements, judgments, defense costs, and related payments. Avoid "taxpayer cost" unless the source records establish direct taxpayer payment.

State decertification context should remain near the bottom of each state landing page and should include compact source-backed report-card information plus one section-level source link. When report-card statuses exist, summarize them with a count such as `{present} of {total} present ({unknown} unknown)`, then render only the field label and status symbol from the report payload or cited source data in a tight responsive non-table layout. Do not repeat source links on each status card, and do not add visible "Present" or "Missing" status text when the symbol and accessible label carry that state. Do not invent friendly replacement fields. It should provide useful report-card content without rendering lengthy explanation or a full detail surface unless a later approved design adds one.

State-level decertification context may create state Civic Index page content, including for states that do not yet have local record coverage. It must not count as home-map record coverage and must not make a state clickable from the home map. Home-map state link eligibility remains based only on reports, personnel, agencies, and civil-case coverage counts.

Public page copy must be self-documenting, not self-referential. The visitor should understand the page from the title, metric cards, band labels, chart titles, compact captions, and action labels. Do not write public-facing copy that tells the visitor the page is a future data product, a grant/funding artifact, a roadmap, a preview experience, or a release-before-data placeholder.

Public copy should target an 8th-grade reading level. A 10th-grade reading level is acceptable only when precision requires it. Public labels and headings must use familiar words instead of technical, legal, or data-analysis terms. If a required source field or data label contains a formal term, use a familiar public label. A tooltip, definition, or detail-page explanation may show the original source/legal term when needed, but the visible label must remain familiar.

### Frame positive indicators comparatively

Positive indicators should answer "better than what?" where possible: current 12 months vs previous 12 months, current year vs prior years, officer vs agency average, agency vs county or state median, place vs similar-size places, pre-policy vs post-policy outcomes, and similar call/population/contact volume peers.

Each positive signal should state the comparison group or time period, who the outcome is better for, which metric improved, whether it is sustained, whether another outcome worsened, and any known related policy, practice, workflow, or supervision change.

## Risks / Trade-offs

- [Risk] The indicator catalog is large enough to create a long page. -> Mitigation: group content into scannable visitor-intent bands and keep previews compact.
- [Risk] Graphs could still read as unexplained dashboard widgets. -> Mitigation: use fixed visitor-intent bands plus concise chart titles, summaries, captions, or metadata where needed; do not require explanatory copy on every chart.
- [Risk] Missing-data copy could sound like a defensive disclaimer. -> Mitigation: use direct metric labels and neutral empty measurement surfaces instead of explanatory caveats or landing-page collection CTAs.
- [Risk] Personnel-level indicators could leak into geography pages. -> Mitigation: encode page-level eligibility in the content model and add implementation tasks to verify it.
- [Risk] Icon uniqueness can regress as metrics are added. -> Mitigation: inspect the existing icon set during implementation and assign distinct visible icons per page.
- [Risk] Positive indicators can read as endorsement. -> Mitigation: require comparative scope, evidence basis, limitations, and neutral language for every positive signal.

## Migration Plan

1. Update the Civic Index spec with the visitor-intent page structure and framing requirements.
2. Implement the shared question-group content model and rendering updates.
3. Verify state, county, place, and agency page-level filtering.
4. Run OpenSpec validation and relevant Astro/site checks after implementation.

Rollback is a UI/spec rollback only. This change is not expected to require database migrations or route changes.

## Open Questions

- Implementation must confirm existing detail routes before adding any "View details" links; this change must not create new scoped sub-pages.
- Implementation must confirm the available icon set before assigning final metric icons.
