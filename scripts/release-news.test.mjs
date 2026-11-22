import assert from "node:assert/strict";
import test from "node:test";
import {
  releaseAliases,
  selectCoverageLink,
} from "../src/lib/data/release-news.ts";

const preferred = "https://original.example/story";
const alternate = "https://local.example/story";
const article = {
  namespace: "com/serpapi/landing-page-search",
  sourceId: preferred,
  canonicalId: "article-db",
  preferredUrl: preferred,
  normalizedUrl: preferred,
  notes: null,
  occurrences: {
    [preferred]: {
      namespace: "com/serpapi/landing-page-search",
      sourceId: preferred,
      url: preferred,
      title: "Original",
      publishedAt: "2026-11-11",
      sourceName: "Original outlet",
      summary: "Original summary",
    },
    [alternate]: {
      namespace: "com/serpapi/landing-page-search",
      sourceId: alternate,
      url: alternate,
      title: "Local copy",
      publishedAt: "2026-11-13",
      sourceName: "Local outlet",
      summary: "Local summary",
    },
  },
  relationships: ["alpha", "beta"].map((id, index) => ({
    namespace: "com/serpapi/landing-page-search",
    sourceId: id,
    agencyPersonnelId: id,
    occurrenceUrl: index ? alternate : preferred,
    confidence: "documented",
    notes: "private note",
  })),
};
const officers = new Map(
  ["alpha", "beta"].map((id) => [
    id,
    { slug: id, first_name: id, last_name: null },
  ]),
);
test("coverage always shows the stored preferred copy and keeps each assignment's source", () => {
  const link = selectCoverageLink(
    article,
    [article.relationships[1]],
    officers,
  );
  assert.equal(link.url, preferred);
  assert.equal(link.title, "Original");
  assert.equal(link.summary, "Original summary");
  assert.equal(link.officers[0].sourceId, "beta");
  assert.equal(link.sourceId, preferred);
  assert.ok(!JSON.stringify(link).includes("private note"));
  assert.equal(
    selectCoverageLink(article, article.relationships, officers).url,
    preferred,
  );
  assert.equal(selectCoverageLink(article, [], officers).url, preferred);
});

test("release aliases contain only confirmed Daily source IDs with one target per story", () => {
  const copy = "https://another.example/story";
  const other = "https://other.example/independent";
  const articleWithCopies = {
    ...article,
    occurrences: {
      ...article.occurrences,
      [copy]: { ...article.occurrences[alternate], url: copy, sourceId: copy },
      [other]: {
        ...article.occurrences[preferred],
        namespace: "a-different-source",
        sourceId: other,
      },
    },
  };
  assert.deepEqual(releaseAliases([articleWithCopies]), {
    CoverageLink: { [alternate]: preferred, [copy]: preferred },
  });
  assert.deepEqual(releaseAliases([]), { CoverageLink: {} });
  assert.deepEqual(
    releaseAliases([{ ...articleWithCopies, sourceId: "not-an-occurrence" }]),
    { CoverageLink: {} },
  );
  assert.throws(
    () =>
      releaseAliases([
        articleWithCopies,
        { ...article, canonicalId: "different" },
      ]),
    /multiple articles/,
  );
});
