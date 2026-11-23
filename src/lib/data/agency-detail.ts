import { groupBy, mapBy } from "#src/lib/data.js";
import { withDb } from "#src/lib/db.js";
import { loadReportSummaryBuildPayloads } from "./build-payloads.js";
import { loadCoverageLinksForAgency } from "./coverage.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

export type AgencyScopedTopicKind = "personnel" | "reports" | "civil-cases";

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

// Route params come from the agency's location_path plus its slug. The
// build_page_payload join only limits the list to agencies that have a page.
const agencyLocationStaticPathSelect = `
  select
    a.id,
    lp.path || a.slug || '/' as canonical_path
  from public.agency a
  join public.location_path lp
    on lp.location_path_id = a.location_path_id
  join public.build_page_payload bpp
    on bpp.page_type = 'agency'
   and bpp.entity_id = a.id
`;

const agencyTopicWhereSql = (kind: AgencyScopedTopicKind) => {
  if (kind === "personnel") {
    return `
      where exists (
        select 1
        from public.agency_personnel ao
        where ao.agency_id = a.id
      )
    `;
  }

  if (kind === "reports") {
    return `
      where exists (
        select 1
        from public.agency_personnel ao
        join public.review_personnel ro
          on ro.agency_personnel_id = ao.id
        where ao.agency_id = a.id
      )
    `;
  }

  return `
    where exists (
      select 1
      from public.agency_personnel ao
      join public.civil_case_personnel cco
        on cco.agency_personnel_id = ao.id
      where ao.agency_id = a.id
    )
  `;
};

const toAgencyLocationStaticPath = (agency: {
  id: string | null;
  canonical_path: string | null;
}) => {
  const agencyId = requireAgencyText(agency.id, "id", "unknown");
  const pathParts = requireAgencyText(agency.canonical_path, "path", agencyId)
    .split("/")
    .filter(Boolean);
  if (pathParts.length !== 4) {
    throw new Error(
      `Agency ${agencyId} has malformed canonical path ${agency.canonical_path}.`,
    );
  }
  return {
    params: {
      category: pathParts[0],
      administrativeArea: pathParts[1],
      place: pathParts[2],
      agencySlug: pathParts[3],
    },
  };
};

export const loadAgencyLocationStaticPaths = async () => {
  const agencies = await withDb(async (client) => {
    return (
      await client.query(
        `
          ${agencyLocationStaticPathSelect}
          order by canonical_path
        `,
      )
    ).rows;
  });

  return agencies.map(toAgencyLocationStaticPath);
};

export const loadAgencyLocationStaticPathsForTopic = async (
  kind: AgencyScopedTopicKind,
) => {
  const agencies = await withDb(async (client) => {
    return (
      await client.query(
        `
          ${agencyLocationStaticPathSelect}
          ${agencyTopicWhereSql(kind)}
          order by canonical_path
        `,
      )
    ).rows;
  });

  return agencies.map(toAgencyLocationStaticPath);
};

type AgencyRouteParams = {
  agencySlug?: string | null;
  administrativeArea?: string | null;
  category?: string | null;
  place?: string | null;
};

const agencyRoutePathFor = (params: AgencyRouteParams) => {
  const category = requireAgencyText(
    params.category,
    "route category",
    "route",
  );
  const administrativeArea = requireAgencyText(
    params.administrativeArea,
    "route administrativeArea",
    "route",
  );
  const place = requireAgencyText(params.place, "route place", "route");
  const agencySlug = requireAgencyText(
    params.agencySlug,
    "route agencySlug",
    "route",
  );

  return {
    agencySlug,
    agencyPath: `/${category}/${administrativeArea}/${place}/${agencySlug}/`,
    locationPath: `/${category}/${administrativeArea}/${place}/`,
  };
};

export const loadAgencyDetailByRouteParams = async (
  params: AgencyRouteParams,
) => {
  const route = agencyRoutePathFor(params);
  const agencyId = await withDb(async (client) => {
    return (
      await client.query(
        `
          select a.id
          from public.agency a
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
          where lp.path = $1
            and a.slug = $2
        `,
        [route.locationPath, route.agencySlug],
      )
    ).rows[0]?.id as string | undefined;
  });

  if (!agencyId) {
    throw new Error(`Agency route ${route.agencyPath} did not resolve.`);
  }

  const detail = await loadAgencyDetail(agencyId);
  if (detail.agencyPath !== route.agencyPath) {
    throw new Error(
      `Agency route ${route.agencyPath} resolved to ${detail.agencyPath}.`,
    );
  }

  return detail;
};

