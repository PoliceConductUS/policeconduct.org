## ADDED Requirements

### Requirement: Visitor-intent Civic Index data preview

The system SHALL organize Civic Index landing-page preview content around a fixed set of visitor-intent bands rather than implementation categories.

#### Scenario: Visitor-intent bands are rendered

- **WHEN** a Civic Index landing page is rendered
- **THEN** the page keeps the top metric cards as the primary orientation surface
- **AND** the page groups preview metrics, graphs, detail links, and collection actions under seven visitor-intent bands
- **AND** the bands cover police contacts, disparate impact, public cost, complaint and discipline outcomes, officer credibility records, policy safeguards, and better outcome signals where level-appropriate
- **AND** the implementation may use concise section labels or short question-like headings for those bands, but the exact heading text is not prescribed by this spec
- **AND** the page does not group content under a generic "Graphs", "Metrics", or "Datasets" heading

#### Scenario: Prohibited editorial sections are absent

- **WHEN** a Civic Index landing page is rendered
- **THEN** the page does not render a "Top 5 things to know" section
- **AND** the page does not render "Who is most affected" as a standalone editorial section
- **AND** the page may still render top metric cards for the current scope

#### Scenario: Landing page is self-documenting

- **WHEN** a Civic Index landing page is rendered
- **THEN** the page communicates its purpose through the page title, top metric labels, visitor-intent band labels, graph titles, compact captions, and action labels
- **AND** the page does not use public-facing meta-explanation that says the page is a future data product, grant/funding artifact, roadmap, preview experience, or release-before-data placeholder
- **AND** the page does not rely on instructional prose to explain how the visitor should use the page at the top level

#### Scenario: Top metric card actions are rendered

- **WHEN** a top metric card is rendered on a Civic Index landing page
- **THEN** ordinary metric cards use "View details" as their only action when an applicable scoped detail subpage already exists for that metric
- **AND** the landing page may designate one top metric card as the default page action when a child geography or child entity subpage exists for the current scope
- **AND** the default-action metric uses one primary CTA labeled "Explore [child entities]" such as "Explore counties", "Explore places", or "Explore agencies"
- **AND** the default-action metric does not also render "View details" on the same card
- **AND** no metric card uses competing action labels such as "Browse...", "Review...", and "View details" together
- **AND** if the current page has no child geography or child entity subpage, no metric card is designated as the default page action

---

### Requirement: Graph previews within visitor-intent bands

The system SHALL render graph previews as central Civic Index measurement surfaces inside the relevant visitor-intent bands.

#### Scenario: Graph preview is rendered

- **WHEN** a graph preview is shown on a Civic Index landing page
- **THEN** the graph appears inside the relevant visitor-intent band
- **AND** the graph title, band heading, nearby summary, or caption makes the future measurement intent clear to a visitor, funder, or grant reviewer
- **AND** the graph includes scope, denominator, grouping, comparison, or time-window context when that context is needed to avoid ambiguity or unsupported interpretation
- **AND** the graph includes a "View details" link when an applicable scoped detail subpage already exists for the measurement

#### Scenario: Source data is absent for a graph preview

- **WHEN** a graph preview applies to the current scope but source data is absent
- **THEN** the page may still show a muted or disabled sample graph surface to communicate the intended measurement
- **AND** the page does not render a numeric zero unless source data directly establishes zero
- **AND** the graph preview does not imply that sample values are verified findings
- **AND** the graph includes a "View details" link when an applicable scoped detail subpage already exists for the measurement
- **AND** collection actions, when shown, are consolidated and secondary rather than repeated on every missing graph card
- **AND** the page does not use public-facing implementation or defensive missing-data copy such as "future source-record surface", "measurement preview", "will appear when verified", "not collected yet", or "source needed"

---

### Requirement: Visitor-intent indicator catalog

The system SHALL map Civic Index indicators and graphs to the visitor intent they help satisfy.

#### Scenario: Police contact band is rendered

