import contract from "./annotation-contract.json" with { type: "json" };

/** @typedef {{field:string,value:unknown,type:'warning'|'error'|'correction',message:string,source_namespace:string,source_record_id:string,replacement_value?:unknown,evidence?:Record<string,unknown>[]}} DataAnnotation */
/** @typedef {DataAnnotation & {canonical_id:string,entity_kind:string,record_url:string,record_label:string,source_provider:string}} AnnotationEntry */

// Validate the exact JSON Schema exported by intake, including recursive JSON values.
function matches(value, schema, root) {
  if (schema.$ref) {
    const target = schema.$ref
      .slice(2)
      .split("/")
      .reduce((node, key) => node[key], root);
    return matches(value, target, root);
  }
  if (schema.oneOf)
    return (
      schema.oneOf.filter((part) => matches(value, part, root)).length === 1
    );
  if (schema.anyOf)
    return schema.anyOf.some((part) => matches(value, part, root));
  if (Object.hasOwn(schema, "const") && value !== schema.const) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string")
    return (
      typeof value === "string" &&
      value.trim().length >= (schema.minLength ?? 0)
    );
  if (schema.type === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "array")
    return (
      Array.isArray(value) &&
      value.every((item) => matches(item, schema.items, root))
    );
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return false;
    if ((schema.required ?? []).some((key) => !Object.hasOwn(value, key)))
      return false;
    return Object.entries(value).every(([key, item]) => {
      const property = schema.properties?.[key];
      if (property) return matches(item, property, root);
      if (schema.additionalProperties === false) return false;
      if (typeof schema.additionalProperties === "object")
        return matches(item, schema.additionalProperties, root);
      return true;
    });
  }
  throw new Error("Unsupported generated annotation schema.");
}

/** @returns {DataAnnotation[]} */
export function parseAnnotations(value) {
  if (
    !Array.isArray(value) ||
    !value.every((entry) =>
      matches(entry, contract.annotation, contract.annotation),
    )
  ) {
    throw new Error(
      "Stored data annotations do not satisfy the intake contract.",
    );
  }
  return value;
}

export function parseSourceValues(value) {
  if (!matches(value, contract.sourceValues, contract.sourceValues))
    throw new Error(
      "Stored source evidence does not satisfy the intake contract.",
    );
  return value;
}

export function annotationValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** @param {AnnotationEntry[]} entries */
export function filterAnnotations(entries, provider = "", type = "") {
  return entries.filter(
    (entry) =>
      (!provider || entry.source_namespace === provider) &&
      (!type || entry.type === type),
  );
}

/** @param {AnnotationEntry[]} entries */
export function paginateAnnotations(entries, page) {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > Math.max(1, Math.ceil(entries.length / 50))
  )
    throw new Error("Invalid annotation page.");
  return entries.slice((page - 1) * 50, page * 50);
}

/** @param {AnnotationEntry[]} entries */
export function annotationsCsv(entries) {
  const columns = [
    "source_provider",
    "source_record_id",
    "record_url",
    "field",
    "reported_value",
    "type",
    "message",
    "replacement_value",
    "evidence",
  ];
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [
    columns.join(","),
    ...entries.map((entry) =>
      [
        entry.source_provider,
        entry.source_record_id,
        entry.record_url,
        entry.field,
        annotationValue(entry.value),
        entry.type,
        entry.message,
        entry.type === "correction"
          ? annotationValue(entry.replacement_value)
          : "",
        entry.evidence === undefined ? "" : JSON.stringify(entry.evidence),
      ]
        .map(quote)
        .join(","),
    ),
    "",
  ].join("\r\n");
}

export function reportedDate(stored, evidence) {
  // pg parses DATE at local midnight; retain its calendar fields, not UTC offset.
  if (stored instanceof Date) {
    if (!Number.isFinite(stored.getTime()))
      throw new Error("Invalid database date.");
    return [
      String(stored.getFullYear()).padStart(4, "0"),
      String(stored.getMonth() + 1).padStart(2, "0"),
      String(stored.getDate()).padStart(2, "0"),
    ].join("-");
  }
  return stored === null && evidence !== undefined
    ? evidence.effective_value
    : stored;
}

export function isReportedDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** @param {AnnotationEntry[]} entries */
export function authorityAnnotations(entries, namespaces, authorityId) {
  return entries.filter(
    (entry) =>
      namespaces.includes(entry.source_namespace) ||
      (entry.entity_kind === "LicensingAuthority" &&
        entry.canonical_id === authorityId),
  );
}

/** Convert a native database record to the generated annotation payload contract. */
export function annotationFromRecord(record) {
  const annotation = {
    field: record.field,
    value: record.value,
    type: record.type,
    message: record.message,
    source_namespace: record.source_namespace,
    source_record_id: record.source_record_id,
    ...(record.type === "correction"
      ? { replacement_value: record.replacement_value }
      : {}),
    ...(record.evidence == null ? {} : { evidence: record.evidence }),
  };
  return parseAnnotations([annotation])[0];
}
