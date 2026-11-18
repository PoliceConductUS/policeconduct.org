# Suggest a civil case edit form (`src/pages/civil-cases/suggest-edit`)

## Overview

Static Astro page for the route `/civil-cases/suggest-edit/`. It renders one HTML form named `civilLitigationEdit` inside `PageShell` and a client script that starts reCAPTCHA and submits the form as JSON. Unlike the other suggestion forms it does not render `PrefillBootstrap` and has no prefill code. The page has no route params, no `getStaticPaths`, no data loader and no pagination.

## Interface

- Route `/civil-cases/suggest-edit/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/civil-cases/suggest-edit/`. `[index.astro:canonicalUrl="/civil-cases/suggest-edit/"]`
- `PageShell` prop `title` is `Edit Civil Litigation | PoliceConduct.org`. `[index.astro:title="Edit Civil Litigation | PoliceConduct.org"]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, Civil cases (`/civil-cases/`), then the current page "Suggest an edit". `[index.astro:label: "Suggest an edit",]`
- `PageShell` prop `heading` is "Suggest an edit". `[index.astro:heading="Suggest an edit"]`
- `PageShell` prop `lede` is "Provide corrections or updates to a published civil case." `[index.astro:lede="Provide corrections or updates to a published civil case."]`
- The only import in the page frontmatter is `PageShell`. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- The form section carries `data-form-shell="civilLitigationEdit"`. `[index.astro:<section class="py-vh-2" data-form-shell="civilLitigationEdit">]`
- Form `name="civilLitigationEdit"` with `method="POST"`, class `needs-validation` and `novalidate`. `[index.astro:name="civilLitigationEdit"]`
- Hidden field `form-name` with the value `civilLitigationEdit`. `[index.astro:<input type="hidden" name="form-name" value="civilLitigationEdit" />]`
- Honeypot text field `organization`. `[index.astro:<input type="text" name="organization" />]`
- Field `casePath` (text, required), label "Civil litigation path\*". `[index.astro:name="casePath"]`
- Field `caseTitle` (text, optional). `[index.astro:name="caseTitle"]`
- Field `updateDetails` (textarea, optional), label "Correction details". `[index.astro:name="updateDetails"]`
- Field `publicSource` (textarea, optional), label "Source links". `[index.astro:name="publicSource"]`
- Field `reporterName` (text, required), label "Full name\*". `[index.astro:name="reporterName"]`
- Field `reporterEmail` (email, required), label "Email\*". `[index.astro:name="reporterEmail"]`
- Field `reporterPhone` (tel, optional). `[index.astro:name="reporterPhone"]`
- Submit button labelled "Submit correction". `[index.astro:Submit correction]`
- The page shows the text "Protected by reCAPTCHA Enterprise." above the submit button. `[index.astro:Protected by reCAPTCHA Enterprise.]`
- Client script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- When the form element is not found, the script calls `showFormLoadError` with the form name and the shell element. `[index.astro:showFormLoadError({ formName: "civilLitigationEdit", shell });]`
- Otherwise the script calls `initRecaptcha()` and adds a `submit` listener that awaits `submitJsonForm`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "civilLitigationEdit"`. `[index.astro:formName: "civilLitigationEdit",]`
- `submitJsonForm` receives `recaptchaAction: "civilLitigationEditSubmit"`. `[index.astro:recaptchaAction: "civilLitigationEditSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- The `onReset` callback removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`

## Invariants

- The submit handler and reCAPTCHA start only run in the branch where the form element exists. `[index.astro:if (!form) {]`

## Side Effects

- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async function (event) {]`

## Verification

- Run: `npm run test:e2e`
