## ADDED Requirements

### Requirement: Stored AI complaint summary

The website SHALL render the AI complaint summary that intake stores in `public.civil_cases.ai_complaint_summary`, separately from `claims_summary`. The website SHALL check only that the summary text is not blank and that each stored link has a nonblank label and an HTTP(S) URL; it SHALL fail the build on a stored value that does not pass. Other stored fields belong to intake's contract; their absence SHALL NOT stop rendering. The website SHALL NOT write, change or add to the summary text.

#### Scenario: Summary without extra metadata

- **WHEN** a stored summary has text and one link but no hashes, model details, dates, paragraph support, limitations or procedural context
- **THEN** the website renders it

#### Scenario: Summary rendering

- **WHEN** a valid summary is loaded
- **THEN** the page shows the heading "AI-generated summary of the complaint", the stored text unchanged, and the stored links; other stored fields are not shown

#### Scenario: Unreadable stored summary

- **WHEN** a stored summary has blank text, or a link with a blank label or a non-HTTP(S) URL
- **THEN** the build fails with an error that names the field

### Requirement: Labelled summary links

The page SHALL show every link intake stores with a summary or an unavailability record, in stored order, each with its stored label. The website SHALL NOT assume a fixed number of links or supply its own link labels.

#### Scenario: Summary with two links

- **WHEN** a summary is stored with two links, each with its own label
- **THEN** the page shows both links with those labels, in stored order

### Requirement: Unavailable-summary states

The website SHALL accept these stored reasons in `public.civil_cases.complaint_summary_unavailability`: `missing_copy`, `pending`, `retrieval_failed`, `authentication_failed`, `generation_failed` and `available_unsummarized`, and SHALL fail the build on any other reason or on a case with both a summary and an unavailability record. For a recorded reason, the page SHALL show intake's stored message, its stored links and the donation line.

#### Scenario: Recorded reason

- **WHEN** no summary exists and the unavailability record has any allowed reason
- **THEN** the page shows the stored message and stored links, and links to /donate/ to support buying court records and making them available free on CourtListener, without promising this particular purchase
- **AND** legacy `claims_summary` is not relabeled

#### Scenario: Complaint available but not summarized

- **WHEN** the unavailability record has reason `available_unsummarized`
- **THEN** the page shows the stored message, the stored links and the donation line

### Requirement: Unknown summary state

When both `ai_complaint_summary` and `complaint_summary_unavailability` are null, the summary state is unknown. The page SHALL NOT show a complaint summary section, a state message or the donation line for that case, and SHALL NOT imply the complaint is missing.

#### Scenario: No summary and no recorded reason

- **WHEN** both columns are null
- **THEN** the case page has no complaint summary section

### Requirement: Direct summary opening

The complaint summary section SHALL begin with its heading followed directly by the stored text, with no lead-in disclaimer.

#### Scenario: Reading a generated summary

- **WHEN** a stored AI complaint summary renders
- **THEN** no introductory "The following summarizes" disclaimer appears before the text

### Requirement: Concise complaint presentation

The page SHALL omit disclaimer prose, retrieval, model and confidence details, page references, hashes and procedural-context sections.

#### Scenario: Opening a stored summary

- **WHEN** the summary renders
- **THEN** readers see the text and the stored links without the internal provenance fields

### Requirement: Consistent case section spacing

Case detail pages SHALL set no top padding on the facts section (`.civic-section--facts`) and a 1.6rem gap between summary, personnel, agency and related-link sections (`.detail-body--sections`).

#### Scenario: Reading a case page

- **WHEN** a case detail page renders
- **THEN** the computed `row-gap` of `.detail-body--sections` is 1.6rem and the computed `padding-top` of `.civic-section--facts` is 0
