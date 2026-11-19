## Ownership

Intake owns all content: storage, acquisition, wording and the stored JSON contract (intake change `add-ai-complaint-summary`). The website renders what the database holds and writes no summary text or state messages.

## Data flow

1. Intake writes `ai_complaint_summary` or `complaint_summary_unavailability` on `public.civil_cases`.
2. `src/lib/data/civil-litigation-detail.ts` loads the case row by slug.
3. `requireAiComplaintSummary` and `requireComplaintSummaryUnavailability` in `src/lib/data/ai-complaint-summary.ts` throw on a value the website cannot read, and on a row that has both.
4. `src/pages/civil-cases/[slug]/index.astro` renders `AiComplaintSummary` when a summary exists, `ComplaintSummaryUnavailable` when a reason is recorded, and no complaint summary section when both columns are null.

## Validation layers

- Intake (zod, `.strict()`): rejects unknown keys and checks the format of optional fields when present.
- Database CHECK: checks key presence and the allowed reason. Whether it also checks field formats is intake's decision.
- Website loader: checks only nonblank summary text, labelled HTTP(S) links, allowed reasons, and that a row does not have both a summary and an unavailability record. The build fails on anything else.

## Current link fields

Until intake stores labelled links: `source.sourcePage` is the CourtListener page for the complaint filing. The unavailability `sourceUrl` is the CourtListener docket page, except for `available_unsummarized`, where it is the complaint PDF. Both are shown today as "Read the complaint".

## Decisions (owner, 2026-11-18/19)

- Ownership (Q15): the website change covers rendering only; intake owns content, wording and the contract.
- Donation line (Q16): shown for every recorded reason, including `available_unsummarized`.
- Allegations (Q17): intake words each claim as the plaintiff's allegation; the page keeps the "AI-generated summary of the complaint" heading and the link to the complaint. Recorded as a `civil-case-content` spec change.
- Links (Q18): any number of links, each with its own stored label; no fixed pair.
- Unknown state (Q19): when both columns are null the page shows nothing; `pending` and other reasons appear only when intake actually determined that state.
- Database format checks and state messages (Q20): not a website concern; intake writes the appropriate message.
