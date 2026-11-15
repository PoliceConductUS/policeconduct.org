## Why

Live stacks must not be recreated when Terraform state is missing or unreadable.

## What Changes

- Refuse policeconduct and iceconduct wrapper applies unless state contains managed instances.
- Document recovery prerequisites and test early failure for both wrappers.
- Leave backend selection and imports pending authenticated inventory.

## Capabilities

### New Capabilities

- `terraform-apply`: Require readable managed state before applying live stacks.

### Modified Capabilities

None.

## Impact

The two bootstrap apply wrappers and their operator documentation. No cloud writes.
