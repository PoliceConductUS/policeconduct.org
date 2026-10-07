import { mkdir, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
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

// User-approved duplicate agencies: legacy routes resolve to retained agency IDs.
const approvedDuplicateAgencyAliases = [
  {
    from: "/law-enforcement-agency/mn/brooklyn-center-police-department-mn-ypgp/",
    retainedAgencyId: "f1vaatwf5ilk19pjizorn6ge",
  },
  {
    from: "/law-enforcement-agency/mn/minneapolis-police-department-mn-n6rd/",
    retainedAgencyId: "ikojqoawn6c4m5m23cgs3yan",
  },
  {
    from: "/law-enforcement-agency/mn/minnesota-state-patrol-d4e5f6/",
    retainedAgencyId: "amcwh94rl4evk2uvlej74k70",
  },
  {
    from: "/law-enforcement-agency/mn/st-anthony-police-department-mn-tbh3/",
    retainedAgencyId: "g0z448nl5vtavrvntebbzu2n",
  },
  {
    from: "/law-enforcement-agency/tx/dallas-police-department-tx-woyv/",
    retainedAgencyId: "cm76wpxb701ggvrvgmu50aa9n",
  },
  {
    from: "/law-enforcement-agency/tx/fort-worth-police-department-tx-py90/",
    retainedAgencyId: "cm7a0bgon037gewvgoqo5jqsu",
  },
  {
    from: "/law-enforcement-agency/tx/texas-department-of-public-safety-tx-28dj/",
    retainedAgencyId: "cm7a0bgoo03ekewvgxw2elv24",
  },
  {
    from: "/law-enforcement-agency/federal/fbi/",
    retainedAgencyId: "cm7a0bgot046gewvgtaafjyui",
  },
  {
    from: "/law-enforcement-agency/federal/atf/",
    retainedAgencyId: "cm7a0bgot046mewvgs6xyqymp",
  },
  {
    from: "/law-enforcement-agency/federal/dea/",
    retainedAgencyId: "cm7a0bgot046oewvgozeu75gj",
  },
  {
    from: "/law-enforcement-agency/federal/usss/",
    retainedAgencyId: "cm7a0bgot046iewvg5qs1f9cn",
  },
  {
    from: "/law-enforcement-agency/federal/cbp/",
    retainedAgencyId: "cufdb3i3jzsr5kkfuto7huqk",
  },
  {
    from: "/law-enforcement-agency/federal/tsa/",
    retainedAgencyId: "chvdwkxp1cjwertwzt6ll9b0",
  },
  {
    from: "/law-enforcement-agency/federal/uscg/",
    retainedAgencyId: "c887sm2ibjg8c2yp4e4f4es5",
  },
  {
    from: "/law-enforcement-agency/federal/usms/",
    retainedAgencyId: "cs2sz1y65zqybhahepchwol6",
  },
];

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
        from public.agency a
        join public.build_page_payload bpp
          on bpp.page_type = 'agency'
         and bpp.entity_id = a.id
        where a.parent_federal_agency_id is not null
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

  const retainedAgencyRows = (
    await client.query(
      `
        select a.id, a.slug, lp.path as location_path,
          (select count(*) from public.agency_personnel ap
           where ap.agency_id = a.id and ap.end_date is null) as assignment_count
        from public.agency a
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        where a.id = any($1::text[])
      `,
      [approvedDuplicateAgencyAliases.map((alias) => alias.retainedAgencyId)],
    )
  ).rows;
  const retainedAgenciesById = new Map(
    retainedAgencyRows.map((agency) => [agency.id, agency]),
  );
  const approvedDuplicateRedirects = approvedDuplicateAgencyAliases.flatMap(
    (alias) => {
      const agency = retainedAgenciesById.get(alias.retainedAgencyId);
      if (!agency) {
        throw new Error(
          `Missing retained agency ${alias.retainedAgencyId} for approved duplicate redirect ${alias.from}.`,
        );
      }
      if (Number(agency.assignment_count) === 0) return [];
      return [
        {
          from: alias.from,
          to: normalizePath(`${agency.location_path}${agency.slug}/`),
          status: 301,
          source: "approved duplicate agency alias",
        },
      ];
    },
  );

  const reportsBySlug = new Map(
    reportRows.map((report) => [report.slug, report]),
  );
  const legacyReportRedirects = legacyReportSlugAliases.flatMap((alias) => {
    const report = reportsBySlug.get(alias.newSlug);
    if (!report) {
      // No current report was found under this slug. An alias to a missing
      // report cannot produce a valid redirect target, so skip it with a warning.
      // verify-redirect-coverage.mjs separately requires coverage against prior
      // sitemaps; reconcile this alias when the warning appears.
      console.warn(
        `Skipping legacy report slug alias ${alias.oldSlug}: no current report with slug ${alias.newSlug}.`,
      );
      return [];
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
      source: "agency.parent_federal_agency_id legacy agency route",
    })),
    ...approvedDuplicateRedirects,
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
    // Retain legacy state and federal category redirects only when the
    // destination was generated in this build.
    ...[...US_STATE_TILES.map((state) => state.code.toLowerCase()), "federal"]
      .map((category) => ({
        from: normalizePath(`/personnel/${category}/`),
        to: normalizePath(`/${category}/`),
        status: 301,
        source: "personnel state route retired",
      }))
      .filter(hasBuiltDestination),
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
      return pages.filter(hasBuiltDestination);
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
      note: "Build-time redirect inventory loaded into the environment's CloudFront KeyValueStore during deployment.",
      redirects,
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${redirects.length} redirects at ${outputPath}`);
