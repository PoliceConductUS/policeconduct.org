# Confirm Email page

## Overview

Static Astro page for the route `/verify/`. A visitor arrives from the link in a confirmation email with a `token` query parameter. The page posts the token to the forms API from the browser, shows the submission ID once the email address is confirmed, and offers a new link when the old one has expired.

## Interface

- Route `/verify/`, from `index.astro`; no `getStaticPaths`, no route params and no frontmatter logic beyond imports. `[index.astro:pagePath="/verify/"]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `pagePath`, `canonicalUrl`, `robots`, `breadcrumbs`, `heading` and `lede`. No `description` or `structuredData` prop is passed. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Confirm Email | PoliceConduct.org`, canonical URL `/verify/`. `[index.astro:title="Confirm Email | PoliceConduct.org"]`
- Breadcrumbs: `Home` (`/`) then `Confirm Email` (current). `[index.astro:{ label: "Confirm Email", href: "/verify/", current: true },]`
- Component: `PrefillBootstrap` from `#src/components/PrefillBootstrap.astro`, rendered with no props. `[index.astro:<PrefillBootstrap />]`
- Markup: the result region `#verificationResult` (`aria-live="polite"`), the hidden block `#verificationActions` with the button `#checkStatusButton`, and the hidden block `#resendActions` with the button `#resendLinkButton`. There is no form element. `[index.astro:id="verificationResult"]`
- Query parameter `token`, read by the inline client script (`is:inline`). `[index.astro:const token = new URLSearchParams(window.location.search).get("token");]`
- Confirm call: `POST /api/forms/verify-link` with a JSON body `{ token }` and the header `Content-Type: application/json`. `[index.astro:const response = await fetch("/api/forms/verify-link", {]`
- Fields read from the confirm response: `message`, `reason` (compared with `expired`), `canResend` and `submissionId`. `[index.astro:if (expired && payload.canResend) {]`
- Resend call: `POST /api/forms/resend-verification` with a JSON body `{ token }`, sent when `#resendLinkButton` is clicked. Only `message` is read from its response. `[index.astro:const response = await fetch("/api/forms/resend-verification", {]`
- Success view (`renderVerified`): heading `Email Confirmed`, a confirmation line, the submission ID, and the `#verificationActions` block made visible. `[index.astro:heading.textContent = "Email Confirmed";]`
- `#checkStatusButton` stores `{ submissionId }` for `/status/` with `window.__IPC_PREFILL__.set`, clears the stored result and navigates to `/status/`. `[index.astro:window.__IPC_PREFILL__?.set?.("/status/", {]`
- Session storage key `ipc_verify_result_v1` holds `{ submissionId, token }` after a successful confirmation. `[index.astro:const storedVerificationResultKey = "ipc_verify_result_v1";]`
- Page states and their headings: no token (`Open the Link From Your Email`), in progress (`Email Confirmation`), confirmed (`Email Confirmed`), expired (`Confirmation Link Expired`), failed (`Email Confirmation Failed`), resend done (`New Link Sent`), resend failed (`Could Not Send a New Link`). `[index.astro:response.ok ? "New Link Sent" : "Could Not Send a New Link",]`
- No loaders and no page-local styles; the file ends with the closing layout tag. `[index.astro:</PageShell>]`

## Invariants

- The page is `noindex,follow`. `[index.astro:robots="noindex,follow"]`
- A stored result is shown without a new API call when it has a submission ID and either the URL has no token or the stored token equals the URL token. `[index.astro:if (storedSubmissionId && (!token || storedToken === token)) {]`
- With no token and no usable stored result the page shows guidance and makes no API call. `[index.astro:"Open the Link From Your Email",]`
- After a successful confirmation, after showing a stored result for a URL that has a token, and after a successful resend, the token is removed from the address bar with `history.replaceState`. `[index.astro:window.history.replaceState({}, "", "/verify/");]`
- A successful confirm response with no `submissionId` is shown as a failure. `[index.astro:"The confirmation response did not include a submission ID.",]`
- The resend block is shown only when the confirm call fails with `reason` equal to `expired` and a truthy `canResend`. `[index.astro:const expired = payload && payload.reason === "expired";]`
- The expired token is kept only in a closure variable and is never written to session storage. `[index.astro:let resendableToken = "";]`
- `resendableToken` is cleared and the button disabled before the resend request, so a second click sends nothing. `[index.astro:resendLinkButton.disabled = true;]`
- The token and the enabled button are restored only when the resend `fetch` itself throws; after any HTTP response, success or error, the resend block is hidden. `[index.astro:resendableToken = token;]`
- A server `message` wins over the built-in text whenever it is a non-empty string, for a failed confirm call and for the resend call. `[index.astro:: "We could not confirm your email address with that link.";]`
- On a successful confirmation the server `message` is not used; the page shows fixed text and the submission ID. `[index.astro:body.textContent = "Your email address has been confirmed.";]`
- `#checkStatusButton` does nothing until a submission ID is known. `[index.astro:if (!verifiedSubmissionId) {]`
- Reads and writes of session storage are wrapped in `try`/`catch`; a storage failure is ignored and a stored value that is not a plain object is treated as missing. `[index.astro:// Ignore storage failures.]`
- The script exits without binding anything when any of its five elements is missing. `[index.astro:!resendLinkButton]`
- Message text is written with `textContent` into elements made with `document.createElement`; API text is never inserted as HTML. `[index.astro:body.textContent = bodyText;]`

## Side Effects

- Browser network call: `POST /api/forms/verify-link` on load when the URL has a token and no matching stored result. `[index.astro:body: JSON.stringify({ token }),]`
- Browser network call: `POST /api/forms/resend-verification` when the resend button is clicked with a token held. `[index.astro:resendLinkButton.addEventListener("click", async function () {]`
- Writes `ipc_verify_result_v1` to `sessionStorage` after a confirmation and removes it when the visitor goes to check status. `[index.astro:window.sessionStorage.removeItem(storedVerificationResultKey);]`
- Rewrites the current history entry to `/verify/` (no query string). `[index.astro:window.history.replaceState({}, "", "/verify/");]`
- Stores a prefill payload for `/status/` and navigates there. `[index.astro:window.location.assign("/status/");]`

## Verification

- Run: `npm run test:e2e`
