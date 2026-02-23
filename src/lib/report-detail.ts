import { withDb } from "./db.js";
import { groupBy, mapBy } from "./data.js";

const assertValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

const isYouTube = (url: string) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be")
    );
  } catch (error) {
    return false;
  }
};

const getEmbedUrl = (url: string) => {
  if (!isYouTube(url)) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }
    const videoId = parsed.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch (error) {
    return null;
  }
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
  reportWitnesses: Record<string, unknown>[];
  reportAttachments: Record<string, unknown>[];
  tags: string[];
  officers: ReportOfficerEntry[];
  evidenceLinks: {
    id: string;
    title: string;
    url: string;
    embed: string | null;
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
      agency,
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
  embed: string | null;
};
type EvidenceLinkSource = { id: string; title: string; url: string };

const buildEvidenceLinks = (links: EvidenceLinkSource[]): EvidenceLink[] =>
  links.map((link) => {
    const id = assertValue(link.id, "Missing id for review_links row");
    return {
      id,
      title: link.title,
      url: link.url,
      embed: getEmbedUrl(link.url),
    };
  });

export const loadReportDetail = async (
  slug: string,
): Promise<ReportDetailModel | null> => {
  const data = await withDb(async (client): Promise<ReportDetailQuery> => {
    const report = (
      await client.query("select * from public.reviews where slug = $1", [slug])
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
    const agencies = (await client.query("select * from public.agency")).rows;
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

  const tagsById = mapBy(data.tags, "id");
  const tags = (data.reportTags || [])
    .map((entry: { tag_id: string }) => tagsById[entry.tag_id])
    .filter(Boolean)
    .map((tag: { label: string }) => tag.label);

  return {
    report: data.report,
    reportWitnesses: data.reportWitnesses ?? [],
    reportAttachments: data.reportAttachments ?? [],
    tags,
    officers: buildOfficerEntries(
      data as ReportDetailQuery & { report: Record<string, unknown> },
    ),
    evidenceLinks: buildEvidenceLinks(data.reportLinks ?? []),
  };
};
