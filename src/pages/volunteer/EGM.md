# Volunteer page

## Overview

Static Astro page for the route `/volunteer/`. It lists eight volunteer role cards and renders the volunteer interest form, which the browser submits as JSON through the shared client forms library.

## Interface

- Route `/volunteer/`, from `index.astro`; no `getStaticPaths`, no route params and no frontmatter logic beyond imports. `[index.astro:pagePath="/volunteer/"]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `breadcrumbs`, `heading` and `lede`. No `structuredData` or `robots` prop is passed. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Volunteer | PoliceConduct.org`, canonical URL `/volunteer/`. `[index.astro:title="Volunteer | PoliceConduct.org"]`
- Breadcrumbs: `Home` (`/`) then `Volunteer` (current). `[index.astro:{ label: "Volunteer", href: "/volunteer/", current: true },]`
- Component: `PrefillBootstrap` from `#src/components/PrefillBootstrap.astro`, rendered with no props. `[index.astro:<PrefillBootstrap />]`
- Component: `PrefillNavButton` from `#src/components/PrefillNavButton.astro`, with props `class="link-dark"`, `to="/about/contact/"`, `variant="link"` and a `payload` of `whoami` and `message`. `[index.astro:whoami: "Volunteer",]`
- Wrapper `div[data-form-shell="volunteer"]` around the whole page body; the client script passes it to `showFormLoadError`. `[index.astro:<div data-form-shell="volunteer">]`
- Eight role cards, each an `h2.ipc-section-title` with one paragraph: Report Review, Research and Outreach, Data and Product, Legal or Advocacy, Media and Storytelling, Software Engineer, Board Member, Other. `[index.astro:<h2 class="ipc-section-title mb-2">Board Member</h2>]`
- Form `form[name="volunteer"]`: `method="POST"`, `novalidate`, class `needs-validation`, no `action`. `[index.astro:name="volunteer"]`
- Hidden field `form-name` with the value `volunteer`. `[index.astro:<input type="hidden" name="form-name" value="volunteer" />]`
- Honeypot text field `organization`, inside a `honeypot visually-hidden` block. `[index.astro:<input type="text" name="organization" />]`
- Required fields: `name` (text), `email` (email), `phone` (tel), `interest` (select) and `consent` (checkbox with the value `Yes`). `[index.astro:id="volunteerConsent"]`
- Optional fields: `location` (text), `skills` (textarea) and `availability` (textarea). `[index.astro:name="availability"]`
- `interest` options: an empty default, then `Board Member`, `Data and Product`, `Legal or Advocacy`, `Media and Storytelling`, `Other`, `Report Review`, `Research and Outreach`, `Software Engineer`. `[index.astro:<option value="Software Engineer">Software Engineer</option>]`
- Client script (bundled module, not inline) imports `initRecaptcha`, `showFormLoadError` and `submitJsonForm` from `#src/lib/client/forms.ts`. `[index.astro:} from "#src/lib/client/forms.ts";]`
- On submit the script calls `submitJsonForm({ event, form, formName, onReset, recaptchaAction, successKind })` with `formName` set to `volunteer`. `[index.astro:await submitJsonForm({]`
- No loaders and no page-local styles; the file ends with the closing layout tag. `[index.astro:</PageShell>]`

## Invariants

- The reCAPTCHA action name is `volunteerSubmit`. `[index.astro:recaptchaAction: "volunteerSubmit",]`
- The success kind is `verification_pending`. `[index.astro:successKind: "verification_pending",]`
- `initRecaptcha()` runs on page load, before any submit, and only when the form exists. `[index.astro:initRecaptcha();]`
- When the form is not found the script calls `showFormLoadError({ formName: "volunteer", shell })` and binds no submit handler. `[index.astro:showFormLoadError({ formName: "volunteer", shell });]`
- `onReset` removes the `was-validated` class from the form. `[index.astro:form.classList.remove("was-validated");]`
- The `interest` option values equal their visible labels and are listed in alphabetical order, which differs from the order of the role cards. `[index.astro:<option value="Board Member">Board Member</option>]`
- The form name `volunteer` appears in four places that must stay equal: the `name` attribute, the hidden `form-name` value, the `data-form-shell` value and the `formName` argument. `[index.astro:formName: "volunteer",]`

## Side Effects

- Calls `initRecaptcha()` from `#src/lib/client/forms.ts` when the page opens; what that call loads is decided inside the library. `[index.astro:initRecaptcha,]`
- Submits the form through `submitJsonForm` from `#src/lib/client/forms.ts`; the request itself is made inside that library, not in this file. `[index.astro:form.addEventListener("submit", async function (event) {]`
- `PrefillNavButton` is given a prefill payload for `/about/contact/`; how it is stored is decided inside the component. `[index.astro:message: "Help me find the right volunteer role.",]`

## Verification

- Run: `npm run test:e2e`
