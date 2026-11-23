## Why

This change began as a site-wide advertising opt-out requested by visitors through the project's internal issue tracker (INS-121, PR #42) and was extended to advanced consent mode in PR #44.

Before PR #44 the site loaded Google Analytics with cookies for every visitor and gave no way to decline. Visitors need to choose whether analytics cookies are used and, separately, whether Google may use their visits for advertising. Advanced consent mode means the Google tag always loads, uses no cookies until the visitor allows them, and sends limited cookieless measurements while consent is denied.

This change keeps the advertising choice and makes it real: the Google Analytics property settings must let an opt-in change what Google does, the dialog must ask only for the permissions the site needs, every control must do exactly what its label says, and the privacy and cookie notices must match.

## What Changes

The site uses advanced consent mode. It denies analytics_storage until the visitor allows analytics cookies, loads the Google tag on production hosts (https on policeconduct.org and www.policeconduct.org) for cookieless measurement even after a decline, remembers choices, and provides a Your privacy choices button to change or withdraw them.

Advertising is a separate category. Allow all and Decline all set both categories; Save preferences sets each one on its own. An advertising opt-in grants ad_storage, ad_user_data and ad_personalization and sets allow_google_signals and allow_ad_personalization_signals to true. This change turns on Google Signals and regional ads personalization in each Google Analytics property (tasks.md), so that an opt-in has an effect. Without an opt-in, every advertising permission stays denied.

The change covers both sites: policeconduct.org (this repository) and section1983.org (its own repository, tracked by per-repository tasks in tasks.md, including section1983's dependency audit).

The shared footer shows the build commit (first 12 characters of the SHA, with "-dirty" for a build from uncommitted changes), matching section1983.

## Non-goals

- No third-party consent tool.
- No change to which GA events are sent.
- No server-side storage of choices.
- No Google Ads account link. The advertising choice covers Google Signals and ads personalization in Google Analytics only.

## Capabilities

- New: analytics-privacy (consent defaults, the advertising choice, consent controls, saved choice handling).
- Modified: entity-page-chrome (adds Footer build commit).

## Impact

Adds a consent dialog and a Your privacy choices button to the shared layout. No data or routing changes.
Changes Google Analytics property settings (Google Signals and regional ads personalization) on both sites.
Updates the privacy and cookie notices to match the dialog. Merge, deployment and GA Admin evidence are tracked in tasks.md.
