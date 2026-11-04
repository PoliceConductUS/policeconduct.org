# Workspace redirects

Place `redirects.json` at the root of `INTAKE_WORKSPACE` to add redirects to the existing CloudFront inventory:

```json
{
  "/civil-cases/old-case/": "/civil-cases/current-case/"
}
```

Keys and values are local URL paths. The generator emits 301 redirects into `dist/_redirect-map.json` alongside its database-derived redirects. Each configured destination must have built HTML and be a final page. Conflicting mappings, loops, invalid paths and missing destinations fail generation. Identical mappings appear once.

Remove an entry and regenerate to retire it. There is no automatic expiry. An absent config adds no workspace redirects; malformed config fails. Keep corpus-specific mappings in workspace data, outside the public repository. Generate and review mappings against the retained case identities before changing URLs.

The existing deployment flow loads the generated inventory into CloudFront. Regeneration alone does not deploy anything.
