# Contact Page

## Overview

Static Astro page for the route `/about/contact/`. It shows the `contact` form. An inline script prefills the form from the prefill helper and from session storage. A bundled client script sends the form through the shared forms helper and saves or clears the remembered contact details. The page has one file, `index.astro`. It passes no `description` or `structuredData` prop to `PageShell` and calls no data loader. Other pages reach this page through `PrefillNavButton` with a `whoami` and `message` payload.

## Interface

- Route `/about/contact/`, a static page with no `getStaticPaths`. [index.astro:pagePath="/about/contact/"]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Contact | PoliceConduct.org`. [index.astro:title="Contact | PoliceConduct.org"]
- `PageShell` prop `canonicalUrl` is the route path. [index.astro:canonicalUrl="/about/contact/"]
- `PageShell` prop `robots` is `noindex,follow`. [index.astro:robots="noindex,follow"]
- `PageShell` prop `breadcrumbs` has two entries: `About` linking to `/about/`, then `Contact` marked `current`. [index.astro:{ label: "Contact", href: "/about/contact/", current: true }]
- `PageShell` props `heading` and `lede` are literal strings. [index.astro:heading="Contact us"]
- The `PrefillBootstrap` component is rendered before the form. [index.astro:PrefillBootstrap />]
- The form wrapper is marked for the forms helper. [index.astro:data-form-shell="contact"]
- An information alert above the form explains why the form appears often. [index.astro:alert alert-info rounded-0]
- The form is named `contact`, uses `method="POST"`, the `needs-validation` class and `novalidate`. [index.astro:name="contact"]
- A hidden `form-name` input holds `contact`. [index.astro:name="form-name" value="contact"]
- A honeypot text input named `organization` sits in a visually hidden wrapper and is named by `data-netlify-honeypot`. [index.astro:data-netlify-honeypot="organization"]
- Required select `whoami` with a disabled empty default and the values `individual`, `police`, `oversight`, `journalist`, `donor`, `partner`, `volunteer`, `profile owner`, `subscriber` and `other`. [index.astro:name="whoami"]
- Required text field `fullName`. [index.astro:name="fullName"]
- Required email field `email`. [index.astro:name="email"]
- Optional phone field `phone`. [index.astro:name="phone"]
- Required textarea `message`. [index.astro:name="message"]
- Checkbox `rememberContact` with no `name` attribute, used only by the scripts. [index.astro:id="rememberContact"]
- A note under the form says it is protected by reCAPTCHA Enterprise. [index.astro:Protected by reCAPTCHA Enterprise.]
- An inline script (`is:inline`) runs the prefill and session restore. [index.astro:script is:inline]
- A bundled script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from the shared forms module. [index.astro:from "#src/lib/client/forms.ts";]

## Invariants

- Both scripts use the same session storage key. [index.astro:const storageKey = "ipc_contact_session_v1";]
- The inline script reads the prefill payload through `window.__IPC_PREFILL__` keyed by the current path, and falls back to an empty payload when the helper is missing. [index.astro:prefill.prefillFields({ key: window.location.pathname })]
- A prefilled `whoami` value is lower-cased and selects the first option whose value equals it or whose text contains it. [index.astro:option.textContent.toLowerCase().includes(value),]
- Saved session values fill `fullName`, `email` and `phone` only when the field is empty. [index.astro:if (data.fullName && !fullNameInput.value.trim()) {]
- When saved session data exists, the remember checkbox is checked. [index.astro:rememberInput.checked = true;]
- Session storage errors are caught and ignored. [index.astro:// Ignore storage errors.]
- If the form element is not found, the bundled script calls `showFormLoadError` and does nothing else. [index.astro:showFormLoadError({ formName: "contact", shell });]
- The form name passed to `submitJsonForm` is `contact`. [index.astro:formName: "contact",]
- The reCAPTCHA action is `contactSubmit`. [index.astro:recaptchaAction: "contactSubmit",]
- The success state requested from the helper is `verification_pending`. [index.astro:successKind: "verification_pending",]

## Side Effects

- On load, the inline script reads `sessionStorage` under the storage key. [index.astro:const saved = sessionStorage.getItem(storageKey);]
- On load, when the form exists, the bundled script calls `initRecaptcha()`. [index.astro:initRecaptcha();]
- On submit, the script hands the event and form to `submitJsonForm`, which performs the submission. [index.astro:form.addEventListener("submit", async function (event) {]
- Before submit, when the remember checkbox is checked, the trimmed `fullName`, `email` and `phone` values are written to `sessionStorage` as JSON. [index.astro:sessionStorage.setItem(storageKey, JSON.stringify(payload));]
- Before submit, when the remember checkbox is not checked, the stored entry is removed. [index.astro:sessionStorage.removeItem(storageKey);]
- On reset, the script removes the `was-validated` class from the form. [index.astro:form.classList.remove("was-validated");]

## Verification

- Run: `npm run test:e2e`
