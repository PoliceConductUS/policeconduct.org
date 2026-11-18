# Suggest an agency edit form (`src/pages/agency/suggest-edit`)

## Overview

Static Astro page for the route `/agency/suggest-edit/`. It renders one HTML form named `agencyEdit` inside `PageShell`, a module script that starts reCAPTCHA and submits the form as JSON, and an inline script that prefills the fields. The page has no route params, no `getStaticPaths`, no data loader and no pagination.

## Interface

- Route `/agency/suggest-edit/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/agency/suggest-edit/`. `[index.astro:canonicalUrl="/agency/suggest-edit/"]`
- `PageShell` prop `title` is `Suggest Agency Edit | PoliceConduct.org`. `[index.astro:title="Suggest Agency Edit | PoliceConduct.org"]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, then the current page "Suggest an agency edit". `[index.astro:label: "Suggest an agency edit",]`
- `PageShell` prop `heading` is "Suggest an agency edit". `[index.astro:heading="Suggest an agency edit"]`
- `PageShell` prop `lede` is "Share corrections or missing information for an agency profile." `[index.astro:lede="Share corrections or missing information for an agency profile."]`
- Renders `PrefillBootstrap` from `src/components/PrefillBootstrap.astro` before the form. `[index.astro:<PrefillBootstrap />]`
- The form section carries `data-form-shell="agencyEdit"`. `[index.astro:<section class="py-vh-2" data-form-shell="agencyEdit">]`
- Form `name="agencyEdit"` with `method="POST"`, class `needs-validation` and `novalidate`. `[index.astro:name="agencyEdit"]`
- The form declares `data-netlify-honeypot="organization"`. `[index.astro:data-netlify-honeypot="organization"]`
- Hidden field `form-name` with the value `agencyEdit`. `[index.astro:<input type="hidden" name="form-name" value="agencyEdit" />]`
- Honeypot text field `organization`. `[index.astro:<input type="text" name="organization" />]`
- Field `agencyPath` (text, required), label "Agency profile path\*". `[index.astro:name="agencyPath"]`
- Field `agencyName` (text, optional). `[index.astro:name="agencyName"]`
- Field `jurisdiction` (text, optional), label "Jurisdiction (city/state/federal)". `[index.astro:name="jurisdiction"]`
- Field `departmentWebsite` (text, optional). `[index.astro:name="departmentWebsite"]`
- Field `departmentHead` (text, optional), label "Chief or agency lead". `[index.astro:name="departmentHead"]`
- Field `pastAgencyInfo` (textarea, optional). `[index.astro:name="pastAgencyInfo"]`
- Field `postOrgLink` (url, optional). `[index.astro:name="postOrgLink"]`
- Field `profilePhotoLink` (url, optional). `[index.astro:name="profilePhotoLink"]`
- Field `socialLinks` (textarea, optional). `[index.astro:name="socialLinks"]`
- Field `civilLitigation` (textarea, optional), label "Civil litigation corrections". `[index.astro:name="civilLitigation"]`
- Field `submitterName` (text, required). `[index.astro:name="submitterName"]`
- Field `submitterEmail` (email, required). `[index.astro:name="submitterEmail"]`
- Field `submitterPhone` (tel, optional). `[index.astro:name="submitterPhone"]`
- Submit button labelled "Submit edit suggestion". `[index.astro:Submit edit suggestion]`
- The page shows the text "Protected by reCAPTCHA Enterprise." above the submit button. `[index.astro:Protected by reCAPTCHA Enterprise.]`
- A note under the form links to `/about/contact`. `[index.astro:<a href="/about/contact">Contact us</a>.]`
- Module script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- When the form element is not found, the module script calls `showFormLoadError` with the form name and the shell element. `[index.astro:showFormLoadError({ formName: "agencyEdit", shell });]`
- Otherwise the module script calls `initRecaptcha()` and adds a `submit` listener that awaits `submitJsonForm`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "agencyEdit"`. `[index.astro:formName: "agencyEdit",]`
- `submitJsonForm` receives `recaptchaAction: "agencyEditSubmit"`. `[index.astro:recaptchaAction: "agencyEditSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- The `onReset` callback removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`
- A second script marked `is:inline` reads `window.__IPC_PREFILL__`. `[index.astro:<script is:inline>]`
- The inline script calls `prefillFields` with only `key: window.location.pathname` (no `root`). `[index.astro:const result = prefill.prefillFields({]`
- After prefill, when the returned `payload.jurisdiction` is a non-blank string, the inline script sets the `jurisdiction` input to that value trimmed and upper-cased. `[index.astro:jurisdictionInput.value = result.payload.jurisdiction]`

## Invariants

- The submit handler and reCAPTCHA start only run in the branch where the form element exists. `[index.astro:if (!form) {]`
- The jurisdiction override only applies when the `jurisdiction` element is an `HTMLInputElement`. `[index.astro:jurisdictionInput instanceof HTMLInputElement &&]`

## Side Effects

- The inline script writes prefill values into page fields and overwrites the `jurisdiction` input value. `[index.astro:.toUpperCase();]`
- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async function (event) {]`

## Verification

- Run: `npm run test:e2e`
