import { groupBy, mapBy } from "#src/lib/data.js";
import { withDb } from "#src/lib/db.js";
import { formatShortDate } from "#src/lib/format.js";
import { US_STATE_TILES } from "#src/lib/geo/states.js";
import { loadCoverageLinksForAgency } from "./coverage.js";
import {
  buildPlacePath,
  requireAgencyCanonicalPath,
} from "./location-paths.js";
import { buildReportCanonicalPath } from "./report-paths.js";

export const requireAgencyText = (
  value: unknown,
  fieldName: string,
  agencyId: string,
) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Agency ${agencyId} is missing required ${fieldName}`);
  }
  return text;
};

export const loadAgencyStaticPaths = async () => {
  const agencies = await withDb(async (client) => {
    return (
      await client.query(
        `select a.id, a.slug, a.state, bpp.path as canonical_path
         from public.agency a
         join public.build_page_payload bpp
           on bpp.page_type = 'agency'
          and bpp.entity_id = a.id`,
      )
    ).rows;
  });

  return agencies.map(
    (agency: {
      id: string;
      slug: string;
      state?: string | null;
      canonical_path: string;
    }) => {
      const agencyId = requireAgencyText(agency.id, "id", "unknown");
      const stateValue = requireAgencyText(
        agency.state,
        "state",
        agencyId,
      ).toLowerCase();

      return {
        params: {
          category: stateValue,
          slug: requireAgencyText(agency.slug, "slug", agencyId),
        },
        props: { canonicalAgencyPath: agency.canonical_path },
      };
    },
  );
};

export const loadAgencyLocationStaticPaths = async () => {
  const agencies = await withDb(async (client) => {
    return (
      await client.query(
        `select a.id, bpp.path as canonical_path
         from public.agency a
         join public.build_page_payload bpp
           on bpp.page_type = 'agency'
          and bpp.entity_id = a.id`,
      )
    ).rows;
  });

  return agencies.map((agency: any) => {
    const agencyId = requireAgencyText(agency.id, "id", "unknown");
    const parts = requireAgencyText(
      agency.canonical_path,
      "canonical_path",
      agencyId,
    )
      .split("/")
      .filter(Boolean);
    if (parts.length !== 4) {
      throw new Error(
        `Agency ${agencyId} has invalid address-based URL ${agency.canonical_path}`,
      );
    }
    const [category, administrativeArea, place, agencySlug] = parts;

    return {
      params: {
        category,
        administrativeArea,
        place,
        agencySlug,
      },
      props: { agencyId },
    };
  });
};

const loadAgencyRows = async (agencyId: string) =>
  withDb(async (client) => {
    const agency = (
      await client.query("select * from public.agency where id = $1", [
        agencyId,
      ])
    ).rows[0];
    const agencyLinks = (
      await client.query(
        `select *
         from public.agency_links
         where agency_id = $1
         order by label asc, url asc`,
        [agencyId],
      )
    ).rows;
    const agencyPhones = (
      await client.query(
        "select * from public.agency_phone_numbers where agency_id = $1",
        [agencyId],
      )
    ).rows;
    const agencyOfficers = (
      await client.query(
        "select * from public.agency_officers where agency_id = $1",
        [agencyId],
      )
    ).rows;
    const agencyStats = (
      await client.query("select * from public.agency_stats where id = $1", [
        agencyId,
      ])
    ).rows[0];
    const federalAgency = (
      await client.query(
        `select fa.id, fa.name, fa.slug
         from public.federal_agency_branch fab
         join public.federal_agency fa on fa.id = fab.federal_agency_id
         where fab.agency_id = $1`,
        [agencyId],
      )
    ).rows[0];
    const officerIds = agencyOfficers.map(
      (entry: { officer_id: string }) => entry.officer_id,
    );
    const officers = officerIds.length
      ? (
          await client.query(
            "select * from public.officers where id = any($1)",
            [officerIds],
          )
        ).rows
      : [];
    const officerStats = officerIds.length
      ? (
          await client.query(
            "select * from public.officers_stats where id = any($1)",
            [officerIds],
          )
        ).rows
      : [];
    const agencyOfficerIds = agencyOfficers.map(
      (entry: { id: string }) => entry.id,
    );
    const reportOfficers = agencyOfficerIds.length
      ? (
          await client.query(
            "select * from public.review_officers where agency_officer_id = any($1)",
            [agencyOfficerIds],
          )
        ).rows
      : [];
    const reportIds = [
      ...new Set(
        reportOfficers.map((entry: { review_id: string }) => entry.review_id),
      ),
    ];
    const reports = reportIds.length
      ? (
          await client.query(
            `
              select r.*, lp.path as location_path
              from public.reviews r
              join public.location_path lp on lp.location_path_id = r.location_path_id
              where r.id = any($1)
            `,
            [reportIds],
          )
        ).rows
      : [];
    const allReportOfficers = reportIds.length
      ? (
          await client.query(
            "select * from public.review_officers where review_id = any($1)",
            [reportIds],
          )
        ).rows
      : [];
    const allReportAgencyOfficerIds = [
      ...new Set(
        allReportOfficers.map(
          (entry: { agency_officer_id: string }) => entry.agency_officer_id,
        ),
      ),
    ];
    const allReportAgencyOfficers = allReportAgencyOfficerIds.length
      ? (
          await client.query(
            "select * from public.agency_officers where id = any($1)",
            [allReportAgencyOfficerIds],
          )
        ).rows
      : [];
    const allReportOfficerIds = [
      ...new Set(
        allReportAgencyOfficers.map(
          (entry: { officer_id: string }) => entry.officer_id,
        ),
      ),
    ];
    const reportLinkedOfficers = allReportOfficerIds.length
      ? (
          await client.query(
            "select * from public.officers where id = any($1)",
            [allReportOfficerIds],
          )
        ).rows
      : [];
    const civilCaseIds = (
      await client.query(
        `select distinct cco.civil_case_id
         from public.agency_officers ao
         join public.civil_case_officers cco on cco.agency_officer_id = ao.id
         where ao.agency_id = $1`,
        [agencyId],
      )
    ).rows.map((row: { civil_case_id: string }) => row.civil_case_id);
    const civilCases = civilCaseIds.length
      ? (
          await client.query(
            `select *
             from public.civil_cases
             where id = any($1)
             order by filed_date desc nulls last, title asc, cause_number asc`,
            [civilCaseIds],
          )
        ).rows
      : [];
    const civilCaseOfficers = civilCaseIds.length
      ? (
          await client.query(
            `select cco.civil_case_id, ao.officer_id, ao.title
             from public.civil_case_officers cco
             join public.agency_officers ao on ao.id = cco.agency_officer_id
             where cco.civil_case_id = any($1)`,
            [civilCaseIds],
          )
        ).rows
      : [];
    const civilOfficerIds = [
      ...new Set(
        civilCaseOfficers.map(
          (entry: { officer_id: string }) => entry.officer_id,
        ),
      ),
    ];
    const civilOfficers = civilOfficerIds.length
      ? (
          await client.query(
            "select * from public.officers where id = any($1)",
            [civilOfficerIds],
          )
        ).rows
      : [];

    return {
      agency,
      agencyLinks,
      agencyPhones,
      agencyOfficers,
      agencyStats,
      federalAgency,
      officers,
      officerStats,
      reports,
      allReportOfficers,
      allReportAgencyOfficers,
      reportLinkedOfficers,
      civilCases,
      civilCaseOfficers,
      civilOfficers,
    };
  });

export const loadAgencyDetail = async (agencyId: string) => {
  const data = await loadAgencyRows(agencyId);
  const coverageLinks = await loadCoverageLinksForAgency(agencyId);

  const agencyRequiredId = requireAgencyText(data.agency.id, "id", "unknown");
  const agencyName = requireAgencyText(
    data.agency.name,
    "name",
    agencyRequiredId,
  );
  const agencyState = requireAgencyText(
    data.agency.state,
    "state",
    agencyRequiredId,
  );
  const agencySlug = requireAgencyText(
    data.agency.slug,
    "slug",
    agencyRequiredId,
  );
  const categorySlug = agencyState.toLowerCase();
  const categoryMeta = US_STATE_TILES.find(
    (entry) => entry.code.toLowerCase() === categorySlug,
  );
  const categoryLabel = categoryMeta?.name || agencyState.toUpperCase();
  const categoryPath = `/${categorySlug}/`;
  const administrativeArea = requireAgencyText(
    data.agency.administrative_area,
    "administrative_area",
    agencyRequiredId,
  );
  const administrativeAreaSlug = requireAgencyText(
    data.agency.administrative_area_slug,
    "administrative_area_slug",
    agencyRequiredId,
  );
  const placeLabel = requireAgencyText(
    data.agency.city,
    "city",
    agencyRequiredId,
  );
  const placeSlug = requireAgencyText(
    data.agency.place_slug,
    "place_slug",
    agencyRequiredId,
  );
  const placePath = buildPlacePath(data.agency);
  if (!placePath) {
    throw new Error(
      `Agency ${agencyRequiredId} is missing required fields for place URL`,
    );
  }
  const canonicalAgencyPath = requireAgencyCanonicalPath(data.agency);
  const agencyPath = canonicalAgencyPath;

  const officersById = mapBy(data.officers, "id");
  const officerStatsById = mapBy(data.officerStats, "id");
  const allReportAgencyOfficersById = mapBy(data.allReportAgencyOfficers, "id");
  const reportLinkedOfficersById = mapBy(data.reportLinkedOfficers, "id");
  const reportOfficersByReport = groupBy(data.allReportOfficers, "review_id");
  const civilCaseOfficersByCase = groupBy(
    data.civilCaseOfficers,
    "civil_case_id",
  );
  const civilOfficersById = mapBy(data.civilOfficers, "id");

  const employees = data.agencyOfficers
    .map(
      (entry: {
        officer_id: string;
        badge_number?: string | null;
        start_date?: string | null;
        end_date?: string | null;
      }) => {
        const officer = officersById[entry.officer_id];
        const stats = officerStatsById[entry.officer_id];
        return {
          entry,
          officer,
          reportCount: stats?.review_count ?? 0,
          rating: stats?.weighted_average ?? null,
        };
      },
    )
    .sort((left, right) => {
      if (!left.entry.end_date && right.entry.end_date) return -1;
      if (left.entry.end_date && !right.entry.end_date) return 1;
      const leftTime = left.entry.start_date
        ? new Date(left.entry.start_date).getTime()
        : Number.NEGATIVE_INFINITY;
      const rightTime = right.entry.start_date
        ? new Date(right.entry.start_date).getTime()
        : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime;
    });

  const civilCases = data.civilCases.map(
    (record: {
      id: string;
      slug: string;
      category: string;
      title?: string | null;
      cause_number?: string | null;
      filed_date?: string | null;
      court?: string | null;
      primary_source_url?: string | null;
    }) => {
      const officerLinks = (civilCaseOfficersByCase[record.id] || []).map(
        (entry: { officer_id: string; title?: string | null }) => {
          const officer = civilOfficersById[entry.officer_id];
          return officer
            ? {
                ...officer,
                licenseType: entry.title || null,
              }
            : null;
        },
      );
      return {
        ...record,
        officers: officerLinks.filter(Boolean),
        caseUrl: `/civil-cases/${record.slug}/`,
      };
    },
  );

  const reportedReports = data.reports
    .map(
      (report: {
        id: string;
        incident_date: string;
        location_path: string;
        slug: string;
      }) => {
        const linkedOfficers = (reportOfficersByReport[report.id] || [])
          .map((entry: { agency_officer_id: string }) => {
            const agencyOfficer =
              allReportAgencyOfficersById[entry.agency_officer_id];
            const officer = agencyOfficer
              ? reportLinkedOfficersById[agencyOfficer.officer_id]
              : null;
            return officer
              ? {
                  ...officer,
                  licenseType: agencyOfficer.title || null,
                }
              : null;
          })
          .filter(Boolean)
          .filter(
            (
              officer: { slug?: string | null },
              index: number,
              officers: { slug?: string | null }[],
            ) =>
              index ===
              officers.findIndex((item) => item.slug === officer.slug),
          );

        return {
          ...report,
          incidentDate: formatShortDate(report.incident_date),
          url: buildReportCanonicalPath({
            id: report.id,
            incidentDate: report.incident_date,
            locationPath: report.location_path,
            slug: report.slug,
          }),
          officers: linkedOfficers,
        };
      },
    )
    .sort((a, b) => {
      const left = new Date(b.incident_date).getTime();
      const right = new Date(a.incident_date).getTime();
      return left - right;
    });

  return {
    ...data,
    employees,
    civilCases,
    reportedReports,
    coverageLinks,
    agencyName,
    agencyState,
    agencySlug,
    categorySlug,
    categoryLabel,
    categoryPath,
    agencyPath,
    canonicalAgencyPath,
    administrativeArea,
    administrativeAreaSlug,
    placeLabel,
    placeSlug,
    placePath,
    counts: {
      civilCases: civilCases.length,
      reports: reportedReports.length,
      personnel: employees.length,
      coverage: coverageLinks.length,
    },
  };
};
