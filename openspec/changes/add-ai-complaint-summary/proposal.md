## Why

A case page needs an AI summary of the complaint that says it is AI-generated and links to the complaint. The legacy `claims_summary` field mixes unrelated content and cannot serve as that summary.

The intake repository has a change with the same name. Intake owns all content: storage, acquisition, wording and the stored JSON contract. This change owns only how the case page renders what the database holds. The website generates no summary text and no state messages.

## What Changes

- The case page reads the optional `public.civil_cases.ai_complaint_summary` (JSON) that intake writes. The website checks only the fields it shows (design.md "Validation layers"). It shows the summary under "AI-generated summary of the complaint", with no lead-in disclaimer and no internal details, followed by every link intake stores for the summary, each with its stored label.
- The case page reads the optional `public.civil_cases.complaint_summary_unavailability` (JSON) that intake writes. When intake recorded why there is no summary, the page shows the message intake stored, every stored link with its stored label, and a /donate/ link.
- When both columns are null, the state is unknown and the page shows no complaint summary section.
- The modified `civil-case-content` requirement records that intake words each claim as the plaintiff's allegation and that the page keeps the AI summary label and the complaint link.
- Case page sections have no top padding on the facts section and a 1.6rem gap between sections.
- `claims_summary` stays separate and is never shown as a summary.

## Goals

- Show a stored AI summary of a case's complaint, labelled as AI-generated, with its stored links.
- When intake recorded why there is no summary, show intake's message and a /donate/ link.
- Show nothing when the state is unknown.

The change is done when every task in tasks.md is checked and verify.md records the final validation for both repositories.

## Non-Goals

- Writing, rewording or choosing summary text or state messages on the website.
- Showing confidence, hashes, model, dates, page references or procedural context on the page.
- Buying court records or promising to buy a specific record.
- Changing `claims_summary`.

## Alternatives Considered

- Reuse or clean `claims_summary`: rejected. It mixes cause codes, titles and other text; the base spec `civil-case-content` forbids showing it as a complaint narrative.
- A separate summary table: rejected. A case has at most one current summary, and two JSONB columns on `public.civil_cases` (`ai_complaint_summary` and `complaint_summary_unavailability`) keep them on the row the page already loads.
- A fixed "Read the complaint" link built from one source field: rejected. The stored targets differ (a CourtListener filing page, a docket page or a PDF), so intake stores each link with its own label and the page shows them all.
- Website-written messages for each unavailability reason: rejected. Intake owns the wording.
- Keep the strict provenance gate (hashes, model, dates, support required): rejected: requiring every metadata field blocked summaries that had text and a complaint link but incomplete metadata.

## Risks & Mitigations

- A wrong or misattributed summary: intake will store each summary with its labelled links (intake task "store links as a list"). A summary is corrected or removed through an intake correction; the next build shows the change.
- Intake and website contracts drift: `scripts/validate-schema-contract.mjs` requires both columns, and the website loader (`src/lib/data/ai-complaint-summary.ts`) fails the build on a stored value it cannot read.
- Readers take allegations as findings: intake will word each claim as the plaintiff's allegation (intake task "add a requirement that each claim ..."), and the page labels the text as an AI summary and links to the complaint.
- One unreadable stored row fails every build: intake's zod schema and the database CHECK reject such rows before they reach the database; the build error names the field so intake can correct it.
- A stored `javascript:` or other non-HTTP(S) link: the website build fails on any link that is not HTTP(S).

## Impact

Summaries and unavailability records arrive through intake corrections into existing rows; there is no separate backfill. Private source data stays outside both repositories.

Website files:

- Create: `src/lib/data/ai-complaint-summary.ts`, `src/components/AiComplaintSummary.astro`, `src/components/ComplaintSummaryUnavailable.astro`, `scripts/ai-complaint-summary.test.mjs`, `scripts/ai-complaint-render.test.mjs`
- Modify: `src/lib/data/civil-litigation-detail.ts`, `src/pages/civil-cases/[slug]/index.astro`, `src/styles/civic-ledger.css`, `scripts/validate-schema-contract.mjs`, `package.json`, `tests/e2e/civil-cases.spec.ts`, `src/components/EGM.md`, `src/lib/data/EGM.md`, `src/pages/civil-cases/[slug]/EGM.md`
