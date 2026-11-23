## Done in intake

- [x] In intake's add-ai-complaint-summary change: add failing intake contract tests with synthetic data for complete and incomplete summaries (intake `test/ai-complaint-summary.test.ts`).
- [x] In intake's add-ai-complaint-summary change: add the schema migration and summary validator; regenerate intake contracts against a disposable database.
- [x] In intake's add-ai-complaint-summary change: import the private retained summary through the existing intake correction and data chain commands.
- [x] In intake's add-ai-complaint-summary change: require only summary text and complaint link in intake and SQL.

## To do in intake

- [ ] In intake's add-ai-complaint-summary change: delete the page-copy scenarios ("Source-bounded rendering", "No summary", "Confirmed missing copy", "Pending, failed, or unassessed") and the case-page sentence in "Available complaint without a reliable summary" from `openspec/changes/add-ai-complaint-summary/specs/ai-complaint-summary/spec.md`, and add a pointer to the website change of the same name. Pass: neither spec describes page rendering the other owns.
- [ ] In intake's add-ai-complaint-summary change: store links as a list, each with a URL and its own label, on both `ai_complaint_summary` and `complaint_summary_unavailability`; update the zod schema, the SQL CHECK and the stored rows. Name the list key and each link's URL and label keys in intake's spec. Pass: intake tests accept one or more labelled links on a summary and reject a blank label or a non-HTTP(S) URL; the intake spec names the keys.
- [ ] In intake's add-ai-complaint-summary change: store the public message for each unavailability record, written at an 8th-grade reading level and never claiming verification. Decide whether the public message reuses `detail` or is a new key, and name the key in intake's spec (intake change `move-complaint-summaries-to-generate` design section 4 proposes that `detail` holds the message). Pass: every stored unavailability record has a nonblank message.
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
- [ ] Blocked on intake task "store links as a list"; use the keys named in intake's spec. In `src/lib/data/ai-complaint-summary.ts`, replace the loader checks with the design.md "Validation layers" list; delete `date()` and `timestamp()`, the reason list and the `source.sourcePage`, `sourceUrl`, `checkedAt` and `detail` checks; drop those fields from the `AiComplaintSummary` and `ComplaintSummaryUnavailability` types. Give `text(value, field)` and `url(value, field)` a field argument. Field names use the column and key path with zero-based list indexes, for example `ai_complaint_summary.<links key>[1].<label key>`. `text()` throws `<field> must be nonblank text`. `url()` throws `<field> must be an HTTP(S) URL: <value>` both when `new URL()` fails and when the protocol is not `http:` or `https:`. Render every stored link with its stored label, in stored order, in `src/components/AiComplaintSummary.astro` and `src/components/ComplaintSummaryUnavailable.astro`, and remove the fixed "Read the complaint" links. Replace the missing-key loop in `scripts/ai-complaint-summary.test.mjs` with one test per check in the list. Update the EGM.md files of the changed folders. Remove design.md "Current link fields". Pass: a render test with two labelled links shows both labels and hrefs in order; the loader tests reject each failure in the list with an error that names the field, and accept a row missing every unchecked field; tests assert the exact message for blank summary text, a blank label, an unparseable URL and a `javascript:` URL.
- [ ] Blocked on intake tasks "store links as a list" and "store the public message"; use the keys named in intake's spec. Show the stored message and remove the website-written sentences and the reason-to-message mapping from `src/components/ComplaintSummaryUnavailable.astro`. Update the EGM.md files of the changed folders. Pass: `scripts/ai-complaint-render.test.mjs` asserts that a stored message renders unchanged and that none of the removed website sentences appears; `scripts/ai-complaint-summary.test.mjs` rejects a blank or missing message with an error that names the field.
- [ ] Show no complaint summary section when both columns are null: in `src/pages/civil-cases/[slug]/index.astro`, render `AiComplaintSummary` when a summary exists, else `ComplaintSummaryUnavailable` when an unavailability record exists, else nothing; make the `unavailability` prop of `src/components/ComplaintSummaryUnavailable.astro` non-null; remove `null` from the reason loop in `scripts/ai-complaint-render.test.mjs`; update the EGM.md files of the changed folders. Pass: the e2e both-null case (task below on `tests/e2e/civil-cases.spec.ts`) finds no complaint summary section and no Donate link; `npm run check` reports no type errors.
- [ ] Render a minimal summary (text and one link only) in the first test of `scripts/ai-complaint-render.test.mjs` and assert the heading, the paragraph and the link href.
- [ ] Blocked on intake tasks "store links as a list" and "store the public message"; use the keys named in intake's spec. In `tests/e2e/civil-cases.spec.ts`: replace the comment "This test visits every retained summary; the combined corpus has 180 pages." with "This test visits every case with a stored summary."; in the summary loop, replace the "Read the complaint" assertion with assertions that each stored link appears with its stored label and href, in stored order; choose the null case with `where ai_complaint_summary is null and complaint_summary_unavailability is null order by id limit 1` and assert the page has no complaint summary section and no Donate link; the test fails if no such row exists; add one case chosen by `where complaint_summary_unavailability is not null order by id limit 1` (no row IDs), asserting the stored message, every stored link with its label and href, and the Donate link; the test fails if no such row exists.
- [ ] In `tests/e2e/civil-cases.spec.ts`, on one case page, assert the computed `row-gap` of `.detail-body--sections` equals 1.6 times the computed `font-size` of the root element, in px, and the computed `padding-top` of `.civic-section--facts` is 0.

## Final validation

- [ ] In policeconduct.org, on the final head, run `npm ci` with the Node version from `mise.toml`, then `npm run validate` against the local database. Record the results in verify.md.
- [ ] In intake, on the final head, run that repository's full validation. Record the results in verify.md.
- [ ] With `npm run dev`, open one case page for each state, chosen by a query on `public.civil_cases` (no row IDs): a stored summary, one case with an unavailability record (record its reason), and both columns null. Record the slugs checked and what each page showed in verify.md.
- [ ] Record the repository, branch and full commit SHA for both repositories in verify.md.

## Retrospective

- [ ] Write `retrospective.md` before archiving.
