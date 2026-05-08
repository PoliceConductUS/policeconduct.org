import { withDb } from "#src/lib/db.js";
import {
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  isDirectVideoContentUrl,
  normalizeVideoUrl,
} from "#src/lib/video.js";

const VIDEO_COLUMNS = `
  id,
  slug,
  category,
  url,
  normalized_url,
  title,
  description,
  thumbnail_url,
  embed_url,
  source_platform,
  source_label,
  recorded_at,
  published_at,
  duration_seconds,
  transcript,
  summary,
  created_at,
  updated_at
`;

export type VideoReference = {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string | null;
  summary: string | null;
  url: string;
  normalizedUrl: string;
  embed: string | null;
  thumbnail: string | null;
  sourcePlatform: string | null;
  sourceLabel: string | null;
  recordedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  path: string;
  tags: { slug: string; label: string }[];
  officers: {
    confidence: string;
    notes: string | null;
    agencyOfficerId: string;
    badgeNumber: string | null;
    title: string | null;
    officer: {
      id: string;
      slug: string;
      firstName: string;
      lastName: string;
      suffix: string | null;
    };
    agency: {
      id: string;
      name: string;
      slug: string;
      category: string;
    };
  }[];
  civilCases: {
    notes: string | null;
    id: string;
    slug: string;
    category: string;
    title: string;
    causeNumber: string;
    primarySourceUrl: string | null;
    path: string;
  }[];
  reports: {
    notes: string | null;
    id: string;
    slug: string;
    category: string;
    title: string;
    incidentDate: string | null;
    path: string;
  }[];
};

const mapVideo = (row: any) => ({
  id: row.id,
  slug: row.slug,
  category: row.category,
  title: row.title,
  description: row.description || null,
  summary: row.summary || null,
  url: row.url,
  normalizedUrl: row.normalized_url,
  embed: row.embed_url || getVideoEmbedUrl(row.url),
  thumbnail: row.thumbnail_url || getYouTubeThumbnailUrl(row.url),
  sourcePlatform: row.source_platform || null,
  sourceLabel: row.source_label || null,
  recordedAt: row.recorded_at || null,
  publishedAt: row.published_at || null,
  updatedAt: row.updated_at,
  path: `/video/${row.category}/${row.slug}/`,
});

