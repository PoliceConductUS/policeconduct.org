# Accounting for missing URLs

`npm run validate:redirects` compares the prior sitemap with the current build.
Every prior URL must be a current route, redirect to a current terminal route,
or appear in the repository's `route-absences.json` list.

For a reviewed URL that is absent from the intake data, add its exact path and
reason to that list. For example (illustrative only):

```json
[
  {
    "path": "/personnel/example-123/",
    "reason": "Not populated by intake; no scheduled return."
  }
]
```

An entry permits the existing normal 404 response. It does not generate a page,
redirect, or 410 response, declare permanent removal, or promise when a profile
will return. Keep absent URLs out of the new sitemap and internal links.

List each exact URL, including any absent child pages. Entries do not cover
prefixes or wildcards. A current route or redirect takes precedence if the
profile returns; the old absence entry can then be removed.

Add actual reviewed URLs from the prior/current sitemap comparison, not guessed
identities or every missing path automatically. An
unlisted gap still fails the check. A redirect to a missing page or another
redirect still fails even if an absence entry exists.

For local checks, set `PRIOR_SITEMAP` to a saved prior sitemap path. Without it,
the checker uses the production sitemap. This check accounts for expected route
coverage; it does not verify deployed HTTP responses.