- **WHEN** the page renders the police-contact visitor-intent band
- **THEN** the group may include calls for service or incidents by explicit time window, offenses by type, charges by type, stops by reason, arrests by offense type, citations by offense type, enforcement contacts by location type, enforcement contacts by time of day, and repeat contacts by person or household
- **AND** the group may include graphs for calls or incidents by explicit time window, offenses by type, stops by reason, citations and arrests by explicit time window, and repeat-contact concentration

#### Scenario: Disparate-impact band is rendered

- **WHEN** the page renders the disparate-impact visitor-intent band
- **THEN** the group may include breakdowns by race or ethnicity, income, local resident distance band, regional or out-of-region distance band, out-of-state status, day versus night, offense type, search type or basis, and outcome type
- **AND** the group may include population share versus enforcement-contact share, stops by ethnicity, stops by ethnicity and day/night, searches or force by race, revenue or fines or fees by income, outcomes by income, search hit rate by race or income, local versus regional versus out-of-state enforcement impact, and repeat contacts by race or income
- **AND** outcomes by income includes recognizable case outcomes such as dismissed, convicted, plea deal, jail, probation, and deferred prosecution rather than a generic "outcome" category

#### Scenario: Public-cost band is rendered

- **WHEN** the page renders the public-cost visitor-intent band
- **THEN** the group may include budget by source, revenue by source, revenue by offense type, revenue by income, civil case count, liability costs, settlements, judgments, defense costs, claims, overtime hours per sworn officer, paid suspension costs, salary or benefits paid during administrative leave, paid leave before separation, civil payouts linked to prior complaints, and settlement with no recorded discipline
- **AND** liability costs include documented costs tied to claims, litigation, settlements, judgments, defense, and related conduct events without implying every dollar was paid directly by taxpayers
- **AND** budget and overtime are separate measurements unless the chart is explicitly comparing budget and overtime for a stated reason
- **AND** civil case count may summarize cases filed in an explicit time window and total cases found
- **AND** the group may include graphs for budget by source, budget by explicit time window, revenue by source, revenue by income, revenue by offense type, liability costs by explicit time window, civil cases filed in an explicit time window plus total cases found, overtime hours per sworn officer by explicit time window, paid suspension costs by explicit time window, paid leave cost before resignation or termination, and payouts involving officers with prior similar complaints versus without

#### Scenario: Accountability outcome band is rendered

- **WHEN** the page renders the complaint, discipline, force, lawsuit, or credibility-concern outcome visitor-intent band
- **THEN** the group may include complaint allegations, complaint outcomes, complaint-to-discipline ratio, filed versus sustained versus disciplined complaints, discipline severity and timing, discipline reversal rate, suspension duration, resignations after complaint, use-of-force reports, fatal force incidents, police-involved deaths, lawsuit, or internal investigation, separation reason, rehire or reinstatement after resignation or discipline or arbitration or settlement, repeat complaint concentration, repeat force concentration, force-to-complaint mismatch, lawsuit-after-complaint patterns, body-camera compliance, body-camera activation failures, missing video or late uploads, report corrections or amendments or late reports or inconsistent reports, and complaint visibility barriers
- **AND** complaint outcome labels may include familiar finding labels such as sustained, exonerated, unfounded, not proven, closed or withdrawn, mediated, rapid resolution, discipline, training, and coaching
- **AND** "not proven" is the public label for formal terms such as "not sustained" or "insufficient facts" unless a source requires the formal term in supporting context
- **AND** coaching is treated as a corrective action or action taken, not as an investigation finding
- **AND** fatal force incidents may break down people under 18, people 18 and older, dogs, and other animals
- **AND** the detail-page label for fatal-force and death records may be "Police-involved deaths" and may include fatal force, custody deaths, pursuit deaths, and other deaths involving police contact
- **AND** fatal force incidents and police-involved deaths may be geography-scoped, agency-scoped, or personnel-linked depending on the source record relationships
- **AND** geography landing pages show only aggregate geography-scope fatal/death metrics, while personnel-linked fatal/death records remain available at personnel scope
- **AND** the group may include graphs for complaint outcome funnel, complaints filed versus sustained versus disciplined, findings and actions taken by explicit time window, complaints by allegation by explicit time window, use of force by explicit time window, fatal force incidents by explicit time window, discipline timeline, discipline reversals by explicit time window, suspension days by allegation type, resignation patterns, repeat complaints per officer distribution, repeat force incidents per officer distribution, body-camera noncompliance by incident type, and force-to-complaint mismatch

