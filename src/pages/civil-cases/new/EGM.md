# Suggest a new civil case form (`src/pages/civil-cases/new`)

## Overview

Static Astro page for the route `/civil-cases/new/`. It renders one HTML form named `civilLitigationNew` inside `PageShell` and a client script that prefills the form, starts reCAPTCHA and submits the form as JSON. The page has no route params, no `getStaticPaths`, no data loader and no pagination.

## Interface

- Route `/civil-cases/new/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/civil-cases/new/`. `[index.astro:canonicalUrl="/civil-cases/new/"]`
- `PageShell` prop `title` is `Submit Civil Litigation | PoliceConduct.org`. `[index.astro:title="Submit Civil Litigation | PoliceConduct.org"]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, Civil cases (`/civil-cases/`), then the current page "Suggest a new civil case". `[index.astro:label: "Suggest a new civil case",]`
- `PageShell` prop `heading` is "Suggest a new civil case". `[index.astro:heading="Suggest a new civil case"]`
- `PageShell` prop `lede` asks for the public record details needed to add a civil litigation entry. `[index.astro:lede="Provide the public record details we need to add a civil litigation entry to the statewide list."]`
- Renders `PrefillBootstrap` from `src/components/PrefillBootstrap.astro` before the form. `[index.astro:<PrefillBootstrap />]`
- The form section carries `data-form-shell="civilLitigationNew"`. `[index.astro:<section class="py-vh-2" data-form-shell="civilLitigationNew">]`
- Form `name="civilLitigationNew"` with `method="POST"`, class `needs-validation` and `novalidate`. `[index.astro:name="civilLitigationNew"]`
- Hidden field `form-name` with the value `civilLitigationNew`. `[index.astro:<input type="hidden" name="form-name" value="civilLitigationNew" />]`
- Honeypot text field `organization`. `[index.astro:<input type="text" name="organization" />]`
- Field `caseTitle` (text, required), label "Case title\*". `[index.astro:name="caseTitle"]`
- Field `jurisdiction` (text, required); help text asks for the two-letter state abbreviation or "federal". `[index.astro:name="jurisdiction"]`
- Field `causeNumber` (text, optional). `[index.astro:name="causeNumber"]`
- Field `court` (text, optional). `[index.astro:name="court"]`
- Field `filedDate` (date, optional). `[index.astro:name="filedDate"]`
- Field `plaintiff` (text, optional). `[index.astro:name="plaintiff"]`
- Field `defendants` (textarea, optional). `[index.astro:name="defendants"]`
- Field `summary` (textarea, optional), label "Summary / allegations". `[index.astro:name="summary"]`
- Field `links` (textarea, optional), label "Links (docket, news, filings)". `[index.astro:name="links"]`
- Field `reporterName` (text, required), label "Full name\*". `[index.astro:name="reporterName"]`
- Field `reporterEmail` (email, required), label "Email\*". `[index.astro:name="reporterEmail"]`
- Field `reporterPhone` (tel, optional). `[index.astro:name="reporterPhone"]`
- Submit button labelled "Submit civil litigation". `[index.astro:Submit civil litigation]`
- The page shows the text "Protected by reCAPTCHA Enterprise." above the submit button. `[index.astro:Protected by reCAPTCHA Enterprise.]`
- A note under the form links to `/about/contact`. `[index.astro:contact us directly via <a href="/about/contact">Contact us</a>.]`
- Client script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- When the form element is not found, the script calls `showFormLoadError` with the form name and the shell element. `[index.astro:showFormLoadError({ formName: "civilLitigationNew", shell });]`
- When `window.__IPC_PREFILL__.prefillFields` exists, the script calls it with `key` set to `window.location.pathname` and `root` set to the form. `[index.astro:const result = prefill.prefillFields({]`
- After prefill, when the returned `payload.jurisdiction` is a non-blank string, the script sets the `jurisdiction` input to the trimmed value, upper-cased only when it is exactly two characters long. `[index.astro:trimmed.length === 2 ? trimmed.toUpperCase() : trimmed;]`
- The script calls `initRecaptcha()` and adds a `submit` listener that awaits `submitJsonForm`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "civilLitigationNew"`. `[index.astro:formName: "civilLitigationNew",]`
- `submitJsonForm` receives `recaptchaAction: "civilLitigationNewSubmit"`. `[index.astro:recaptchaAction: "civilLitigationNewSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- The `onReset` callback removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`

## Invariants

- The submit handler, prefill and reCAPTCHA start only run in the branch where the form element exists. `[index.astro:if (!form) {]`
- The jurisdiction override only applies when the `jurisdiction` element is an `HTMLInputElement`. `[index.astro:jurisdictionInput instanceof HTMLInputElement &&]`

## Side Effects

- Prefill writes values into fields inside the form and may overwrite the `jurisdiction` input value. `[index.astro:jurisdictionInput.value =]`
- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async function (event) {]`

## Verification

- Run: `npm run test:e2e`
