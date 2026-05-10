import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { withDb } from "../src/lib/db.js";

const distDir = path.resolve("dist");
const outputPath = path.join(distDir, "_redirect-map.json");

const normalizePath = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw new Error("Redirect path cannot be empty.");
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

const redirects = await withDb(async (client) => {
  const agencyRows = (
    await client.query(
      `
        select a.category, a.slug, bpp.path as canonical_path
        from public.agency a
        join public.build_page_payload bpp
          on bpp.page_type = 'agency'
         and bpp.entity_id = a.id
        where a.category is not null
          and a.slug is not null
        order by a.category, a.slug
      `,
    )
  ).rows;

  const civilCaseRows = (
    await client.query(
      `
        select category, slug
        from public.civil_cases
        where category is not null
          and slug is not null
        order by category, slug
      `,
    )
  ).rows;

  const categoryRows = (
    await client.query(
      `
        select distinct lower(category) as category
        from public.agency
        where category is not null
        order by lower(category)
      `,
    )
  ).rows;

  return [
    ...agencyRows.map((agency) => ({
      from: normalizePath(
        `/law-enforcement-agency/${agency.category}/${agency.slug}/`,
      ),
      to: normalizePath(agency.canonical_path),
      status: 301,
      source: "build_page_payload.path",
    })),
    ...civilCaseRows.map((civilCase) => ({
      from: normalizePath(
        `/civil-litigation/${civilCase.category}/${civilCase.slug}/`,
      ),
      to: normalizePath(`/civil-cases/${civilCase.slug}/`),
      status: 301,
      source: "civil_cases.slug",
    })),
    ...categoryRows.flatMap((entry) => [
      {
        from: normalizePath(`/personnel/${entry.category}/`),
        to: normalizePath(`/${entry.category}/`),
        status: 301,
        source: "state-scoped personnel routes retired",
      },
      {
        from: `/personnel/${entry.category}/page/*`,
        to: normalizePath(`/${entry.category}/`),
        status: 301,
        source: "state-scoped personnel pagination retired",
      },
      {
        from: normalizePath(`/civil-litigation/${entry.category}/`),
        to: normalizePath(`/${entry.category}/`),
        status: 301,
        source: "state-scoped civil case routes retired",
      },
      {
        from: `/civil-litigation/${entry.category}/page/*`,
        to: normalizePath(`/${entry.category}/`),
        status: 301,
        source: "state-scoped civil case pagination retired",
      },
    ]),
    {
      from: "/videos/*",
      to: "/search/",
      status: 301,
      source: "top-level videos retired",
    },
    {
      from: "/video/*",
      to: "/search/",
      status: 301,
      source: "top-level videos retired",
    },
  ];
});

await mkdir(distDir, { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Build-time redirect inventory. Current static redirect pages and CloudFront pattern redirects are the active redirect mechanisms.",
      redirects,
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${redirects.length} redirects at ${outputPath}`);
