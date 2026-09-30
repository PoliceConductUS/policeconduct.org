import { withDb } from "./db.js";
import { mapBy } from "./data.js";
import { requireAgencyCanonicalPath } from "./data/location-paths.js";
import { buildReportCanonicalPath } from "./data/report-paths.js";

const assertValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

type ReportOfficerEntry = {
  officer: Record<string, unknown>;
  agencyOfficer: Record<string, unknown>;
  agency: Record<string, unknown>;
  path: string;
  badge: string | null;
  ratingOverall: number | null;
};

type ReportDetailQuery = {
  report: Record<string, unknown> | null;
  reportOfficers: any[];
  reportLinks: any[];
  officers: any[];
  agencies: any[];
  agencyOfficers: any[];
};

// Parity fields collected by /report/new that the mockup displays
// post-approval, mapped from their storage columns and rendered only when
// present (see openspec/changes/align-report-pages/brainstorm.md). `charges`
// holds submitter-entered charges/allegations text (`reviews.charges`).
// Narrative answers use the current reviews columns and remain the
// submitter's own account.
export type ReportDetailFacts = {
  submitterRelationship: string | null;
  interactionType: string | null;
  setting: string | null;
  caseNumber: string | null;
  complaintFiled: string | null;
  bodycamRequested: string | null;
  incidentTime: string | null;
  feelings: string | null;
  charges: string | null;
  desiredOutcome: string | null;
  whatHappened: string | null;
  whatElse: string | null;
  purpose: string | null;
};

const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const buildReportFacts = (
  report: Record<string, unknown>,
): ReportDetailFacts => ({
  submitterRelationship: nullableText(report.submitter_relationship),
  interactionType: nullableText(report.interaction_type),
  setting: nullableText(report.setting),
  caseNumber: nullableText(report.case_number),
  complaintFiled: nullableText(report.complaint_filed),
  bodycamRequested: nullableText(report.bodycam_requested),
  incidentTime: nullableText(report.incident_time),
  feelings: nullableText(report.how_felt),
  charges: nullableText(report.charges),
  desiredOutcome: nullableText(report.desired_outcome),
  whatHappened: nullableText(report.what_happened),
  whatElse: nullableText(report.what_else),
  purpose: nullableText(report.purpose),
});

export type ReportDetailModel = {
  report: Record<string, unknown>;
  facts: ReportDetailFacts;
  canonicalPath: string;
  locationBreadcrumbs: {
    state: { label: string; href: string };
    administrativeArea: { label: string; href: string };
    place: { label: string; href: string };
    reports: { label: string; href: string };
  };
  officers: ReportOfficerEntry[];
  evidenceLinks: {
    id: string;
    title: string;
    url: string;
    source_name?: string | null;
    published_at?: string | null;
    notes?: string | null;
  }[];
};

const buildOfficerEntries = (
  data: ReportDetailQuery & { report: Record<string, unknown> },
) => {
  const officersById = mapBy(data.officers, "id");
  const agenciesById = mapBy(data.agencies, "id");
  const agencyOfficersById = mapBy(data.agencyOfficers || [], "id");

  const reportOfficerEntries = data.reportOfficers;
  if (!reportOfficerEntries.length) {
    throw new Error(
      `Report ${data.report?.slug || data.report?.id || "unknown"} has no review_personnel records`,
    );
  }

  return reportOfficerEntries.map((entry: any) => {
    const agencyOfficer = assertValue(
      agencyOfficersById[entry.agency_personnel_id],
      `Missing agency_officer ${entry.agency_personnel_id} for review officer ${entry.id}`,
    );
    const officer = assertValue(
      officersById[agencyOfficer.personnel_id],
      `Missing officer ${agencyOfficer.personnel_id} for agency_officer ${agencyOfficer.id}`,
    );
    const officerSlug = assertValue(
      officer.slug,
      `Missing slug for officer ${agencyOfficer.personnel_id} on review officer ${entry.id}`,
    );
    const agency = assertValue(
      agenciesById[agencyOfficer.agency_id],
      `Missing agency ${agencyOfficer.agency_id} for agency_officer ${agencyOfficer.id}`,
    );
    const path = `/personnel/${officerSlug}/`;
    const numericRating = Number(entry.rating_overall);
    const ratingOverall = Number.isNaN(numericRating) ? null : numericRating;

    return {
      officer,
      agencyOfficer,
      agency: {
        ...agency,
        canonicalPath: requireAgencyCanonicalPath(agency),
      },
      path,
      badge: agencyOfficer.badge_number || null,
      ratingOverall,
    };
  });
};

