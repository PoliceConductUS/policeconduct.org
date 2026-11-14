# Design

Use the existing list/get requests to return the same Terraform string map. Missing domains fail before any create call; tracking drift is reported unchanged. Keep apply and verify explicit and manual. Apply creates a missing domain only and preserves all existing tracking/capability settings. Tracking configuration is a separate provider operation, so bootstrap reruns cannot undo the requested setup.

The repository bridge skills are unavailable in this runtime, so use the spec-driven schema with recorded plan and verification. No delegation.

Include provider-returned Tracking DNS in the existing Route 53 resource map. Keep existing record key construction; review the saved plan for index changes before applying. All DNS remediation and rollback must pass through Terraform state and reviewed plans.
