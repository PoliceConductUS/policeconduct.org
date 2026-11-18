# Document a police experience form (`src/pages/report/new`)

## Overview

Static Astro page for the route `/report/new/`. It renders the report intake form inside `PageShell` and a client script that builds repeatable "person" and "evidence" rows from HTML templates, applies prefill data, autosaves a draft to the server, restores a saved draft, sends analytics events and submits the form as JSON. The page has no route params, no `getStaticPaths`, no build-time data loader and no pagination.

## Interface

- Route `/report/new/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/report/new/`. `[index.astro:canonicalUrl="/report/new/"]`
- `PageShell` prop `title` is `Document a Police Experience | PoliceConduct.org`. `[index.astro:title="Document a Police Experience | PoliceConduct.org"]`
- `PageShell` prop `description` is "Share what happened during a police experience, how it felt, and what people should know." `[index.astro:description="Share what happened during a police experience, how it felt, and what people should know."]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, then the current page "Document a police experience". `[index.astro:label: "Document a police experience",]`
- `PageShell` prop `heading` is "Document a police experience". `[index.astro:heading="Document a police experience"]`
- Renders `PrefillBootstrap` (`src/components/PrefillBootstrap.astro`). `[index.astro:<PrefillBootstrap />]`
- The `header` slot holds two lede paragraphs and an info note saying contact information is not published and the submission must be confirmed by email. `[index.astro:<div class="alert alert-info mb-0" role="note">]`
- The form wrapper carries `data-report-form-shell`; the client script uses it as the place to show a load error. `[index.astro:<div class="col-12" data-report-form-shell>]`
- The form has `id="report-form"` and `novalidate`. `[index.astro:id="report-form"]`
- Section `start` holds the two classification questions. `[index.astro:<section id="start" class="report-new-section">]`
- Field `submitterRelationship` (select, required) with the options "Directly involved", "Witnessed in person", "Helping someone else" and "Records or evidence only". `[index.astro:name="submitterRelationship"]`
- Field `interactionType` (select, required) with the options "Helpful or positive", "Routine but worth sharing", "Confusing or uncomfortable", "Mixed", "Concerning or harmful", "Severe harm or death" and "I am not sure". `[index.astro:name="interactionType"]`
- Section `basic-details` holds the date, time, place, agency and case number fields. `[index.astro:<section id="basic-details" class="report-new-section">]`
- Field `incidentDate` (date, required). `[index.astro:name="incidentDate"]`
- Field `incidentTime` (time, optional). `[index.astro:name="incidentTime"]`
- Field `location` (text, required), label "City and state". `[index.astro:name="location"]`
- Field `setting` (text, optional). `[index.astro:name="setting"]`
- Field `agencyName` (text, optional, `autocomplete="organization"`). `[index.astro:name="agencyName"]`
- Field `caseNumber` (text, optional). `[index.astro:<input class="form-control" id="caseNumber" name="caseNumber" />]`
- Section `story` holds the three narrative fields and a collapsed block of writing examples. `[index.astro:<section id="story" class="report-new-section">]`
- Field `whatHappened` (textarea, required). `[index.astro:name="whatHappened"]`
- Field `howFelt` (textarea, required). `[index.astro:name="howFelt"]`
- Field `whatElse` (textarea, required). `[index.astro:name="whatElse"]`
- The writing examples sit in a `details` element with the class `report-new-disclosure`. `[index.astro:<details class="report-new-disclosure mt-4">]`
- Section `people-involved` holds an empty list container `data-people-list` that the script fills, and a button `data-add-person`. `[index.astro:<div data-people-list class="d-grid gap-3" aria-live="polite"></div>]`
- Section `records` holds two required selects, an empty list container `data-evidence-list` and a button `data-add-evidence`. `[index.astro:<div data-evidence-list class="d-grid gap-3" aria-live="polite"></div>]`
- Field `bodycamRequested` (select, required) with the options "Yes", "No" and "Not sure". `[index.astro:name="bodycamRequested"]`
- Field `complaintFiled` (select, required) with the options "Yes", "No" and "Not sure". `[index.astro:name="complaintFiled"]`
- Section `purpose` holds field `reportPurpose` (select, required) with seven options from "Preserve what happened" to "I am not sure". `[index.astro:name="reportPurpose"]`
- Section `contact` holds the submitter contact fields. `[index.astro:<section id="contact" class="report-new-section">]`
- Field `reporterName` (text, required, `autocomplete="name"`). `[index.astro:name="reporterName"]`
- Field `reporterEmail` (email, required, `autocomplete="email"`). `[index.astro:name="reporterEmail"]`
- Field `reporterPhone` (tel, optional, `autocomplete="tel"`). `[index.astro:name="reporterPhone"]`
- Field `preferredContact` (select, optional) with the options "Email", "Phone" and "Either is okay". `[index.astro:name="preferredContact"]`
- Field `consent` (checkbox, required) with the value `yes`. `[index.astro:name="consent"]`
- The "Review and submit" section holds a note that an email confirmation link is sent after submission. `[index.astro:After you submit, we will send you an email confirmation link.]`
- Submit button labelled "Submit my experience". `[index.astro:Submit my experience]`
- Template `person-template` defines one person row marked `data-person-involved`. `[index.astro:<template id="person-template">]`
- Person row field `people[0][name]` (text, required), label "Name or description". `[index.astro:name="people[0][name]"]`
- Person row field `people[0][badge]` (text, optional). `[index.astro:name="people[0][badge]"]`
- Person row field `people[0][department]` (text, optional), label "Agency, if known". `[index.astro:name="people[0][department]"]`
- Person row field `people[0][central]` (select, optional) with the options "Yes", "No" and "Not sure". `[index.astro:name="people[0][central]"]`
- Person row field `people[0][actions]` (textarea, optional). `[index.astro:name="people[0][actions]"]`
- Each person row has a button `data-remove-person`. `[index.astro:data-remove-person]`
- Template `evidence-template` defines one evidence row marked `data-evidence`. `[index.astro:<template id="evidence-template">]`
- Evidence row field `evidence[0][link]` (text, optional), label "Link or file name". `[index.astro:name="evidence[0][link]"]`
- Evidence row field `evidence[0][description]` (text, optional), label "What is this?". `[index.astro:name="evidence[0][description]"]`
- Each evidence row has a button `data-remove-evidence`. `[index.astro:data-remove-evidence]`
- Client script imports `flattenFormData`, `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- The script starts with a draft of one empty person and no evidence. `[index.astro:people: [emptyPerson()],]`
- `readReportData` reads the form with `flattenFormData(new FormData(form), "people", "evidence")`. `[index.astro:const structuredRoots = ["people", "evidence"];]`
- Unless `keepEmptyRows` is set, `readReportData` drops people without a name. `[index.astro:hasValue(person.name),]`
- Unless `keepEmptyRows` is set, `readReportData` drops evidence rows that have neither a link nor a description. `[index.astro:[item.link, item.description].some(hasValue),]`
- `renderPeople` rebuilds the people list from the template, one row per draft person, labelled "Person N". ``[index.astro:`Person ${index + 1}`;]``
- `renderEvidence` rebuilds the evidence list from the template, one row per draft evidence item, labelled "Evidence or record N". ``[index.astro:`Evidence or record ${index + 1}`;]``
- Row rendering rewrites the `for`, `id` and `name` attributes so the index in `people[N]`, `person-...-N`, `evidence[N]` and `evidence-...-N` matches the row position. ``[index.astro:.replace(/people\[\d+\]/g, `people[${index}]`)]``
- The remove button of a person row is hidden when only one person row exists. `[index.astro:removeButton.hidden = people.length === 1;]`
- Removing a person re-reads the form with empty rows kept, removes that row, re-renders and marks the draft dirty. `[index.astro:draft.people = nextPeople.length > 0 ? nextPeople : [emptyPerson()];]`
- Removing an evidence row re-reads the form with empty rows kept, removes that row, re-renders and marks the draft dirty. `[index.astro:draft.evidence = nextEvidence;]`
- The "Add another person" button appends an empty person, re-renders and marks the draft dirty. `[index.astro:draft.people = [...people, emptyPerson()];]`
- The "Add evidence or record" button appends an empty evidence item, re-renders and marks the draft dirty. `[index.astro:draft.evidence = [...evidence, emptyEvidence()];]`
- `validateEvidenceRows` sets a custom validity message on any evidence row with neither a link nor a description and returns `false` in that case. `[index.astro:"Add a link, file name, or description, or remove this evidence row.",]`
- `restoreDraft` replaces the draft, re-renders both lists and restores the other fields; checkboxes and radio buttons are checked by value, other fields get the first value. `[index.astro:const restoreDraft = (data: ReportDraft) => {]`
- `applyReportPrefill` reads prefill data with `window.__IPC_PREFILL__.readAndConsume(window.location.pathname)`. `[index.astro:? prefill.readAndConsume(window.location.pathname)]`
- Prefill uses only the `officer` object of the result; it fills the first person's `name` and `department` from `officer.name` and `officer.department`, and only when those values are empty. `[index.astro:if (!firstPerson.name && typeof officer.name === "string") {]`
- After prefill the script re-renders the people list and records the current form state as saved, so prefill alone does not trigger a draft save. `[index.astro:draft.people = [firstPerson, ...people.slice(1)];]`
- `saveDraft` sends `POST /api/forms/draft` with a JSON body holding `draftId` (or `null`) and `data`. `[index.astro:const draftEndpoint = "/api/forms/draft";]`
- When the save response includes `draftId`, the script stores it in the draft cookie. `[index.astro:setReportDraftId(result.draftId);]`
- The draft cookie is named `reportDraftId`. `[index.astro:const reportDraftCookieName = "reportDraftId";]`
- The draft cookie is written with `Path=/report/new/`, `SameSite=Lax` and `Max-Age=2592000`. ``[index.astro:)}; Path=/report/new/; SameSite=Lax; Max-Age=2592000`;]``
- `runDraftSave` skips the save when the draft is not dirty or when the form state equals the last saved state. `[index.astro:if (snapshot === lastSavedDraftSnapshot) {]`
- `runDraftSave` waits for a save already in flight and runs again afterward when a change arrived during it. `[index.astro:while (saveDraftInFlight) {]`
- `scheduleDraftSave` delays the autosave by 350 ms by default and restarts the delay on each call. `[index.astro:const scheduleDraftSave = (delay = 350) => {]`
- `flushDraftSave` cancels the pending delay and saves at once in `submit` mode. `[index.astro:return runDraftSave("submit");]`
- `loadDraft` does nothing when there is no draft cookie; otherwise it sends `GET /api/forms/draft?draftId=...` with `Accept: application/json`. ``[index.astro:`${draftEndpoint}?draftId=${encodeURIComponent(draftId)}`,]``
- `loadDraft` clears the draft cookie on a 204 response. `[index.astro:if (response.status === 204) {]`
- `loadDraft` stops without changes on any other non-OK response. `[index.astro:if (!response.ok) return;]`
- `loadDraft` restores the form from `payload.data` when present, and clears the draft cookie when the payload has no `data`. `[index.astro:restoreDraft(payload.data as ReportDraft);]`
- `loadDraft` ignores fetch and parse errors. `[index.astro:// Keep the locally restored draft when the optional server draft is unavailable.]`
- Analytics events go through `window.__IPC_ANALYTICS__?.track?.()` with `form_name: "reportNew"` added to every event. `[index.astro:window.__IPC_ANALYTICS__?.track?.(eventName, {]`
- Event `report_form_started` is sent once per page load with a `source` of `add_person`, `add_evidence`, `field_change` or `field_input`. `[index.astro:trackReportEvent("report_form_started", { source });]`
- Event `report_optional_section_used` is sent with `section: "people"` or `section: "evidence"` when a row is added. `[index.astro:trackReportEvent("report_optional_section_used", { section: "people" });]`
- Event `report_step_progress` is sent on every field `change` with `field_name` set to the field name, else its id, else `unknown`. `[index.astro:field_name: target.name || target.id || "unknown",]`
- Event `report_draft_saved` is sent with `save_mode` after a successful save. `[index.astro:trackReportEvent("report_draft_saved", { save_mode: saveMode });]`
- Event `report_draft_save_failed` is sent with `save_mode`, plus `response_status` when the server answered with a non-OK status. `[index.astro:response_status: response.status,]`
- Event `report_draft_loaded` is sent with `draft_source: "server"` after a draft is restored. `[index.astro:trackReportEvent("report_draft_loaded", { draft_source: "server" });]`
- The form `change` listener clears custom validity on the edited repeat row, marks the report started and marks the draft dirty. `[index.astro:form.addEventListener("change", (event) => {]`
- The form `input` listener does the same for inputs and textareas, without sending `report_step_progress`. `[index.astro:form.addEventListener("input", (event) => {]`
- On `submit` the script awaits `submitJsonForm` with `event`, `form`, `formName`, `onBeforeSubmit`, `validate`, `buildPayload`, `onSuccess`, `recaptchaAction` and `successKind`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "reportNew"`. `[index.astro:formName: "reportNew",]`
- `onBeforeSubmit` saves the draft first and throws a user-facing error when that save fails. `[index.astro:if (await flushDraftSave()) return;]`
- `validate` runs the evidence row check. `[index.astro:validate: () => validateRepeatRows(),]`
- `buildPayload` returns `data` (the filtered form data), `draftId` (or `null`), `formName` and `recaptchaToken`. `[index.astro:draftId: getReportDraftId() || null,]`
- `onSuccess` clears the draft cookie. `[index.astro:onSuccess: () => clearReportDraftCookie(),]`
- `submitJsonForm` receives `recaptchaAction: "reportNewSubmit"`. `[index.astro:recaptchaAction: "reportNewSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- On load the script renders both lists, applies prefill, records the saved state, adds the listeners, calls `initRecaptcha()` and then starts `loadDraft()` without awaiting it. `[index.astro:void loadDraft();]`

## Invariants

- When the form, either list container or either template is missing, the script shows the load error for `reportNew` and throws. `[index.astro:throw new Error("Report form missing required elements.");]`
- The people list always shows at least one person row. `[index.astro:: [emptyPerson()];]`
- A person row counts as data only when it has a name. `[index.astro:const filterPeople = (people: PersonDraft[] | undefined): PersonDraft[] =>]`
- The form is not submitted when the draft cannot be saved to the server first. `[index.astro:"We could not safely save your progress to the server. Please try again. If you cannot submit this form, print this page and email it to]`
- The draft cookie is scoped to the path `/report/new/` when set and when cleared. ``[index.astro:document.cookie = `${reportDraftCookieName}=; Max-Age=0; Path=/report/new/; SameSite=Lax`;]``
- Only one draft save request runs at a time. `[index.astro:saveDraftInFlight = saveDraft(saveMode);]`

## Side Effects

- Sends `POST` requests to `/api/forms/draft` from the browser while the visitor edits the form and before submission. `[index.astro:const response = await fetch(draftEndpoint, {]`
- Sends a `GET` request to `/api/forms/draft` on page load when a draft cookie exists. `[index.astro:const response = await fetch(]`
- Writes and clears the browser cookie `reportDraftId`. ``[index.astro:document.cookie = `${reportDraftCookieName}=${encodeURIComponent(]``
- Consumes prefill data for the current path through `readAndConsume`. `[index.astro:const result = prefill?.readAndConsume]`
- Sends analytics events through `window.__IPC_ANALYTICS__`. `[index.astro:form_name: "reportNew",]`
- Replaces the children of the people and evidence list containers on every re-render. `[index.astro:personList.replaceChildren();]`
- Sets and clears custom validity messages on evidence row fields. `[index.astro:getRepeatFields(root).forEach((field) => field.setCustomValidity(""));]`
- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async (event) => {]`

## Verification

- Run: `npm run test:e2e`
