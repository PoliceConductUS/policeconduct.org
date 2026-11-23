## Decision

Use advanced consent mode. Read only a valid saved choice; otherwise default
analytics_storage to denied before loading the Google tag on production hosts
(https on policeconduct.org and www.policeconduct.org). ad_storage, ad_user_data
and ad_personalization, and the flags allow_google_signals and
allow_ad_personalization_signals, follow the saved advertising choice and default
to denied and false.

The choice is saved in localStorage under ipc-analytics-consent-v1 as JSON
{"analytics": "granted"|"denied", "advertising": "granted"|"denied"}; any other
value is invalid and counts as no choice. Choices are stored per origin; the
router redirects the bare domain to www, so production choices are stored on one
origin. Storage failure defaults the next visit to denied.

A modal dialog (AnalyticsConsent.astro, opened with showModal()) shows three
categories: Necessary settings (always on), Analytics cookies and Advertising,
and three equally styled buttons: Allow all, Save preferences and Decline all.
Allow all grants both categories. Decline all denies both. Save preferences sets
each category from its checkbox. The dialog opens on its own when no valid choice
is saved. A Your privacy choices button at the bottom of every page reopens it. The
dialog says that limited cookieless measurement continues after a decline, and
it describes the Advertising choice as exactly what the property settings below
let Google do. Withdrawal sends a consent update and removes the cookies of each
denied category. Changes sync across tabs and apply without a page reload. The
dialog uses native focus handling and Escape dismissal; Escape saves nothing.
The dialog is built in Astro without React.

## Which layer controls advertising

The page consent update alone does not change what Google does with advertising
data. Each Google Analytics property must also allow it:

| Setting                      | Where it is kept                                            | Target value               | How it is applied                                                                           |
| ---------------------------- | ----------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| Google Signals               | `config/analytics.json` `googleSignalsSettings.state`       | `GOOGLE_SIGNALS_ENABLED`   | `npm run analytics:apply` (policeconduct.org) or `npm run analytics:push` (section1983.org) |
| Regional ads personalization | `config/analytics-manual.json` `regionalAdsPersonalization` | allowed in all 307 regions | Manual GA Admin setting; recorded with a new `observedAt` and `evidence`                    |
| Reporting identity           | `config/analytics-manual.json` `reportingIdentity`          | Device-based               | Manual GA Admin setting; recorded with `observedAt` and `evidence`                          |

Property IDs: policeconduct.org 520368202; section1983.org 525032464.

Each property uses device-based reporting identity, so turning on Google Signals
does not withhold low-count rows from the project's own reports. Signals still
serves ads personalization for visitors who opt in.

With both settings on, a visitor who opts in lets Google use visit data to
personalize ads, and with Google Signals on, to associate visits with signed-in
Google accounts. A visitor who does not opt in keeps every advertising permission denied, so
these property settings have no effect for that visitor. Advertising data is
collected only from visitors who opt in. No Google Ads account is linked, so the dialog must not promise
ad measurement or conversion tracking.

Permissions requested: analytics_storage for Analytics cookies; ad_storage,
ad_user_data and ad_personalization for Advertising. Google Signals and ads
personalization use these three permissions. No other permission is requested.

## Selling and sharing

PoliceConduct.org does not sell or actively share personal information. The site uses outside services, such as Google Analytics, that may collect information about a visitor depending on the visitor's cookie choices and actions, and those companies may sell or share it under their own policies. The privacy and cookie notices say exactly this (tasks.md, Notices, remaining edits, item 6). They no longer promise that no selling or sharing happens anywhere.

A Global Privacy Control (GPC) signal is treated as an opt-out of sharing for
advertising: Advertising stays off, overrides a saved opt-in and cannot be
turned on; GPC does not turn off analytics (tasks.md, Global Privacy Control).
Visitors can also opt out with the Advertising choice in Your privacy choices,
or with the footer link "Do Not Sell or Share My Personal Information", which
opens the request form with the opt-out preselected
(src/layouts/SiteLayout.astro).

## Alternatives considered

- Basic consent mode (load Google only after Allow all). Rejected: it loses
  all measurement from visitors who decline.
- No advertising choice, advertising always denied. Rejected: visitors may
  choose to allow advertising, and the choice must have a real effect.
- A third-party consent tool. Rejected: it adds a dependency and an external
  script (AGENTS.md "Avoid new dependencies").
- One combined category. Rejected: visitors can allow analytics without allowing
  advertising.
- Allow all grants analytics only. Rejected: every control must do exactly
  what its label says, and "all" includes advertising.

## Risks and mitigations

- Google still receives cookieless measurements after a decline. Accepted as
  part of advanced consent mode; disclosed in the dialog and the
  privacy notice (tasks.md).
- Choices are stored per origin. Mitigated: the router redirects the bare domain
  to www (infrastructure/bootstrap-policeconduct/functions/router.js), so
  visitors store choices on one origin.
- If storage fails, the dialog opens on every page. Accepted: the visitor can
  still choose for each page, and nothing is granted by default.
- If storage fails after an earlier choice was saved, the earlier choice could
  survive. Mitigated: the site removes the earlier saved choice (tasks.md).
- Escape closes the dialog without saving. With no saved choice it opens again
  on the next page; with a saved choice that choice stays. Accepted: no choice
  means denied.
- Cookie removal covers \_ga, \_ga\_\*, \_gcl\_\*, \_gac and \_gac\_\*. GA4 does
  not set \_gid or \_gat\_\*.
- Turning on Google Signals and ads personalization in a property affects only
  visitors who opt in.
- Order: the dialog text and notices ship first. They describe what Google may
  do when Advertising is on, which is true whether or not the property settings
  are on yet. The property settings (Google Signals, regional ads
  personalization) are turned on after the release with that text is promoted
  to www. Until then an opt-in does nothing on Google's side.
- Promoting a release built before this change's text: its notice says the site
  does not use cookies for targeted advertising, but its Allow all now turns on
  Signals and ads personalization. Accepted (breakage is fixed afterward).
  Manual step when promoting such a release: set googleSignalsSettings.state to
  GOOGLE_SIGNALS_DISABLED and run npm run analytics:apply, or promote a newer
  release.
- What Advertising does while Analytics is denied (no analytics cookies, so no
  client ID) is not stated in the Google sources below. The dialog label
  therefore promises only ads personalization. The deployed check for "Save
  preferences with only Advertising checked" records what Google receives.

## Verification

Test fresh, accepted, declined, saved preferences (each checkbox combination),
returning, withdrawn, invalid-storage, storage-error and cross-tab behavior, and
the effect of each button on all four consent keys and both advertising flags.
Tests intercept every request to Google, so no test traffic reaches Google.
Deployed network checks run after deployment (tasks.md).

## Source

https://developers.google.com/tag-platform/security/guides/consent
https://developers.google.com/tag-platform/security/concepts/consent-mode
Retrieved 2026-11-14.

Google Signals: the Google Analytics Help page on activating Google signals is
the source for the Signals claims above. Its URL and retrieval date are added
here before the property settings are turned on (tasks.md). These describe technical behavior, not legal approval.
