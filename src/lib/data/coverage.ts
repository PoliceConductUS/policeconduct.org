import { withDb } from "../db.js";
import {
  selectCoverageLink,
  type ReleaseArticle,
  type Relationship,
  type Officer,
  type Ranking,
} from "./release-news.ts";
export type { CoverageLink } from "./release-news.ts";

type Assignment = { id: string; agencyId: string; personnelId: string };
type Destination = { article: ReleaseArticle; assignments: Relationship[] };
const sourceRef = (row: {
  id: string;
  source_namespace: string | null;
  source_id: string | null;
}) => {
  if ((row.source_namespace === null) !== (row.source_id === null))
    throw new Error(`Incomplete source identity for ${row.id}`);
  return {
    canonicalId: row.id,
    ...(row.source_namespace !== null &&
      row.source_id !== null && {
        namespace: row.source_namespace,
        sourceId: row.source_id,
      }),
  };
};
async function loadCoverage() {
  return withDb(async (client) => {
    const { rows: links } = await client.query(
      `select id,url,normalized_url,title,source_name,published_at,summary,notes,occurrences,source_namespace,source_id from public.coverage_links`,
    );
    const articles = new Map<string, ReleaseArticle>();
    for (const row of links) {
      const article: ReleaseArticle = {
        ...sourceRef(row),
        preferredUrl: row.url,
        normalizedUrl: row.normalized_url,
        notes: row.notes,
        occurrences: { ...row.occurrences },
        relationships: [],
      };
      // Database coverage predating source acquisition has metadata on the article row.
      if (!article.occurrences[row.url])
        article.occurrences[row.url] = {
          url: row.url,
          title: row.title,
          sourceName: row.source_name,
          publishedAt: row.published_at?.toISOString() ?? null,
          summary: row.summary,
        };
      articles.set(row.id, article);
    }
    const { rows } =
      await client.query(`select r.id,r.coverage_link_id,r.agency_personnel_id,r.confidence,r.notes,r.source_namespace,r.source_id,r.occurrence_url,r.correction_reason,
      a.agency_id,a.personnel_id,p.slug,p.first_name,p.last_name
      from public.coverage_link_agency_personnel r join public.agency_personnel a on a.id=r.agency_personnel_id
      join public.personnel p on p.id=a.personnel_id order by p.last_name,p.first_name,a.id`);
    const officers = new Map<string, Officer>();
    const agencies = new Map<string, Map<string, Destination>>();
    const personnel = new Map<string, Map<string, Destination>>();
    for (const row of rows) {
      const article = articles.get(row.coverage_link_id)!;
      const assignment = {
        ...sourceRef(row),
        agencyPersonnelId: row.agency_personnel_id,
        occurrenceUrl: row.occurrence_url,
        ...(row.correction_reason && { needsCorrection: true }),
        confidence: row.confidence,
        notes: row.notes,
      };
      article.relationships.push(assignment);
      officers.set(assignment.agencyPersonnelId, {
        slug: row.slug,
        first_name: row.first_name,
        last_name: row.last_name,
      });
      function add(index: typeof agencies, key: string) {
        let group = index.get(key);
        if (!group) index.set(key, (group = new Map()));
        let entry = group.get(row.coverage_link_id);
        if (!entry)
          group.set(
            row.coverage_link_id,
            (entry = { article, assignments: [] }),
          );
        entry.assignments.push(assignment);
      }
      add(agencies, row.agency_id);
      add(personnel, row.personnel_id);
    }
    const { rows: windows } = await client.query(
      "select id,window_end::text,placement_count from public.coverage_homepage_windows order by window_end desc limit 1",
    );
    let ranking: Ranking | undefined;
    const home: ReleaseArticle[] = [];
    if (windows.length) {
      const { rows: placements } = await client.query(
        "select coverage_link_id, position, clicks from public.coverage_homepage_placements where window_id=$1 and position <= $2 order by position",
        [windows[0].id, windows[0].placement_count],
      );
      ranking = {
        windowEnd: windows[0].window_end,
        placements: placements.map((row) => {
          const article = articles.get(row.coverage_link_id);
          if (!article)
            throw new Error(`Unknown ranked article ${row.coverage_link_id}`);
          home.push(article);
          return {
            canonicalId: article.canonicalId,
            namespace: article.namespace,
            sourceId: article.sourceId,
            position: row.position,
            clicks: Number(row.clicks),
          };
        }),
      };
    }
    return { agencies, personnel, officers, home, ranking };
  });
}
let cached: ReturnType<typeof loadCoverage> | undefined;
export const loadReleaseCoverage = () => (cached ??= loadCoverage());
async function forDestination(type: "agencies" | "personnel", id: string) {
  const data = await loadReleaseCoverage();
  const links = Array.from(
    data[type].get(id)?.values() ?? [],
    ({ article, assignments }) =>
      selectCoverageLink(article, assignments, data.officers),
  );
  const sortIdentity = (link: (typeof links)[number]) =>
    JSON.stringify(
      link.namespace && link.sourceId
        ? [link.namespace, link.sourceId]
        : [link.id],
    );
  return links.sort(
    (a, b) =>
      (b.published_at ?? "").localeCompare(a.published_at ?? "") ||
      a.title.localeCompare(b.title) ||
      sortIdentity(a).localeCompare(sortIdentity(b)),
  );
}
export const loadCoverageLinksForAgency = (id: string) =>
  forDestination("agencies", id);
export const loadCoverageLinksForOfficer = (id: string) =>
  forDestination("personnel", id);
export async function loadHomepageNews() {
  const { home, officers } = await loadReleaseCoverage();
  return home.map((article) => selectCoverageLink(article, [], officers));
}
export async function loadReleaseRoster() {
  return withDb(async (client) => {
    const { rows: agencies } = await client.query(
      `select a.id,a.name,lp.path || a.slug || '/' as path from public.agency a join public.location_path lp on lp.location_path_id=a.location_path_id order by a.id`,
    );
    const { rows: personnel } = await client.query(
      `select p.id,concat_ws(' ',p.first_name,p.middle_name,p.last_name,p.suffix) as name,p.first_name as "firstName",p.last_name as "lastName",concat_ws(' ',p.first_name,p.last_name) as "displayName",'/personnel/'||p.slug||'/' as path from public.personnel p where exists (select 1 from public.agency_personnel a where a.personnel_id=p.id) order by p.id`,
    );
    const { rows: assignments } = await client.query<Assignment>(
      `select id,agency_id as "agencyId",personnel_id as "personnelId" from public.agency_personnel order by id`,
    );
    return {
      agencies: agencies as { id: string; name: string; path: string | null }[],
      personnel: personnel as {
        id: string;
        name: string;
        path: string | null;
      }[],
      assignments,
    };
  });
}
