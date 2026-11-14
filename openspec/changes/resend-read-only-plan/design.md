# Design

Use the existing list/get requests to return the same Terraform string map. Missing domains fail before any create call; tracking drift is reported unchanged. Keep apply and verify explicit and manual. The apply comparison expects links, matching the existing PATCH payload; no new tracking policy is introduced.

The repository bridge skills are unavailable in this runtime, so use the spec-driven schema with recorded plan and verification. No delegation.
