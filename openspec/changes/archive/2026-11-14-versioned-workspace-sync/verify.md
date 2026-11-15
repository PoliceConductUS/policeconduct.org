# Verification

Push and pull sync INTAKE_WORKSPACE to the matching leaf prefix, without an environment argument, recursive push pre-scan, destination deletion, or dev-copy exclusion. Both directions stream progress and exclude .DS_Store at every depth.

48 focused workspace tests pass, including live subprocess output, path safeguards, version recovery, and deployment prompt choices. Standalone Terraform validation and the mocked storage plan pass. The operator roles include the bucket encryption and public-access read permissions required by transfer validation.

The authorized infrastructure rebuild completed: 12 former resources removed and 12 standalone resources created. The standalone post-apply plan reports no changes. Live synthetic version recovery and automatic storage validation passed under the dev IAM role. Local intake data was untouched; a real workspace re-upload after rebuilding is not claimed.

The local synthetic recovery demo at http://127.0.0.1:8154 returns passed=true with two retained revisions, original bytes recovered and a local backup. This fixture demonstration is separate from live AWS recovery evidence.

Website-wide drift review completed with an authenticated, untargeted plan: 3 additions, 18 updates, no resource deletions. Changes cover preview redirect KVS permissions/configuration, two Lambda packages and preview recipient configuration, 15 DNS creation-overwrite protections, a preview hosting-bucket retention rule, and an alert-email subscription. The workspace change only removes obsolete website outputs; its resources belong to the standalone root. The hosting retention rule does not affect the intake bucket. No website plan was applied.

Full validation reproduced a 60-second agency-projection query timeout. Its planner repeatedly scanned agencies while walking location ancestry. Materializing agency/location pairs once preserves the joins and symmetric EXCEPT assertion; EXPLAIN ANALYZE returned zero mismatches in 2.6 seconds. No assertion, test timeout, or production schema changed. Final-head full validation remains required.

All six GitHub checks passed on edf7d769442cf38eb10649bd11b2950a077c6188. Subsequent head changes require fresh validation and CI evidence. Active OpenSpec closure and board sync review remain merge gates. No merge or site deployment is authorized by this report.

## Final integrated verification

Full `npm run validate` passed on a97c9447b7a80f49535ad2bfc84bbab648b12f48 with Node 24.22.3: formatting, lint, types (zero warnings/hints), shell, schema, OpenSpec, personal-data scan and all tests. Browser coverage: 213 passed; all other stages passed with zero skips. All six GitHub checks passed on that published commit. The npm newer-version notice is informational; the repository-pinned Node runtime remains unchanged. Earlier incomplete/failing validation observations above are superseded by this complete run. Archive changes require another full validation on their final commit. Board sync review and explicit merge authorization remain separate; nothing merged or website-deployed.

Archive emitted a suggestion to split changes containing more than ten deltas. The eleven workspace requirements form the single integrated storage/transfer/recovery/deployment-prompt capability requested by the board; retaining them together follows the explicit reconciliation direction. No validation rule or assertion was disabled.
