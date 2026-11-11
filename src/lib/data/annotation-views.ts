import {
  filterAnnotations,
  authorityAnnotations,
  paginateAnnotations,
  type AnnotationEntry,
} from "./annotation-values.js";
import { PAGE_SIZE } from "#src/lib/pagination.js";
const types = ["", "warning", "error", "correction"];
export function annotationFilters(
  entries: AnnotationEntry[],
  namespaces?: string[],
  authorityId?: string,
) {
  const eligible =
    namespaces === undefined
      ? entries
      : authorityAnnotations(entries, namespaces, authorityId);
  const providers =
    namespaces === undefined
      ? ["", ...new Set(eligible.map((entry) => entry.source_namespace))]
      : [""];
  return providers.flatMap((provider) =>
    types.map((type) => {
      const parts = [
        provider ? `source/${encodeURIComponent(provider)}` : "",
        type ? `type/${type}` : "",
      ]
        .filter(Boolean)
        .join("/");
      return {
        parts,
        provider,
        type,
        entries: filterAnnotations(eligible, provider, type),
      };
    }),
  );
}
export function annotationPages(
  entries: AnnotationEntry[],
  namespaces?: string[],
  authorityId?: string,
) {
  return annotationFilters(entries, namespaces, authorityId).flatMap((filter) =>
    Array.from(
      { length: Math.max(1, Math.ceil(filter.entries.length / PAGE_SIZE)) },
      (_, index) => ({
        ...filter,
        parts: [filter.parts, index ? `page/${index + 1}` : ""]
          .filter(Boolean)
          .join("/"),
        filterParts: filter.parts,
        page: index + 1,
        pageCount: Math.max(1, Math.ceil(filter.entries.length / PAGE_SIZE)),
        rows: paginateAnnotations(filter.entries, index + 1),
      }),
    ),
  );
}
export function annotationHref(base: string, parts: string) {
  return parts ? `${base}${parts}/` : base;
}
