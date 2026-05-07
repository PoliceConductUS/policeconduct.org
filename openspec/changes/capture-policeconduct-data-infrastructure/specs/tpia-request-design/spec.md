## ADDED Requirements

### Requirement: Machine-Readable Source-System Requests
PoliceConduct.org SHALL support TPIA/public-records request templates that ask for machine-readable source-system exports when structured records exist.

#### Scenario: Drafting an arrest-data request
- **WHEN** a request template is generated for arrests, stops, force, complaints, evidence, BWC, CAD, or funding
- **THEN** the template SHALL request row-level data, stable IDs, join keys, lookup tables, codebooks, data dictionaries, source-system exports, and redaction logs.

### Requirement: Funding and Money-Flow Fields
PoliceConduct.org SHALL include funding-source and money-flow fields in relevant request templates.

#### Scenario: Drafting a specialized-unit or enforcement-program request
- **WHEN** a request concerns a policy domain, unit, technology, or enforcement program
- **THEN** the template SHALL request grants, award numbers, Assistance Listing/CFDA numbers, fund/account/project codes, budgets, obligations, expenditures, overtime, vendors, equipment, reimbursements, forfeiture funds, audits, clawbacks, and linked enforcement activity where available.

### Requirement: Multi-Agency Evidence Requests
PoliceConduct.org SHALL support requests that treat incidents as multi-agency evidence events.

#### Scenario: Drafting a serious-incident request
- **WHEN** a request concerns an arrest, force event, serious injury, death in custody, or officer-involved shooting
- **THEN** the template SHALL include CAD, dispatch/radio, 911, BWC/MVR, RMS reports, evidence/property, lab, DA/court, EMS/fire, medical examiner, claims/risk management, IA, and litigation-hold records where applicable.

### Requirement: Request Lifecycle Tracking
PoliceConduct.org SHALL track request status and legal/procedural milestones.

#### Scenario: Agency refers a request to an attorney general or equivalent authority
- **WHEN** a request receives a referral, denial, fee estimate, production, redaction, or ruling
- **THEN** the system SHALL record date, status, due date, request ID, agency rationale, produced files, missing fields, and next action.

### Requirement: Positive-Deviance Discovery Requests
PoliceConduct.org SHALL support public-records request templates that can reveal unusually effective practices as well as failures.

#### Scenario: Drafting a positive-practice request
- **WHEN** a request seeks to evaluate whether an agency, unit, supervisor, or officer produces better resident-facing outcomes under comparable constraints
- **THEN** the template SHOULD request commendations, awards, community feedback, training completion, supervision reviews, crisis-diversion records, complaint recurrence data, force-review outcomes, public-records response logs, policy-change records, audit improvements, and structured outcome data with officer, unit, supervisor, assignment, and date fields where public.

#### Scenario: Avoiding praise-only records
- **WHEN** a request includes positive-practice records such as commendations or awards
- **THEN** the template SHOULD also request comparable denominator and accountability records such as assignments, calls, arrests, force incidents, complaints, findings, separations, and training completion so positive findings can be evaluated in context.
### Requirement: Federal Task-Force and Confidential-Informant Program Data
PoliceConduct.org SHALL support request templates for federal/interagency task-force relationships and confidential-informant program controls while protecting sensitive identities.

#### Scenario: Drafting a task-force or CI-program request
- **WHEN** a request concerns federal agency collaboration, task-force assignment, deputization, confidential funds, or confidential informants
- **THEN** the template SHALL request MOUs, assignment rosters, cross-designation/deputization records, grant or reimbursement records, overtime/project codes, handler/supervisor controls, CI policies, de-identified CI registry fields or aggregate counts, payment/audit ledgers, and case links, while excluding CI names and other identifying operational details unless already public and legally releasable.

#### Scenario: Requesting officer-level CI usage counts
- **WHEN** a request seeks to evaluate whether CI use by an officer appears legitimate or patterned
- **THEN** the template SHALL request officer/handler IDs, supervisor IDs, unit/task-force affiliation, monthly or yearly counts of active CIs per officer, de-identified stable CI keys where producible, CI-linked warrant/case/CAD/RMS/arrest IDs, corroboration categories, prior reliability categories, payment/funding metadata, warrant outcomes, seizure outcomes, prosecution outcomes, suppression/challenge records, and supervisor/prosecutor review fields, with CI identities and identifying operational details redacted.
### Requirement: Complaint Officer and Organization Context Requests
PoliceConduct.org SHALL request complaint data with officer, allegation, unit, supervisor, and outcome context sufficient to evaluate organizational treatment patterns.

#### Scenario: Drafting a complaint or IA data request
- **WHEN** a request seeks complaint, internal-affairs, misconduct, use-of-force-review, or discipline records
- **THEN** the template SHALL request complaint ID, allegation ID, officer ID, officer name/badge/employee number where public, unit, assignment, shift, supervisor, chain-of-command reviewer, complainant category, received date, incident date, allegation category, investigative finding, discipline recommendation, final discipline, appeal/grievance outcome, decisionmaker, and linked policy/training/case IDs.
