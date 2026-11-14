# Google Analytics configuration

`config/analytics.json` is the versioned configuration for this site's property and web stream.

```sh
npm run analytics:pull
npm run analytics:compare
npm run analytics:push
npm run test:analytics-config
```

Supply an OAuth access token using the `GOOGLE_ANALYTICS_ACCESS_TOKEN` environment variable through your secret manager or shell session. Keep tokens out of files and command history. The Analytics Admin API must be enabled, and the token's account must have property access. Pull and compare need `analytics.readonly` or `analytics.edit`; push needs `analytics.edit` and property edit permission. These tasks use the token directly and do not change Cloud CLI accounts or store credentials.

Pull fetches all pages of the supported collections and the supported singleton settings, validates the result, then atomically replaces the local configuration. Review `git diff -- config/analytics.json` before committing. A failed read leaves the local file intact. Pull deliberately replaces local desired values with remote values; commit any local edits you want to retain first.

Compare exits 0 for matching managed fields, 1 for drift, and 2 for errors. Push reads and plans all changes before writing, applies only changed managed fields, then reads back to verify. Push exits 0 only for a verified result, and 2 for errors. If a write fails partway through, earlier writes may have succeeded: compare again before retrying. These tasks run explicitly, separately from build and deployment.

Supported configuration: Google signals state; data retention; enhanced measurement switches; data redaction; custom dimensions; key events and counting methods; event creation rules. Pull imports supported collection fields and strips provider resource IDs and output-only metadata. Push preserves unlisted fields and resources. Only an explicit `unmarkedKeyEvents` entry for the existing legacy `form_submit_success` event permits deletion. Pull clears that deletion intent if the event exists remotely. Removing other resources locally does not delete them remotely.

Google signals consent acknowledgments, account access, Ads links, audiences, traffic filters, and regional advertising-personalization controls are outside this CLI's managed scope. The Admin API reference currently exposes no regional ads-personalization update endpoint; record dated Admin observations in `config/analytics-manual.json`. That file is evidence only and is never applied by push. Visitor consent and browser tag behavior remain in website source code.

References: [Admin API](https://developers.google.com/analytics/devguides/config/admin/v1/rest), [Google signals updates](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties/updateGoogleSignalsSettings).
