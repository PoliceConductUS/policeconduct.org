# Suggest a personnel edit form (`src/pages/personnel/suggest-edit`)

## Overview

Static Astro page for the route `/personnel/suggest-edit/`. It renders one HTML form named `officerEdit` inside `PageShell`, a module script that starts reCAPTCHA and submits the form as JSON, and an inline script that prefills the fields. The page has no route params, no `getStaticPaths`, no data loader and no pagination.

## Interface

- Route `/personnel/suggest-edit/`: `PageShell` (`src/layouts/PageShell.astro`) receives `pagePath` and `canonicalUrl` set to `/personnel/suggest-edit/`. `[index.astro:canonicalUrl="/personnel/suggest-edit/"]`
- `PageShell` prop `title` is `Suggest Officer Edit | PoliceConduct.org`. `[index.astro:title="Suggest Officer Edit | PoliceConduct.org"]`
- `PageShell` prop `robots` is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- `PageShell` prop `breadcrumbs` is Home, Personnel (`/personnel/`), then the current page "Suggest an edit". `[index.astro:label: "Suggest an edit",]`
- `PageShell` prop `heading` is "Suggest an edit". `[index.astro:heading="Suggest an edit"]`
- `PageShell` prop `lede` is "Share corrections or missing information for an officer profile." `[index.astro:lede="Share corrections or missing information for an officer profile."]`
- Renders `PrefillBootstrap` from `src/components/PrefillBootstrap.astro` before the form. `[index.astro:<PrefillBootstrap />]`
- The form section carries `data-form-shell="officerEdit"`. `[index.astro:<section class="py-vh-2" data-form-shell="officerEdit">]`
- Form `name="officerEdit"` with `method="POST"`, class `needs-validation` and `novalidate`. `[index.astro:name="officerEdit"]`
- The form declares `data-netlify-honeypot="organization"`. `[index.astro:data-netlify-honeypot="organization"]`
- Hidden field `form-name` with the value `officerEdit`. `[index.astro:<input type="hidden" name="form-name" value="officerEdit" />]`
- Honeypot text field `organization`. `[index.astro:<input type="text" name="organization" />]`
- Field `officerPath` (text, required), label "Officer profile path\*", placeholder `/personnel/`. `[index.astro:name="officerPath"]`
- Field `officerName` (text, optional). `[index.astro:name="officerName"]`
- Field `badgeNumber` (text, optional). `[index.astro:name="badgeNumber"]`
- Field `currentEmployer` (text, optional). `[index.astro:name="currentEmployer"]`
- Field `currentSupervisor` (text, optional). `[index.astro:name="currentSupervisor"]`
- Field `pastEmployers` (textarea, optional). `[index.astro:name="pastEmployers"]`
- Field `postOrgLink` (url, optional). `[index.astro:name="postOrgLink"]`
- Field `profilePhotoLink` (url, optional). `[index.astro:name="profilePhotoLink"]`
- Field `socialLinks` (textarea, optional). `[index.astro:name="socialLinks"]`
- Field `civilLitigation` (textarea, optional). `[index.astro:name="civilLitigation"]`
- Field `submitterName` (text, required). `[index.astro:name="submitterName"]`
- Field `submitterEmail` (email, required). `[index.astro:name="submitterEmail"]`
- Field `submitterPhone` (tel, optional). `[index.astro:name="submitterPhone"]`
- Submit button labelled "Submit edit suggestion". `[index.astro:Submit edit suggestion]`
- The page shows the text "Protected by reCAPTCHA Enterprise." above the submit button. `[index.astro:Protected by reCAPTCHA Enterprise.]`
- A note under the form links to `/about/contact`. `[index.astro:<a href="/about/contact">Contact us</a>.]`
- Module script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- When the form element is not found, the module script calls `showFormLoadError` with the form name and the shell element. `[index.astro:showFormLoadError({ formName: "officerEdit", shell });]`
- Otherwise the module script calls `initRecaptcha()` and adds a `submit` listener that awaits `submitJsonForm`. `[index.astro:await submitJsonForm({]`
- `submitJsonForm` receives `formName: "officerEdit"`. `[index.astro:formName: "officerEdit",]`
- `submitJsonForm` receives `recaptchaAction: "officerEditSubmit"`. `[index.astro:recaptchaAction: "officerEditSubmit",]`
- `submitJsonForm` receives `successKind: "verification_pending"`. `[index.astro:successKind: "verification_pending",]`
- The `onReset` callback removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`
- A second script marked `is:inline` calls `window.__IPC_PREFILL__?.prefillFields?.()` with only `key: window.location.pathname`; it applies no field-specific override. `[index.astro:window.__IPC_PREFILL__?.prefillFields?.({]`

## Invariants

- The submit handler and reCAPTCHA start only run in the branch where the form element exists. `[index.astro:if (!form) {]`

## Side Effects

- The inline script writes prefill values into page fields. `[index.astro:<script is:inline>]`
- `initRecaptcha()` runs in the browser on page load. `[index.astro:initRecaptcha();]`
- Submitting the form hands the event and form to `submitJsonForm`, which performs the submission. `[index.astro:form.addEventListener("submit", async function (event) {]`

## Verification

- Run: `npm run test:e2e`
