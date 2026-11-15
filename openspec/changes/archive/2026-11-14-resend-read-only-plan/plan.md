# Plan

1. Add read-only domain lookup and select it in Terraform.
2. Keep manual bootstrap and verification documented separately.
3. Test the actual CLI selected by Terraform with a fetch mock that rejects writes, covering drift and missing domains.
4. Correct the existing apply comparison/payload mismatch and verify idempotence.
5. Validate and open a feature PR; do not merge or deploy.
