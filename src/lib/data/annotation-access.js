/** @param {Record<string, string | undefined>} env */
export function internalAnnotationsEnabled(env) {
  return env.DATA_ANNOTATIONS_INTERNAL === "1";
}
/** Internal staging only. Public rollout remains a separate release action. */
export const annotationsEnabled = internalAnnotationsEnabled(process.env);

/** SQL predicate for an open assignment, preserving invalid reported end dates. */
export function currentAssignmentSql(alias = "") {
  if (alias && !/^[a-z_]+$/.test(alias))
    throw new Error("Invalid assignment alias.");
  const prefix = alias ? `${alias}.` : "";
  const missingDate = `${prefix}end_date is null`;
  if (!annotationsEnabled) return missingDate;
  const evidence = `${prefix}data_source_values->'end_date'->'effective_value'`;
  return `(${missingDate} and (${evidence} is null or ${evidence} = 'null'::jsonb))`;
}
