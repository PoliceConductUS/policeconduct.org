## Context

The shared GoogleAnalytics component configures G-40S6M70XP7. The live page has neither opt-out flag.

## Decision

Use the site-wide option explicitly offered in INS-121. Set both flags false and queue denied advertising consent before loading the external tag. Google documents 2026 changes that make Consent Mode relevant alongside legacy flags: https://support.google.com/analytics/answer/17016975 . Implementation order follows https://developers.google.com/tag-platform/security/guides/consent . Do not claim consent was granted for analytics or that all tracking stops.

## Verification and release

Test the actual inline code for consent-before-load ordering, flags and retained analytics. Verify deployed HTML and network behavior after release. Read actual GA Admin Google signals, ads personalization and Ads links; do not infer these from HTML. Production release retains the repository release gates.