#### Scenario: Credibility-record band is rendered

- **WHEN** the page renders the officer-credibility, search-validity, force-justification, or impeachment visitor-intent band
- **THEN** the group may include officer complaint history by allegation type, sustained dishonesty findings, false report findings, evidence-handling findings, bias findings, excessive-force findings, unlawful search or seizure findings, retaliation findings, prior similar allegations with sustained and unsustained allegations separated, civil cases involving the same officer or unit or allegation type or search pattern or force pattern, Brady or Giglio indicators, suppression motions or rulings tied to officer conduct, search suppression outcomes, evidence exclusion outcomes, body-camera activation failures or missing evidence, report inconsistencies or late reports or amended reports, training or policy violations tied to incident type, decertification referrals or findings or eligibility, separation or resignation after complaint or investigation, use-of-force pattern compared with peers, search pattern compared with peers including hit rate, and complaint or discipline timeline relative to a criminal case
- **AND** the group may include graphs for Brady or Giglio flags by officer or unit or agency, suppression or evidence-exclusion outcomes by explicit time window, search hit rate by officer or unit or search type, complaints by allegation type for officer or unit, prior similar allegations timeline, civil cases linked to officer or unit, and body-camera failures by incident type

#### Scenario: Policy-safeguard band is rendered

- **WHEN** the page renders the policy, safeguard, and accountability-system visitor-intent band
- **THEN** the group may include policy rating, policy safeguard details, decertification law context, complaint access and transparency, public-records barriers, union-contract barriers, discipline appeal or arbitration barriers, policy-to-outcome comparison, accountability barriers, pre-policy versus post-policy outcomes, and policy adoption date versus force or complaint or payout or disparity trends
- **AND** the group may include graphs for policy safeguard score versus force rate, complaint rate, liability costs, or disparity index; pre-policy versus post-policy force or complaint or payout trends; and accountability barrier score by place, county, or state

#### Scenario: Better-outcome band is rendered

- **WHEN** the page renders the better-outcome visitor-intent band
- **THEN** the group may include lower force rate per enforcement contact than comparable peers, lower complaint rate per contact or stop or arrest or use-of-force event, lower sustained excessive-force complaints, lower liability costs per contact or sworn officer, lower racial or income disparity in stops or searches or force or fines or outcomes, higher search hit rate with lower search volume, higher diversion or warning or non-custodial resolution rate for comparable offenses, lower failure-to-appear or warrant escalation after fine or fee contact, faster complaint resolution without lower sustain rates, higher body-camera compliance, lower report correction or late-report rate, lower suppression or exclusion rate, higher policy safeguard score paired with better outcomes, lower overtime per sworn officer without worse public-safety or contact outcomes, higher commendation or positive-conduct ratio without suppressed complaint visibility, and sustained year-over-year improvement in force, complaints, payouts, disparities, fine burden, repeat contacts, or warrant escalation
- **AND** the group may include graphs for force rate by explicit time window compared with peer median, complaint rate by explicit time window compared with peer median, liability costs by explicit time window compared with peer median, disparity index by explicit time window by race and income, search hit rate versus search volume, diversion or warning or non-custodial outcomes by offense type, positive-to-negative conduct ratio, policy safeguard score versus outcomes, and unusually good outcomes under comparable conditions

---

### Requirement: Metric icon uniqueness

The system MUST use distinct visible icons for visible metric cards on the same Civic Index page.

#### Scenario: Metric cards are rendered

- **WHEN** multiple metric cards are visible on the same Civic Index page
- **THEN** no visible metric card duplicates another visible metric card icon on that page
- **AND** the implementation chooses the closest available non-duplicative icon when the icon set does not include a perfect semantic match

---

### Requirement: Positive indicator comparison framing

The system MUST frame positive indicators and disparity indicators with comparison context where possible.

#### Scenario: Positive indicator is rendered

