/** SQL predicate for an open assignment, preserving invalid reported end dates. */
export function currentAssignmentSql(alias = "") {
  if (alias && !/^[a-z_]+$/.test(alias))
    throw new Error("Invalid assignment alias.");
  const prefix = alias ? `${alias}.` : "";
  const missingDate = `${prefix}end_date is null`;
  const evidence = `${prefix}data_source_values->'end_date'->'effective_value'`;
  const startEvidence = `${prefix}data_source_values->'start_date'->'effective_value'`;
  const knownStart = `(${prefix}start_date <= (current_timestamp at time zone 'UTC')::date or (${prefix}start_date is null and (${startEvidence} is null or ${startEvidence} = 'null'::jsonb)))`;
  return `(${missingDate} and (${evidence} is null or ${evidence} = 'null'::jsonb) and ${knownStart})`;
}
