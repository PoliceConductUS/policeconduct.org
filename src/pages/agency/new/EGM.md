# Suggest a new agency form (`src/pages/agency/new`)

## Overview

Static Astro page for the route `/agency/new/`. It renders one HTML form named `agencyNew` inside `PageShell` and a client script that prefills the form, starts reCAPTCHA and submits the form as JSON. The page has no route params, no `getStaticPaths`, no data loader and no pagination.

## Interface

- Route `/agency/new/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/agency/new/`. `[index.astro:canonicalUrl="/agency/new/"]`
- `PageShell` prop `title` is `Suggest New Agency | PoliceConduct.org`. `[index.astro:title="Suggest New Agency | PoliceConduct.org"]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, then the current page "Suggest a new agency". `[index.astro:{ label: "Suggest a new agency", href: "/agency/new/", current: true },]`
- `PageShell` prop `heading` is "Suggest a new agency". `[index.astro:heading="Suggest a new agency"]`
- `PageShell` prop `lede` describes sharing public contact details and background information. `[index.astro:lede="Share public contact details and background information so we can add a new agency profile."]`
- Renders `PrefillBootstrap` from `src/components/PrefillBootstrap.astro` before the form. `[index.astro:<PrefillBootstrap />]`
- The form section carries `data-form-shell="agencyNew"`; the client script uses it as the place to show a load error. `[index.astro:<section class="py-vh-2" data-form-shell="agencyNew">]`
- Form `name="agencyNew"` with `method="POST"`, class `needs-validation` and `novalidate`. `[index.astro:name="agencyNew"]`
- The form declares `data-netlify-honeypot="organization"`. `[index.astro:data-netlify-honeypot="organization"]`
- Hidden field `form-name` with the value `agencyNew`. `[index.astro:<input type="hidden" name="form-name" value="agencyNew" />]`
- Honeypot text field `organization` inside a `honeypot visually-hidden` block. `[index.astro:<input type="text" name="organization" />]`
- Field `agencyName` (text, required), label "Agency name\*". `[index.astro:name="agencyName"]`
- Field `category` (text, required), label "Agency category\*"; help text says to use `federal` or the lowercase state abbreviation. `[index.astro:name="category"]`
- Field `city` (text, optional). `[index.astro:name="city"]`
- Field `state` (text, optional), label "State (full name)". `[index.astro:name="state"]`
- Field `address` (text, optional). `[index.astro:name="address"]`
- Field `zipCode` (text, optional). `[index.astro:name="zipCode"]`
- Field `contactName` (text, optional). `[index.astro:name="contactName"]`
- Field `contactEmail` (email, optional). `[index.astro:name="contactEmail"]`
- Field `website` (url, optional). `[index.astro:name="website"]`
- Field `phoneNumbers` (textarea, optional), label "Phone numbers / labels". `[index.astro:name="phoneNumbers"]`
- Field `civilLitigation` (textarea, optional), label "Civil litigation references". `[index.astro:name="civilLitigation"]`
- Field `notes` (textarea, optional). `[index.astro:name="notes"]`
- Field `submitterName` (text, required), label "Submitter full name\*". `[index.astro:name="submitterName"]`
- Field `submitterEmail` (email, required), label "Submitter email\*". `[index.astro:name="submitterEmail"]`
- Field `submitterPhone` (tel, optional). `[index.astro:name="submitterPhone"]`
- Submit button labelled "Submit agency suggestion". `[index.astro:Submit agency suggestion]`
- The page shows the text "Protected by reCAPTCHA Enterprise." above the submit button. `[index.astro:Protected by reCAPTCHA Enterprise.]`
- A note under the form links to `/about/contact`. `[index.astro:<a href="/about/contact">Contact us</a>.]`
- Client script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- When the form element is not found, the script calls `showFormLoadError` with the form name and the shell element and does nothing else. `[index.astro:showFormLoadError({ formName: "agencyNew", shell });]`
- When `window.__IPC_PREFILL__.prefillFields` exists, the script calls it with `key` set to `window.location.pathname` and `root` set to the form. `[index.astro:prefill.prefillFields({]`
- The script calls `initRecaptcha()` once the form is found. `[index.astro:initRecaptcha();]`
- On `submit` the script awaits `submitJsonForm` with `event`, `form`, `formName`, `onReset`, `recaptchaAction` and `successKind`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "agencyNew"`. `[index.astro:formName: "agencyNew",]`
- `submitJsonForm` receives `recaptchaAction: "agencyNewSubmit"`. `[index.astro:recaptchaAction: "agencyNewSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- The `onReset` callback removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`

## Invariants

- The submit handler, prefill and reCAPTCHA start only run in the branch where the form element exists. `[index.astro:if (!form) {]`
- The prefill lookup key is the current URL path, not a fixed string. `[index.astro:key: window.location.pathname,]`

## Side Effects

- Prefill writes values into fields inside the form through `window.__IPC_PREFILL__.prefillFields`. `[index.astro:root: form,]`
- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async function (event) {]`

## Verification

- Run: `npm run test:e2e`
