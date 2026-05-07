## ADDED Requirements

### Requirement: Local Agency Report Card
PoliceConduct.org SHALL provide a local agency report card that helps visitors understand whether a police department appears safe, accountable, transparent, and improving.

#### Scenario: Viewing a local agency profile
- **WHEN** a visitor opens a law-enforcement agency profile
- **THEN** the system SHOULD summarize the agency's current state using clear sections for transparency, accountability, force and enforcement, governance, cost, staffing, training, and year-over-year change.

### Requirement: Positive-Deviance Snapshot
PoliceConduct.org SHALL include evidence-backed positive-deviance signals in local agency report cards where data supports them.

#### Scenario: Agency has unusually strong comparable outcomes
- **WHEN** an agency outperforms comparable peers on a defined resident-facing outcome such as lower force severity, lower complaint recurrence, stronger records responsiveness, better crisis diversion, or better training completion
- **THEN** the report card SHOULD show the positive-deviance candidate signal, comparison group, source records, limitations, and candidate practices that may explain the outcome.

### Requirement: Department Snapshot
PoliceConduct.org SHALL maintain top-level snapshot fields for each agency where data is available.

#### Scenario: Showing agency-at-a-glance metrics
- **WHEN** an agency has current or recent public data
- **THEN** the report card SHOULD show sworn officer count, population served, officers per 1,000 residents, annual budget, budget per resident, budget per officer, calls for service, arrests, use-of-force incidents, complaints, sustained complaints, lawsuits, settlements, officer separations, training compliance, accreditation status, body-camera policy status, and public-records responsiveness.

### Requirement: Staffing Health Reporting
PoliceConduct.org SHALL track staffing health indicators that reveal whether an agency is growing, shrinking, stable, or experiencing accountability-relevant turnover.

#### Scenario: Reporting officer workforce changes
- **WHEN** staffing, licensing, roster, or separation data is available
- **THEN** the system SHOULD report new hires, departures, vacancies, lateral hires, reactivations, average tenure, turnover rate, separation reasons, probationary officers, known Brady/Giglio status where public, decertification or suspension status where public, and officers who resigned or retired while under investigation, discipline, or criminal charges.

### Requirement: Training Reality Reporting
PoliceConduct.org SHALL distinguish training requirements, training offered, and training actually completed.

#### Scenario: Reporting agency training compliance
- **WHEN** training data is available
- **THEN** the report card SHOULD show annual training hours per officer and completion status for de-escalation, mental-health crisis response, domestic violence response, active violence response, use of force, constitutional policing, First Amendment activity, stops/searches/seizures, report writing, bias-free policing, duty to intervene, and body-camera compliance.

### Requirement: Accountability Pipeline Reporting
PoliceConduct.org SHALL report complaint and discipline outcomes as a pipeline rather than a single aggregate count.

#### Scenario: Showing complaint disposition flow
- **WHEN** complaint, internal-affairs, discipline, or review data is available
- **THEN** the system SHOULD show complaints filed, complaints accepted for investigation, complaints investigated, complaints sustained, complaints closed without discipline, median investigation time, discipline imposed, repeated-officer complaint patterns, use-of-force reviews, shooting reviews, oversight-body involvement, appeal or arbitration reversals, and public access to the complaint process.

### Requirement: Use-of-Force Profile
PoliceConduct.org SHALL support agency-level use-of-force reporting that allows visitors to understand frequency, severity, context, and disparity.

#### Scenario: Reporting force patterns
- **WHEN** force data is available
- **THEN** the report card SHOULD show total force incidents, force incidents per 1,000 arrests, force type, civilian injuries, officer injuries, force by race/age/gender/location where available, force during mental-health calls, force against restrained people, force resulting in hospitalization, fatal force, and whether underlying force reports are public.

### Requirement: Stops, Searches, and Arrests Reporting
PoliceConduct.org SHALL report enforcement activity in ways that help visitors evaluate whether police activity is effective, targeted, or disparate.

#### Scenario: Reporting stop and search outcomes
- **WHEN** stop, search, citation, arrest, or disposition data is available
- **THEN** the system SHOULD show stops, searches, search hit rate, arrests, citations, warnings, consent searches, probable-cause searches, racial disparities, geographic hotspots, stops per officer, arrests per officer, and charges later dismissed where available.

### Requirement: Budget, Grants, and Money-Flow Reporting
PoliceConduct.org SHALL report how police agencies are funded and how money connects to enforcement activity, equipment, training, and accountability costs.

#### Scenario: Reporting agency money flow
- **WHEN** budget, grant, procurement, settlement, or risk-management data is available
- **THEN** the report card SHOULD show local police budget, state and federal grants received, training funds received, equipment grants, surveillance-technology purchases, overtime spending, settlement payouts, insurance or risk-pool costs, union contract costs, forfeiture funds, vendors, and grant conditions attached to funding.

### Requirement: Transparency Score
PoliceConduct.org SHALL maintain an agency-level transparency score backed by the fine-grained Agency Transparency Index.

#### Scenario: Scoring agency transparency
- **WHEN** an agency profile is evaluated
- **THEN** the transparency score SHOULD summarize whether the agency publishes policies, annual reports, use-of-force data, complaint data, officer discipline summaries, commendations where available, stop/search/arrest data, charge-disposition links, body-camera policy, union contract, budget, pay or compensation data, public-records instructions, public-records logs, machine-readable data, training records, custody or jail data where applicable, asset-forfeiture data, lawsuit/settlement data, and whether it responds to public-records requests predictably and completely.

#### Scenario: Showing transparency score details
- **WHEN** a visitor views an agency transparency score
- **THEN** the report card SHOULD show component-level transparency evidence, freshness, confidence, source links or archive references, and labels such as unknown, not found, not published, request-required, published-but-not-machine-readable, or blocked-by-access-limits.

### Requirement: Policy Standards Comparison
PoliceConduct.org SHALL compare agency policies against baseline accountability topics and clearly identify missing or weak policy areas.

#### Scenario: Reviewing an agency policy library
- **WHEN** agency policies are available
- **THEN** the system SHOULD compare policies for use of force, de-escalation, duty to intervene, foot pursuits, vehicle pursuits, body cameras, First Amendment activity, crowd control, mental-health response, complaints/internal affairs, stops/searches, arrests, juvenile interactions, domestic violence, and off-duty conduct.

### Requirement: Year-Over-Year Agency Change
PoliceConduct.org SHALL report how an agency changed over time rather than presenting only static values.

#### Scenario: Showing annual changes
- **WHEN** comparable prior-year data exists
- **THEN** the report card SHOULD show whether budget, staffing, complaints, sustained discipline, force, lawsuits, settlements, public-records responsiveness, training hours, surveillance tools, policies, and leadership changed year over year.

### Requirement: Positive Practice Transferability
PoliceConduct.org SHALL distinguish between a positive outcome and a practice that may be transferable to other agencies.

#### Scenario: Reporting a promising agency practice
- **WHEN** a report card identifies a candidate positive practice
- **THEN** the system SHOULD describe the practice, the problem it addresses, evidence that it is associated with better outcomes, conditions where it may or may not transfer, and whether the finding is confirmed, candidate, or needs review.

### Requirement: Data Feasibility Labels
PoliceConduct.org SHALL label each report-card metric by expected acquisition difficulty and source type.

#### Scenario: Displaying metric provenance and feasibility
- **WHEN** a report-card metric is shown or planned
- **THEN** the system SHALL identify whether the metric is typically obtainable from published public sources, public-records requests, structured data productions, litigation records, third-party datasets, manual review, or hard-to-obtain internal records, and SHALL preserve source/provenance notes for visitor trust.
