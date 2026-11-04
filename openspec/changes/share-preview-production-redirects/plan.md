# Plan

1. Implement shared router with runtime-parity regressions for production and preview, queries, exact/wildcard maps, assets, and missing keys.
2. Repair and share the map loader with mocked AWS adapter tests; wire local deployment scripts.
3. Wire Terraform functions/stores to the common source; inspect discovered map and coverage defects.
4. Run focused and aggregate checks plus independent review.
5. Provision/load preview store, verify AWS development function, publish preview, and verify live redirects and destinations.
6. Handle production rollout according to user instruction; commit/sync verified changes and evidence.

## Release follow-up — October 4

7. Reproduce noindex destination false positives with real generated fixture files, then use generated HTML existence as well as sitemap membership for route coverage. Keep missing destinations and chains failing.
8. Add only approved duplicate agency aliases; resolve retained agency destinations through `agency.location_path_id -> location_path.path` and the stored agency slug. Fail for missing retained IDs. Verify mappings and built destination availability.
9. Audit all 477 exact paths into actionable groups, with existing decisions, evidence, and recommendations distinguished. Do not add unapproved absence records or guessed identity redirects.
10. Review scoped changes, run `npm run validate`, and report pre-merge preparation versus later production build/publication. No production build, deployment, or activation in this follow-up.

## Legacy collection release follow-up

Restore legacy agency collection navigation to built state/federal civic indexes, including scoped wildcard and exact count-derived pagination entries. Add the federal civil collection mapping to the built federal index. Keep missing indexes unredirected and preserve individual record identity. Resolve agency route identity through the required agency/location join rather than projection payloads. Verify in temporary fixtures; do not modify the ongoing build output or deploy.