- **WHEN** a positive indicator or positive-deviance signal is rendered
- **THEN** the indicator states the comparison group or comparison time period when available
- **AND** the indicator states who the result is better for and which metric is better
- **AND** the indicator states whether the result is sustained over time when that evidence is available
- **AND** the indicator states whether another tracked outcome worsened at the same time when that evidence is available
- **AND** the indicator identifies any known related policy, practice, workflow, or supervision change without implying causation unless an approved methodology supports causation

#### Scenario: Comparison context is selected

- **WHEN** a positive indicator or disparity indicator has available comparison data
- **THEN** the page may compare current 12 months versus previous 12 months, current year versus prior years, officer versus agency average, officer versus similar assignment or unit, agency versus county median, agency versus state median, place versus similar-size places, county versus state median, state versus national or available peer states, pre-policy versus post-policy adoption, similar call volume, similar population size, or similar enforcement-contact volume

---

## MODIFIED Requirements

### Requirement: Civic indicator catalog

The system SHALL render a level-appropriate catalog of desired civic indicators on Civic Index landing pages.

#### Scenario: State indicator catalog is rendered

- **WHEN** a state Civic Index page is rendered
- **THEN** the page may include top-level metrics for county count, report count, budget, civil cases, liability costs, fatal force incidents, and decertification law context
- **AND** the page does not render personnel records as a top-level metric
- **AND** the page does not render officer-level complaint, force, discipline, credibility, or positive-conduct indicators as top-level metrics

#### Scenario: County or place indicator catalog is rendered

- **WHEN** an administrative-area or place Civic Index page is rendered
- **THEN** the page may include level-appropriate metrics for calls for service or incidents, offenses, charges, stops, arrests, citations, enforcement contacts, repeat contacts, revenue, outcomes, use of force, fatal force incidents, police-involved deaths, budget, overtime, complaints, discipline, body-camera compliance, report quality, policies, policy safeguards, accountability barriers, civil cases, liability costs, and positive comparative signals
- **AND** the page does not render personnel records as a top-level metric
- **AND** the page does not render officer-level complaint, force, discipline, credibility, or positive-conduct indicators as top-level metrics

#### Scenario: Agency indicator catalog is rendered

- **WHEN** an agency Civic Index page is rendered
- **THEN** the page may include agency-level metrics for calls for service or incidents, offenses, charges, stops, arrests, citations, enforcement contacts, repeat contacts, revenue, outcomes, use of force, fatal force incidents, police-involved deaths, budget, overtime, complaints, discipline, body-camera compliance, report quality, policies, policy safeguards, accountability barriers, civil cases, liability costs, personnel records, officer-level complaint indicators, officer-level force indicators, officer-level discipline indicators, officer-level credibility indicators, and officer-level positive-conduct indicators
- **AND** personnel records appear only at agency scope unless another approved spec defines a non-agency personnel scope
- **AND** budget by source includes civil forfeiture only as a budget or revenue source, not as a separate Civic Index metric family

#### Scenario: Personnel detail pages stay content-stable

- **WHEN** an existing personnel detail page is rendered
- **THEN** the page keeps its existing content model and does not adopt the Civic Index landing-page visitor-intent band structure
- **AND** labels, graph styles, icons, time-window wording, and neutral availability states may be updated for consistency with the shared Civic Index presentation system
- **AND** existing personnel-linked use-of-force, fatal-force, and police-involved death records remain eligible for personnel-page display
- **AND** those presentation updates preserve the existing personnel-page scope and do not add new personnel metrics unless separately approved

#### Scenario: Policy and accountability context is rendered

- **WHEN** policy safeguards are rendered
- **THEN** the page may summarize available safeguards such as de-escalation requirements, duty to intervene, neck-restraint limits, shooting-at-vehicles limits, force reporting requirements, force review process, complaint intake accessibility, anonymous complaint acceptance, body-camera activation or retention or release rules, stop or search documentation requirements, and public reporting requirements
- **AND** each safeguard is labeled according to the source data without fabricating a finding for absent source data

#### Scenario: State decertification context is rendered

