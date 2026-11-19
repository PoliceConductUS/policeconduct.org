# Submission Status page

## Overview

Static Astro page for the route `/status/`. It renders a one-field form that looks up the status of a submission by its submission ID, calling the status API from the browser and showing the answer on the page.

## Interface

- Route `/status/`, from `index.astro`; no `getStaticPaths`, no route params and no frontmatter logic beyond imports. `[index.astro:pagePath="/status/"]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `pagePath`, `canonicalUrl`, `robots`, `breadcrumbs`, `heading` and `lede`. No `description` or `structuredData` prop is passed. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Submission Status | PoliceConduct.org`, canonical URL `/status/`. `[index.astro:title="Submission Status | PoliceConduct.org"]`
- Breadcrumbs: `Home` (`/`) then `Submission Status` (current). `[index.astro:{ label: "Submission Status", href: "/status/", current: true },]`
- Component: `PrefillBootstrap` from `#src/components/PrefillBootstrap.astro`, rendered with no props before the form. `[index.astro:<PrefillBootstrap />]`
- Form `#statusLookupForm`: one required text input `#submissionId` (name `submissionId`) and the submit button `#statusLookupSubmit`. The form has no `action` or `method`. `[index.astro:<form id="statusLookupForm" class="border p-4 bg-white shadow-sm">]`
- Result region `#statusLookupResult`: hidden with `d-none` until a lookup finishes, and announced with `aria-live="polite"`. `[index.astro:id="statusLookupResult"]`
- Inline client script (`is:inline`): on submit it sends `GET /api/status/<submissionId>` with the ID passed through `encodeURIComponent` and the header `accept: application/json`. `[index.astro:headers: { accept: "application/json" },]`
- The script reads two fields of the JSON response: `status` (string) and `message` (string). `[index.astro:typeof payload.message === "string" && payload.message.trim()]`
- The result is a heading `Status` and one paragraph: the trimmed `message` when it is not empty, else a sentence built from the submission ID and the status. `[index.astro:renderMessage("Status", message);]`
- Prefill: on load the script calls `window.__IPC_PREFILL__.readAndConsume(window.location.pathname)` and, when the result has a non-empty string `submissionId`, puts it in the input and enables the button. It does not submit the form. `[index.astro:const flashedPrefill = window.__IPC_PREFILL__?.readAndConsume?.(]`
- No loaders and no page-local styles; the file ends with the closing layout tag. `[index.astro:</PageShell>]`

## Invariants

- The page is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- The submit button is disabled on load and is enabled only while the trimmed input is not empty. `[index.astro:setSubmitEnabled(Boolean(input.value.trim()));]`
- An empty trimmed ID makes the submit handler return without a request. `[index.astro:if (!submissionId) {]`
- The button is disabled while a request is in flight and its state is restored in `finally`. `[index.astro:} finally {]`
- The HTTP status of the response is never checked: `response.ok` is not read, so an error response is handled like a success response. `[index.astro:payload = await response.json();]`
- Every failure falls back to the status `pending`: a response body that is not JSON, a payload that is not a plain object, a missing or blank `status`, and a failed `fetch`. `[index.astro:renderStatus(submissionId, "pending", "");]`
- The script exits without binding anything when the form, input, button or result element is missing. `[index.astro:if (!form || !input || !submitButton || !result) {]`
- Result text is written with `textContent` into elements made with `document.createElement`; API text is never inserted as HTML. `[index.astro:body.textContent = bodyText;]`

## Side Effects

- Browser network call: `fetch` to `/api/status/<submissionId>` on each form submit. `[index.astro:const response = await fetch(]`
- Consumes the prefill payload stored for this path through `window.__IPC_PREFILL__.readAndConsume`. `[index.astro:window.location.pathname,]`
- Replaces the content of `#statusLookupResult` and removes its `d-none` class. `[index.astro:result.classList.remove("d-none");]`

## Verification

- Run: `npm run test:e2e`
