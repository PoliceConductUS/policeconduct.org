## Ownership

Intake owns all content: storage, acquisition, wording and the stored JSON contract (intake change `add-ai-complaint-summary`). The website renders what the database holds and writes no summary text or state messages.

## Data flow

1. Intake writes `ai_complaint_summary` or `complaint_summary_unavailability` on `public.civil_cases`.
2. `src/lib/data/civil-litigation-detail.ts` loads the case row by slug.
3. `requireAiComplaintSummary` and `requireComplaintSummaryUnavailability` in `src/lib/data/ai-complaint-summary.ts` throw on a value the website cannot read, and on a row that has both.
4. `src/pages/civil-cases/[slug]/index.astro` renders `AiComplaintSummary` when a summary exists, `ComplaintSummaryUnavailable` when a reason is recorded, and no complaint summary section when both columns are null.

## Stored contract (read side)

The website reads only the summary text, the link list (each link's URL and label) and the unavailability message. Intake's spec for `add-ai-complaint-summary` names their keys (intake tasks "store links as a list" and "store the public message"). Website tasks that read these keys use those names and wait for those intake tasks.

## Validation layers

- Intake (zod, `.strict()`): rejects unknown keys and checks the format of optional fields when present.
- Database CHECK: checks key presence and the allowed reason. Whether it also checks field formats is intake's decision.
- Website loader: these are the only website checks. The build fails when any check fails, and the error names the field.
  - `ai_complaint_summary`: the summary text is a nonblank string; the link list has at least one link; each link has a nonblank label and an HTTP(S) URL.
  - `complaint_summary_unavailability`: the message is a nonblank string; the link list may be empty; each link has a nonblank label and an HTTP(S) URL.
  - A row does not have both a summary and an unavailability record.

  The loader does not check the reason, dates, document identity or any other stored field. Intake's zod schema and the database CHECK own those (intake change `add-ai-complaint-summary`).

## Current link fields

Until intake stores labelled links: `source.sourcePage` is the CourtListener page for the complaint filing. The unavailability `sourceUrl` is the CourtListener docket page, except for `available_unsummarized`, where it is the complaint PDF. Today the summary links `source.sourcePage` as "Read the complaint", and the unavailable section links `sourceUrl` as "Read the complaint" only for `available_unsummarized`.

## Decisions (owner, 2026-11-18/19)

- Ownership: the website change covers rendering only; intake owns content, wording and the contract.
- Donation line: shown for every recorded reason, including `available_unsummarized`.
- Allegations: intake words each claim as the plaintiff's allegation; the page keeps the "AI-generated summary of the complaint" heading and the link to the complaint. Recorded as a `civil-case-content` spec change.
- Links: any number of links, each with its own stored label; no fixed pair.
- Unknown state: when both columns are null the page shows nothing; `pending` and other reasons appear only when intake actually determined that state.
- Database format checks and state messages: not a website concern; intake writes the appropriate message.
