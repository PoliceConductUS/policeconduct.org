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
        select lower(a.state) as state, a.slug, bpp.path as canonical_path
        from public.agency a
        join public.build_page_payload bpp
          on bpp.page_type = 'agency'
         and bpp.entity_id = a.id
        where a.state is not null
          and a.slug is not null
        order by lower(a.state), a.slug
      `,
    )
  ).rows;

  const federalBranchRows = (
    await client.query(
      `
        select a.slug, bpp.path as canonical_path
        from public.federal_agency_branch fab
        join public.agency a on a.id = fab.agency_id
        join public.build_page_payload bpp
          on bpp.page_type = 'agency'
         and bpp.entity_id = a.id
        where a.slug is not null
        order by a.slug
      `,
    )
  ).rows;

  const civilCaseRows = (
    await client.query(
      `
        select lp.state_or_territory_slug as state, c.slug
        from public.civil_cases c
        join public.location_path lp
          on lp.location_path_id = c.location_path_id
        where c.slug is not null
        order by lp.state_or_territory_slug, c.slug
      `,
    )
  ).rows;

  const reportRows = (
    await client.query(
      `
        select lp.state_or_territory_slug as state, r.slug
        from public.reviews r
        join public.location_path lp
          on lp.location_path_id = r.location_path_id
        where r.slug is not null
        order by lp.state_or_territory_slug, r.slug
      `,
    )
  ).rows;

  const stateRows = (
    await client.query(
      `
        select distinct lower(state) as state
        from public.agency
        where state is not null
        order by lower(state)
      `,
    )
  ).rows;

  return [
    ...agencyRows.map((agency) => ({
      from: normalizePath(
        `/law-enforcement-agency/${agency.state}/${agency.slug}/`,
      ),
      to: normalizePath(agency.canonical_path),
      status: 301,
      source: "build_page_payload.path",
    })),
    ...federalBranchRows.map((agency) => ({
      from: normalizePath(`/law-enforcement-agency/federal/${agency.slug}/`),
      to: normalizePath(agency.canonical_path),
      status: 301,
      source: "federal_agency_branch legacy agency route",
    })),
    ...civilCaseRows.map((civilCase) => ({
      from: normalizePath(
        `/civil-litigation/${civilCase.state}/${civilCase.slug}/`,
      ),
      to: normalizePath(`/civil-cases/${civilCase.slug}/`),
      status: 301,
      source: "civil_cases.slug",
    })),
    ...reportRows.map((report) => ({
      from: normalizePath(`/report/${report.state}/${report.slug}/`),
      to: normalizePath(`/report/${report.slug}/`),
      status: 301,
      source: "reviews.slug",
    })),
    ...stateRows.flatMap((entry) => [
      {
        from: normalizePath(`/personnel/${entry.state}/`),
        to: normalizePath(`/${entry.state}/`),
        status: 301,
        source: "state-scoped personnel routes retired",
      },
      {
        from: `/personnel/${entry.state}/page/*`,
        to: normalizePath(`/${entry.state}/`),
        status: 301,
        source: "state-scoped personnel pagination retired",
      },
      {
        from: normalizePath(`/civil-litigation/${entry.state}/`),
        to: normalizePath(`/${entry.state}/`),
        status: 301,
        source: "state-scoped civil case routes retired",
      },
      {
        from: `/civil-litigation/${entry.state}/page/*`,
        to: normalizePath(`/${entry.state}/`),
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
