## Immediate safeguard

- [x] Add shared state guard before both wrappers perform other work.
- [x] Add warnings to both READMEs.
- [x] Test invalid, empty, data-only, unreadable, and valid state plus wrapper phases.
- [ ] Complete full repository validation.

## State recovery

- [ ] Restore authorized AWS access and verify accounts.
- [ ] Audit policeconduct, iceconduct, and section1983 state locations.
- [ ] Configure verified remote backend and locking.
- [ ] Import and reconcile existing resources; review a plan without unexpected creates, replacements, or destroys.

## Fail-closed audit iteration

- [x] Reject unavailable AWS tools, STS failure, malformed identity, failed state reads and missing/mismatched account evidence.
- [x] Propagate CloudFront discovery failures; retain valid absent-resource results.
- [x] Add failure-injection tests to the required infrastructure suite (30 combined focused tests pass).
- [x] Verify the guard and discovery against authorized live AWS read access.
- [ ] Run full validation after the shared database rebuild completes; publish the exact branch commits.

## Lambda configuration ownership

- [x] Remove release-script environment writes now that bootstrap state is recovered.
- [x] Check expected notification configuration for every selected function before release writes.
- [ ] Complete focused and full validation; publish the existing branch.
