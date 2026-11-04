# Agency status

## Outcome

Residents can see an agency's stored status and status date near its name. Non-active status stands out. Search and AI consumers receive the same facts.

## Scope and decisions

User requests authorize this bounded change. Existing schema has nullable text status and nullable date status_date. Current values are ACTIVE, INACTIVE, and null. Show supplied values independently; never infer Active from null. Use the neutral label Status date; no effective, opening, closure, or update-date inference. Preserve stored dates, including 1899-12-31 (reported to user). Active metadata is compact; non-active metadata is a prominent neutral navy notice. Keep existing routes and other content.
