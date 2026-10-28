import type { APIRoute } from "astro";
import { annotationsEnabled } from "#src/lib/data/annotation-access.js";
import { loadDataAnnotations } from "#src/lib/data/data-annotations.js";
import {
  loadStateAuthorityPaths,
  loadStateAuthority,
  loadAuthorityNamespaces,
} from "#src/lib/data/licensing-authority.js";
import { annotationFilters } from "#src/lib/data/annotation-views.js";
import { annotationsCsv } from "#src/lib/data/annotation-values.js";
export async function getStaticPaths() {
  if (!annotationsEnabled) return [];
  const entries = await loadDataAnnotations();
  return (
    await Promise.all(
      (await loadStateAuthorityPaths()).map(async ({ params }) => {
        const authority = await loadStateAuthority(`/${params.category}/`);
        return annotationFilters(
          entries,
          await loadAuthorityNamespaces(authority.id),
        ).map(({ parts }) => ({
          params: { ...params, parts: parts || undefined },
        }));
      }),
    )
  ).flat();
}
export const GET: APIRoute = async ({ params }) => {
  if (!annotationsEnabled) return new Response(null, { status: 404 });
  const authority = await loadStateAuthority(`/${params.category}/`);
  const filter = annotationFilters(
    await loadDataAnnotations(),
    await loadAuthorityNamespaces(authority.id),
  ).find((filter) => filter.parts === (params.parts || ""));
  if (!filter) throw new Error("Unknown authority annotation export.");
  return new Response(annotationsCsv(filter.entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=data-notes.csv",
    },
  });
};
