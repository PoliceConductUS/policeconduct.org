# Donate page

## Overview

Static Astro page for the route `/donate/`. It renders donation amount buttons and giving-club cards that link to Stripe payment links, with a monthly or one-time switch handled in the browser. All amounts, links, club details and page text are constants in the page file. It loads no data.

## Interface

- Route `/donate/`, from `index.astro`; no `getStaticPaths` and no route params. `[index.astro:const pagePath = "/donate/";]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `heading` and `lede`. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Donate | PoliceConduct.org`; the canonical URL is the page path; the description is built from `ORG_LEGAL_NAME`. `[index.astro:title="Donate | PoliceConduct.org"]`
- Structured data: one object from `buildWebPage({ siteUrl, pageUrl, name, description })`, with `siteUrl` from `getSiteUrl(Astro.site)` (both from `#src/lib/structured-data.js`). `[index.astro:const structuredData = buildWebPage({]`
- Breadcrumbs: `Home` (`/`) then `Donate` (current). `[index.astro:{ label: "Donate", href: pagePath, current: true },]`
- Organization constants `ORG_ADDRESS_LINE`, `ORG_EIN` and `ORG_LEGAL_NAME` come from `#src/lib/org.js`; they feed the EIN in the trust strip, the check instructions and the description. `[index.astro:import { ORG_ADDRESS_LINE, ORG_EIN, ORG_LEGAL_NAME } from "#src/lib/org.js";]`
- Component: `PrefillBootstrap` from `#src/components/PrefillBootstrap.astro`, rendered with no props. `[index.astro:<PrefillBootstrap />]`
- Component: `PrefillNavButton` from `#src/components/PrefillNavButton.astro`, with props `class`, `to` (`/about/contact/`), `payload` (`whoami: "Donor"` and a `message`) and the attribute `data-donation-contact-link`. `[index.astro:whoami: "Donor",]`
- Local types `DonationFrequency` (`monthly` or `oneTime`), `PresetAmountKey`, `DonatePageConfiguration`, `DonationPageCopy` and `StripeLinkEntry`; none is exported. `[index.astro:type DonationFrequency = "monthly" | "oneTime";]`
- `donatePageConfiguration`: page title and subtitle, `ein`, `financialReportsPath`, six `presetAmounts`, `stripeLinks` (`presets` and `clubs`, each keyed by frequency), four `clubs` and `guardrailSentence`. `[index.astro:const donatePageConfiguration: DonatePageConfiguration = {]`
- `donatePageCopy`: every visible label and paragraph, including `frequencyOptions`, `trustStripSegments`, `otherWays` and `processingParagraphs`. `[index.astro:const donatePageCopy: DonationPageCopy = {]`
- Build-time helpers `collectStripeLinks`, `getStripeHostname` and `validateStripeHostnames`, run once in the frontmatter. `[index.astro:validateStripeHostnames(collectStripeLinks(donatePageConfiguration));]`
- Root element `div[data-donation-root]`; the client script and the page-local styles are scoped to it. `[index.astro:<div data-donation-root>]`
- Frequency switch: a `fieldset` with `role="radiogroup"` and one radio input named `donation-frequency` per option, with ids `frequency-monthly` and `frequency-oneTime`. `[index.astro:name="donation-frequency"]`
- Preset buttons: one `a[data-preset-button]` per preset amount, carrying `data-amount-key`, `data-amount-label`, `data-link-monthly` and `data-link-onetime`, opening in a new tab. `[index.astro:data-link-onetime={oneTimeLink}]`
- Trust strip: the segments joined with a bullet, plus a financial reports link marked `data-donation-financial-link`; a second such link sits at the foot of the page. `[index.astro:data-donation-financial-link]`
- Club grid `[data-club-grid]`: one `[data-club-card]` per club with its name, amount label, description, a `details` list of perks, a monthly button, an annual button and a hint marked `data-club-hint`. `[index.astro:<div class="row g-4 mt-3" data-club-grid>]`
- Club buttons: `a[data-club-button]` with `data-club-key`, `data-club-name`, `data-club-frequency` (`monthly` or `annual`) and `data-link`, opening in a new tab. `[index.astro:data-club-frequency="annual"]`
- "Other ways to give" cards from `donatePageCopy.otherWays`, and a processing section from `donatePageCopy.processingParagraphs`. `[index.astro:{donatePageCopy.otherWays.map((item) => (]`
- Inline client script (`is:inline`), placed after the layout: handles the frequency switch and sends analytics events. `[index.astro:const rootElement = document.querySelector("[data-donation-root]");]`
- Analytics events sent through `window.__IPC_ANALYTICS__.track`: `donation_frequency_selected` (`frequency`), `donation_amount_clicked` (`amount_key`, `amount_label`, `frequency`), `donation_club_clicked` (`club_frequency`, `club_key`, `club_name`), `donation_contact_clicked` (`link_text`) and `donation_financial_reports_clicked` (`link_text`). `[index.astro:trackDonationEvent("donation_financial_reports_clicked", {]`
- Page-local styles for the frequency button group inside `[data-donation-root]`. `[index.astro:[data-donation-root] .btn-group > .btn:focus-visible {]`
- No loaders and no `form` element; the frequency radios sit in a `fieldset` and every payment control is a link. `[index.astro:<fieldset]`

