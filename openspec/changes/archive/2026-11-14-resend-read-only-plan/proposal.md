# Read-only Resend planning

## Why

Terraform currently runs the Resend bootstrap in apply mode during external data reads. A preview can create a domain or patch tracking settings.

## What Changes

Use an explicit read mode for Terraform, fail if the domain is absent, and retain manual apply/verify operations. Align the apply comparison with its existing links tracking-subdomain payload.

## Capabilities

### New Capabilities

- `resend-planning`: Provider lookup without mutations during Terraform evaluation.

### Modified Capabilities

None.

## Impact

Bootstrap script, its tests, Terraform external program and operator documentation. No deployed application or DNS changes.
