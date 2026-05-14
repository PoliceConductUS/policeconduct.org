## 1. Flow Structure

- [x] 1.1 Replace the `/report/new/` page framing with "Document a police interaction" and experience-first hero copy.
- [x] 1.2 Reorder the submission flow so validation and interaction questions appear before contact information.
- [x] 1.3 Add a manageable progression for the required sections and make optional sections visually distinct.
- [x] 1.4 Ensure the flow remains usable on mobile without horizontal scrolling or overlapping text.

## 2. Plain-Language Intake Fields

- [x] 2.1 Add the "Did this happen to you?" relationship question with the required four answer options.
- [x] 2.2 Add the "How would you describe it?" interaction type question with helpful, routine, confusing, mixed, concerning, severe, and not-sure options.
- [x] 2.3 Replace incident basics with minimal approximate details fields and copy that permits unknown or approximate answers.
- [x] 2.4 Replace the single narrative model with separate prompts for "What happened?", "How did you feel?", and "What else should people know?"
- [x] 2.5 Add the writing help disclosure with conclusion-to-observation examples for both concerning and positive interactions.

## 3. People, Evidence, And Purpose

- [x] 3.1 Replace officer scoring and conduct rubrics with optional descriptive people-involved entries.
- [x] 3.2 Ensure people-involved entries support name, badge number, or description; agency if known; what the person did or said; and whether the person was central.
- [x] 3.3 Update evidence and records fields so proof is optional and bodycam/complaint questions support yes, no, and not-sure answers.
- [x] 3.4 Add the "What do you want this report to help with?" purpose question with all required options.

## 4. Contact, Consent, And Submission

- [x] 4.1 Move contact fields near the end of the flow and update privacy copy to explain follow-up use and non-publication.
- [x] 4.2 Add clear pre-submit copy that no account or identity proof is required, but email confirmation is required before PoliceConduct.org can process the submission.
- [x] 4.3 Update final consent to distinguish experience, observations, beliefs, supporting context, verified records, and final findings.
- [x] 4.4 Change the submit control to "Submit my experience" or equivalent.
- [x] 4.5 Update client-side validation to match the new required fields and optional sections.

## 5. Submission Payload And Review Compatibility

- [x] 5.1 Update form payload construction to include relationship, interaction type, basic details, story fields, people involved, evidence metadata, purpose, contact, and consent.
- [x] 5.2 Ensure existing form submission delivery still works with the new payload shape.
- [x] 5.3 Preserve reviewer access to all submitted text, optional unknown answers, and contact details needed for follow-up.
- [x] 5.4 Preserve the existing unconfirmed post-submit state that tells users to check email and click the confirmation link.
- [x] 5.5 Preserve the existing confirmation success state that shows the submission ID only after email confirmation.
- [x] 5.6 Ensure confirmation success copy explains status lookup and email follow-up using the submission ID.
- [x] 5.7 Update analytics events to track form start, step progress, validation failures, optional section usage, initial submit success, and confirmation completion where available.

## 6. Verification

- [x] 6.1 Run the project validation or build command required for this repository.
- [x] 6.2 Verify the page in a desktop viewport for readability, field order, and submission copy.
- [x] 6.3 Verify the page in a mobile viewport for readability, operability, and no horizontal scrolling.
- [x] 6.4 Check that officer scoring and conduct rubrics no longer appear in the initial submission flow.
- [x] 6.5 Check that evidence, officer names, badge numbers, and legal classification are not required to submit.
- [x] 6.6 Check that email confirmation is explained before submission and that unconfirmed submissions are clearly described as not processable.
- [x] 6.7 Check that the submission ID appears only after email confirmation.
