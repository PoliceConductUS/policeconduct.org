# Shared redirect handling

## Why

Preview currently returns 403 for legacy URLs despite an uploaded redirect map. Production has separate hard-coded routing rules. The existing preview loader accepts the wrong map shape and is not called by local deployment.

## What Changes

Use one CloudFront router source and one map loader for both environments. Maintain separate environment stores and namespace preview maps by PR label. Wire both local deployment paths to load their artifact's redirect map. Preserve query strings, support the map's terminal wildcard entries, and keep destinations on the requested environment host.

## Impact

No database changes or production content publication. Existing bucket layouts remain. Validate maps and runtime parity before enabling preview. Resolve discovered invalid redirect targets without inventing entity identities. Production activation depends on rollout scope confirmation.