const loadAgencyRows = async (agencyId: string) =>
  withDb(async (client) => {
    const agency = (
      await client.query(
        `
          select
            a.*,
            a.status,
            a.status_date::text as status_date,
            lp.path || a.slug || '/' as canonical_path,
            lp.path as location_path,
            area_lp.display_name as administrative_area,
            area_lp.path as administrative_area_path,
            state_lp.display_name as state_display_name,
            state_lp.path as state_path,
            lp.display_name as city
          from public.agency a
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
          left join public.location_path area_lp
            on area_lp.location_path_id = lp.parent_location_path_id
           and area_lp.level = 'administrative_area'
          left join public.location_path state_lp
            on state_lp.location_path_id = area_lp.parent_location_path_id
           and state_lp.level = 'state'
          join public.build_page_payload bpp
            on bpp.page_type = 'agency'
           and bpp.entity_id = a.id
          where a.id = $1
        `,
        [agencyId],
      )
    ).rows[0];
    if (!agency) {
      throw new Error(
        `Agency ${agencyId} was not found with a location_path and an agency build projection.`,
      );
    }
    // Staff counts of distinct people come from the intake view
    // site_agency_count.
    const staffCounts = (
      await client.query(
        `select personnel_count, current_personnel_count,
                former_personnel_count, unknown_personnel_count
         from public.site_agency_count
         where agency_id = $1`,
        [agencyId],
      )
    ).rows[0];
    if (!staffCounts) {
      throw new Error(`Agency ${agencyId} has no site_agency_count row.`);
    }
    const agencyPhones = (
      await client.query(
        `select * from public.agency_phone_numbers
         where agency_id = $1
         order by created_at asc, id asc`,
        [agencyId],
      )
    ).rows;
    const agencyOfficers = (
      await client.query(
        "select * from public.agency_personnel where agency_id = $1 order by id",
        [agencyId],
      )
    ).rows;
    const federalAgency = (
      await client.query(
        `select fa.id, fa.name, fa.slug
         from public.agency a
         join public.federal_agency fa on fa.id = a.parent_federal_agency_id
         where a.id = $1`,
        [agencyId],
      )
    ).rows[0];
    const officerIds = [
      ...new Set(
        agencyOfficers.map(
          (entry: { personnel_id: string }) => entry.personnel_id,
        ),
      ),
    ];
    const officers = officerIds.length
      ? (
          await client.query(
            "select * from public.personnel where id = any($1)",
            [officerIds],
          )
        ).rows
      : [];
    // Live report counts, not the officers_stats.review_count projection
    // (which can be stale/unpopulated). Same join shape as personnel.ts.
    const reportCounts = officerIds.length
      ? (
          await client.query(
            `select ao.personnel_id, count(distinct ro.review_id) as report_count
             from public.review_personnel ro
             join public.agency_personnel ao on ao.id = ro.agency_personnel_id
             where ao.personnel_id = any($1)
             group by ao.personnel_id`,
            [officerIds],
          )
        ).rows
      : [];
    const personnelDisciplineCounts = officerIds.length
      ? (
          await client.query<{
            personnel_id: string;
            discipline_count: number;
          }>(
            `select personnel_id, count(*)::int as discipline_count
             from public.discipline
             where personnel_id = any($1)
             group by personnel_id`,
            [officerIds],
          )
        ).rows
      : [];
    const disciplineLinks = (
      await client.query<{ personnel_id: string; discipline_id: string }>(
        `select distinct ap.personnel_id, dap.discipline_id
         from public.discipline_agency_personnel dap
         join public.agency_personnel ap on ap.id = dap.agency_personnel_id
         where ap.agency_id = $1`,
        [agencyId],
      )
    ).rows;
    const agencyOfficerIds = agencyOfficers.map(
      (entry: { id: string }) => entry.id,
    );
    const reportOfficers = agencyOfficerIds.length
      ? (
          await client.query(
            "select * from public.review_personnel where agency_personnel_id = any($1)",
            [agencyOfficerIds],
          )
        ).rows
      : [];
    const reportIds = [
      ...new Set(
        reportOfficers.map((entry: { review_id: string }) => entry.review_id),
      ),
    ];
    const civilCaseIds = (
      await client.query(
        `select distinct cco.civil_case_id
         from public.agency_personnel ao
         join public.civil_case_personnel cco on cco.agency_personnel_id = ao.id
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
             order by filed_date desc, title asc, cause_number asc`,
            [civilCaseIds],
          )
        ).rows
      : [];
    const civilCaseOfficers = civilCaseIds.length
      ? (
          await client.query(
            `select cco.civil_case_id, ao.personnel_id, ao.title
             from public.civil_case_personnel cco
             join public.agency_personnel ao on ao.id = cco.agency_personnel_id
             where cco.civil_case_id = any($1)`,
            [civilCaseIds],
          )
        ).rows
      : [];
    const civilOfficerIds = [
      ...new Set(
        civilCaseOfficers.map(
          (entry: { personnel_id: string }) => entry.personnel_id,
        ),
      ),
    ];
    const civilOfficers = civilOfficerIds.length
      ? (
          await client.query(
            "select * from public.personnel where id = any($1)",
            [civilOfficerIds],
          )
        ).rows
      : [];
    return {
      agency,
      staffCounts,
      agencyPhones,
      agencyOfficers,
      federalAgency,
      officers,
      reportCounts,
      disciplineLinks,
      personnelDisciplineCounts,
      reportIds,
      civilCases,
      civilCaseOfficers,
      civilOfficers,
    };
  });

