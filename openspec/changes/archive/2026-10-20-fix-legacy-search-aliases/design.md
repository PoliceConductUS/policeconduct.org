## Context

normalizePath appends a slash. Existing static aliases therefore cannot cover no-slash requests. load-redirects.mjs validates but does not rewrite paths, and the CloudFront router probes the exact URI before wildcard rules.

## Goals / Non-Goals

Cover exactly two verified no-slash static aliases. Preserve existing slash aliases. Do not add general normalization or infer destinations for missing entity records.

## Decisions

Add two literal from values, bypassing normalizePath only for these explicit aliases. Keep the same canonical destinations as the existing slash entries. The serialized generator output preserves the literal source values; the loader stores namespace + from unchanged.

## Risks / Trade-offs

New entries require publishing the regenerated map. No page render is required for this source-only redirect correction.

## Migration Plan

Parent will regenerate and publish the redirect inventory through the release workflow. Reverting the added entries rolls back the correction.

## Open Questions

None.
