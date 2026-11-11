import type { APIRoute } from "astro";
import { loadDataAnnotations } from "#src/lib/data/data-annotations.js";
import { annotationFilters } from "#src/lib/data/annotation-views.js";
import { annotationsCsv } from "#src/lib/data/annotation-values.js";
export async function getStaticPaths() {
  return annotationFilters(await loadDataAnnotations()).map(({ parts }) => ({
    params: { parts: parts || undefined },
  }));
}
export const GET: APIRoute = async ({ params }) => {
  const filter = annotationFilters(await loadDataAnnotations()).find(
    (filter) => filter.parts === (params.parts || ""),
  );
  if (!filter) throw new Error("Unknown data notes export.");
  return new Response(annotationsCsv(filter.entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=data-notes.csv",
    },
  });
};
