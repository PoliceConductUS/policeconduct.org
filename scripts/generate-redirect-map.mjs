import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { withDb } from "../src/lib/db.js";
import { US_STATE_TILES } from "../src/lib/geo/states.ts";

const distDir = path.resolve("dist");
const outputPath = path.join(distDir, "_redirect-map.json");

// Keep in sync with src/lib/pagination.ts PAGE_SIZE. That module can't be
// imported here (this script runs under plain node, not the Astro/Vite
// TypeScript resolver), so the value is mirrored as a constant instead.
const PERSONNEL_PAGE_SIZE = 50;

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

const legacyReportSlugAliases = [
  {
    oldSlug: "2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f",
    newSlug: "first-amendment-retaliation-arrest-2c545f",
  },
  {
    oldSlug: "2026-01-07-55401-death-of-renee-nicole-good-ice-shooting-d1e2f3",
    newSlug: "death-of-renee-nicole-good-ice-shooting-d1e2f3",
  },
  {
    oldSlug:
      "2026-01-24-55404-death-of-alex-pretti-federal-officers-shooting-g4h5i6",
    newSlug: "death-of-alex-pretti-federal-officers-shooting-g4h5i6",
  },
  {
    oldSlug:
      "2022-06-21-55422-mn-state-patrol-trooper-spenser-stockwell-speeding-j7k8l9",
    newSlug: "mn-state-patrol-trooper-spenser-stockwell-speeding-j7k8l9",
  },
  {
    oldSlug:
      "2022-08-02-55422-mn-state-patrol-lt-john-farmakes-voicemail-m0n1o2",
    newSlug: "mn-state-patrol-lt-john-farmakes-voicemail-m0n1o2",
  },
];

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

const redirects = await withDb(async (client) => {
  const agencyRows = (
    await client.query(
      `
        select
          payload->'agency'->>'state' as state,
          payload->'agency'->>'slug' as slug,
          path as canonical_path
        from public.build_page_payload
        where page_type = 'agency'
        order by payload->'agency'->>'state', payload->'agency'->>'slug'
      `,
    )
  ).rows;

  const federalBranchRows = (
    await client.query(
      `
        select
          bpp.payload->'agency'->>'slug' as slug,
          bpp.path as canonical_path
        from public.federal_agency_branch fab
        join public.build_page_payload bpp
          on bpp.page_type = 'agency'
         and bpp.entity_id = fab.agency_id
        order by bpp.payload->'agency'->>'slug'
      `,
    )
  ).rows;

  const civilCaseRows = (
    await client.query(
      `
        select split_part(lp.path, '/', 2) as state, c.slug
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
               r.slug, r.incident_date
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

  // Mirrors the per-officer "most recent active assignment" grouping done by
  // loadPersonnelSummaries() (src/lib/data/personnel.ts): for each officer,
  // pick their active (end_date is null) agency assignment with the latest
  // start_date, then bucket by that agency's state. Reimplemented as SQL
  // here (rather than imported) because personnel.ts pulls in TS modules
  // that resolve via Astro/tsconfig path aliases, which plain node can't
  // resolve when this script runs standalone.
  const personnelCategoryCounts = (
    await client.query(
      `
        with active_assignments as (
          select distinct on (ao.personnel_id)
            ao.personnel_id,
            lower(a.state) as category
          from public.agency_personnel ao
          join public.agency a on a.id = ao.agency_id
          where ao.end_date is null
            and a.state is not null
          order by ao.personnel_id, ao.start_date desc
        )
        select category, count(*)::int as total
        from active_assignments
        group by category
        order by category
      `,
    )
  ).rows;

  const reportsBySlug = new Map(
    reportRows.map((report) => [report.slug, report]),
  );
  const legacyReportRedirects = legacyReportSlugAliases.flatMap((alias) => {
    const report = reportsBySlug.get(alias.newSlug);
    if (!report) {
      throw new Error(`Missing report for legacy slug ${alias.oldSlug}`);
    }
    return [
      {
        from: normalizePath(`/report/${report.state}/${alias.oldSlug}/`),
        to: buildReportPath(report),
        status: 301,
        source: "legacy report slug alias",
      },
      {
        from: normalizePath(`/report/${alias.oldSlug}/`),
        to: buildReportPath(report),
        status: 301,
        source: "legacy report slug alias",
      },
      {
        from: buildReportPath({ ...report, slug: alias.oldSlug }),
        to: buildReportPath(report),
        status: 301,
        source: "legacy report slug alias",
      },
    ];
  });

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
      to: buildReportPath(report),
      status: 301,
      source: "reviews.slug",
    })),
    ...legacyReportRedirects,
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
    ...stateRows.flatMap((entry) => [
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
    // Full parity with the retired src/pages/personnel/[category]/index.astro
    // route: it built one redirect stub per US_STATE_TILES entry plus
    // "federal", regardless of whether that state currently has any
    // agencies in the database.
    ...[
      ...US_STATE_TILES.map((state) => state.code.toLowerCase()),
      "federal",
    ].map((category) => ({
      from: normalizePath(`/personnel/${category}/`),
      to: normalizePath(`/${category}/`),
      status: 301,
      source: "personnel state route retired",
    })),
    // Full parity with the retired
    // src/pages/personnel/[category]/page/[...page].astro route: it
    // generated a redirect stub for every pagination page 2..N per
    // category, where N is derived from the personnel count for that
    // category chunked by PAGE_SIZE.
    ...personnelCategoryCounts.flatMap(({ category, total }) => {
      const pageCount = Math.ceil(Number(total) / PERSONNEL_PAGE_SIZE);
      const pages = [];
      for (let page = 2; page <= pageCount; page += 1) {
        pages.push({
          from: normalizePath(`/personnel/${category}/page/${page}/`),
          to: normalizePath(`/${category}/`),
          status: 301,
          source: "personnel pagination route retired",
        });
      }
      return pages;
    }),
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
