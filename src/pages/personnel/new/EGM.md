# Suggest new personnel form (`src/pages/personnel/new`)

## Overview

Static Astro page for the route `/personnel/new/`. It renders one HTML form named `personnelNew` inside `PageShell`, a module script that starts reCAPTCHA and submits the form as JSON, and an inline script that prefills the fields. The page has no route params, no `getStaticPaths`, no data loader and no pagination.

## Interface

- Route `/personnel/new/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/personnel/new/`. `[index.astro:canonicalUrl="/personnel/new/"]`
- `PageShell` prop `title` is `Suggest New Personnel | PoliceConduct.org`. `[index.astro:title="Suggest New Personnel | PoliceConduct.org"]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, Personnel (`/personnel/`), then the current page "Suggest new personnel". `[index.astro:{ label: "Suggest new personnel", href: "/personnel/new/", current: true },]`
- `PageShell` prop `heading` is "Suggest new personnel". `[index.astro:heading="Suggest new personnel"]`
- `PageShell` prop `lede` is "Share public, verifiable details so we can add a new personnel profile." `[index.astro:lede="Share public, verifiable details so we can add a new personnel profile."]`
- Renders `PrefillBootstrap` from `src/components/PrefillBootstrap.astro` before the form. `[index.astro:<PrefillBootstrap />]`
- The form section carries `data-form-shell="personnelNew"`. `[index.astro:<section class="py-vh-2" data-form-shell="personnelNew">]`
- Form `name="personnelNew"` with `method="POST"`, class `needs-validation` and `novalidate`. `[index.astro:name="personnelNew"]`
- Hidden field `form-name` with the value `personnelNew`. `[index.astro:<input type="hidden" name="form-name" value="personnelNew" />]`
- Honeypot text field `organization`. `[index.astro:<input type="text" name="organization" />]`
- Field `firstName` (text, required). `[index.astro:name="firstName"]`
- Field `lastName` (text, required). `[index.astro:name="lastName"]`
- Field `suffix` (text, optional). `[index.astro:name="suffix"]`
- Field `badgeNumber` (text, optional). `[index.astro:name="badgeNumber"]`
- Field `currentAgency` (text, required). `[index.astro:name="currentAgency"]`
- Field `currentAgencyCity` (text, optional). `[index.astro:name="currentAgencyCity"]`
- Field `currentAgencyState` (text, optional). `[index.astro:name="currentAgencyState"]`
- Field `currentAgencyStart` (date, optional). `[index.astro:name="currentAgencyStart"]`
- Field `pastEmployers` (textarea, optional). `[index.astro:name="pastEmployers"]`
- Field `civilLitigation` (textarea, optional). `[index.astro:name="civilLitigation"]`
- Field `reportLinks` (textarea, optional), label "Reports". `[index.astro:name="reportLinks"]`
- Field `profilePhotoLink` (url, optional). `[index.astro:name="profilePhotoLink"]`
- Field `submitterName` (text, required). `[index.astro:name="submitterName"]`
- Field `submitterEmail` (email, required). `[index.astro:name="submitterEmail"]`
- Field `submitterPhone` (tel, optional). `[index.astro:name="submitterPhone"]`
- Submit button labelled "Submit personnel suggestion". `[index.astro:Submit personnel suggestion]`
- The page shows the text "Protected by reCAPTCHA Enterprise." above the submit button. `[index.astro:Protected by reCAPTCHA Enterprise.]`
- A note under the form links to `/about/contact`. `[index.astro:<a href="/about/contact">Contact us</a>.]`
- Module script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- When the form element is not found, the module script calls `showFormLoadError` with the form name and the shell element. `[index.astro:showFormLoadError({ formName: "personnelNew", shell });]`
- Otherwise the module script calls `initRecaptcha()` and adds a `submit` listener that awaits `submitJsonForm`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "personnelNew"`. `[index.astro:formName: "personnelNew",]`
- `submitJsonForm` receives `recaptchaAction: "personnelNewSubmit"`. `[index.astro:recaptchaAction: "personnelNewSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- The `onReset` callback removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`
- A second script marked `is:inline` reads `window.__IPC_PREFILL__`. `[index.astro:<script is:inline>]`
- The inline script calls `prefillFields` with only `key: window.location.pathname` (no `root`). `[index.astro:const result = prefill.prefillFields({]`
- After prefill, when the returned `payload.currentAgencyState` is a non-blank string, the inline script sets the `currentAgencyState` input to that value trimmed and upper-cased. `[index.astro:stateInput.value = result.payload.currentAgencyState]`

## Invariants

- The submit handler and reCAPTCHA start only run in the branch where the form element exists. `[index.astro:if (!form) {]`
- The state override only applies when the `currentAgencyState` element is an `HTMLInputElement`. `[index.astro:stateInput instanceof HTMLInputElement &&]`

## Side Effects

- The inline script writes prefill values into page fields and overwrites the `currentAgencyState` input value. `[index.astro:.toUpperCase();]`
- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async function (event) {]`

## Verification

- Run: `npm run test:e2e`
