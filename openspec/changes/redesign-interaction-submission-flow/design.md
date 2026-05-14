## Context

The existing submit page is a report intake experience for PoliceConduct.org. This change redesigns the intake as a plain-language experience documentation flow for people with firsthand police interactions. The flow must support the brand intent that every firsthand experience is legitimate and informative, whether helpful, routine, confusing, mixed, concerning, harmful, severe, or uncertain.

The main stakeholder is a person deciding whether their interaction is worth sharing. That person may be using a phone, may be stressed, may not know officer names or legal terms, and may not have evidence. Reviewers still need enough structure to evaluate, summarize, redact, and route submissions responsibly.

The redesign should avoid new dependencies and should fit the existing Astro form and client-side submission patterns unless implementation proves a simpler local structure is needed.

The existing submission system already requires email confirmation after initial form submission. The redesigned flow must preserve that behavior and make it clear before submission: users do not need to create an account or prove identity, but PoliceConduct.org cannot process unconfirmed submissions. The submission ID is shown only after the user clicks the confirmation link, and that ID is used for status lookup or email follow-up.

## Goals / Non-Goals

**Goals:**

- Increase completed firsthand submissions.
- Make the first screen clear that all firsthand experiences matter.
- Ask for what happened, how the person felt, and what else people should know as separate concepts.
- Preserve subjective experience without converting it into a final finding.
- Make evidence, officer names, badge numbers, and legal categories optional.
- Remove officer scoring and conduct rubrics from the initial submission flow.
- Use field labels and helper text that are easy to understand on first read.
- Keep severe harm direct and visible rather than softened by broad "balance" language.
- Preserve enough structure for reviewer follow-up and eventual publication.
- Preserve and clearly explain the existing email confirmation requirement.

**Non-Goals:**

- This change does not determine whether misconduct occurred.
- This change does not create a complete legal complaint workflow.
- This change does not require users to score officers.
- This change does not require new external services or dependencies.
- This change does not replace reviewer judgment, redaction, or verification.
- This change does not introduce account creation or identity proofing.

## Decisions

### Decision: Lead with experience documentation instead of report intake

Use "Document a police interaction" and "Submit my experience" language instead of report-first language.

Rationale: "Report" can imply a formal complaint, legal finding, or serious incident threshold. "Experience" better invites positive, routine, uncertain, and harmful interactions.

Alternative considered: Keep "Submit a report" and improve helper text. This is weaker because the first impression still suggests a formal complaint process.

### Decision: Ask contact information near the end

Collect contact information after the user has started the flow and understands why the submission matters.

Rationale: Asking for name and email first creates friction and distrust before the page establishes value. Late collection keeps privacy reassurance visible while reducing early abandonment.

Alternative considered: Keep contact first for reviewer convenience. Reviewer convenience is less important than completed firsthand submissions.

### Decision: Explain the existing email confirmation requirement before submission

Tell users before they submit that they will need to click a link in a confirmation email before PoliceConduct.org can process the submission. The copy should also state that no account or identity proof is required.

Rationale: Email confirmation is already part of the system, but users should not discover a required processing step only after submitting. Upfront copy keeps the flow supportive and avoids surprise while preserving low friction.

Alternative considered: Mention confirmation only on the post-submit screen. This is less clear because the user may not expect that processing depends on clicking the email link.

### Decision: Keep submission ID display after email confirmation

Show the submission ID only after the user confirms by clicking the email link, then explain that the ID can be used to check status on the website or follow up by email.

Rationale: Showing the ID after confirmation reinforces that the submission is now confirmed and processable. It also gives the user a durable reference without requiring an account.

Alternative considered: Show the submission ID immediately after initial form submission. This could imply the submission is already confirmed or being processed.

### Decision: Separate the story into three plain-language prompts

Ask "What happened?", "How did you feel?", and "What else should people know?"

Rationale: This structure validates subjective experience while giving reviewers and readers a clearer separation between events, feelings, beliefs, and context.

Alternative considered: Use one large narrative field. This is simpler technically but produces less structured, harder-to-review submissions and does less to teach the brand principle.

### Decision: Remove officer scoring from initial submission

Do not ask users to rate or score officer conduct during initial intake.

Rationale: Scoring is heavy, stressful, and can make the form feel adversarial or bureaucratic. Users should be asked to describe people involved and what each person did or said.

Alternative considered: Keep optional conduct rubrics behind a disclosure. Even optional rubrics can signal that the user must judge conduct before their experience counts.

### Decision: Keep optional people involved details

Allow users to add officers, deputies, troopers, dispatchers, supervisors, or other personnel when remembered.

Rationale: Separating people avoids treating everyone involved as if they did the same thing, while keeping names and badge numbers optional reduces friction.

Alternative considered: Use a single free-text "people involved" field. This is lower friction but weaker for reviewer follow-up and future pattern analysis.

### Decision: Use examples to explain observation-plus-experience writing

Include an expandable writing help section with "Less useful" and "More useful" examples.

Rationale: Abstract instructions such as "separate observations from conclusions" are hard to understand. Examples teach the desired pattern without invalidating feelings or conclusions.

Alternative considered: Short helper copy only. This is concise but not enough for many users, especially during stressful submissions.

## Risks / Trade-offs

- Early validation language could make the form feel less formal than a public record requires. -> Mitigation: final consent and helper text clearly state that PoliceConduct.org may review, summarize, redact, and distinguish experience from verified records or findings.
- Removing officer scoring may reduce structured conduct data. -> Mitigation: collect person-specific actions and allow reviewers to tag or structure conduct later.
- A longer multi-step flow may still feel burdensome. -> Mitigation: keep early questions short, allow "not sure," and make optional sections visibly optional.
- Severe harm and positive experiences in one flow may create tonal tension. -> Mitigation: use direct language for severe harm and avoid copy that implies positive stories offset harm.
- New field structure may require downstream payload handling changes. -> Mitigation: keep the submission payload explicit and map new fields to reviewer-friendly names during implementation.
- Users may miss the confirmation email and assume their submission is being processed. -> Mitigation: provide clear pre-submit copy, a supportive check-your-email state after initial submission, and plain instructions that unconfirmed submissions cannot be processed.

## Migration Plan

1. Replace the current `/report/new/` user experience with the new flow behind the same route.
2. Update form payload handling to accept the new field structure while preserving submission delivery.
3. Preserve the existing email confirmation flow, including the unconfirmed post-submit state and confirmed submission ID display.
4. Update analytics events to track start, step progression, abandonment points, initial submit success, and confirmation completion where available.
5. Verify the page on mobile and desktop before release.
6. Roll back by restoring the previous `/report/new/` implementation if submission delivery, email confirmation, or validation fails.

## Open Questions

- Should non-firsthand submitters complete the same flow or be routed to a lighter evidence/context path?
- Should "Severe harm or death" trigger additional crisis, legal, or safety resources on the page?
- Should reviewer tooling later include internal conduct tags derived from the new narrative fields?