type EvidenceLink = {
  id: string;
  title: string;
  url: string;
  source_name?: string | null;
  published_at?: string | null;
  notes?: string | null;
};
type EvidenceLinkSource = { id: string; title: string; url: string };

const buildEvidenceLinks = (links: EvidenceLinkSource[]): EvidenceLink[] =>
  links.map((link) => {
    const id = assertValue(link.id, "Missing id for review_links row");
    return {
      id,
      title: link.title,
      url: link.url,
    };
  });

export const loadReportDetail = async (
  slug: string,
): Promise<ReportDetailModel | null> => {
  const data = await withDb(async (client): Promise<ReportDetailQuery> => {
    const report = (
      await client.query(
        `
          select
            r.*,
            lp.path as location_path,
            split_part(lp.path, '/', 2) as state_or_territory_slug,
            split_part(lp.path, '/', 3) as administrative_area_slug,
            split_part(lp.path, '/', 4) as place_slug,
            state_lp.display_name as state_or_territory_name,
            area_lp.display_name as administrative_area_name,
            lp.display_name as place_name
          from public.reviews r
          left join public.location_path lp
            on lp.location_path_id = r.location_path_id
          left join public.location_path area_lp
            on area_lp.location_path_id = lp.parent_location_path_id
           and area_lp.level = 'administrative_area'
          left join public.location_path state_lp
            on state_lp.location_path_id = area_lp.parent_location_path_id
           and state_lp.level = 'state'
          where r.slug = $1
        `,
        [slug],
      )
    ).rows[0];
    if (!report) {
      return {
        report: null,
        reportOfficers: [],
        reportLinks: [],
        officers: [],
        agencies: [],
        agencyOfficers: [],
      };
    }
    const reportOfficers = (
      await client.query(
        "select * from public.review_personnel where review_id = $1",
        [report.id],
      )
    ).rows;
    const reportLinks = (
      await client.query(
        "select * from public.review_links where review_id = $1",
        [report.id],
      )
    ).rows;
    const officers = (await client.query("select * from public.personnel"))
      .rows;
    const agencies = (
      await client.query(
        `
          select a.*, lp.path as location_path, bpp.path as canonical_path
          from public.agency a
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
          join public.build_page_payload bpp
            on bpp.page_type = 'agency'
           and bpp.entity_id = a.id
        `,
      )
    ).rows;
    const agencyOfficers = (
      await client.query("select * from public.agency_personnel")
    ).rows;
    return {
      report,
      reportOfficers,
      reportLinks,
      officers,
      agencies,
      agencyOfficers,
    };
  });

  if (!data.report) {
    return null;
  }
  const reportId = assertValue(data.report.id, "Missing id for report row");
  const locationPath = assertValue(
    data.report.location_path,
    `Report ${reportId} is missing location_path.path.`,
  );
  const stateSlug = assertValue(
    data.report.state_or_territory_slug,
    `Report ${reportId} is missing state_or_territory_slug.`,
  );
  const administrativeAreaSlug = assertValue(
    data.report.administrative_area_slug,
    `Report ${reportId} is missing administrative_area_slug.`,
  );
  const stateName = assertValue(
    data.report.state_or_territory_name,
    `Report ${reportId} is missing state_or_territory_name.`,
  );
  const administrativeAreaName = assertValue(
    data.report.administrative_area_name,
    `Report ${reportId} is missing administrative_area_name.`,
  );
  const placeName = assertValue(
    data.report.place_name,
    `Report ${reportId} is missing place_name.`,
  );

  const evidenceLinks = buildEvidenceLinks(data.reportLinks ?? []);

  return {
    report: data.report,
    facts: buildReportFacts(data.report),
    canonicalPath: buildReportCanonicalPath({
      id: String(data.report.id),
      incidentDate: data.report.incident_date as string | Date | null,
      locationPath: locationPath as string,
      slug: data.report.slug as string | null,
    }),
    locationBreadcrumbs: {
      state: {
        label: String(stateName),
        href: `/${stateSlug}/`,
      },
      administrativeArea: {
        label: String(administrativeAreaName),
        href: `/${stateSlug}/${administrativeAreaSlug}/`,
      },
      place: {
        label: String(placeName),
        href: String(locationPath),
      },
      reports: {
        label: "Reports",
        href: `${locationPath}reports/`,
      },
    },
    officers: buildOfficerEntries(
      data as ReportDetailQuery & { report: Record<string, unknown> },
    ),
    evidenceLinks,
  };
};