const hydrateVideos = async (rows: any[]): Promise<VideoReference[]> => {
  if (!rows.length) {
    return [];
  }

  const videoIds = rows.map((row) => row.id);
  const { tagRows, officerRows, civilCaseRows, reportRows } = await withDb(
    async (client) => {
      const tags = await client.query(
        `
            select
              link.video_id,
              tag.slug,
              tag.label
            from public.video_tag_links link
            join public.video_tags tag on tag.id = link.tag_id
            where link.video_id = any($1)
            order by tag.label
          `,
        [videoIds],
      );
      const officers = await client.query(
        `
            select
              link.video_id,
              link.confidence,
              link.notes,
              agency_officer.id as agency_officer_id,
              agency_officer.badge_number,
              agency_officer.title,
              officer.id as officer_id,
              officer.slug as officer_slug,
              officer.first_name,
              officer.last_name,
              officer.suffix,
              agency.id as agency_id,
              agency.name as agency_name,
              agency.slug as agency_slug,
              agency.category as agency_category
            from public.video_agency_officers link
            join public.agency_officers agency_officer
              on agency_officer.id = link.agency_officer_id
            join public.officers officer
              on officer.id = agency_officer.officer_id
            join public.agency agency
              on agency.id = agency_officer.agency_id
            where link.video_id = any($1)
            order by officer.last_name, officer.first_name
          `,
        [videoIds],
      );
      const civilCases = await client.query(
        `
            select
              link.video_id,
              link.notes,
              civil_case.id,
              civil_case.slug,
              civil_case.category,
              civil_case.title,
              civil_case.cause_number,
              civil_case.primary_source_url
            from public.video_civil_cases link
            join public.civil_cases civil_case
              on civil_case.id = link.civil_case_id
            where link.video_id = any($1)
            order by civil_case.filed_date nulls last, civil_case.title
          `,
        [videoIds],
      );
      const reports = await client.query(
        `
            select
              link.video_id,
              link.notes,
              review.id,
              review.slug,
              review.category,
              review.title,
              review.incident_date
            from public.video_reports link
            join public.reviews review
              on review.id = link.review_id
            where link.video_id = any($1)
            order by review.incident_date nulls last, review.title
          `,
        [videoIds],
      );

      return {
        tagRows: tags.rows,
        officerRows: officers.rows,
        civilCaseRows: civilCases.rows,
        reportRows: reports.rows,
      };
    },
  );

  const groupByVideoId = (items: any[]) => {
    const grouped = new Map<string, any[]>();
    for (const item of items) {
      const group = grouped.get(item.video_id) || [];
      group.push(item);
      grouped.set(item.video_id, group);
    }
    return grouped;
  };

  const tagsByVideo = groupByVideoId(tagRows);
  const officersByVideo = groupByVideoId(officerRows);
  const civilCasesByVideo = groupByVideoId(civilCaseRows);
  const reportsByVideo = groupByVideoId(reportRows);

  return rows.map((row) => {
    const video = mapVideo(row);
    return {
      ...video,
      tags: (tagsByVideo.get(video.id) || []).map((tag: any) => ({
        slug: tag.slug,
        label: tag.label,
      })),
      officers: (officersByVideo.get(video.id) || []).map((entry: any) => ({
        confidence: entry.confidence,
        notes: entry.notes || null,
        agencyOfficerId: entry.agency_officer_id,
        badgeNumber: entry.badge_number || null,
        title: entry.title || null,
        officer: {
          id: entry.officer_id,
          slug: entry.officer_slug,
          firstName: entry.first_name,
          lastName: entry.last_name,
          suffix: entry.suffix || null,
        },
        agency: {
          id: entry.agency_id,
          name: entry.agency_name,
          slug: entry.agency_slug,
          category: entry.agency_category,
        },
      })),
      civilCases: (civilCasesByVideo.get(video.id) || []).map((entry: any) => ({
        notes: entry.notes || null,
        id: entry.id,
        slug: entry.slug,
        category: entry.category,
        title: entry.title,
        causeNumber: entry.cause_number,
        primarySourceUrl: entry.primary_source_url || null,
        path: `/civil-litigation/${entry.category}/${entry.slug}/`,
      })),
      reports: (reportsByVideo.get(video.id) || []).map((entry: any) => ({
        notes: entry.notes || null,
        id: entry.id,
        slug: entry.slug,
        category: entry.category,
        title: entry.title,
        incidentDate: entry.incident_date || null,
        path: `/report/${entry.category}/${entry.slug}/`,
      })),
    };
  });
};

export const loadVideoSummaries = async () => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select ${VIDEO_COLUMNS}
            from public.videos
            order by coalesce(recorded_at, published_at, created_at) desc, title
          `,
      )
    ).rows;
  });

  return hydrateVideos(rows);
};

export const loadVideoCategoryCounts = async () => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select lower(category) as category, count(*)::integer as count
            from public.videos
            group by lower(category)
          `,
      )
    ).rows;
  });

  return rows.map((row: { category: string; count: number }) => ({
    category: row.category,
    count: Number(row.count),
  }));
};

export const loadFederalAgencyVideoCounts = async () => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            agency.id,
            agency.name,
            agency.slug,
            agency.category,
            count(distinct video_officer.video_id)::integer as video_count
          from public.agency agency
          left join public.agency_officers agency_officer
            on agency_officer.agency_id = agency.id
          left join public.video_agency_officers video_officer
            on video_officer.agency_officer_id = agency_officer.id
          where lower(agency.category) = 'federal'
          group by agency.id, agency.name, agency.slug, agency.category
          order by agency.name
        `,
      )
    ).rows;
  });

  return rows.map(
    (row: {
      id: string;
      name: string;
      slug: string;
      category: string;
      video_count: number;
    }) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      videoCount: Number(row.video_count),
    }),
  );
};

export const loadVideosByCategory = async (category: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select ${VIDEO_COLUMNS}
            from public.videos
            where lower(category) = lower($1)
            order by coalesce(recorded_at, published_at, created_at) desc, title
          `,
        [category],
      )
    ).rows;
  });

  return hydrateVideos(rows);
};

