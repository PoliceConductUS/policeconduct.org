# Design

Both CloudFront functions render the same `functions/router.js` source with domain and canonical-host configuration. Each associates its environment's KeyValueStore. Map keys are `r:prod:<path>` for production and `r:<preview-label>:<path>` for preview. Redirect lookup happens before file rewrites; matching exact entries take precedence over terminal `/*` prefix entries. Relative destinations preserve the current host. Query parameters, including repeated values, survive redirects. Production apex canonicalization is preserved.

The loader consumes the build's actual `{ redirects: [...] }` envelope, validates entries before writes, retains other namespaces, changes only differing entries, and removes stale keys using AWS UpdateKeys batches. Both local deploy scripts publish their map after successful content sync and before invalidation. Keep dry-run mutation-free.

New maps and existing mapped targets must be validated before edge publication. Existing production content must not receive the preview map. Production activation is separate from deploying preview for review.

First activation is staged: provision the selected store, validate and load its deployed-artifact map, test DEVELOPMENT, then publish only that environment. A full Terraform apply is not the initial activation path because function resources publish immediately. The user selected preview-only activation; production stays live on its existing function until a later rollout.

The user approved excluding category redirects whose built destinations are absent. The generator checks actual destination HTML, preserving noindex routes. Entity mappings remain subject to destination validation. For this activation, the current database differs from the deployed artifact, so the preserved artifact map receives only the approved category exclusions and identical duplicate removal.

## Release reconciliation follow-up

Submission/edit forms remain `noindex,follow`; their indexing policy is independent of route existence. The coverage checker first uses the sitemap, then checks generated `index.html` for an unresolved route. Existing missing-target and chain/cycle checks remain required.

Fifteen verified legacy agency paths map to retained agency IDs. The generator queries those IDs through `agency.location_path_id -> location_path.path` and the stored agency slug; a missing retained ID fails generation. The alias inventory contains no generated database IDs or precomputed destination paths.

The complete legacy URL decision inventory is `docs/redirect-release-disposition-2026-10-04.md`. Recommendations for unresolved URLs are not new redirect or absence policies. This follow-up does not build or publish production. Production activation is a deployment-time action; source checks and DEVELOPMENT testing can precede merge, but LIVE publication must use the eventual production artifact and map.
