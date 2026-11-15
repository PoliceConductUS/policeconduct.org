## Implementation

- [x] Add read-only lookup and wire Terraform to it.
- [x] Preserve manual operations and document approval boundary.
- [x] Align tracking comparison with existing update payload.
- [x] Test CLI JSON contract, no writes on drift/missing domain, and matching-domain idempotence.
- [x] Run focused checks and record limits.

## Email configuration follow-up

- [x] Preserve enabled tracking/custom host on explicit bootstrap reruns.
- [x] Verify authoritative DNS across all four nameservers.
- [x] Read live Resend domain requirements and capture exact tracking record.
- [x] Restore authorized AWS profile access and verify identity.
- [x] Prepare exact DNS/Resend forward and rollback payloads, preserving inbound routing.
- [x] Execute authorized scoped changes and verify provider status.
- [x] Complete full repository validation before merge.

- [x] Include tracking DNS in the Terraform-managed provider record map.
- [x] Verify authenticated Terraform state/plan against live DNS before applying.

## Approved distribution access restriction

- [x] Declare US allowlists for PoliceConduct production/preview and Iceconduct.
- [x] Declare US allowlists for section1983 production/preview.
- [x] Inspect bounded plans, apply only approved changes, and verify all five live distributions.
- [x] Complete verification and archive the active change before PR #45 can merge.