export const loadVideosForCivilCase = async (civilCaseId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            video.id,
            video.slug,
            video.category,
            video.url,
            video.normalized_url,
            video.title,
            video.description,
            video.thumbnail_url,
            video.embed_url,
            video.source_platform,
            video.source_label,
            video.recorded_at,
            video.published_at,
            video.duration_seconds,
            video.transcript,
            video.summary,
            video.created_at,
            video.updated_at
          from public.videos video
          where exists (
            select 1
            from public.video_civil_cases video_case
            where video_case.video_id = video.id
              and video_case.civil_case_id = $1
          )
          order by coalesce(video.recorded_at, video.published_at, video.created_at) desc, video.title
        `,
        [civilCaseId],
      )
    ).rows;
  });

  return hydrateVideos(rows);
};

export const loadVideosForReport = async (reportId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            video.id,
            video.slug,
            video.category,
            video.url,
            video.normalized_url,
            video.title,
            video.description,
            video.thumbnail_url,
            video.embed_url,
            video.source_platform,
            video.source_label,
            video.recorded_at,
            video.published_at,
            video.duration_seconds,
            video.transcript,
            video.summary,
            video.created_at,
            video.updated_at
          from public.videos video
          where exists (
            select 1
            from public.video_reports video_report
            where video_report.video_id = video.id
              and video_report.review_id = $1
          )
          order by coalesce(video.recorded_at, video.published_at, video.created_at) desc, video.title
        `,
        [reportId],
      )
    ).rows;
  });

  return hydrateVideos(rows);
};

export const loadVideosForAgency = async (agencyId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            video.id,
            video.slug,
            video.category,
            video.url,
            video.normalized_url,
            video.title,
            video.description,
            video.thumbnail_url,
            video.embed_url,
            video.source_platform,
            video.source_label,
            video.recorded_at,
            video.published_at,
            video.duration_seconds,
            video.transcript,
            video.summary,
            video.created_at,
            video.updated_at
          from public.videos video
          where exists (
            select 1
            from public.video_agency_officers video_officer
            join public.agency_officers agency_officer
              on agency_officer.id = video_officer.agency_officer_id
            where video_officer.video_id = video.id
              and agency_officer.agency_id = $1
          )
          order by coalesce(video.recorded_at, video.published_at, video.created_at) desc, video.title
        `,
        [agencyId],
      )
    ).rows;
  });

  return hydrateVideos(rows);
};

export const loadVideoByCategorySlug = async (
  category: string,
  slug: string,
) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select ${VIDEO_COLUMNS}
            from public.videos
            where lower(category) = lower($1)
              and slug = $2
          `,
        [category, slug],
      )
    ).rows;
  });

  const videos = await hydrateVideos(rows);
  return videos[0] || null;
};

export const loadVideoByUrl = async (url: string) => {
  const normalizedUrl = normalizeVideoUrl(url);
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select ${VIDEO_COLUMNS}
            from public.videos
            where normalized_url = $1
          `,
        [normalizedUrl],
      )
    ).rows;
  });

  const videos = await hydrateVideos(rows);
  return videos[0] || null;
};

export const loadVideoPathsByUrls = async (urls: string[]) => {
  const normalizedUrls = Array.from(new Set(urls.map(normalizeVideoUrl)));
  if (!normalizedUrls.length) {
    return new Map<string, string>();
  }

  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select normalized_url, category, slug
            from public.videos
            where normalized_url = any($1)
          `,
        [normalizedUrls],
      )
    ).rows;
  });

  const pathsByNormalizedUrl = new Map(
    rows.map(
      (row: { normalized_url: string; category: string; slug: string }) => [
        row.normalized_url,
        `/video/${row.category}/${row.slug}/`,
      ],
    ),
  );

  return new Map(
    urls.flatMap((url) => {
      const path = pathsByNormalizedUrl.get(normalizeVideoUrl(url));
      return path ? [[url, path] as const] : [];
    }),
  );
};

export const loadVideosForOfficer = async (officerId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
            select
              video.id,
              video.slug,
              video.category,
              video.url,
              video.normalized_url,
              video.title,
              video.description,
              video.thumbnail_url,
              video.embed_url,
              video.source_platform,
              video.source_label,
              video.recorded_at,
              video.published_at,
              video.duration_seconds,
              video.transcript,
              video.summary,
              video.created_at,
              video.updated_at
            from public.videos video
            where exists (
              select 1
              from public.video_agency_officers video_officer
              join public.agency_officers agency_officer
                on agency_officer.id = video_officer.agency_officer_id
              where video_officer.video_id = video.id
                and agency_officer.officer_id = $1
            )
            order by coalesce(video.recorded_at, video.published_at, video.created_at) desc, video.title
          `,
        [officerId],
      )
    ).rows;
  });

  return hydrateVideos(rows);
};

export const getVideoContentUrlFields = (video: VideoReference) => ({
  ...(isDirectVideoContentUrl(video.url) ? { contentUrl: video.url } : {}),
});
