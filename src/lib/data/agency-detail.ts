import { groupBy, mapBy } from "#src/lib/data.js";
import { withDb } from "#src/lib/db.js";
import { US_STATE_TILES } from "#src/lib/geo/states.js";
import { loadReportSummaryBuildPayloads } from "./build-payloads.js";
import { loadCoverageLinksForAgency } from "./coverage.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

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
        `select
           payload
         from public.build_page_payload
         where page_type = 'agency'`,
      )
    ).rows;
  });

  return agencies.map((row: { payload: any }) => {
    const agency = row.payload?.agency;
    const agencyId = requireAgencyText(agency?.id, "id", "unknown");

    return {
      params: {
        category: requireAgencyText(agency?.state, "state", agencyId),
        slug: requireAgencyText(agency?.slug, "slug", agencyId),
      },
      props: {
        canonicalAgencyPath: requireAgencyText(
          agency?.path,
          "canonical path",
          agencyId,
        ),
      },
    };
  });
};

export const loadAgencyLocationStaticPaths = async () => {
  const agencies = await withDb(async (client) => {
    return (
      await client.query(
        `select
           path,
           entity_id
         from public.build_page_payload
         where page_type = 'agency'
         order by path`,
      )
    ).rows;
  });

  return agencies.map((agency: any) => {
    const agencyId = requireAgencyText(agency.entity_id, "id", "unknown");
    const pathParts = requireAgencyText(agency.path, "path", agencyId)
      .split("/")
      .filter(Boolean);
    if (pathParts.length !== 4) {
      throw new Error(
        `Agency ${agencyId} has malformed projected canonical path ${agency.path}.`,
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
  });
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
            bpp.path as canonical_path,
            lp.path as location_path,
            lp.state_or_territory_slug as state,
            lp.administrative_area_name as administrative_area,
            lp.administrative_area_slug as location_administrative_area_slug,
            lp.place_name as city,
            lp.place_slug as location_place_slug
          from public.agency a
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
          join public.build_page_payload bpp
            on bpp.page_type = 'agency'
           and bpp.entity_id = a.id
          where a.id = $1
        `,
        [agencyId],
      )
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
             order by filed_date desc, title asc, cause_number asc`,
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
    const targetOfficerIds = [
      ...new Set(
        agencyOfficers
          .map((entry: { officer_id?: string | null }) => entry.officer_id)
          .filter(Boolean),
      ),
    ];
    const personnelLinkedCivilCases = targetOfficerIds.length
      ? (
          await client.query(
            `
              select
                c.id as civil_case_id,
                c.slug,
                c.title,
                c.cause_number,
                c.filed_date,
                c.date_terminated,
                c.court,
                c.primary_source_url,
                o.id as officer_id,
                o.slug as officer_slug,
                o.first_name,
                o.last_name,
                o.suffix,
                case_ao.title as case_license_type,
                case_agency.id as case_agency_id,
                case_agency.name as case_agency_name,
                case_agency.slug as case_agency_slug,
                case_location.path as case_agency_location_path,
                case_bpp.path as case_agency_canonical_path,
                target_ao.title as target_license_type,
                target_ao.start_date as target_start_date,
                target_ao.end_date as target_end_date
              from public.civil_case_officers cco
              join public.civil_cases c
                on c.id = cco.civil_case_id
              join public.agency_officers case_ao
                on case_ao.id = cco.agency_officer_id
              join public.officers o
                on o.id = case_ao.officer_id
              join public.agency case_agency
                on case_agency.id = case_ao.agency_id
              join public.location_path case_location
                on case_location.location_path_id = case_agency.location_path_id
              join public.build_page_payload case_bpp
                on case_bpp.page_type = 'agency'
               and case_bpp.entity_id = case_agency.id
              join lateral (
                select *
                from public.agency_officers target_assignment
                where target_assignment.agency_id = $1
                  and target_assignment.officer_id = case_ao.officer_id
                order by
                  (target_assignment.end_date is null) desc,
                  coalesce(target_assignment.end_date, target_assignment.start_date) desc nulls last,
                  target_assignment.id
                limit 1
              ) target_ao on true
              where case_ao.officer_id = any($2)
                and case_ao.agency_id <> $1
                and not exists (
                  select 1
                  from public.civil_case_officers direct_cco
                  join public.agency_officers direct_ao
                    on direct_ao.id = direct_cco.agency_officer_id
                  where direct_cco.civil_case_id = c.id
                    and direct_ao.agency_id = $1
                )
              order by c.filed_date desc, c.title asc, o.last_name asc
            `,
            [agencyId, targetOfficerIds],
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
      reportIds,
      civilCases,
      civilCaseOfficers,
      civilOfficers,
      personnelLinkedCivilCases,
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
    data.agency.location_administrative_area_slug,
    "administrative_area_slug",
    agencyRequiredId,
  );
  const placeLabel = requireAgencyText(
    data.agency.city,
    "city",
    agencyRequiredId,
  );
  const placeSlug = requireAgencyText(
    data.agency.location_place_slug,
    "place_slug",
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
  const officerStatsById = mapBy(data.officerStats, "id");
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
        officer_id?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        title?: string | null;
      };
      officer?: { first_name?: string | null; last_name?: string | null };
    },
    right: {
      entry: {
        officer_id?: string | null;
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
      left.entry.officer_id || "",
      right.entry.officer_id || "",
    );
  };

  const employees = data.agencyOfficers
    .map(
      (entry: {
        officer_id: string;
        badge_number?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        title?: string | null;
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
    .sort(comparePersonnelEntry);
  const currentEmployees = employees.filter(
    (employee) => !employee.entry.end_date,
  );
  const formerEmployees = employees.filter(
    (employee) => employee.entry.end_date,
  );

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

  const personnelLinkedCivilCases = (
    Object.values(
      groupBy(data.personnelLinkedCivilCases || [], "civil_case_id"),
    ) as any[][]
  ).map((entries) => {
    const record = entries[0];
    return {
      id: record.civil_case_id,
      slug: record.slug,
      title: record.title,
      cause_number: record.cause_number,
      filed_date: record.filed_date,
      date_terminated: record.date_terminated,
      court: record.court,
      primary_source_url: record.primary_source_url,
      caseUrl: `/civil-cases/${record.slug}/`,
      links: entries.map((entry) => ({
        officer: {
          id: entry.officer_id,
          slug: entry.officer_slug,
          first_name: entry.first_name,
          last_name: entry.last_name,
          suffix: entry.suffix,
          licenseType: entry.case_license_type || null,
        },
        caseAgency: {
          id: entry.case_agency_id,
          name: entry.case_agency_name,
          slug: entry.case_agency_slug,
          location_path: entry.case_agency_location_path,
          canonicalPath: requireAgencyCanonicalPath({
            id: entry.case_agency_id,
            canonical_path: entry.case_agency_canonical_path,
          }),
        },
        targetAgencyAssignment: {
          licenseType: entry.target_license_type || null,
          startDate: entry.target_start_date || null,
          endDate: entry.target_end_date || null,
          relationship: entry.target_end_date ? "former" : "current",
        },
      })),
    };
  });

  const reportSummariesById = mapBy(
    await loadReportSummaryBuildPayloads(),
    "id",
  );
  const reportedReports = data.reportIds
    .map((reportId: string) => {
      const report = reportSummariesById[reportId];
      if (!report) {
        throw new Error(
          `Agency ${agencyRequiredId} references report ${reportId}, but that report has no build projection.`,
        );
      }
      return {
        ...report,
        url: report.canonicalPath,
        officers: report.personnel || [],
      };
    })
    .sort((a, b) => {
      const left = new Date(b.incidentDate).getTime();
      const right = new Date(a.incidentDate).getTime();
      return left - right;
    });

  return {
    ...data,
    employees,
    currentEmployees,
    formerEmployees,
    civilCases,
    personnelLinkedCivilCases,
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
      personnelLinkedCivilCases: personnelLinkedCivilCases.length,
      reports: reportedReports.length,
      personnel: employees.length,
      currentPersonnel: currentEmployees.length,
      formerPersonnel: formerEmployees.length,
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
    cached = buildAgencyDetail(agencyId);
    agencyDetailCache.set(agencyId, cached);
  }
  return cached;
};
