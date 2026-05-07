import { withDb } from "#src/lib/db.js";
import {
  loadVideoPathsByUrls,
  loadVideosForCivilCase,
} from "#src/lib/data/videos.js";
import {
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  normalizeVideoUrl,
} from "#src/lib/video.js";

export type CivilCaseCoverageLink = {
  id: string;
  title: string;
  url: string;
  embed: string | null;
  thumbnail: string | null;
  videoPath: string | null;
  created_at: string;
  updated_at: string;
};

export type CivilCaseDetailOfficer = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
};

export type CivilCaseDetailAgency = {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string | null;
  state: string | null;
};

export type CivilCaseDetail = {
  civilCase: {
    id: string;
    slug: string;
    category: string;
    title: string;
    cause_number: string;
    court: string | null;
    filed_date: string | null;
    claims_summary: string | null;
    outcome: string | null;
    primary_source_url: string | null;
    created_at: string;
    updated_at: string;
  };
  officers: CivilCaseDetailOfficer[];
  agencies: CivilCaseDetailAgency[];
  coverageLinks: CivilCaseCoverageLink[];
};

export const loadCivilCaseDetail = async (
  category: string,
  slug: string,
): Promise<CivilCaseDetail | null> => {
  return withDb(async (client) => {
    const civilCase = (
      await client.query(
        `
          select *
          from public.civil_cases
          where lower(category) = $1
            and slug = $2
        `,
        [category.toLowerCase(), slug],
      )
    ).rows[0];
    if (!civilCase) {
      return null;
    }

    const coverageLinks = (
      await client.query(
        `
          select id, title, url, created_at, updated_at
          from public.civil_case_links
          where civil_case_id = $1
          order by created_at, id
        `,
        [civilCase.id],
      )
    ).rows.map(
      (link: {
        id: string;
        title: string;
        url: string;
        created_at: string;
        updated_at: string;
      }) => ({
        ...link,
        embed: getVideoEmbedUrl(link.url),
        thumbnail: getYouTubeThumbnailUrl(link.url),
        videoPath: null,
      }),
    );
    const videoPathsByUrl = await loadVideoPathsByUrls(
      coverageLinks.map((link: CivilCaseCoverageLink) => link.url),
    );
    const linkedVideos = await loadVideosForCivilCase(civilCase.id);
    const linkedVideoRows = linkedVideos
      .filter(
        (video) =>
          !coverageLinks.some(
            (link: CivilCaseCoverageLink) =>
              normalizeVideoUrl(link.url) === video.normalizedUrl,
          ),
      )
      .map((video) => ({
        id: `video:${video.id}`,
        title: video.title,
        url: video.url,
        embed: video.embed,
        thumbnail: video.thumbnail,
        videoPath: video.path,
        created_at: video.publishedAt || video.recordedAt || video.updatedAt,
        updated_at: video.updatedAt,
      }));

    const officers = (
      await client.query(
        `
          select distinct
            officer.id,
            officer.slug,
            officer.first_name,
            officer.last_name
          from public.civil_case_officers civil_case_officer
          join public.agency_officers agency_officer
            on agency_officer.id = civil_case_officer.agency_officer_id
          join public.officers officer
            on officer.id = agency_officer.officer_id
          where civil_case_officer.civil_case_id = $1
          order by officer.last_name, officer.first_name
        `,
        [civilCase.id],
      )
    ).rows;

    const agencies = (
      await client.query(
        `
          select distinct
            agency.id,
            agency.name,
            agency.slug,
            agency.category,
            agency.city,
            agency.state
          from public.civil_case_officers civil_case_officer
          join public.agency_officers agency_officer
            on agency_officer.id = civil_case_officer.agency_officer_id
          join public.agency agency
            on agency.id = agency_officer.agency_id
          where civil_case_officer.civil_case_id = $1
          order by agency.name
        `,
        [civilCase.id],
      )
    ).rows;

    return {
      civilCase,
      officers,
      agencies,
      coverageLinks: [
        ...coverageLinks.map((link: CivilCaseCoverageLink) => ({
          ...link,
          videoPath: videoPathsByUrl.get(link.url) || null,
        })),
        ...linkedVideoRows,
      ],
    };
  });
};
