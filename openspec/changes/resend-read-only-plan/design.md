# Design

Use the existing list/get requests to return the same Terraform string map. Missing domains fail before any create call; tracking drift is reported unchanged. Keep apply and verify explicit and manual. Apply creates a missing domain only and preserves all existing tracking/capability settings. Tracking configuration is a separate provider operation, so bootstrap reruns cannot undo the requested setup.

The repository bridge skills are unavailable in this runtime, so use the spec-driven schema with recorded plan and verification. No delegation.
