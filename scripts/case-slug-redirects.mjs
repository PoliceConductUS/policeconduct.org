/** Old paths are intake-owned evidence; destinations always use current DB slugs. */
export function caseSlugRedirects(rows, hasDestination) {
  const owners = new Map();
  return rows.map((row) => {
    if (
      !/^\/civil-(cases|litigation)\/[a-z0-9/-]+\/$/.test(row.old_path) ||
      !/^[a-z0-9-]+$/.test(row.slug || "") ||
      !row.civil_case_id
    ) {
      throw new Error("Invalid historical case URL or missing target case.");
    }
    if (owners.has(row.old_path))
      throw new Error(`Duplicate historical URL ownership: ${row.old_path}`);
    owners.set(row.old_path, row.civil_case_id);
    const to = `/civil-cases/${row.slug}/`;
    if (to === row.old_path)
      throw new Error(`Historical case self-redirect: ${to}`);
    if (!hasDestination({ to }))
      throw new Error(`Historical case destination is not built: ${to}`);
    return {
      from: row.old_path,
      to,
      status: 301,
      source: "civil_case_url_alias and civil_cases.slug",
    };
  });
}
