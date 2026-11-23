import contract from "./annotation-contract.json" with { type: "json" };
import { PAGE_SIZE } from "../pagination.ts";

/** @typedef {{field:string,value:unknown,type:'warning'|'error'|'correction',message:string,source_namespace:string,source_record_id:string,replacement_value?:unknown,evidence?:Record<string,unknown>[]}} DataAnnotation */
/** @typedef {DataAnnotation & {canonical_id:string,entity_kind:string,record_url:string|null,record_label:string,source_provider:string}} AnnotationEntry */

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

export function annotationValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

// Public presentation is separate from the intact intake audit record.
const internalReferenceField = (field) =>
  (field === "id" || field.endsWith("_id")) && !field.startsWith("source_");
function publicEvidence(value) {
  if (Array.isArray(value)) return value.map(publicEvidence);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !internalReferenceField(key))
        .map(([key, item]) => [key, publicEvidence(item)]),
    );
  return value;
}
export function annotationDisplay(entry) {
  const reference = internalReferenceField(entry.field);
  return {
    field: entry.field,
    showValues: !reference,
    ...(reference
      ? {}
      : { value: entry.value, replacement_value: entry.replacement_value }),
    message: entry.message,
    ...(entry.evidence === undefined
      ? {}
      : { evidence: publicEvidence(entry.evidence) }),
  };
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
    page > Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  )
    throw new Error("Invalid annotation page.");
  return entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
    ...entries.map((entry) => {
      const display = annotationDisplay(entry);
      return [
        entry.source_provider,
        entry.source_record_id,
        entry.record_url,
        display.field,
        display.showValues ? annotationValue(display.value) : "",
        entry.type,
        display.message,
        entry.type === "correction" && display.showValues
          ? annotationValue(display.replacement_value)
          : "",
        display.evidence === undefined ? "" : JSON.stringify(display.evidence),
      ]
        .map(quote)
        .join(",");
    }),
    "",
  ].join("\r\n");
}

/** Format a stored DATE column as its calendar date; other values pass through. */
export function storedDate(stored) {
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
  return stored;
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
export function authorityAnnotations(entries, authorityId) {
  return entries.filter(
    (entry) =>
      entry.entity_kind === "LicensingAuthority" &&
      entry.canonical_id === authorityId,
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

/** Preserve the excluded subject even when the annotation is filed on an authority. */
export function annotationRecordLabel(entry) {
  if (
    entry.field === "excluded_records" &&
    entry.value &&
    typeof entry.value === "object"
  ) {
    return entry.value.name || `${entry.value.kind} ${entry.value.key}`;
  }
  return entry.record_label;
}

export function annotationNoteLabel(entry) {
  return entry.type === "warning"
    ? "Warning"
    : entry.type === "error"
      ? "Data error"
      : "Correction";
}
