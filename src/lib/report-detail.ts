import { withDb } from "./db.js";
import { groupBy, mapBy } from "./data.js";
import { loadCoverageLinksForReport } from "./data/coverage.js";
import { requireAgencyCanonicalPath } from "./data/location-paths.js";
import { buildReportCanonicalPath } from "./data/report-paths.js";

const assertValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

type ReportOfficerRating = {
  traitLabel: string;
  rubricDescription: string;
  rubricHelp: string | null;
};

type ReportOfficerEntry = {
  officer: Record<string, unknown>;
  agencyOfficer: Record<string, unknown>;
  agency: Record<string, unknown>;
  path: string;
  badge: string | null;
  ratingOverall: number | null;
  ratings: ReportOfficerRating[];
};

type ReportDetailQuery = {
  report: Record<string, unknown> | null;
  reportOfficers: any[];
  reportOfficerRatings: any[];
  reportTags: any[];
  reportLinks: any[];
  reportAttachments: any[];
  reportWitnesses: any[];
  officers: any[];
  agencies: any[];
  agencyOfficers: any[];
  tags: any[];
  traits: any[];
  rubrics: any[];
};

export type ReportDetailModel = {
  report: Record<string, unknown>;
  canonicalPath: string;
  reportWitnesses: Record<string, unknown>[];
  reportAttachments: Record<string, unknown>[];
  tags: string[];
  officers: ReportOfficerEntry[];
  civilCases: {
    id: string;
    title: string;
    causeNumber: string;
    court: string | null;
    filedDate: string | null;
    path: string;
  }[];
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
  const reportOfficerRatings = groupBy(
    data.reportOfficerRatings || [],
    "review_officer_id",
  );
  const traitsById = mapBy(data.traits, "id");
  const rubricsById = mapBy(data.rubrics, "id");

  const reportOfficerEntries = data.reportOfficers;
  if (!reportOfficerEntries.length) {
    throw new Error(
      `Report ${data.report?.slug || data.report?.id || "unknown"} has no review_officers records`,
    );
  }

  return reportOfficerEntries.map((entry: any) => {
    const agencyOfficer = assertValue(
      agencyOfficersById[entry.agency_officer_id],
      `Missing agency_officer ${entry.agency_officer_id} for review officer ${entry.id}`,
    );
    const officer = assertValue(
      officersById[agencyOfficer.officer_id],
      `Missing officer ${agencyOfficer.officer_id} for agency_officer ${agencyOfficer.id}`,
    );
    const officerSlug = assertValue(
      officer.slug,
      `Missing slug for officer ${agencyOfficer.officer_id} on review officer ${entry.id}`,
    );
    const agency = assertValue(
      agenciesById[agencyOfficer.agency_id],
      `Missing agency ${agencyOfficer.agency_id} for agency_officer ${agencyOfficer.id}`,
    );
    const path = `/personnel/${officerSlug}/`;
    const ratingEntries = (reportOfficerRatings[entry.id] || []).map(
      (rating: any) => {
        const trait = traitsById[rating.trait_id];
        const rubric = rubricsById[rating.rubric_id];
        return {
          traitLabel: trait?.label || "",
          rubricDescription: rubric?.description || "",
          rubricHelp: rubric?.help || null,
        };
      },
    );
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
      ratings: ratingEntries,
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
          select r.*, lp.path as location_path, lp.state_or_territory_slug
          from public.reviews r
          left join public.location_path lp
            on lp.location_path_id = r.location_path_id
          where r.slug = $1
        `,
        [slug],
      )
    ).rows[0];
    if (!report) {
      return {
        report: null,
        reportOfficers: [],
        reportOfficerRatings: [],
        reportTags: [],
        reportLinks: [],
        reportAttachments: [],
        reportWitnesses: [],
        officers: [],
        agencies: [],
        agencyOfficers: [],
        tags: [],
        traits: [],
        rubrics: [],
      };
    }
    const reportOfficers = (
      await client.query(
        "select * from public.review_officers where review_id = $1",
        [report.id],
      )
    ).rows;
    const reportOfficerIds = reportOfficers.map(
      (entry: { id: string }) => entry.id,
    );
    const reportOfficerRatings = reportOfficerIds.length
      ? (
          await client.query(
            "select * from public.review_officers_ratings where review_officer_id = any($1)",
            [reportOfficerIds],
          )
        ).rows
      : [];
    const reportTags = (
      await client.query(
        "select * from public.review_tags where review_id = $1",
        [report.id],
      )
    ).rows;
    const reportLinks = (
      await client.query(
        "select * from public.review_links where review_id = $1",
        [report.id],
      )
    ).rows;
    const reportAttachments = (
      await client.query(
        "select * from public.review_attachments where review_id = $1",
        [report.id],
      )
    ).rows;
    const reportWitnesses = (
      await client.query(
        "select * from public.review_witnesses where review_id = $1",
        [report.id],
      )
    ).rows;
    const officers = (await client.query("select * from public.officers")).rows;
    const agencies = (
      await client.query(
        `
          select a.*, lp.path as location_path
          from public.agency a
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
        `,
      )
    ).rows;
    const agencyOfficers = (
      await client.query("select * from public.agency_officers")
    ).rows;
    const tags = (await client.query("select * from public.tags")).rows;
    const traits = (await client.query("select * from public.traits")).rows;
    const rubrics = (await client.query("select * from public.rubrics")).rows;
    return {
      report,
      reportOfficers,
      reportOfficerRatings,
      reportTags,
      reportLinks,
      reportAttachments,
      reportWitnesses,
      officers,
      agencies,
      agencyOfficers,
      tags,
      traits,
      rubrics,
    };
  });

  if (!data.report) {
    return null;
  }
  const reportId = assertValue(data.report.id, "Missing id for report row");

  const tagsById = mapBy(data.tags, "id");
  const tags = (data.reportTags || [])
    .map((entry: { tag_id: string }) => tagsById[entry.tag_id])
    .filter(Boolean)
    .map((tag: { label: string }) => tag.label);

  const evidenceLinks = buildEvidenceLinks(data.reportLinks ?? []);
  const coverageLinks = await loadCoverageLinksForReport(
    String(data.report.id),
  );
  const civilCases = await withDb(async (client) => {
    return (
      await client.query(
        `
          select distinct
            civil_case.id,
            civil_case.title,
            civil_case.cause_number,
            civil_case.court,
            civil_case.filed_date,
            civil_case.slug
          from public.civil_cases civil_case
          join public.civil_case_officers civil_case_officer
            on civil_case_officer.civil_case_id = civil_case.id
          join public.review_officers review_officer
            on review_officer.agency_officer_id = civil_case_officer.agency_officer_id
          where review_officer.review_id = $1
          order by civil_case.filed_date desc nulls last, civil_case.title
        `,
        [reportId],
      )
    ).rows;
  });

  return {
    report: data.report,
    canonicalPath: buildReportCanonicalPath({
      id: String(data.report.id),
      incidentDate: data.report.incident_date as string | Date | null,
      locationPath: data.report.location_path as string | null,
      slug: data.report.slug as string | null,
    }),
    reportWitnesses: data.reportWitnesses ?? [],
    reportAttachments: data.reportAttachments ?? [],
    tags,
    officers: buildOfficerEntries(
      data as ReportDetailQuery & { report: Record<string, unknown> },
    ),
    civilCases: civilCases.map((civilCase: Record<string, string | null>) => {
      const id = assertValue(civilCase.id, "Missing id for civil case row");
      const title = assertValue(
        civilCase.title,
        `Missing title for civil case ${id}`,
      );
      const causeNumber = assertValue(
        civilCase.cause_number,
        `Missing cause_number for civil case ${id}`,
      );
      const slug = assertValue(
        civilCase.slug,
        `Missing slug for civil case ${id}`,
      );

      return {
        id,
        title,
        causeNumber,
        court: civilCase.court,
        filedDate: civilCase.filed_date,
        path: `/civil-cases/${slug}/`,
      };
    }),
    evidenceLinks: [...evidenceLinks, ...coverageLinks],
  };
};
