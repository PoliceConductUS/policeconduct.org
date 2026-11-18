# Data Subject Access Request Page

## Overview

Static Astro page for the route `/legal-notice/data-subject-access-request/`. It shows a notice about public records and a privacy request form named `dataSubjectAccessRequest`. A bundled client script sends the form through the shared forms helper. The page has one file, `index.astro`. It passes no `description`, `structuredData` or `lede` prop to `PageShell` and calls no data loader.

## Interface

- Route `/legal-notice/data-subject-access-request/`, a static page with no `getStaticPaths`. [index.astro:pagePath="/legal-notice/data-subject-access-request/"]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Data Subject Access Request | PoliceConduct.org`. [index.astro:title="Data Subject Access Request | PoliceConduct.org"]
- `PageShell` prop `canonicalUrl` is the route path. [index.astro:canonicalUrl="/legal-notice/data-subject-access-request/"]
- `PageShell` prop `robots` is `noindex,follow`. [index.astro:robots="noindex,follow"]
- `PageShell` prop `breadcrumbs` has two entries: `Legal Notice` linking to `/legal-notice/`, then `Data Subject Access Request` marked `current`. [index.astro:label: "Data Subject Access Request",]
- `PageShell` prop `heading` is `Data Subject Access Request`. [index.astro:heading="Data Subject Access Request"]
- The `header` slot shows a last-updated date. [index.astro:Fragment slot="header"]
- A notice section explains that privacy opt-outs do not remove public records. [index.astro:id="public-record-notice"]
- The form wrapper is marked for the forms helper. [index.astro:data-form-shell="dataSubjectAccessRequest"]
- The form is named `dataSubjectAccessRequest`, uses `method="POST"`, the `needs-validation` class and `novalidate`. [index.astro:name="dataSubjectAccessRequest"]
- A hidden `form-name` input repeats the form name. [index.astro:name="form-name"]
- A honeypot text input named `organization` sits in a visually hidden wrapper and is named by `data-netlify-honeypot`. [index.astro:data-netlify-honeypot="organization"]
- Required text field `name` (full name). [index.astro:id="dsarName"]
- Required email field `email`. [index.astro:id="dsarEmail"]
- Optional phone field `phone`. [index.astro:id="dsarPhone"]
- Required radio group `request_as` with two options: the person or their parent or guardian, or an authorized agent. [index.astro:name="request_as"]
- Required select `compliance_type` with an empty default and the values `gdpr`, `ccpa`, `cpa`, `ctdpa`, `ucpa`, `vcdpa` and `other`. [index.astro:name="compliance_type"]
- Required radio group `action` with ten options, from knowing what is collected through `Other`. [index.astro:id="actionOther"]
- Optional textarea `content` for details. [index.astro:id="dsarDetails"]
- Required checkbox `declare_information` with value `Yes`. [index.astro:name="declare_information"]
- Required checkbox `understand_deletion` with value `Yes`. [index.astro:name="understand_deletion"]
- Required checkbox `validate_email` with value `Yes`. [index.astro:name="validate_email"]
- Required checkbox `understand_public_records` with value `Yes`. [index.astro:name="understand_public_records"]
- A note under the form says it is protected by reCAPTCHA Enterprise. [index.astro:Protected by reCAPTCHA Enterprise.]
- The client script imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from the shared forms module. [index.astro:from "#src/lib/client/forms.ts";]

## Invariants

- If the form element is not found, the script calls `showFormLoadError` with the form name and the shell element and does nothing else. [index.astro:showFormLoadError({ formName: "dataSubjectAccessRequest", shell });]
- The form name passed to `submitJsonForm` matches the form `name` attribute. [index.astro:formName: "dataSubjectAccessRequest",]
- The reCAPTCHA action is `dataSubjectAccessRequestSubmit`. [index.astro:recaptchaAction: "dataSubjectAccessRequestSubmit",]
- The success state requested from the helper is `verification_pending`. [index.astro:successKind: "verification_pending",]
- The page is kept out of search indexes while links stay followable. [index.astro:noindex,follow]

## Side Effects

- On load, when the form exists, the client script calls `initRecaptcha()`. [index.astro:initRecaptcha();]
- On submit, the script hands the event and form to `submitJsonForm`, which performs the submission. [index.astro:form.addEventListener("submit", async function (event) {]
- On reset, the script removes the `was-validated` class from the form. [index.astro:form.classList.remove("was-validated");]

## Verification

- Run: `npm run test:e2e`
