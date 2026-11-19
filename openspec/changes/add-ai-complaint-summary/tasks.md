## Done in intake

- [x] In intake's add-ai-complaint-summary change: add failing intake contract tests with synthetic data for complete and incomplete summaries (intake `test/ai-complaint-summary.test.ts`).
- [x] In intake's add-ai-complaint-summary change: add the schema migration and summary validator; regenerate intake contracts against a disposable database.
- [x] In intake's add-ai-complaint-summary change: import the private retained summary through the existing intake correction and data chain commands.
- [x] In intake's add-ai-complaint-summary change: require only summary text and complaint link in intake and SQL.

## To do in intake

- [ ] In intake's add-ai-complaint-summary change: delete the page-copy scenarios ("Source-bounded rendering", "No summary", "Confirmed missing copy", "Pending, failed, or unassessed") and the case-page sentence in "Available complaint without a reliable summary" from `openspec/changes/add-ai-complaint-summary/specs/ai-complaint-summary/spec.md`, and add a pointer to the website change of the same name. Pass: neither spec describes page rendering the other owns.
- [ ] In intake's add-ai-complaint-summary change: store links as a list, each with a URL and its own label, on both `ai_complaint_summary` and `complaint_summary_unavailability`; update the zod schema, the SQL CHECK and the stored rows. Pass: intake tests accept one or more labelled links and reject a blank label or a non-HTTP(S) URL.
- [ ] In intake's add-ai-complaint-summary change: store the public message for each unavailability record, written at an 8th-grade reading level and never claiming verification. Pass: every stored unavailability record has a nonblank message.
- [ ] In intake's add-ai-complaint-summary change: record `pending` or any other reason only when intake actually determined that state; leave both columns null when the state is unknown (for example, when no complaint was identified). Pass: an intake test shows an undetermined case keeps both columns null.
- [ ] In intake's add-ai-complaint-summary change: add a requirement that each claim in a summary is worded as the plaintiff's allegation, and enforce it in the review prompt or receipt. Pass: the intake spec states the rule and an intake test or receipt check covers it.
- [ ] In intake's add-ai-complaint-summary change: state the fixed list of optional summary fields and that intake rejects unknown keys.
- [ ] In intake's add-ai-complaint-summary change: decide whether the database CHECK on `complaint_summary_unavailability` also checks field formats (the website build already fails on a value it cannot read).
- [ ] In intake's add-ai-complaint-summary change: in `tasks.md`, replace "all 19 retained summaries" with "every retained summary".

## Website implementation

- [x] Add website validation and render tests; implement the loader check and the summary component (`src/lib/data/ai-complaint-summary.ts`, `src/components/AiComplaintSummary.astro`, `scripts/ai-complaint-summary.test.mjs`, `scripts/ai-complaint-render.test.mjs`).
- [x] Require only summary text and complaint link in the website loader, and test minimal summaries, retained metadata and invalid rendered fields.
- [x] Require both columns in the schema contract (`scripts/validate-schema-contract.mjs`) and run both test files in `npm run test:client` (`package.json`).

## Case page presentation

- [x] Open the summary section with its heading and the text, with no lead-in disclaimer (`src/components/AiComplaintSummary.astro`; `scripts/ai-complaint-render.test.mjs`).
- [x] Leave confidence, hashes, retrieval, model, page references and procedural context off the page (`src/components/AiComplaintSummary.astro`; `scripts/ai-complaint-render.test.mjs`).
- [x] Show the donation line for every recorded reason, including `available_unsummarized` (`src/components/ComplaintSummaryUnavailable.astro`; `scripts/ai-complaint-render.test.mjs`).
- [x] Set case section spacing (`src/styles/civic-ledger.css` `.civic-section--facts`, `.detail-body--sections`).
- [ ] After intake stores labelled links: render every stored link with its stored label, in stored order, for summaries and unavailability records; remove the fixed "Read the complaint" links (`src/lib/data/ai-complaint-summary.ts`, `src/components/AiComplaintSummary.astro`, `src/components/ComplaintSummaryUnavailable.astro`). Pass: a render test with two labelled links shows both labels and hrefs in order; the loader test rejects a blank label and a non-HTTP(S) URL.
- [ ] After intake stores the message: show the stored message for each recorded reason and remove the website-written sentences from `src/components/ComplaintSummaryUnavailable.astro`. Pass: `scripts/ai-complaint-render.test.mjs` asserts the stored message renders for each of the six reasons and that no website-written reason sentence appears.
- [ ] Show no complaint summary section when both columns are null (`src/pages/civil-cases/[slug]/index.astro`, `src/components/ComplaintSummaryUnavailable.astro`). Pass: a render test passes null and finds no section, no message and no Donate link.
- [ ] Give the loader's URL check a field name: `url()` wraps `new URL(value)` and throws `<field> must be an HTTP(S) URL: <value>`; move the `date()` body into `timestamp()` and delete `date()` (`src/lib/data/ai-complaint-summary.ts`). Pass: `scripts/ai-complaint-summary.test.mjs` asserts the error names the field.
- [ ] Render a minimal summary (text and one link only) in the first test of `scripts/ai-complaint-render.test.mjs` and assert the heading, the paragraph and the link href.
- [ ] In `tests/e2e/civil-cases.spec.ts`: replace the comment "This test visits every retained summary; the combined corpus has 180 pages." with "This test visits every case with a stored summary."; change the null-case check to assert no complaint summary section; add one case per recorded reason, each chosen by a query on `complaint_summary_unavailability ->> 'reason'` (no row IDs), asserting the stored message, stored links and Donate link. A reason with no corpus row is reported, not skipped silently.
- [ ] In `tests/e2e/civil-cases.spec.ts`, on one case page, assert the computed `row-gap` of `.detail-body--sections` is 1.6rem and the computed `padding-top` of `.civic-section--facts` is 0.

## Final validation

- [ ] In policeconduct.org, on the final head, run `npm ci` with the Node version from `mise.toml`, then `npm run validate` against the local database. Record the results in verify.md.
- [ ] In intake, on the final head, run that repository's full validation. Record the results in verify.md.
- [ ] With `npm run dev`, open one case page for each state, chosen by a query on `public.civil_cases` (no row IDs): a stored summary, `missing_copy`, `available_unsummarized`, `pending`, and both columns null. Record the slugs checked and what each page showed in verify.md.
- [ ] Record the repository, branch and full commit SHA for both repositories in verify.md.

## Retrospective

- [ ] Write `retrospective.md` before archiving.
