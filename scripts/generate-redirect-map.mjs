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
          lower(lp.state_or_territory_slug) as state,
          a.slug,
          lp.path || a.slug || '/' as canonical_path
        from public.agency a
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        where lp.state_or_territory_slug is not null
          and a.slug is not null
        order by lower(lp.state_or_territory_slug), a.slug
      `,
    )
  ).rows;

  const federalBranchRows = (
    await client.query(
      `
        select a.slug, lp.path || a.slug || '/' as canonical_path
        from public.federal_agency_branch fab
        join public.agency a on a.id = fab.agency_id
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
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
        select lp.state_or_territory_slug as state, lp.path as location_path,
               r.slug, r.incident_date
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
        select distinct lower(lp.state_or_territory_slug) as state
        from public.agency a
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        where lp.state_or_territory_slug is not null
        order by lower(lp.state_or_territory_slug)
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
      from: normalizePath("/law-enforcement-agency/"),
      to: normalizePath("/find-records/"),
      status: 301,
      source: "root collection route retired",
    },
    {
      from: normalizePath("/civil-litigation/"),
      to: normalizePath("/find-records/"),
      status: 301,
      source: "root collection route retired",
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
