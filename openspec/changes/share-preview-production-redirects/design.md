# Design

Both CloudFront functions render the same `functions/router.js` source with domain and canonical-host configuration. Each associates its environment's KeyValueStore. Map keys are `r:prod:<path>` for production and `r:<preview-label>:<path>` for preview. Redirect lookup happens before file rewrites; matching exact entries take precedence over terminal `/*` prefix entries. Relative destinations preserve the current host. Query parameters, including repeated values, survive redirects. Production apex canonicalization is preserved.

The loader consumes the build's actual `{ redirects: [...] }` envelope, validates entries before writes, retains other namespaces, changes only differing entries, and removes stale keys using AWS UpdateKeys batches. Both local deploy scripts publish their map after successful content sync and before invalidation. Keep dry-run mutation-free.

New maps and existing mapped targets must be validated before edge publication. Existing production content must not receive the preview map. Production activation is separate from deploying preview for review.

First activation is staged: provision the selected store, validate and load its deployed-artifact map, test DEVELOPMENT, then publish only that environment. A full Terraform apply is not the initial activation path because function resources publish immediately. The user selected preview-only activation; production stays live on its existing function until a later rollout.

The user approved excluding category redirects whose built destinations are absent. The generator checks actual destination HTML, preserving noindex routes. Entity mappings remain subject to destination validation. For this activation, the current database differs from the deployed artifact, so the preserved artifact map receives only the approved category exclusions and identical duplicate removal.
