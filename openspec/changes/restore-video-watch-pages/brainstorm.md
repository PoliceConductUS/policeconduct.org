# Outcome

Restore the removed report and civil-case watch pages. A published video URL identifies the original stored link row; replacement IDs and redirects to ordinary record pages do not satisfy this outcome.

# Scoped design

Use existing report geographic canonical paths and civil-case slug paths, followed by `watch/{stored-link-id}/`. Enumerate stored parent paths and links, then reload the parent by exact slug and require the link to belong to it. Reuse shared page chrome, embedded video, source and record navigation, previous/next videos, and VideoObject metadata. Legacy URL redirects preserve the link ID and use only the existing approved report slug aliases.

The direct fix request authorizes this restoration. No new branch, schema policy, alias IDs, or deployment.
