## ADDED Requirements

### Requirement: Experience-first submission framing

The system SHALL present the submission page as a way to document a police interaction, not only as a formal report or complaint.

#### Scenario: User lands on the submission page

- **WHEN** a user opens the submission page
- **THEN** the page presents a title equivalent to "Document a police interaction"
- **AND** the page states that helpful, routine, confusing, frightening, harmful, respectful, and life-changing experiences can all be shared
- **AND** the page states that the user does not need to prove misconduct to share what happened
- **AND** the page states that contact information is not published

### Requirement: Plain-language copy

The system MUST use plain-language civic writing throughout the submission flow.

#### Scenario: User reads form labels and helper text

- **WHEN** a user reads labels, buttons, validation messages, or helper text
- **THEN** labels use direct language such as "What happened?", "How did you feel?", and "What else should people know?"
- **AND** field labels are understandable at roughly a 5th- to 6th-grade reading level
- **AND** helper text is understandable at roughly a 6th- to 8th-grade reading level
- **AND** abstract labels such as "Subjective experience," "Desired outcome," and "Provide context" are avoided for primary field labels

### Requirement: Firsthand relationship question

The system SHALL ask how the submitter is connected to the interaction before asking detailed incident questions.

#### Scenario: User identifies their connection

- **WHEN** a user begins the flow
- **THEN** the system asks "Did this happen to you?" or equivalent
- **AND** the available choices include direct personal involvement, in-person witness, helping someone else share, and having records or evidence without being present

### Requirement: Full-spectrum interaction type

The system SHALL allow users to describe the interaction across the full spectrum of experiences.

#### Scenario: User describes the interaction type

- **WHEN** a user reaches the interaction type step
- **THEN** the system offers choices for helpful or positive, routine but worth sharing, confusing or uncomfortable, mixed, concerning or harmful, severe harm or death, and not sure
- **AND** the system states that this choice does not decide whether misconduct happened
- **AND** the system states that the choice helps PoliceConduct.org understand what the interaction felt like to the user

### Requirement: Minimal basic details

The system SHALL collect only the basic details needed to locate and understand the interaction.

#### Scenario: User enters basic details

- **WHEN** a user reaches the basic details step
- **THEN** the system asks for approximate date, optional approximate time, city and state, location or setting, agency if known, and optional case, citation, or report number
- **AND** the system tells users approximate details are acceptable
- **AND** the system allows users to leave unknown optional fields blank or write "not sure" where text entry is available

### Requirement: Separate event, feeling, and context prompts

The system SHALL collect the user's account using separate prompts for events, feelings, and additional context.

#### Scenario: User tells their story

- **WHEN** a user reaches the story section
- **THEN** the system asks what happened
- **AND** the system asks how the user felt during or after the interaction
- **AND** the system asks what else people should know
- **AND** the helper text explains that feelings such as helped, respected, confused, ignored, intimidated, unsafe, relieved, harmed, grateful, afraid, or unsure may be included

### Requirement: Writing examples for conclusions and observations

The system SHALL provide examples that show how to connect feelings and conclusions to observable details.

#### Scenario: User opens writing help

- **WHEN** a user opens the writing help section
- **THEN** the system shows examples with a less useful conclusion-only statement and a more useful version that includes what the user saw, heard, felt, or experienced
- **AND** the examples include at least one concerning interaction and at least one positive interaction
- **AND** the helper text states that users do not need to remove feelings or conclusions

### Requirement: Optional people involved details

The system SHALL let users add officers or other police personnel without requiring names, badge numbers, or scores.

#### Scenario: User adds people involved

- **WHEN** a user chooses to add a person involved
- **THEN** the system allows a name, badge number, or description
- **AND** the system allows agency if known
- **AND** the system asks what that person did or said
- **AND** the system asks whether that person was central to what happened
- **AND** name, badge number, and agency are optional

### Requirement: No initial officer scoring

The system MUST NOT ask users to score or rate officer conduct during the initial submission flow.

#### Scenario: User completes the submission flow

- **WHEN** a user moves through the initial submission flow
- **THEN** the system does not present officer conduct ratings, officer scoring rubrics, or required trait assessments

### Requirement: Optional evidence and records

The system SHALL invite evidence and records without making proof a condition of submission.

#### Scenario: User reaches evidence and records

- **WHEN** a user reaches the evidence and records section
- **THEN** the system allows photos, videos, documents, links, or records
- **AND** the system asks whether bodycam was requested using yes, no, or not sure choices
- **AND** the system asks whether a complaint was filed using yes, no, or not sure choices
- **AND** the system allows optional citation, case, or report numbers
- **AND** the system states that proof is not required to share what happened

### Requirement: Submission purpose

The system SHALL ask what the user wants the report to help with.

#### Scenario: User selects desired help

- **WHEN** a user reaches the purpose step
- **THEN** the system asks "What do you want this report to help with?" or equivalent
- **AND** the available choices include preserving what happened, recognizing helpful conduct, helping others see a pattern, supporting accountability or review, adding context to an officer or agency record, helping the user understand whether it was normal, and not sure

### Requirement: Late contact and privacy collection

The system SHALL collect contact information near the end of the flow and explain how it is used.

#### Scenario: User reaches contact and privacy

- **WHEN** a user reaches the contact and privacy step
- **THEN** the system asks for name, email, optional phone, and preferred contact method
- **AND** the system states that contact information is used for follow-up or clarification
- **AND** the system states that contact information is not published
- **AND** the system states that no account or proof of identity is required
- **AND** the system states that the user must click a link in a confirmation email before PoliceConduct.org can process the submission

### Requirement: Final consent distinguishes experience from findings

The system SHALL require final consent that accurately describes how PoliceConduct.org may handle the submission.

#### Scenario: User submits their experience

- **WHEN** a user reaches final review and consent
- **THEN** the system requires affirmation that the user is sharing truthfully to the best of their knowledge
- **AND** the system states that PoliceConduct.org may review, summarize, redact, or ask for clarification before publishing
- **AND** the system states that the report may include what happened, what the user saw or heard, how the user felt, what the user believes it meant, and supporting context
- **AND** the system states that PoliceConduct.org may distinguish those elements from verified records or final findings
- **AND** the submit control uses language equivalent to "Submit my experience"

### Requirement: Existing email confirmation flow is preserved

The system SHALL preserve the existing email confirmation behavior and explain it with supportive, plain-language copy.

#### Scenario: User submits initial form

- **WHEN** a user submits the initial form successfully
- **THEN** the system shows a supportive check-your-email state
- **AND** the system states that the submission is not confirmed yet
- **AND** the system states that PoliceConduct.org cannot process the submission until the user clicks the confirmation link
- **AND** the system does not show the submission ID before email confirmation

#### Scenario: User confirms submission by email

- **WHEN** a user clicks the confirmation link from the email
- **THEN** the system confirms that the submission has been confirmed
- **AND** the system shows the submission ID
- **AND** the system explains that the submission ID can be used to check status on the website or follow up by email

### Requirement: Mobile-stressed-user usability

The system SHALL keep the flow usable for a stressed user on a mobile device.

#### Scenario: User completes the form on mobile

- **WHEN** a user uses the submission flow on a mobile viewport
- **THEN** the form remains readable and operable without horizontal scrolling
- **AND** required steps are presented in a manageable progression
- **AND** optional sections are visually distinguishable from required sections
- **AND** the user can answer "not sure" where uncertainty is expected
