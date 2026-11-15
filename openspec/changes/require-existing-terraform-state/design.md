## Context

Both wrappers can reach apply without existing state. AWS access is unavailable in this runtime.

## Goals / Non-Goals

Reject absent or unreadable state before environment loading, npm installation, and all apply phases. This does not certify complete recovery or authorize infrastructure changes.

## Decisions

Share a read-only guard using Terraform state pull and jq with pipefail. Require version 4 state with at least one managed instance; data-only state is insufficient. Do not initialize or migrate implicitly.

## Risks / Trade-offs

Partial managed state still passes. Operators must reconcile every resource and review the full plan before apply. Direct Terraform invocation bypasses wrappers. Initial provisioning requires a separate explicitly authorized workflow.

## Migration Plan

Deploy no infrastructure. Restore authorized AWS access, inspect existing backend and resources, then determine the backend key and locking configuration before importing anything.

## Audit iteration: failed AWS reads

The recovered state and AWS credentials now permit live read verification. Account preflight uses managed AWS ARNs, including regional ARNs, and rejects missing, mixed or mismatched account evidence. This bootstrap is a single-account root; multi-account adoption requires an explicit provider-account mapping before applying.

CloudFront discovery uses successful list responses to distinguish absence from failed reads. Both DEVELOPMENT and LIVE function stages are checked. Errors propagate without an empty JSON result. No provider writes are introduced.

## Regional security adoption

Adopt the existing 85 regional security resources into the recovered PoliceConduct
bootstrap state. Reuse this root and branch; do not create a second state owner.
Explicit account-restricted `security_` provider aliases avoid the site's default
tags and existing alias names. Imports preserve enabled services and standards;
`prevent_destroy` rejects their removal. The saved plan must show no security
resource mutations before adoption. Unsupported GuardDuty feature settings stay
unchanged and explicitly unresolved. Backend durability is still separate work.

## GuardDuty feature ownership

Declare the six provider-supported feature types for each existing detector in the
same bootstrap root, preserving enabled/disabled and nested agent-management
settings. These resources cannot be imported by the pinned provider; creation
calls UpdateDetector. Inspect a scoped saved plan against fresh AWS reads before
execution, then compare every reported feature, including unsupported types.
Keep prevent_destroy and the existing account-restricted provider aliases. Do not
enable services or change unsupported settings as part of adoption.

Use AWS provider 6.70.0 for all 146 configurable reported feature entries. Its
Optional+Computed nested settings allow disabled legacy EKS runtime entries to
omit the AWS-rejected agent-management payload while retaining readback. Keep
explicit nested values for other features and compare all 197 live settings after
adoption. Inspect a full upgrade plan before any scoped feature application.

## reCAPTCHA account binding

Bind the AWS provider to the existing account `942370948729`, since caller
identity supplies the Google federation trust. Validate the Google project input
against `ipc-policeconduct`. Enforce both in Terraform configuration so direct
plans retain the restrictions. Preserve keys and federation settings; backend
migration and checkout binding remain separate verification steps.

## Preview entrypoints and alert restoration

The board requests the bare preview hostname serve the preview bucket root index,
a small PR-13 index to exercise namespace routing, seven-day old-version cleanup,
and infrastructure alerts to hello@policeconduct.org. Add a separate preview
certificate using the existing wildcard validation record; preserve the production
certificate. Manage the diagnostic HTML and bare-host A/AAAA aliases in Terraform.
The existing router passes bare-preview paths through and CloudFront supplies the
default index. Missing objects use the existing 404 mapping with a supplied page.
Inspect scoped plans and verify HTTPS responses before declaring success.
