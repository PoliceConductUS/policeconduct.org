# Plan

1. Implement shared router with runtime-parity regressions for production and preview, queries, exact/wildcard maps, assets, and missing keys.
2. Repair and share the map loader with mocked AWS adapter tests; wire local deployment scripts.
3. Wire Terraform functions/stores to the common source; inspect discovered map and coverage defects.
4. Run focused and aggregate checks plus independent review.
5. Provision/load preview store, verify AWS development function, publish preview, and verify live redirects and destinations.
6. Handle production rollout according to user instruction; commit/sync verified changes and evidence.
