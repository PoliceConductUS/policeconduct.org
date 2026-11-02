# Workspace-managed historical redirects

Keep historical URLs reachable after the approved case slug migration. Read an operator-maintained old-path to new-path JSON object from `INTAKE_WORKSPACE/redirects.json` and merge it into the existing CloudFront redirect inventory. Removing an entry retires it on regeneration.

This board-directed format supersedes the six-case retained-ID configuration proposed earlier. Stable identity and source evidence remain in the migration audit; the workspace mapping requires no IDs or expiry fields. No deployment or publication is authorized.