- **WHEN** a state Civic Index landing page has decertification law context
- **THEN** the page may show compact decertification report-card information near the bottom of the state page
- **AND** the item links to the source record or source report
- **AND** the item may summarize source-backed status fields from the report card using counts such as `{present} of {total} present ({unknown} unknown)` when those statuses exist
- **AND** any rendered report-card field labels and statuses are taken from the report payload or cited source data rather than invented summary labels
- **AND** the landing page does not need to render lengthy decertification explanation or the full report-card detail surface

#### Scenario: Accountability barriers are rendered

- **WHEN** accountability barriers are rendered
- **THEN** each barrier identifies a specific public-information obstacle such as unavailable complaint process, unpublished complaint outcomes, unpublished force data, incomplete stop or search fields, overly aggregated budget records, unlinked settlement records, unavailable or unversioned policy manual, state-law discipline-record limits, or decertification records not linked to agency or personnel records
- **AND** the page does not summarize those barriers as a general conclusion that an agency or jurisdiction is unsafe, unaccountable, or intentionally withholding information

#### Scenario: Positive conduct indicators are rendered

- **WHEN** commendations, awards, positive conduct, or positive-deviance indicators are rendered
- **THEN** the page labels the exact source type and scope
- **AND** the page does not present unsupported praise, rankings, endorsements, or overall findings
- **AND** any positive-deviance finding is clearly identified as a derived evidence-backed analysis with methodology and limitations

---

### Requirement: Metric scope and neutrality

The system MUST make every displayed civic indicator and graph explicit and neutral.

#### Scenario: Direct metric is rendered

- **WHEN** a Civic Index page renders a direct metric
- **THEN** the metric states what is counted or measured
- **AND** the metric states the geographic, agency, personnel, or entity scope
- **AND** the metric states the source basis
- **AND** the metric states a visible time period near the metric value, label, detail text, or surrounding card unless the metric is a structural count, current status, or source/report-date context

#### Scenario: Graph is rendered

- **WHEN** a Civic Index page renders a graph
- **THEN** the graph title, surrounding band heading, nearby summary, or caption states what is counted, measured, or compared
- **AND** the graph title, surrounding band heading, nearby summary, or caption states the geographic, agency, personnel, or entity scope when the scope is not already clear from the page context
- **AND** the graph states the source basis when source data exists and the basis is needed to interpret the graph
- **AND** the graph states a visible time window unless the graph is a current status or source/report-date context

#### Scenario: Time-based metric or graph is rendered

- **WHEN** a metric or graph describes a rate, trend, comparison over time, or recent activity
- **THEN** the metric or graph defaults to the previous 12 months unless the label states a different date range
- **AND** the date range is visible near the metric value, metric label, graph title, or graph caption
- **AND** longer windows such as 5 years are used only when the label or nearby copy states that range

#### Scenario: Update date metadata is rendered

- **WHEN** a Civic Index metric, graph, report-card item, policy item, or source-backed summary has a known source update date
- **THEN** the page shows the date using the standard label `Updated {date}`
- **AND** the date appears near the related metric, graph, item, or compact source summary
- **AND** the page does not use alternate public labels such as "last updated", "source date", "data date", or "refresh date" for the same concept
- **AND** if no source-backed update date exists, the page omits update-date metadata for that item
- **AND** the page does not render placeholder update-date text such as `--`, "pending", "unknown", "not available", or "not collected yet"

#### Scenario: All data copy is rendered

- **WHEN** Civic Index data, metric labels, graph labels, captions, summaries, empty states, or calls to action are rendered
- **THEN** the copy remains descriptive and neutral
- **AND** public-facing copy targets an 8th-grade reading level, with a 10th-grade reading level allowed only when precision requires it
- **AND** public labels use familiar words instead of technical, legal, or data-analysis terms
- **AND** if a required source field, legal concept, or data label contains a technical or legal term, the page uses a familiar public label
- **AND** a tooltip, definition, or detail-page explanation may show the original source/legal term when needed, but the visible label remains familiar
- **AND** the copy does not imply quality, danger, intent, causation, accountability, safety, misconduct, or improvement unless an approved methodology directly supports that statement
- **AND** the copy does not use hedging or defensive missing-data phrases such as "will appear when verified", "not collected yet", or "source needed"

