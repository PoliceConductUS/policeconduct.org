import { mergeWorkspaceRedirects } from "./workspace-redirects.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { PAGE_SIZE } from "../src/lib/pagination.ts";
import { getVideoEmbedUrl } from "../src/lib/video.ts";
import { withDb } from "../src/lib/db.js";
import { US_STATE_TILES } from "../src/lib/geo/states.ts";

const distDir = path.resolve("dist");
const outputPath = path.join(distDir, "_redirect-map.json");

const hasBuiltDestination = ({ to }) => {
  try {
    return statSync(path.join(distDir, to, "index.html")).isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

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

const normalizeReportDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid report incident date: ${value}`);
  }
  return parsed.toISOString().slice(0, 10);
};

const buildReportPath = (report) => {
  const date = normalizeReportDate(report.incident_date);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Report ${report.slug} is missing a complete date.`);
  }
  return normalizePath(
    `${report.location_path}reports/${match[1]}/${match[2]}/${match[3]}/${report.slug}/`,
  );
};

const generatedRedirects = await withDb(async (client) => {
  const agencyRows = (
    await client.query(
      `
        select
          lower(split_part(lp.path, '/', 2)) as state,
          a.slug,
          lp.path || a.slug || '/' as canonical_path
        from public.agency a
        join public.location_path lp on lp.location_path_id = a.location_path_id
        join public.build_page_payload bpp on bpp.entity_id = a.id and bpp.page_type = 'agency'
        order by lower(split_part(lp.path, '/', 2)), a.slug
      `,
    )
  ).rows;

  const federalBranchRows = (
    await client.query(
      `
        select
          a.slug,
          lp.path || a.slug || '/' as canonical_path
        from public.agency a
        join public.build_page_payload bpp
          on bpp.page_type = 'agency'
         and bpp.entity_id = a.id
        join public.location_path lp on lp.location_path_id = a.location_path_id
        where a.parent_federal_agency_id is not null
        order by a.slug
      `,
    )
  ).rows;

  const civilCaseRows = (
    await client.query(
      `
        select c.id, split_part(lp.path, '/', 2) as state, c.slug,
          (select coalesce(json_agg(json_build_object('id', l.id, 'url', l.url)), '[]'::json)
           from public.civil_case_links l where l.civil_case_id = c.id) as videos
        from public.civil_cases c
        join public.location_path lp
          on lp.location_path_id = c.location_path_id
        where c.slug is not null
        order by split_part(lp.path, '/', 2), c.slug
      `,
    )
  ).rows;

  const reportRows = (
    await client.query(
      `
        select split_part(lp.path, '/', 2) as state, lp.path as location_path,
               r.slug, r.incident_date,
               (select coalesce(json_agg(json_build_object('id', l.id, 'url', l.url)), '[]'::json)
                from public.review_links l where l.review_id = r.id) as videos
        from public.reviews r
        join public.location_path lp
          on lp.location_path_id = r.location_path_id
        where r.slug is not null
        order by split_part(lp.path, '/', 2), r.slug
      `,
    )
  ).rows;

  const stateRows = (
    await client.query(
      `
        select distinct lower(split_part(lp.path, '/', 2)) as state
        from public.agency a
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        where split_part(lp.path, '/', 2) is not null
        order by lower(split_part(lp.path, '/', 2))
      `,
    )
  ).rows;

  // Parity with the retired "agencies" topic of
  // src/pages/personnel/[slug]/[topic]/: it generated
  // /personnel/{slug}/agencies/ for every officer with more than one distinct
  // agency assignment. The profile page already carries the full assignment
  // table, so those URLs fold back into it.
  const multiAgencyPersonnelRows = (
    await client.query(
      `
        select o.slug
        from public.personnel o
        join public.agency_personnel ao on ao.personnel_id = o.id
        group by o.slug
        having count(distinct ao.agency_id) > 1
        order by o.slug
      `,
    )
  ).rows;

  const watchRedirects = [
    ...civilCaseRows.flatMap((civilCase) =>
      civilCase.videos
        .filter((video) => getVideoEmbedUrl(video.url))
        .map((video) => ({
          from: normalizePath(
            `/civil-litigation/${civilCase.state}/${civilCase.slug}/watch/${video.id}/`,
          ),
          to: normalizePath(
            `/civil-cases/${civilCase.slug}/watch/${video.id}/`,
          ),
          status: 301,
          source: "civil_case_links.id and civil_cases.slug",
        })),
    ),
    ...reportRows.flatMap((report) =>
      report.videos
        .filter((video) => getVideoEmbedUrl(video.url))
        .flatMap((video) =>
          [
            `/report/${report.state}/${report.slug}/watch/${video.id}/`,
            `/report/${report.slug}/watch/${video.id}/`,
          ].map((from) => ({
            from: normalizePath(from),
            to: normalizePath(`${buildReportPath(report)}watch/${video.id}/`),
            status: 301,
            source: "review_links.id and reviews.slug",
          })),
        ),
    ),
  ];

  return [
    ...watchRedirects,
    ...agencyRows.map((agency) => ({
      from: normalizePath(
        `/law-enforcement-agency/${agency.state}/${agency.slug}/`,
      ),
      to: normalizePath(agency.canonical_path),
      status: 301,
      source: "agency.location_path_id and agency.slug",
    })),
    ...federalBranchRows.map((agency) => ({
      from: normalizePath(`/law-enforcement-agency/federal/${agency.slug}/`),
      to: normalizePath(agency.canonical_path),
      status: 301,
      source: "agency.parent_federal_agency_id legacy agency route",
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
      to: buildReportPath(report),
      status: 301,
      source: "reviews.slug",
    })),
    ...reportRows.map((report) => ({
      from: normalizePath(`/report/${report.slug}/`),
      to: buildReportPath(report),
      status: 301,
      source: "reviews.slug",
    })),
    {
      from: normalizePath("/report/"),
      to: normalizePath("/find-records/"),
      status: 301,
      source: "root collection route retired",
    },
    {
      from: "/privacy-policy",
      to: normalizePath("/legal-notice/privacy/"),
      status: 301,
      source: "legacy static route (Search Console 404 export)",
    },
    {
      from: "/partner/prosecutor",
      to: normalizePath("/partner/"),
      status: 301,
      source: "legacy static route (Search Console 404 export)",
    },
    {
      from: normalizePath("/privacy-policy/"),
      to: normalizePath("/legal-notice/privacy/"),
      status: 301,
      source: "legacy static route (Search Console 404 export)",
    },
    {
      from: normalizePath("/partner/prosecutor/"),
      to: normalizePath("/partner/"),
      status: 301,
      source: "legacy static route (Search Console 404 export)",
    },
    {
      from: normalizePath("/partner/peace-officer-standards-and-training/"),
      to: normalizePath("/partner/"),
      status: 301,
      source: "legacy static route (Search Console 404 export)",
    },
    {
      from: normalizePath("/law-enforcement-agency/"),
      to: normalizePath("/find-records/"),
      status: 301,
      source: "root collection route retired",
    },
    {
      from: normalizePath("/law-enforcement-agency/new/"),
      to: normalizePath("/agency/new/"),
      status: 301,
      source: "agency form route renamed",
    },
    {
      from: normalizePath("/law-enforcement-agency/suggest-edit/"),
      to: normalizePath("/agency/suggest-edit/"),
      status: 301,
      source: "agency form route renamed",
    },
    {
      from: normalizePath("/civil-litigation/"),
      to: normalizePath("/find-records/"),
      status: 301,
      source: "root collection route retired",
    },
    {
      from: normalizePath("/civil-litigation/new/"),
      to: normalizePath("/civil-cases/new/"),
      status: 301,
      source: "civil case form route renamed",
    },
    {
      from: normalizePath("/civil-litigation/suggest-edit/"),
      to: normalizePath("/civil-cases/suggest-edit/"),
      status: 301,
      source: "civil case form route renamed",
    },
    ...stateRows.flatMap((entry) =>
      [
        {
          from: normalizePath(`/report/${entry.state}/`),
          to: normalizePath(`/${entry.state}/reports/`),
          status: 301,
          source: "state-scoped report routes retired",
        },
        {
          from: `/report/${entry.state}/page/*`,
          to: normalizePath(`/${entry.state}/reports/`),
          status: 301,
          source: "state-scoped report pagination retired",
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
      ].filter(hasBuiltDestination),
    ),
    ...[
      {
        from: "/civil-litigation/federal/",
        to: "/federal/",
        status: 301,
        source: "federal civil case collection retired",
      },
    ].filter(
      (entry) =>
        !stateRows.some(({ state }) => state === "federal") &&
        hasBuiltDestination(entry),
    ),
    // Retain legacy state and federal category redirects only when the
    // destination was generated in this build.
    ...[...US_STATE_TILES.map((state) => state.code.toLowerCase()), "federal"]
      .flatMap((category) => [
        {
          from: normalizePath(`/personnel/${category}/`),
          to: normalizePath(`/${category}/`),
          status: 301,
          source: "personnel state route retired",
        },
        {
          from: normalizePath(`/law-enforcement-agency/${category}/`),
          to: normalizePath(`/${category}/`),
          status: 301,
          source: "agency collection route retired",
        },
        {
          from: `/law-enforcement-agency/${category}/page/*`,
          to: normalizePath(`/${category}/`),
          status: 301,
          source: "agency collection pagination retired",
        },
      ])
      .filter(hasBuiltDestination),
    ...[...new Set(agencyRows.map(({ state }) => state))].flatMap(
      (category) => {
        const pageCount = Math.ceil(
          agencyRows.filter(({ state }) => state === category).length /
            PAGE_SIZE,
        );
        return Array.from(
          { length: Math.max(0, pageCount - 1) },
          (_, index) => ({
            from: normalizePath(
              `/law-enforcement-agency/${category}/page/${index + 2}/`,
            ),
            to: normalizePath(`/${category}/`),
            status: 301,
            source: "agency collection pagination retired",
          }),
        ).filter(hasBuiltDestination);
      },
    ),
    // Full parity with the retired
    // src/pages/personnel/[category]/page/[...page].astro route: it
    // generated a redirect stub for every pagination page 2..N per
    // category, where N is derived from the personnel count for that
    // category chunked by PAGE_SIZE.
    ...multiAgencyPersonnelRows
      .map(({ slug }) => ({
        from: normalizePath(`/personnel/${slug}/agencies/`),
        to: normalizePath(`/personnel/${slug}/`),
        status: 301,
        source: "personnel agencies subpage retired",
      }))
      .filter(hasBuiltDestination),
    {
      from: "/videos/*",
      to: "/find-records/",
      status: 301,
      source: "top-level videos retired",
    },
    {
      from: "/video/*",
      to: "/find-records/",
      status: 301,
      source: "top-level videos retired",
    },
  ];
});

const redirects = await mergeWorkspaceRedirects(generatedRedirects, {
  workspace: process.env.INTAKE_WORKSPACE,
  hasBuiltDestination,
});

await mkdir(distDir, { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Build-time redirect inventory loaded into the environment's CloudFront KeyValueStore during deployment.",
      redirects,
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${redirects.length} redirects at ${outputPath}`);
