## ADDED Requirements

### Requirement: National Data Source Crawl Index
PoliceConduct.org SHALL maintain a crawl/index backlog for national, state, local, academic, nonprofit, court, and federal data sources that may help build a comprehensive picture of law-enforcement agencies and personnel.

#### Scenario: Recording a candidate crawl source
- **WHEN** an operator identifies a candidate source for crawl or indexing
- **THEN** the system SHALL record source name, canonical URL, submitted URL(s), source owner, jurisdiction/coverage, likely data domains, access method, crawl/index depth, license/terms, robots/access constraints, refresh cadence, provenance notes, and review status.

#### Scenario: Preserving duplicate submitted URLs
- **WHEN** the same URL or organization is submitted more than once
- **THEN** the system SHALL preserve the duplicate submission in provenance notes while using a single canonical source record for evaluation and crawl planning.

### Requirement: Full-Source Indexing Evaluation
PoliceConduct.org SHALL evaluate whether candidate sources should be fully indexed, selectively indexed, manually reviewed, or excluded.

#### Scenario: Evaluating full-source indexing
- **WHEN** a candidate source is reviewed
- **THEN** the review SHALL identify whether the source contains structured datasets, searchable documents, PDFs, tables, APIs, case records, research articles, downloadable files, methodology pages, or link directories, and SHALL recommend full crawl, bounded crawl, manual extraction, API ingestion, download mirroring, citation-only reference, or exclusion.

#### Scenario: Source has publication or access limits
- **WHEN** a source has paywalls, licenses, rate limits, robots restrictions, personal-data risks, copyrighted articles, or unclear reuse rights
- **THEN** the source SHALL be marked with access limitations and SHALL NOT be mirrored or republished beyond allowed use until reviewed.

### Requirement: Comprehensive Officer and Agency Coverage Domains
PoliceConduct.org SHALL map candidate sources to the officer-level, agency-level, incident-level, court-level, custody-level, and funding-level domains they may support.

#### Scenario: Mapping source coverage to data domains
- **WHEN** a source is evaluated
- **THEN** the evaluation SHALL mark applicable domains, including pay, staffing, rosters, arrests, stops, searches, citations, use of force, civilian injury, officer injury, in-custody injury or death, complaints, commendations, discipline, training, questionable training events, public-records release behavior, juvenile interactions, suppressed evidence, civil-rights lawsuits, qualified-immunity cases, criminal-case dispositions, bail, detainee counts, jail population, asset forfeiture, grants, budgets, settlements, convictions later reversed, and arrest-to-final-disposition linkage.

### Requirement: Arrest-to-Disposition Traceability
PoliceConduct.org SHALL prioritize sources that help connect an initial police contact to later legal, custody, and case outcomes.

#### Scenario: Evaluating traceability value
- **WHEN** a source contains arrest, jail, court, prosecutor, bail, charge, conviction, dismissal, suppression, reversal, or sentence data
- **THEN** the evaluation SHALL record the identifiers available for linking the contact-to-disposition pipeline, including agency IDs, officer IDs, person IDs where lawful and safe, incident numbers, case numbers, booking numbers, charge codes, court identifiers, dates, and jurisdiction.

### Requirement: Seed Candidate Source List
PoliceConduct.org SHALL seed the crawl/index backlog with the initial source list identified for national police accountability data discovery.

#### Scenario: Creating initial backlog entries
- **WHEN** this OpenSpec change is implemented
- **THEN** the candidate source backlog SHALL include, at minimum, the following submitted sources and preserve the submitted URLs in provenance:
  - `https://www.icpsr.umich.edu/sites/nacjd/discover-data`
  - `https://nij.ojp.gov/library/datasets-nij-funded-research`
  - `https://policefundingdatabase.org/`
  - `https://www.naacpldf.org/`
  - `https://campaignzero.org/`
  - `https://www.justice.gov/oip/available-documents-all-doj-components`
  - `https://ij.org/`
  - `https://mappingpoliceviolence.org/methodology`
  - `https://policescorecard.org/`
  - `https://journals.sagepub.com/`
  - `https://www.annualreviews.org/search?option1=pub_keyword&value1=%22police%22`
  - `https://repository.law.umich.edu/do/search/?q=police&start=0&context=1`
  - `https://www.ssrn.com/ssrn/`
  - `https://scholarship.law.wm.edu/wmlr/vol64/iss3/3/`
  - `https://scholarship.law.wm.edu/cgi/viewcontent.cgi?article=3971&context=wmlr`
  - `https://openpolicing.stanford.edu/`
  - `https://policetransparency.vera.org/`
  - `https://www.vera.org/`
  - `https://journals.sagepub.com/doi/abs/10.1177/07340168211071014`
  - `https://pmc.ncbi.nlm.nih.gov/articles/PMC12538985/`
  - `https://researchonline.stthomas.edu/esploro/`
  - `https://digitalcommons.law.villanova.edu/vlr/`

#### Scenario: Initial source list contains repeated organizations
- **WHEN** the submitted list includes repeated organizations or URLs, including NAACP LDF and Vera Police Transparency
- **THEN** the backlog SHALL deduplicate canonical source records but SHALL preserve the repeated submissions as evidence of priority or multiple discovery paths.

