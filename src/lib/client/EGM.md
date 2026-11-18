# Client Scripts (`src/lib/client`)

## Overview

Browser-side modules shipped to the reader's browser. `site.js` is a side-effect script that wires site-wide behaviour (beta banner, header scroll state, click analytics, copy link, entity menu, jump forms, masthead search). `analytics.js` and `analytics-consent.js` own Google Analytics loading, event sending and the consent dialog. `forms.ts` owns the shared client submit flow for JSON forms (validation, reCAPTCHA Enterprise token, `POST` to the forms API, inline success and error states). Nothing in this directory reads the database or the file system.

## Interface

### `forms.ts`

- Exports four functions and no types, classes or constants: `flattenFormData`, `initRecaptcha`, `showFormLoadError`, `submitJsonForm`. At import time it only reads the reCAPTCHA site key and sets two promise caches to null. `[forms.ts:recaptchaSiteKey]`
- `flattenFormData(formData, ...structuredRoots)` returns a plain object from a `FormData`, with every value coerced by `String(value)`. A field whose first parsed name segment is in `structuredRoots` is expanded into nested objects and arrays along its dot or bracket path; every other field is stored flat under its raw name. The `FormData` is not changed. `[forms.ts:flattenFormData]`
- `flattenFormData` flat fields: the first value is a string, a second value turns the entry into a two-item array, later values are pushed. `[forms.ts:structuredRoots.includes(root)]`
- `flattenFormData` structured fields: all-digit segments become numbers and address array indexes; a container is created as an array when the next segment is numeric, else as an object; a numeric last segment overwrites that slot; an object-key last segment behaves like the flat case. `[forms.ts:nextValueIsArray]`
- `initRecaptcha()` returns nothing. It starts loading the reCAPTCHA Enterprise script and caches a ready promise. Every failure, including a missing site key, is swallowed. `[forms.ts:initRecaptcha]`
- `showFormLoadError({ formName, shell })` returns nothing. It builds (does not throw) an error, logs it, sends it to Sentry, tracks `form_load_error`, and, when `shell` is not null, shows `FORM_LOAD_ERROR_MESSAGE` inside a `[data-form-load-error]` alert in the shell (created if absent). `[forms.ts:showFormLoadError]`
- `submitJsonForm(options)` returns `Promise<boolean>`. It runs the whole submit flow for one form: lock, validate, get a reCAPTCHA token, build the payload, `POST` it, render the inline success or error alert, track analytics. It resolves `true` only when the request succeeded and `onSuccess` finished; it resolves `false` when the form was already locked, validation failed, or any error was caught. It does not reject for errors raised inside its try block. `[forms.ts:submitJsonForm]`
- `submitJsonForm` options (the `SubmitJsonFormOptions` type is not exported). Required: `form`, `formName`, `recaptchaAction`. Optional: `event`, `submitButton` (defaults to the form's `button[type="submit"]` only when the property is undefined), `onReset`, `onBeforeValidate`, `validate`, `onInvalid`, `onBeforeSubmit`, `buildPayload`, `onSuccess`, `successKind`, `getSuccessDetail`. `[forms.ts:SubmitJsonFormOptions]`
- `successKind` is accepted by the type but is never read; it has no effect. `[forms.ts:_successKind]`
- `buildPayload` receives `{ beforeSubmitResult, data, form, formData, formName, recaptchaToken }` and returns a record. When absent or falsy, the payload is `{ data, formName, recaptchaToken }`. `[forms.ts:SubmitPayloadArgs]`
- `onSuccess` receives `{ form, inlineSuccess, recaptchaToken, response, result, submitButton }` and is awaited after the success state is shown and tracked. `[forms.ts:SubmitSuccessArgs]`
- Global type augmentation: `Window` gains optional `__IPC_ANALYTICS__`, `__IPC_PREFILL__` and `grecaptcha`. The file reads `__IPC_ANALYTICS__` and `grecaptcha`, never uses `__IPC_PREFILL__`, and assigns none of them. `[forms.ts:__IPC_PREFILL__]`
- DOM hooks used or created: `[data-form-submit-error]`, `[data-form-submit-success]`, `[data-form-submit-success-detail]`, `[data-dismiss-submit-success]`, `[data-form-validation-summary]`, `[data-form-load-error]`, the `data-ipc-recaptcha` script marker, the `data-release-id` attribute on the document element, and the dataset keys `submitLocked`, `submitUiBound` and `originalHtml`. `[forms.ts:data-form-submit-success-detail]`
- No custom DOM events are dispatched. The only listeners installed are `load` and `error` on the reCAPTCHA script and `click` on the success alert's Reset button. `[forms.ts:data-dismiss-submit-success]`

### `site.js`

- Exports nothing. On module evaluation it imports Bootstrap's collapse, scrollspy and tab plugins for their side effects and calls, in this order: `initBetaBanner`, `initHeaderScroll`, `initAnalyticsClicks`, `initMapAnalyticsClicks`, `initCopyLink`, `initEntityMenu`, `initJumpForms`, `initSiteSearch`. It does not wait for `DOMContentLoaded`. `[site.js:initBetaBanner();]`
- It dispatches no custom events and sets no globals on `window`; every helper is module-private. `[site.js:normalizeText]`
- Beta banner: depends on `.beta-banner` and a `.btn-close` inside it. If the dismissed flag is stored the banner is removed at load; otherwise a click on the close button stores the flag and removes the banner. `[site.js:.beta-banner]`
- Header scroll state: a passive `scroll` listener on `window`, run once immediately, adds `scrolled` and `shadow-sm` to the first `.navbar` when the page is scrolled past the threshold and removes them otherwise. `[site.js:shadow-sm]`
- Link click analytics: one delegated `click` listener on `document` acting on the closest `a[href]`. Base payload: `href_path`, `link_text`, `page_path`, `section_id` (id of the closest `section[id]`, or empty). `[site.js:section_id]`
- Link click event selection: inside `.masthead` it sends `nav_cta_click` for an anchor with class `nav-action`, else `nav_link_click`, and stops. Outside the masthead it sends `cta_click` for an anchor with class `btn`, and also `outbound_link_click` (adds `destination_host`, `destination_url`) when the link origin differs from the page origin. `[site.js:outbound_link_click]`
- Nav toggler analytics: a click on the first `.navbar-toggler` button sends `nav_menu_toggle` with `page_path`. `[site.js:nav_menu_toggle]`
- Map link analytics: one delegated `click` listener acting on the closest `a[data-map-link-type]` inside `[data-usa-map-card]`. Base payload: `destination_url`, `map_label`, `page_path`. `[site.js:data-usa-map-card]`
- Map link event selection by `data-map-link-type`: `state` sends `map_state_selected` (adds `state_count`, `state_id`); `header_action` sends `map_header_action_clicked`; any other value sends `map_federal_link_clicked` (adds `link_type`). `[site.js:map_federal_link_clicked]`
- Copy link: a delegated `click` listener acting on a `[data-copy-link]` anchor. It prevents the default, copies the current page URL, sets the anchor text to `Copied!` or `Couldn't copy`, mirrors the message into a `[data-copy-link-status]` element in the anchor's closest `li`, then restores the text after a fixed delay. `[site.js:data-copy-link-status]`
- Entity menu: on `Escape`, every open `details.entity-menu` is closed and its `summary` focused; on any click, every open entity menu that does not contain the click target is closed. `[site.js:details.entity-menu]`
- Jump forms: every `[data-jump-form]` present at load that holds a `[data-jump-select]` select gets a `submit` listener that prevents the default and navigates to the selected option's value. An optional `[data-jump-status]` element in the form's parent shows `Choose one first.` or an "Opening" message. Forms added later are not enhanced. `[site.js:data-jump-status]`
- Masthead search: depends on the first `[data-site-search]` form and on `[data-site-search-input]`, `[data-site-search-panel]`, `[data-site-search-listbox]`, `[data-site-search-status]`, `[data-site-search-empty]` and `[data-site-search-empty-link]` inside it. `[site.js:data-site-search-empty-link]`
- Masthead search listeners: on the input, a one-time `focus` listener that starts loading Pagefind, an `input` listener that runs a debounced search on the trimmed value, and a `keydown` listener; on `document`, a `click` listener that closes the panel on an outside click; on the form, a `focusout` listener that closes the panel unless focus stays inside the form. `[site.js:focusout]`
- Masthead search keys: `ArrowDown` and `ArrowUp` move the active option with wrap-around; `Enter` navigates to the active option, and otherwise lets the plain form submit proceed; `Escape` closes an open panel. `[site.js:ArrowDown]`
- Masthead search rendering: each result is an `li` with id `site-search-option-<index>`, `role=option`, a title span and a path span set through `textContent`, and a `mousedown` listener that navigates to the result. `[site.js:masthead-search-option-path]`
- Masthead search ARIA state: `aria-expanded` on the input follows the result list; the active option gets class `is-active` and `aria-selected=true`, is scrolled into view, and is named by `aria-activedescendant` on the input. `[site.js:aria-activedescendant]`
- Masthead search with no results: the empty note and the panel are shown and the empty link points at `/find-records/?q=` plus the encoded term. `[site.js:/find-records/?q=]`
- Masthead search status text: `No results`, `1 result`, or `<n> results`; cleared for an empty term. `[site.js:No results]`
- Masthead search analytics: `search_results` (with `search_source: masthead` and the full Pagefind `result_count`) and `search_result_selected` (with `result_category`). The search term is never sent. `[site.js:search_result_selected]`
- Result category (`getSearchResultCategory`), from the result pathname: `personnel`, `civil_case`, `report`, `federal-agency`, `agency`, `place` or `other`. `[site.js:federal-agency]`

### `analytics.js`

- `trackAnalytics(eventName, params = {})` returns nothing. It sends one event through `window.gtag("event", …)` with the page context (`page_location`, `page_path`, `page_referrer`) overlaid by `params`. It does nothing unless the page is the production site, `eventName` is truthy and `window.gtag` is a function. `[analytics.js:trackAnalytics]`
- `initializeAnalytics()` returns nothing. It always sets `window.__IPC_ANALYTICS__`. On the production site it also creates `window.dataLayer` and `window.gtag`, queues default consent, advertising settings, the `js` timestamp, the page context, `config` and a `page_view` event, and appends the Google tag script. `[analytics.js:initializeAnalytics]`
- Global `window.__IPC_ANALYTICS__` is `{ track: trackAnalytics }`, set on every host. `[analytics.js:__IPC_ANALYTICS__]`
- Global `window.gtag` is defined on production only, pushes its `arguments` object onto `window.dataLayer`, and re-checks the production condition on each call. `[analytics.js:function gtag()]`
- Nothing else is exported; `MEASUREMENT_ID`, `ATTRIBUTION_PARAMETERS`, `URL_PARAMETERS`, `isProduction`, `sanitizeUrl` and `pageContext` are module-private. `[analytics.js:ATTRIBUTION_PARAMETERS]`

### `analytics-consent.js`

- `readAnalyticsChoice()` returns `"granted"`, `"denied"`, or `null` when nothing valid is stored or storage cannot be read. `[analytics-consent.js:readAnalyticsChoice]`
- `readAdvertisingChoice()` returns `"granted"` or `"denied"`, defaulting to `"denied"`; it never returns null. `[analytics-consent.js:readAdvertisingChoice]`
- `advertisingSettings(choice)` is pure and returns `{ allow_ad_personalization_signals, allow_google_signals }`, both true only when `choice` is `"granted"`. `[analytics-consent.js:allow_ad_personalization_signals]`
- `consentState(choice, advertising = "denied")` is pure and returns a Google consent object: `analytics_storage` follows `choice`; `ad_storage`, `ad_user_data` and `ad_personalization` follow `advertising`. `[analytics-consent.js:ad_personalization]`
- `initializeConsentControls()` returns nothing. It un-hides the privacy-settings control, fills the checkboxes from the stored choice, opens the dialog when no analytics choice is stored, installs the listeners below, and clears Google cookies for any category not granted. `[analytics-consent.js:initializeConsentControls]`
- DOM contract: `[data-analytics-consent]` (a dialog element), `[data-privacy-settings]`, and inside the panel `[data-consent-status]`, `[data-analytics-enabled]`, `[data-advertising-enabled]`, zero or more `[data-analytics-choice]` buttons and one `[data-analytics-save]` button. `[analytics-consent.js:data-analytics-consent]`
- Listeners: `cancel` on the panel (hides it), `click` on the settings control (re-renders and shows the panel), `click` on each choice button, `click` on the save button, and `storage` on `window`. `[analytics-consent.js:data-privacy-settings]`
- A `[data-analytics-choice]` button saves its value as both the analytics choice and the advertising choice. `[analytics-consent.js:button.dataset.analyticsChoice]`
- The `[data-analytics-save]` button saves the analytics and advertising choices independently from the two checkboxes. `[analytics-consent.js:data-analytics-save]`
- Saving applies the choice to gtag and cookies, updates the checkboxes, writes storage, then closes and hides the panel. If the storage write throws, the panel stays open and the status element shows a message starting "Your choice applies to this page." `[analytics-consent.js:Your choice applies to this page.]`
- Cross-tab sync: a `storage` event for the consent key (or a full clear) re-applies the stored choice, shows the panel when no analytics choice remains, closes and hides it otherwise, and re-renders the checkboxes. `[analytics-consent.js:event.key !== null]` `[analytics-consent.js:else hide();]`
- No custom events are dispatched and no `window` globals are set; `CHOICE_KEY`, `readChoices` and `clearCookies` are module-private. `[analytics-consent.js:CHOICE_KEY]`

## Invariants

### `forms.ts`

- Throws `reCAPTCHA is not configured.` plus the blocked-submit fallback sentence when the trimmed site key is empty, and again when the script resolved but `window.grecaptcha.enterprise` is still missing. `[forms.ts:reCAPTCHA is not configured.]`
- The script promise rejects with `reCAPTCHA loaded without enterprise client.` when the script loads without the enterprise client. `[forms.ts:reCAPTCHA loaded without enterprise client.]`
- The script promise rejects with `Unable to load reCAPTCHA. Please try again.` on the script `error` event. `[forms.ts:Unable to load reCAPTCHA. Please try again.]`
- An error thrown by `enterprise.ready` rejects the ready promise with that same error, and the cached ready promise is reset to null so a later call can retry. `[forms.ts:recaptchaReadyPromise = null;]`
- Throws `Unable to validate reCAPTCHA.` plus the fallback sentence when `enterprise.execute` throws (original error kept as `cause`) or resolves to a falsy token. `[forms.ts:Unable to validate reCAPTCHA.]`
- Throws `The form is missing its website release.` when the document element has no `data-release-id`; no request is sent. `[forms.ts:The form is missing its website release.]`
- Throws when `response.ok` is false. The message defaults to a fixed sentence starting "We could not submit your form right now." and is replaced by the trimmed `error` string of the response JSON when present. A response body that is not valid JSON is ignored. `[forms.ts:We could not submit your form right now.]`
- `showFormLoadError` builds the error `Unable to locate the form named <formName>.` but only logs and reports it. `[forms.ts:Unable to locate the form named]`
- Re-entrancy guard: when `form.dataset.submitLocked` is `"true"`, the call prevents the event default and returns `false` without validating or sending. `[forms.ts:submitLocked]`
- Lock release: when the submission did not complete, the button busy state is cleared and the lock is released. After a completed success the lock stays set and the button stays disabled until the Reset button is used. `[forms.ts:submissionCompleted]`
- `event.preventDefault()` is always called when an event is supplied; `event.stopPropagation()` is called only on the validation-failure path. `[forms.ts:stopPropagation]`
- Order inside `submitJsonForm`: `onBeforeValidate`, `validate`, native `checkValidity`, (`onInvalid`), `onBeforeSubmit`, `FormData` snapshot, reCAPTCHA token, payload, release-id check, fetch, response JSON, success state, analytics, `onSuccess`. `[forms.ts:onBeforeSubmit]`
- The form is invalid when native validity fails or `validate()` resolves falsy. On failure the form gets class `was-validated`. When at least one field is natively invalid, the summary is shown, ancestor `<details>` of the first invalid field are opened, and that field is scrolled to and focused; when only `validate()` failed and no field is natively invalid, the summary is hidden and no field is focused. The class is removed again after a successful response. `[forms.ts:was-validated]` `[forms.ts:if (invalidFields.length === 0) {]`
- Invalid-field detection covers `input, select, textarea`, skipping disabled and hidden fields. `[forms.ts:input, select, textarea]`
- Validation summary label order: the field's `labels`, the closest ancestor `label`, `aria-label`, the field `name`, then the literal "the first highlighted field". `[forms.ts:the first highlighted field]`
- Form analytics parameters: every form event carries `form_name`. `form_validation_error` adds `invalid_field_count`; `form_submit_success` adds `response_status` and `verification_email_status`; `form_verification_email_failed` adds `response_status`, `verification_email_status`, `failure_stage` and `failure_reason`; `form_submit_error` adds `error_name`, `failure_stage` and `response_status`; `form_load_error` adds `page_path`. `[forms.ts:invalid_field_count]` `[forms.ts:error_name]`
- Failure stages reported with `form_submit_error` are the fixed strings `validation`, `before_submit`, `recaptcha`, `request`, `response`. `form_verification_email_failed` always reports the stage `verification_email`. `[forms.ts:before_submit]` `[forms.ts:failure_stage: "verification_email"]`
- An error thrown by `onSuccess` is caught under stage `response`: the success alert is already shown, the inline error is shown too, the call returns `false`, and the form is unlocked. `[forms.ts:failureStage = "response"]`
- The request body is the payload with `releaseId` spread last, so the document's release id overrides any `releaseId` from `buildPayload`. `[forms.ts:releaseId]`
- The default `data` drops the keys `form-name` and `g-recaptcha-response`; a repeated key becomes an array. `[forms.ts:g-recaptcha-response]`
- Email status from the response JSON: `verificationPending === true` is `pending`, `false` is `failed`, anything else is `unknown`. `[forms.ts:verificationEmailStatus]`
- Success detail text precedence: `getSuccessDetail({ result })`, else the trimmed `result.message`, else a fixed sentence about opening the emailed link within 15 minutes. A reference with `result.requestId` is appended when `verificationPending === false`. `[forms.ts:within 15 minutes]`
- `failure_reason` for `form_verification_email_failed` is limited to `missing_email`, `invalid_email`, `send_failed`; anything else is `unknown`. `[forms.ts:["missing_email", "invalid_email", "send_failed"].includes(reason)]`
- The inline error text is the error message, or "Unable to submit the form. Please try again." for a non-Error or empty message, with the fallback sentence appended unless the message already names the contact address. It is set through `textContent`. `[forms.ts:Unable to submit the form. Please try again.]`
- Fixed copy lives in `BLOCKED_SUBMIT_FALLBACK`, `FORM_LOAD_ERROR_MESSAGE` and `createSubmissionSuccessMarkup`. `[forms.ts:BLOCKED_SUBMIT_FALLBACK]`
- Field names are parsed by one fixed regex in `parseFieldName`; empty segments are discarded. `[forms.ts:parseFieldName]`
- reCAPTCHA script loading is de-duplicated: an existing enterprise client is returned directly, one shared promise is used, an existing marked script element is reused, and the cached promise is reset to null on rejection so a later call can retry. `[forms.ts:recaptchaScriptPromise]`
- The inline error, validation summary, inline success and load-error elements are created only when absent. The Reset handler is bound once per success element, so it keeps the `formName`, `submitButton` and `onReset` of the first call for that form. `[forms.ts:submitUiBound]`
- Reset tracks `form_success_reset`, hides the success alert, resets the form, calls `onReset()` without awaiting it, releases the lock and re-enables the button. `[forms.ts:form_success_reset]`
- Busy button: stores the original markup once, disables the button, sets `aria-busy`, and shows a spinner with the label "Submitting..."; the reverse restores it. A null button is a no-op. `[forms.ts:Submitting...]`
- Analytics calls are silent no-ops when `window.__IPC_ANALYTICS__` or its `track` is missing; malformed error payloads are ignored. `[forms.ts:Ignore malformed error payloads.]`

### `site.js`

- The file has no `throw`. Each feature returns early when its markup is missing or of the wrong element type. `[site.js:instanceof HTMLFormElement]`
- `localStorage` failures in the beta banner are caught and ignored. `[site.js:Ignore localStorage errors.]`
- The beta banner flag is the fixed key `ipc_beta_banner_dismissed_v1` with value `1`. `[site.js:ipc_beta_banner_dismissed_v1]`
- The header scroll threshold is fixed. `[site.js:window.scrollY > 10]`
- Link click analytics ignores anchors inside `[data-site-search]` or `[data-record-finder]`, anchors with an empty href, and anchors whose raw href starts with `#`. `[site.js:data-record-finder]`
- `getHrefDetails` returns null for an empty href, and falls back to the raw href with `isExternal: false` when URL parsing throws. `[site.js:isExternal]`
- `normalizeText` collapses whitespace runs to one space, trims, and returns an empty string for empty input. `[site.js:normalizeText]`
- Map link analytics fires only for anchors that have `data-map-link-type` and sit inside `[data-usa-map-card]`. `[site.js:data-map-link-type]`
- `copyTextToClipboard` returns false, without throwing, when the clipboard API is missing, the context is not secure, or the write rejects. `[site.js:isSecureContext]`
- Copy link always copies the current page URL, never the anchor's href; the feedback reset delay is fixed. `[site.js:1600]`
- Jump forms navigate only when the resolved destination protocol is `https:` or `http:`; other protocols are dropped with no message. `[site.js:destination.protocol]`
- Search constants are fixed: the Pagefind module URL, the debounce, the measurement delay and the maximum rendered results. `[site.js:MAX_SEARCH_RESULTS]`
- Pagefind is loaded lazily and at most once; the load promise is cached, including after a failed load. `[site.js:pagefindLoadPromise]`
- After the import, the module's `init()` is awaited when the module has one. `[site.js:await module.init?.();]`
- A Pagefind load failure leaves the API null, so search is a silent no-op and plain form submission stays the fallback; search failures are also caught and ignored. `[site.js:pagefindApi = null]`
- Stale responses are discarded: each search increments a request counter that is re-checked after each await. `[site.js:currentRequestId !== requestId]`
- An empty term clears results, closes the panel and resets the reporting state without loading Pagefind. `[site.js:lastReportedTerm = ""]`
- `search_results` is sent at most once per distinct consecutive term: after the measurement delay if the input still holds that term, or immediately before a result is selected. `[site.js:lastReportedTerm === completedSearch.term]`
- Closing the panel clears the results and the listbox and resets the active index. `[site.js:results = [];]`
- A result's title is the Pagefind entry's `meta.title`, falling back to the entry URL; a result with no path is not navigated to. `[site.js:entry.meta?.title]`
- Options are selected on `mousedown` with the default prevented, so the input keeps focus until navigation. `[site.js:mousedown]`

### `analytics.js`

- The file has no `throw`; every guard is a silent return. `[analytics.js:isProduction]`
- Production gate: analytics runs only over `https:` on host `policeconduct.org` or `www.policeconduct.org`. `[analytics.js:www.policeconduct.org]`
- The Google Analytics measurement id is a fixed constant. `[analytics.js:MEASUREMENT_ID]`
- `sanitizeUrl` returns an empty string for a falsy value, a non-http(s) protocol, or a parse error; otherwise it blanks the username, password and hash and deletes every query parameter outside the attribution allow-list. `[analytics.js:url.searchParams.delete]`
- Attribution allow-list: `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_content`, `utm_term`, `gclid`, `dclid`, `gbraid`, `wbraid`. `[analytics.js:wbraid]`
- Payload keys always sanitized as URLs: `page_location`, `page_referrer`, `destination_url`, `page_path`, `href_path`, `prefill_key`. `[analytics.js:prefill_key]`
- A URL key ending in `_path`, and `prefill_key`, is reduced to the pathname only. `[analytics.js:key.endsWith("_path")]`
- Payload keys whose value is undefined, null, an empty string or NaN are removed before sending. `[analytics.js:Number.isNaN(value)]`
- Automatic page views are off; the one page view is sent by the explicit `page_view` call. `[analytics.js:send_page_view]`
- Default consent and advertising settings come from the stored choice through `readAnalyticsChoice`, `readAdvertisingChoice`, `consentState` and `advertisingSettings`, and are queued before the Google tag script is appended. `[analytics.js:readAdvertisingChoice()]`
- There is no idempotence guard: each `initializeAnalytics` call on production redefines `window.gtag`, re-queues the commands and appends another script. An existing `window.dataLayer` is reused. `[analytics.js:window.dataLayer || []]`

### `analytics-consent.js`

- The file has no `throw`. `[analytics-consent.js:readChoices]`
- The choice is stored under the fixed key `ipc-analytics-consent-v1`. `[analytics-consent.js:ipc-analytics-consent-v1]`
- Accepted stored formats: the bare string `granted` or `denied` (advertising then `denied`), or a JSON object whose `analytics` and `advertising` are each `granted` or `denied`. Anything else reads as no choice. `[analytics-consent.js:JSON.parse(saved)]`
- The written value is always the JSON form `{ analytics, advertising }`. `[analytics-consent.js:JSON.stringify]`
- Default-deny: only the exact string `granted` grants anything; advertising defaults to `denied`. `[analytics-consent.js:?? "denied"]`
- `initializeConsentControls` returns without changes when the panel or the settings control is missing. `[analytics-consent.js:if (!panel || !settings) return;]`
- The inner elements are not null-checked; a missing one fails with an uncaught TypeError on first use. `[analytics-consent.js:data-advertising-enabled]`
- The panel opens automatically only when no valid analytics choice is stored, and `showModal()` is called only when the panel is not already open. `[analytics-consent.js:if (!panel.open) panel.showModal();]`
- gtag is updated only when `window.gtag` is a function; cookie clearing runs either way. On save, both happen before the storage write. `[analytics-consent.js:apply(choice, ads);]`
- Cookie rules: analytics cookies are `_ga` and names starting with `_ga_`; advertising cookies are names starting with `_gcl_`, and `_gac` or names starting with `_gac_`. Only cookies of a category that is not granted are expired. `[analytics-consent.js:_gcl_]`
- Each matching cookie is expired with `Max-Age=0; Path=/; SameSite=Lax`, once with no domain and once for every suffix of the current hostname. `[analytics-consent.js:Max-Age=0; Path=/; SameSite=Lax]`
- Opening the panel through the settings control, and every render, clears the status text. `[analytics-consent.js:status.textContent = "";]`
- There is no guard against a second `initializeConsentControls` call; it adds a second set of listeners. `[analytics-consent.js:panel.addEventListener("cancel"]`

## Side Effects

### `forms.ts`

- Environment variable read at module load: `import.meta.env.RECAPTCHA_SITE_KEY`. `[forms.ts:RECAPTCHA_SITE_KEY]`
- Network: `fetch` with method `POST` and a JSON body to the same-origin path `/api/forms/submit`; the response is read with `response.json()`. `[forms.ts:/api/forms/submit]`
- Network: appends an async, deferred `<script>` for Google reCAPTCHA Enterprise to `document.head`. `[forms.ts:recaptcha/enterprise.js]`
- Third-party API: `window.grecaptcha.enterprise.ready` and `enterprise.execute` per submission. `[forms.ts:enterprise.execute]`
- Module-level mutable state: `recaptchaReadyPromise` and `recaptchaScriptPromise`. `[forms.ts:recaptchaReadyPromise]`
- Error reporting: `Sentry.captureException` from `@sentry/astro`. A failed submission is tagged `area: form_submit`, gets a `form_name` tag only when the form name is a non-blank string, and carries the form action, form name, page path and reCAPTCHA action as extra data. `[forms.ts:Sentry.captureException]` `[forms.ts:form_name: formNameTag]`
- Error reporting for a form load error (`showFormLoadError`): tag `area: form_init` and an unconditional `form_name` tag, with only the form name and page path as extra data. `[forms.ts:area: "form_init"]`
- Console: `console.error` for a failed submission, a failed form initialisation, and a failed verification email. `[forms.ts:Form verification email failed]`
- Analytics through `window.__IPC_ANALYTICS__.track`: `form_submit_attempt`, `form_validation_error`, `form_submit_success`, `form_verification_email_failed`, `form_submit_error`, `form_success_reset`, `form_load_error`. `[forms.ts:form_submit_attempt]`
- Reads `window.location.pathname` for logs, Sentry and analytics. `[forms.ts:window.location.pathname]`
- DOM: creates and toggles the inline error alert (appended to the form). `[forms.ts:data-form-submit-error]`
- DOM: creates, fills and empties the validation summary (prepended to the form). `[forms.ts:data-form-validation-summary]`
- DOM: creates the inline success alert with `innerHTML`, and writes its detail through `textContent`. `[forms.ts:data-form-submit-success]`
- DOM: creates the load-error alert in the shell and sets its `innerHTML` to a fixed constant. `[forms.ts:data-form-load-error]`
- DOM: sets the form lock and `was-validated` class, resets the form, opens ancestor `<details>`, and changes the submit button's `disabled`, `aria-busy` and markup. `[forms.ts:originalHtml]`
- Scrolling and focus: `scrollIntoView` on the first invalid field and on the success alert; `focus` on the first invalid field. `[forms.ts:scrollIntoView]`
- Reads the form's `action` attribute and sends it to Sentry as `formAction`. `[forms.ts:formAction]`
- No database access, file access, timers, cookies, web storage, history or clipboard use. `[forms.ts:import * as Sentry]`

### `site.js`

- Network: a dynamic `import()` of the same-origin Pagefind module on first search focus or first non-empty search; no direct fetch. `[site.js:@vite-ignore]`
- `localStorage`: reads and writes the beta banner key. `[site.js:storageKey]`
- Clipboard: `navigator.clipboard.writeText` with the current page URL. `[site.js:navigator.clipboard.writeText]`
- Navigation: assigns `window.location.href` from a jump form and from a selected search result. `[site.js:window.location.href = result.path]`
- Reads `window.location.origin`, `pathname` and `href`, `window.scrollY` and `window.isSecureContext`. `[site.js:window.location.origin]`
- Analytics through `trackAnalytics`: `nav_cta_click`, `nav_link_click`, `cta_click`, `outbound_link_click`, `nav_menu_toggle`, `map_state_selected`, `map_header_action_clicked`, `map_federal_link_clicked`, `search_results`, `search_result_selected`. `[site.js:map_header_action_clicked]`
- DOM: removes the beta banner, toggles navbar classes, rewrites status and anchor text, closes entity menus, creates and removes search options, toggles `hidden` on the search panel and empty note, and sets ARIA attributes on the search input. `[site.js:listbox.innerHTML]`
- Listeners that are never removed: `click` and `keydown` listeners on `document` and one passive `scroll` listener on `window`. `[site.js:passive: true]`
- Timers: `window.setTimeout` and `window.clearTimeout` for copy feedback, search debounce and search measurement. `[site.js:SEARCH_MEASUREMENT_DELAY_MS]`
- Mutable state lives in the `initSiteSearch` closure (Pagefind module, results, active index, request counter, timers, reporting state); there is no module-level mutable state. `[site.js:completedSearch]`
- No environment variables, database access, file access or console output. `[site.js:PAGEFIND_MODULE_URL]`

### `analytics.js`

- Network: on production, appends an async `<script>` for the Google tag to `document.head` with `referrerPolicy` `origin`. `[analytics.js:https://www.googletagmanager.com/gtag/js?id=]`
- Globals written: `window.__IPC_ANALYTICS__` always; `window.dataLayer` and `window.gtag` on production. `[analytics.js:window.dataLayer]`
- Queues `consent`, `set`, `js`, `config` and `event` commands on the data layer. `[analytics.js:window.gtag("event", eventName, payload)]`
- Reads `window.location` (protocol, host, href, pathname, origin), `document.referrer` and `document.title`. `[analytics.js:document.referrer]`
- Reads the stored consent choice through `analytics-consent.js`. `[analytics.js:readAnalyticsChoice]`
- No environment variables, database access, file access, console output, timers, fetch or beacon calls. `[analytics.js:URL_PARAMETERS]`

### `analytics-consent.js`

- `localStorage`: `getItem` and `setItem` on the consent key. `[analytics-consent.js:window.localStorage.setItem]`
- Cookies: reads `document.cookie` and writes it to expire Google Analytics and Google Ads cookies. `[analytics-consent.js:document.cookie]`
- gtag: calls `window.gtag("set", …)` and `window.gtag("consent", "update", …)` when gtag exists; it never creates gtag or the data layer. `[analytics-consent.js:"update"]`
- Reads `window.location.hostname` to build the cookie domain list. `[analytics-consent.js:window.location.hostname]`
- DOM: sets `hidden` on the panel and settings control, calls `showModal()` and `close()`, sets the checkboxes and the status text. `[analytics-consent.js:settings.hidden = false;]`
- No environment variables, database access, network calls, file access, console output or timers; no module-level mutable state. `[analytics-consent.js:const CHOICE_KEY]`

## Verification

- Run: `npm run test:client` (its `scripts/copy-link.test.mjs` reads `site.js`; its `scripts/google-analytics.test.mjs` reads `analytics.js` and `analytics-consent.js`)
- Run: `npm run test:e2e` (`tests/e2e/recaptcha.spec.ts` covers `forms.ts`; `tests/e2e/forms-submit.spec.mjs` and `tests/e2e/report-new.spec.ts` cover the submit flow against a routed `/api/forms/submit`; `tests/e2e/site-search.spec.ts` covers the masthead search in `site.js`; `tests/e2e/analytics.spec.mjs` covers the analytics events)
