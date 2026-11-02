# Preserve case URLs during citation slug migration

INS-109 authorizes citation-based case slugs and redirects. Intake owns case IDs, citation formatting, and historical URL ownership. The site SHALL read `civil_case_url_alias`, join each alias to the current case slug, and emit a direct 301 only to a built case page. Conflicting ownership, missing cases, self-redirects, and missing built destinations must fail the build. The new table is a required contract; deploy intake schema and data migration before building this site. No public deployment is authorized by local verification.
