## ADDED Requirements

### Requirement: Stored AI complaint summary

The website SHALL render the AI complaint summary that intake stores in `public.civil_cases.ai_complaint_summary`, separately from `claims_summary`. The website SHALL NOT write, change or add to the summary text.

#### Scenario: Summary rendering

- **WHEN** a valid summary is loaded
- **THEN** the page shows the heading "AI-generated summary of the complaint", the stored text unchanged, and the stored links; other stored fields are not shown

### Requirement: Summary field checks

The website SHALL check only the summary fields it shows: the summary text is not blank, the summary has at least one stored link, and each link has a nonblank label and an HTTP(S) URL (design.md "Validation layers"). It SHALL fail the build, with an error that names the field, when a check fails. The website SHALL NOT check any other stored field; intake owns those.

#### Scenario: Summary without extra metadata

- **WHEN** a stored summary has text and one link but no hashes, model details, dates, paragraph support, limitations or procedural context
- **THEN** the website renders it

#### Scenario: Unreadable stored summary

- **WHEN** a stored summary has blank text, or a link with a blank label or a non-HTTP(S) URL
- **THEN** the build fails with an error that names the field

#### Scenario: Summary with no links

- **WHEN** a stored summary has an empty link list
- **THEN** the build fails with an error that names the field

### Requirement: Labelled summary links

The page SHALL show every link intake stores with a summary or an unavailability record, in stored order, each with its stored label. The website SHALL NOT assume a fixed number of stored links or supply labels for them. A summary SHALL have at least one stored link. An unavailability record MAY have none; the page then shows no links for it.

#### Scenario: Summary with two links

- **WHEN** a summary is stored with two links, each with its own label
- **THEN** the page shows both links with those labels, in stored order

### Requirement: Website text in summary sections

The website-written section headings ("AI-generated summary of the complaint", "Complaint summary") and the Donate link SHALL be the only website text in the complaint summary sections.

#### Scenario: Unavailability record with a stored message

- **WHEN** an unavailability record renders
- **THEN** the section shows the "Complaint summary" heading, the stored message, the stored links and the Donate link, and no other website-written sentence

### Requirement: Unavailable-summary states

For a case with an unavailability record in `public.civil_cases.complaint_summary_unavailability`, the page SHALL show intake's stored message, its stored links and the donation line. The website SHALL fail the build when the message is blank, a link has a blank label or a non-HTTP(S) URL, or the case has both a summary and an unavailability record. The website SHALL NOT check or show the stored reason.

#### Scenario: Recorded reason

- **WHEN** no summary exists and an unavailability record is stored
- **THEN** the page shows the stored message and stored links, and links to /donate/ to support buying court records and making them available free on CourtListener, without promising this particular purchase
- **AND** legacy `claims_summary` is not relabeled

#### Scenario: Complaint available but not summarized

- **WHEN** the unavailability record has reason `available_unsummarized`
- **THEN** the page shows the stored message, the stored links and the donation line

#### Scenario: Unreadable unavailability record

- **WHEN** a stored unavailability record has a blank message, or a link with a blank label or a non-HTTP(S) URL
- **THEN** the build fails with an error that names the field

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

The complaint summary section SHALL omit disclaimer prose, retrieval, model and confidence details, page references, hashes and procedural-context sections.

#### Scenario: Opening a stored summary

- **WHEN** the summary renders
- **THEN** readers see the text and the stored links without the internal provenance fields

### Requirement: Consistent case section spacing

Case detail pages SHALL set no top padding on the facts section (`.civic-section--facts`) and a 1.6rem gap between summary, personnel, agency and related-link sections (`.detail-body--sections`).

#### Scenario: Reading a case page

- **WHEN** a case detail page renders
- **THEN** the computed `row-gap` of `.detail-body--sections` equals 1.6 times the computed `font-size` of the root element, in px, and the computed `padding-top` of `.civic-section--facts` is 0
