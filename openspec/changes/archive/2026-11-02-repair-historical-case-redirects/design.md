# Design

Read optional `redirects.json` from the configured intake workspace. Its JSON object maps local old paths to local destination paths. Merge configured 301 redirects with generated redirects, deduplicating identical mappings and rejecting conflicting destinations, self redirects, loops and configured targets that redirect again. Every configured destination must have built HTML.

The file is operator-managed workspace data and is not committed with named-person or corpus snapshots. A missing file means no workspace overrides; an unreadable or malformed file fails. Removing entries regenerates the inventory without those entries. The existing CloudFront deployment flow continues to consume `_redirect-map.json`.
