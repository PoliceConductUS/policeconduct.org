## Implementation

- [x] Add read-only lookup and wire Terraform to it.
- [x] Preserve manual operations and document approval boundary.
- [x] Align tracking comparison with existing update payload.
- [x] Test CLI JSON contract, no writes on drift/missing domain, and matching-domain idempotence.
- [x] Run focused checks and record limits.

## Email configuration follow-up

- [x] Preserve enabled tracking/custom host on explicit bootstrap reruns.
- [x] Verify authoritative DNS across all four nameservers.
- [ ] Read live Resend domain requirements and capture exact tracking record.
- [ ] Restore authorized AWS profile access and verify identity.
- [ ] Prepare exact DNS/Resend forward and rollback payloads, preserving inbound routing.
- [ ] Execute authorized scoped changes and verify provider status.
- [ ] Complete full repository validation before merge.