const buildAgencyDetail = async (agencyId: string) => {
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
  const categoryLabel = requireAgencyText(
    data.agency.state_display_name,
    "state display_name",
    agencyRequiredId,
  );
  const categoryPath = requireAgencyText(
    data.agency.state_path,
    "state path",
    agencyRequiredId,
  );
  const administrativeArea = requireAgencyText(
    data.agency.administrative_area,
    "administrative_area",
    agencyRequiredId,
  );
  const administrativeAreaPath = requireAgencyText(
    data.agency.administrative_area_path,
    "administrative_area path",
    agencyRequiredId,
  );
  const placeLabel = requireAgencyText(
    data.agency.city,
    "city",
    agencyRequiredId,
  );
  const placePath = requireAgencyText(
    data.agency.location_path,
    "location_path",
    agencyRequiredId,
  );
  const canonicalAgencyPath = requireAgencyCanonicalPath(data.agency);
  const agencyPath = canonicalAgencyPath;

  const officersById = mapBy(data.officers, "id");
  const reportCountsByOfficerId = mapBy(data.reportCounts, "personnel_id");
  const personnelDisciplineCountsById = mapBy(
    data.personnelDisciplineCounts,
    "personnel_id",
  );
  const disciplineLinksByPersonnelId = groupBy(
    data.disciplineLinks,
    "personnel_id",
  );
  const civilCaseOfficersByCase = groupBy(
    data.civilCaseOfficers,
    "civil_case_id",
  );
  const civilOfficersById = mapBy(data.civilOfficers, "id");
  const compareText = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base",
  }).compare;
  const timeFor = (
    value?: string | null,
    fallback = Number.POSITIVE_INFINITY,
  ) => (value ? new Date(value).getTime() : fallback);
  const comparePersonnelEntry = (
    left: {
      entry: {
        personnel_id?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        title?: string | null;
      };
      officer?: { first_name?: string | null; last_name?: string | null };
    },
    right: {
      entry: {
        personnel_id?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        title?: string | null;
      };
      officer?: { first_name?: string | null; last_name?: string | null };
    },
  ) => {
    const lastNameCompare = compareText(
      left.officer?.last_name || "",
      right.officer?.last_name || "",
    );
    if (lastNameCompare !== 0) return lastNameCompare;

    const firstNameCompare = compareText(
      left.officer?.first_name || "",
      right.officer?.first_name || "",
    );
    if (firstNameCompare !== 0) return firstNameCompare;

    const startDateCompare =
      timeFor(left.entry.start_date) - timeFor(right.entry.start_date);
    if (startDateCompare !== 0) return startDateCompare;

    const endDateCompare =
      timeFor(left.entry.end_date) - timeFor(right.entry.end_date);
    if (endDateCompare !== 0) return endDateCompare;

    return compareText(
      left.entry.personnel_id || "",
      right.entry.personnel_id || "",
    );
  };

  const employees = data.agencyOfficers
    .map(
      (entry: {
        personnel_id: string;
        badge_number?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        title?: string | null;
      }) => {
        const officer = officersById[entry.personnel_id];
        const reportCountRow = reportCountsByOfficerId[entry.personnel_id];
        return {
          entry,
          officer,
          reportCount: reportCountRow ? Number(reportCountRow.report_count) : 0,
          personnelDisciplineCount:
            personnelDisciplineCountsById[entry.personnel_id]
              ?.discipline_count ?? 0,
          disciplineCount:
            disciplineLinksByPersonnelId[entry.personnel_id]?.length ?? 0,
          // Per-personnel rating came from the dropped officers_stats table;
          // no rating aggregate exists in the current schema.
          rating: null as number | null,
        };
      },
    )
    .sort(comparePersonnelEntry);

  const civilCases = data.civilCases.map(
    (record: {
      id: string;
      slug: string;
      category: string;
      title?: string | null;
      cause_number?: string | null;
      filed_date: string;
      date_terminated?: string | null;
      court?: string | null;
      outcome?: string | null;
      primary_source_url?: string | null;
    }) => {
      const officerLinks = (civilCaseOfficersByCase[record.id] || []).map(
        (entry: { personnel_id: string; title?: string | null }) => {
          const officer = civilOfficersById[entry.personnel_id];
          return officer
            ? {
                ...officer,
                title: entry.title || null,
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

  const reportSummariesById = mapBy(
    await loadReportSummaryBuildPayloads(),
    "id",
  );
  const reportedReports = data.reportIds
    .map((reportId: string) => {
      const report = reportSummariesById[reportId];
      if (!report) {
        // The build projection (build_page_payload) is the source of truth for
        // which report pages exist. A referenced report absent from it has no
        // page to link to, so linking would 404. This normally means the
        // report was created after the projection snapshot ran (the DB is
        // mutated concurrently by intake until atomic-sha-deploys lands), or an
        // unpublished report. Skip it and warn rather than failing the build.
        console.warn(
          `Agency ${agencyRequiredId} references report ${reportId}, but that report has no build projection; skipping.`,
        );
        return null;
      }
      return {
        ...report,
        url: report.canonicalPath,
        officers: report.personnel || [],
      };
    })
    .filter((report): report is NonNullable<typeof report> => report !== null)
    .sort((a, b) => {
      const left = new Date(b.incidentDate).getTime();
      const right = new Date(a.incidentDate).getTime();
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
    categoryLabel,
    categoryPath,
    agencyPath,
    canonicalAgencyPath,
    administrativeArea,
    administrativeAreaPath,
    placeLabel,
    placePath,
    counts: {
      civilCases: civilCases.length,
      reports: reportedReports.length,
      discipline: new Set(
        data.disciplineLinks.map((link) => link.discipline_id),
      ).size,
      personnel: data.staffCounts.personnel_count as number,
      currentPersonnel: data.staffCounts.current_personnel_count as number,
      formerPersonnel: data.staffCounts.former_personnel_count as number,
      uncertainPersonnel: data.staffCounts.unknown_personnel_count as number,
      coverage: coverageLinks.length,
    },
  };
};

const agencyDetailCache = new Map<
  string,
  ReturnType<typeof buildAgencyDetail>
>();

export const loadAgencyDetail = async (agencyId: string) => {
  if (process.env.NODE_ENV !== "production") {
    return buildAgencyDetail(agencyId);
  }

  let cached = agencyDetailCache.get(agencyId);
  if (!cached) {
    cached = buildAgencyDetail(agencyId).catch((error: unknown) => {
      agencyDetailCache.delete(agencyId);
      throw error;
    });
    agencyDetailCache.set(agencyId, cached);
  }
  return cached;
};