---

### Requirement: Metric availability states

The system SHALL show desired Civic Index metrics and graphs with explicit availability behavior instead of hiding missing applicable source data.

#### Scenario: Metric or graph data is available

- **WHEN** a desired metric or graph has scoped source data
- **THEN** the page shows the metric value, graph, or summary
- **AND** the metric or graph includes a "View details" link when a relevant scoped subpage already exists

#### Scenario: Metric or graph data is partially available

- **WHEN** a desired metric or graph has incomplete scoped source data
- **THEN** the page may show the available value, graph, or summary
- **AND** the metric or graph states the known limitation without implying the missing data is zero
- **AND** the metric or graph includes a "View details" link when a relevant scoped subpage already exists

#### Scenario: Source data is absent for an applicable metric or graph

- **WHEN** a desired metric or graph applies to the current scope but has no collected source data
- **THEN** the page does not render a numeric zero unless source data directly establishes zero
- **AND** the page presents the intended measurement directly, optionally as a muted or disabled sample graph with neutral empty values
- **AND** the metric or graph includes a "View details" link when a relevant scoped subpage already exists
- **AND** the page may show a consolidated non-primary contribution CTA scoped to the current area and dataset
- **AND** the contribution link includes enough query context for the volunteer page to prefill the related geography, agency, or personnel record
- **AND** the contribution link includes the source page path and the applicable scope type such as state, county, place, agency, or personnel
- **AND** the page does not use public-facing implementation or defensive missing-data copy such as "future source-record surface", "measurement preview", "will appear when verified", "not collected yet", or "source needed"

#### Scenario: Metric or graph is unavailable for the current scope

- **WHEN** a desired metric or graph does not apply to the current level, geography, agency, personnel, or entity scope
- **THEN** the page omits it according to the approved metric catalog
- **AND** the page does not invite volunteers to collect inapplicable data

---

### Requirement: Detail subpages own browse surfaces

The system MUST keep Civic Index landing pages focused on visitor-intent preview metrics and keep child entity lists, maps, browse tables, direct drill-down sections, search, sort, pagination, and row-level browsing on scoped subpages only, if those subpages already exist.

#### Scenario: Civic Index landing page is rendered

- **WHEN** a user opens a state, administrative-area, place, or agency Civic Index landing page
- **THEN** the page does not render child entity lists
- **AND** the page does not render maps
- **AND** the page does not render browse tables
- **AND** the page does not render direct drill-down sections
- **AND** the page does not render searchable browse tables, paginated child results, or row-level child entity links
- **AND** the page may render metric-card CTAs or text links to existing scoped browse subpages
- **AND** those browse surfaces may exist only on scoped subpages, if they exist at all

#### Scenario: State landing page is rendered

- **WHEN** a state Civic Index landing page is rendered
- **THEN** the page does not list, map, table, or directly drill into counties, places, agencies, personnel, reports, or civil cases
- **AND** the page may link to an existing counties, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpage
- **AND** any county browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Administrative-area landing page is rendered

- **WHEN** an administrative-area Civic Index landing page is rendered
- **THEN** the page does not list, map, table, or directly drill into places, agencies, personnel, reports, or civil cases
- **AND** the page may link to an existing places, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpage
- **AND** any place or agency browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Place landing page is rendered

- **WHEN** a place Civic Index landing page is rendered
- **THEN** the page does not list, map, table, or directly drill into agencies, personnel, reports, or civil cases
- **AND** the page may link to an existing agencies, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpage
- **AND** any agency browse experience is rendered only on a scoped subpage, if it exists at all

#### Scenario: Agency landing page is rendered

- **WHEN** an agency Civic Index landing page is rendered
- **THEN** the page does not render browse tables, maps, paginated personnel lists, paginated report lists, or paginated civil-case lists alongside the visitor-intent data previews
- **AND** the page may link to existing personnel, reports, civil-cases, budget, liability-costs, outcomes, or related scoped subpages
- **AND** any personnel, report, civil-case, budget, liability, or other browse experience is rendered only on a scoped subpage, if it exists at all
