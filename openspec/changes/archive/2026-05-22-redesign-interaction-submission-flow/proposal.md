## Why

PoliceConduct.org needs a submission flow that invites people to document firsthand police interactions without making them feel they must prove misconduct, know legal terms, identify every officer, or have evidence before their experience matters. The current opportunity is to align intake with the intended brand: a plain-language civic record for harm, positive deviance, routine encounters, uncertainty, and everything in between.

## What Changes

- Replace the report-first framing with an experience documentation flow centered on "Document a police interaction."
- Optimize the first screen and early questions for people with direct personal interactions with police.
- Welcome helpful, routine, confusing, mixed, concerning, harmful, severe, and uncertain experiences.
- Ask separately for what happened, how the person felt, and what else people should know.
- Add writing examples that show how to connect conclusions and feelings to observable details.
- Make officer/personnel details optional and descriptive rather than scored.
- Remove officer scoring and conduct rubrics from the initial submission flow.
- Make evidence optional and clearly state that proof is not required to share what happened.
- Move contact and privacy collection near the end of the flow.
- Preserve the existing email confirmation flow and explain it clearly before submission: users do not need an account or proof of identity, but PoliceConduct.org cannot process an unconfirmed submission.
- Use plain-language copy with field labels around a 5th- to 6th-grade reading level and helper text around a 6th- to 8th-grade reading level.
- Treat severe harm directly and avoid softening or balancing it away.

## Capabilities

### New Capabilities

- `interaction-submission-flow`: Requirements for a plain-language, outcome-focused intake flow for firsthand law-enforcement interaction submissions.

### Modified Capabilities

None.

## Impact

- Affects the `/report/new/` submission experience and any client-side behavior that supports that flow.
- Affects form payload shape, submission copy, validation rules, analytics events, and review workflow expectations for newly structured fields.
- Must preserve the existing post-submit email confirmation behavior, including the unconfirmed state, confirmation email link, confirmation success state, submission ID display after confirmation, status lookup, and email follow-up expectations.
- May require downstream reviewer or API handling for new narrative sections, interaction type, motivation, personnel descriptions, and optional evidence/record metadata.
- No new external dependencies are expected.
