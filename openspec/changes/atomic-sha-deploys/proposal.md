## Why

Deploys today mutate the live S3 root via incremental `s3 sync` + a `/*`
CloudFront invalidation, and the full build renders 165k static pages in ~90
minutes. That means a slow, non-atomic release with a partial-state window, no
instant rollback, and a build too slow to sit in CI. The site already has the
ingredients for something better: a `build_page_payload` projection table with
`content_hash`, a preview CloudFront Function that already routes
`pr-<N>.preview.…` to a per-PR folder, and content-hashed `_astro/*` assets.

## What Changes

**Immutable per-build folders + pointer promotion**

- From: `s3 sync` overwrites the bucket root; the running site is whatever was
  last synced; rollback means re-syncing an old build.
- To: every build — PR or prod — lands in one immutable namespace `builds/<id>/`
  (`<id>` = `pr-<n>` or a merge-commit sha) in one bucket. A single CloudFront
  Function selects the folder per request — a KeyValueStore `current` pointer for
  the apex (prod), the first DNS label for `<id>.builds.<domain>` — and rewrites
  the URI to include the folder, so the build id is part of the cache key.
  Promotion is one KVS write with **no invalidation**; rollback is promoting the
  previous sha.
- Impact: atomic releases, instant rollback, PR and prod builds coexist in one
  namespace, and `<sha>.builds.<domain>` gives a pre-promote smoke test for free.

**Consolidated router function**

- From: separate `index_rewrite` and `preview_router` CloudFront Functions.
- To: one `router` function (folder selection + index rewrite + redirect-map
  application from KVS). Retire the two existing functions.

**Redirects travel with the promotion**

- From: `_redirect-map.json` is emitted into `dist` but applied by ad-hoc means.
- To: `builds/<id>/redirects.json` is the per-build source of truth. A CloudFront
  Function cannot read files, so publish loads each build's map into the KVS under
  a per-build namespace (`r:<id>:<path>`), and the router serves 301s on **every
  host** — apex and every `<id>.builds.<domain>` — so no host 404s on legacy URLs
  regardless of which build serves. The map is small and stable, well under KVS
  caps; Lambda@Edge reading the per-build file is the fallback only if it ever
  outgrows KVS. See design.md §1.

**Incremental rendering**

- From: every deploy re-renders all 165k pages.
- To: extend `refresh-build-projections` so every page type (including the 153k
  personnel pages that currently render from live queries) carries a
  `content_hash`; diff against the previous build's `_manifest.json`, render only
  changed pages, copy the rest from `builds/<prev-sha>/`. Typical delta = minutes.

**Sharded, cached CI build**

- From: one long local/serial build.
- To: a GitHub Actions matrix shards the full build across N runners (~11 min for
  a cold full build), with npm/Astro caches; incremental runs shard only the
  changed set. Build + upload + promote move into CI; the KVS flip is the only
  privileged prod step.

## Out of scope (for now)

- `<sha>.builds.policeconduct.org` per-build preview hostnames (the KVS pointer
  already selects prod; add later if a pre-promote look is wanted).
- On-demand/SSR rendering of the personnel long tail (keeps the site pure-static).
