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
