## MODIFIED Requirements

### Requirement: Case descriptions reflect their source

Case pages SHALL NOT present the mixed legacy claims_summary field as a complaint narrative or an AI-generated summary, including in page descriptions. An AI summary SHALL come only from `ai_complaint_summary`, which intake writes. Intake SHALL word each claim in the summary as the plaintiff's allegation (for example "The plaintiff alleges ..."). The case page SHALL show the stored text unchanged under the heading "AI-generated summary of the complaint", followed by its stored links, each with its stored label; at least one link leads to the complaint.

#### Scenario: Legacy value contains only a cause code

- **WHEN** a case has a cause code or title in claims_summary
- **THEN** the case page does not display it as a complaint narrative

#### Scenario: AI summary renders with its label and link

- **WHEN** a case has a stored AI summary
- **THEN** the page shows it under "AI-generated summary of the complaint" with its stored links, each with its stored label
