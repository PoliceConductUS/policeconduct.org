export type SourceReference = {
  namespace?: string;
  sourceId?: string;
  canonicalId?: string;
};
export type Occurrence = {
  namespace?: string;
  sourceId?: string;
  url: string;
  title: string;
  publishedAt: string | null;
  sourceName: string | null;
  summary: string | null;
  publisherAttribution?: string | null;
  domainRank?: number | null;
};
export type Relationship = SourceReference & {
  agencyPersonnelId: string;
  occurrenceUrl: string | null;
  needsCorrection?: boolean;
  confidence: string;
  notes: string | null;
};
export type ReleaseArticle = SourceReference & {
  preferredUrl: string;
  normalizedUrl: string;
  notes: string | null;
  occurrences: Record<string, Occurrence>;
  relationships: Relationship[];
};
export type Officer = {
  slug: string;
  first_name: string;
  last_name: string | null;
};
type Placement = SourceReference & { position: number; clicks: number };
export type Ranking = { windowEnd: string; placements: Placement[] };

export function selectCoverageLink(
  article: ReleaseArticle,
  assignments: Relationship[],
  officers: Map<string, Officer>,
) {
  // The coverage_links row's own url names the copy shown; the site does not
  // choose among occurrences.
  const occurrence = article.occurrences[article.preferredUrl];
  if (!occurrence)
    throw new Error(`No preferred occurrence for ${article.preferredUrl}`);
  return {
    id: article.canonicalId,
    namespace: occurrence.namespace ?? article.namespace,
    sourceId: occurrence.sourceId ?? article.sourceId,
    url: occurrence.url,
    title: occurrence.title,
    source_name: occurrence.sourceName,
    published_at: occurrence.publishedAt,
    summary: occurrence.summary,
    notes: article.notes,
    officers: assignments
      .map((assignment) => {
        const officer = officers.get(assignment.agencyPersonnelId);
        if (!officer)
          throw new Error(`Unknown assignment ${assignment.agencyPersonnelId}`);
        return {
          ...officer,
          assignmentId: assignment.agencyPersonnelId,
          namespace: assignment.namespace,
          sourceId: assignment.sourceId,
        };
      })
      .sort(
        (a, b) =>
          (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
          a.first_name.localeCompare(b.first_name) ||
          a.assignmentId.localeCompare(b.assignmentId),
      ),
  };
}
export type CoverageLink = ReturnType<typeof selectCoverageLink>;

// Build the initial private alias file from occurrences imported on the same row.
export function releaseAliases(articles: Iterable<ReleaseArticle>) {
  const aliases: Record<string, string> = {};
  const owners = new Map<string, ReleaseArticle>();
  for (const article of articles) {
    const keys = new Set<string>();
    for (const occurrence of Object.values(article.occurrences)) {
      if (occurrence.namespace !== "com/serpapi/landing-page-search") continue;
      if (!occurrence.sourceId)
        throw new Error("Missing publisher URL source ID");
      keys.add(occurrence.sourceId);
    }
    if (!keys.size) continue;
    // Only the article's own recorded source ID is an alias target; the site
    // does not choose one among its occurrences.
    const target =
      article.namespace === "com/serpapi/landing-page-search" &&
      article.sourceId &&
      keys.has(article.sourceId)
        ? article.sourceId
        : null;
    for (const key of keys) {
      const owner = owners.get(key);
      if (owner && owner !== article)
        throw new Error("Publisher URL belongs to multiple articles: " + key);
      owners.set(key, article);
      if (target !== null && key !== target) aliases[key] = target;
    }
  }
  return { CoverageLink: aliases };
}

export function pageNews(articles: ReleaseArticle[], ranking?: Ranking) {
  return {
    news: {
      target: "[data-page-part='news']",
      template: { fromOriginal: "template[data-template='coverage-item']" },
      data: { articles, ...(ranking && { ranking }) },
    },
  };
}