## Invariants

- The build throws `Stripe link hostname mismatch` when any non-empty Stripe link has a hostname different from the first non-empty link. `[index.astro:if (hostname && hostname !== firstHostname) {]`
- The build throws `Invalid Stripe URL for` a key when a non-empty link is not a valid URL. `[index.astro:Invalid Stripe URL for "${key}": "${url}"]`
- Empty links are skipped by the hostname check, and a `null` club link is treated as empty. `[index.astro:const link = links[clubKey] ?? "";]`
- The default frequency is `monthly`: the server renders that radio `checked`. `[index.astro:const defaultFrequency: DonationFrequency = "monthly";]`
- The script reads the frequency from the checked radio on load and again on `pageshow`, so a choice the browser restores on Back navigation is kept. `[index.astro:window.addEventListener("pageshow", syncCheckedFrequency);]`
- The `amount25` preset is the only one drawn with `btn-dark`. `[index.astro:const primaryPresetKey: PresetAmountKey = "amount25";]`
- A preset with no link for the selected frequency is rendered disabled: class `disabled`, `aria-disabled="true"`, `tabindex` -1 and no `href`. The monthly `amountOther` link is empty, so `Other` is disabled for monthly giving. `[index.astro:amountOther: "",]`
- The script applies the same rule when the frequency changes: a link sets `href` and enables the anchor, an empty link removes `href` and disables it. `[index.astro:anchorElement.removeAttribute("href");]`
- The "annual" club button uses the link stored under `stripeLinks.clubs.oneTime`. `[index.astro:donatePageConfiguration.stripeLinks.clubs.oneTime[club.key] || "";]`
- Club buttons do not change with the frequency switch; each keeps its own `data-link`. `[index.astro:const link = anchorElement.dataset.link || "";]`
- `stripeLinks.clubs` has a `civilian` key for both frequencies, but the `clubs` array has no `civilian` entry, so no Civilian Club card is rendered. `[index.astro:"civilian" | "sentinel" | "vanguard" | "patron" | "guardian",]`
- Amount and club click events are not sent when the anchor has no `href`. `[index.astro:if (!anchorElement.href) {]`
- The amount click event reports the frequency stored on the root element, with `monthly` as the fallback. `[index.astro:frequency: rootElement.dataset.frequency || "monthly",]`
- The script does nothing when `[data-donation-root]` is missing. `[index.astro:if (rootElement) {]`
- All Stripe anchors open in a new tab with `rel="noopener noreferrer"`. `[index.astro:rel="noopener noreferrer"]`
- `pagePath` is the single source for the `pagePath` prop, the `canonicalUrl` prop, the breadcrumb `href` and the structured-data `pageUrl`. `[index.astro:canonicalUrl={pagePath}]`

## Side Effects

- Outbound links to Stripe payment pages; this file makes no network call itself. `[index.astro:target="_blank"]`
- Sends analytics events through `window.__IPC_ANALYTICS__.track` when present. `[index.astro:window.__IPC_ANALYTICS__?.track?.(eventName, params);]`
- Writes the selected frequency to `data-frequency` on the root element. `[index.astro:rootElement.dataset.frequency = frequency;]`
- `PrefillNavButton` is given a prefill payload for `/about/contact/`; how it is stored is decided inside the component. `[index.astro:message: "Question about club benefits.",]`

## Verification

- Run: `npm run test:e2e`