#### Scenario: Preserving the raw submitted source list
- **WHEN** the initial backlog is created
- **THEN** the provenance for the backlog SHALL preserve the raw submitted list, including duplicates, in the submitted order:
  - `https://www.icpsr.umich.edu/sites/nacjd/discover-data`
  - `https://nij.ojp.gov/library/datasets-nij-funded-research`
  - `https://policefundingdatabase.org/`
  - `https://www.naacpldf.org/`
  - `https://campaignzero.org/`
  - `https://www.justice.gov/oip/available-documents-all-doj-components`
  - `https://ij.org/`
  - `https://www.naacpldf.org/`
  - `https://mappingpoliceviolence.org/methodology`
  - `https://policescorecard.org/`
  - `https://journals.sagepub.com/`
  - `https://www.annualreviews.org/search?option1=pub_keyword&value1=%22police%22`
  - `https://repository.law.umich.edu/do/search/?q=police&start=0&context=1`
  - `https://www.ssrn.com/ssrn/`
  - `https://scholarship.law.wm.edu/wmlr/vol64/iss3/3/`
  - `https://scholarship.law.wm.edu/cgi/viewcontent.cgi?article=3971&context=wmlr`
  - `https://openpolicing.stanford.edu/`
  - `https://policetransparency.vera.org/`
  - `https://policetransparency.vera.org/`
  - `https://www.vera.org/`
  - `https://journals.sagepub.com/doi/abs/10.1177/07340168211071014`
  - `https://pmc.ncbi.nlm.nih.gov/articles/PMC12538985/`
  - `https://researchonline.stthomas.edu/esploro/`
  - `https://digitalcommons.law.villanova.edu/vlr/`

### Requirement: Court and Litigation Source Discovery
PoliceConduct.org SHALL evaluate litigation-oriented sources for cases that reveal constitutional policing patterns, officer conduct, agency policy, qualified immunity, suppressed evidence, reversals, settlements, and Monell-relevant facts.

#### Scenario: Evaluating civil-rights and qualified-immunity case sources
- **WHEN** a candidate source may contain court cases or litigation materials
- **THEN** the evaluation SHALL identify whether the source supports court-case discovery, opinion extraction, party/officer/agency matching, claim classification, disposition tracking, cited policy extraction, qualified-immunity outcome tagging, and import into the evidence graph.

### Requirement: Civil Rights Without Representation Claim Review Task
PoliceConduct.org SHALL maintain a research task to locate and review court claims alleging police violations of civil rights where the record contains one or more patterns of potentially legitimate claims described in Joanna C. Schwartz, *Civil Rights Without Representation*, 64 Wm. & Mary L. Rev. 641 (2023).

#### Scenario: Locating candidate underrepresented civil-rights claims
- **WHEN** the court-claim review task is run
- **THEN** the system or reviewer SHALL search federal and state court sources for police-related civil-rights claims, including pro se Section 1983 complaints, screened prisoner or detainee cases, excessive-force cases, unlawful-arrest/search/seizure cases, First Amendment retaliation cases, conditions-of-confinement cases, qualified-immunity opinions, Monell claims, and cases dismissed on non-merits procedural grounds.

#### Scenario: Classifying potentially legitimate claim patterns
- **WHEN** a candidate claim is reviewed
- **THEN** the reviewer SHALL tag supported indicators only when the source record supports them, including force against a surrendered, compliant, prone, handcuffed, or otherwise restrained person; gratuitous force during routine stops or arrests; severe or unsanitary confinement conditions; officer statements suggesting malice; medical evidence corroborating injury; independent witness, video, or emergency-response corroboration; inconsistencies in police narratives; documented similar misconduct by the same officer, unit, or agency; parallel lawsuits; Monell pattern/custom allegations; or court language finding the claim cognizable, potentially cognizable, plausible, or sufficient to survive dismissal or summary judgment.

#### Scenario: Recording procedural red flags that dismissal may not reflect merits
- **WHEN** a candidate claim ended without merits adjudication
- **THEN** the reviewer SHALL record procedural red flags identified in *Civil Rights Without Representation*, including dismissal for failure to prosecute after prison transfer or returned mail, failure to complete summons or service paperwork, wrong defendant naming caused by information asymmetry, discovery missteps, repeated denial of counsel despite incarceration or restricted law-library access, plaintiff death or incapacity, prison or jail interference with litigation, and attorney-declination factors that do not themselves negate merit, such as low expected damages, incarceration, criminal record, geography, homelessness, mental illness, or non-catastrophic injury.

#### Scenario: Preserving claim-review provenance
- **WHEN** a potentially legitimate underrepresented claim is added to the backlog or evidence graph
- **THEN** the system SHALL record case caption, docket number, court, jurisdiction, filing date, disposition date, procedural posture, plaintiff representation status, alleged agency/officer, constitutional rights or issues, claim-pattern tags, dismissal/disposition basis, source URLs, downloaded docket/opinion/complaint file paths, content hashes, reviewer confidence, uncertainty notes, and recommended next action.

#### Scenario: Avoiding unsupported merit conclusions
- **WHEN** the reviewer cannot verify the factual basis for a claim from court records or reliable public sources
- **THEN** the claim SHALL be flagged as a source lead or theory-to-review only, and PoliceConduct.org SHALL NOT state that the claim is true, meritorious, or proven unless the source record independently supports that characterization.

### Requirement: Crawl Output Manifests
PoliceConduct.org SHALL preserve a manifest for each crawl, index, mirror, API pull, or manual extraction batch.

#### Scenario: Crawl or index job completes
- **WHEN** a crawl or index job runs
- **THEN** the system SHALL record seed URL(s), crawl scope, timestamp, tool/version, fetched URLs, skipped URLs, HTTP statuses, content hashes, extracted file paths, detected datasets, detected schemas, errors, access limitations, robots/terms notes, and recommended next action.
