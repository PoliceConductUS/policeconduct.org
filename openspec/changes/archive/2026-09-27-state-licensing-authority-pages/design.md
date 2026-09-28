# Design

Resolve the authority by joining licensing_authority.location_path_id to the exact database-backed state location path. getStaticPaths enumerates only params; render reloads authority by exact path and requires exactly one result. Reuse PageShell, civic tables and design tokens. The authority name is H1; section headings use shared H2 styling.

Show license counts grouped by stored license type/status and license actions grouped by stored action with counts/latest recorded date. Show directly attributed discipline with personnel profile links, recorded dates/action/case and document links. Omit record sections without rows. Education awaits explicit authority relationship from intake. Show verified official website for every authority.

Load authority link by exact state path for state pages; personnel licensing loader joins the authority's location path for internal authority links. Database reads require columns, no missing-schema guards. Retain official website on authority page.

Manual records use official source name/site, state path source reference, stable manual source-local identity, intake canonical mapping and data chain. Preserve existing TX/MN rows. Keep a research manifest with official source URLs and evidence notes under this change and an audit copy in intake workspace. Only scoped new authority mutations may be applied; do not apply unrelated pending imports.
