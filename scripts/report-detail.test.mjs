import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { Pool } from "pg";
import { requireWatchVideo } from "../src/lib/video.ts";

// Astro resolves these TypeScript source files from their .js import paths.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.endsWith("/src/lib/report-detail.ts") &&
      ["./data/location-paths.js", "./data/report-paths.js"].includes(specifier)
    ) {
      return nextResolve(specifier.replace(/\.js$/, ".ts"), context);
    }
    return nextResolve(specifier, context);
  },
});
process.env.DATABASE_URL ||= "postgres://fixture:fixture@127.0.0.1:1/fixture";
const { loadReportDetail } = await import("../src/lib/report-detail.ts");
hooks.deregister();

const caseLink = {
  id: "case-relationship",
  review_id: "report",
  title: null,
  url: null,
  civil_case_id: "case",
  case_id: "case",
  case_title: "Current case title",
  case_slug: "current-case-slug",
};
const externalLinks = [
  {
    id: "document-relationship",
    review_id: "report",
    title: "Source document",
    url: "https://example.org/document.pdf",
    civil_case_id: null,
    case_id: null,
    case_title: null,
    case_slug: null,
  },
  {
    id: "video-relationship",
    review_id: "report",
    title: "Source video",
    url: "https://youtu.be/TKh6X74AEc0",
    civil_case_id: null,
    case_id: null,
    case_title: null,
    case_slug: null,
  },
];

function serveReport(t, links) {
  t.mock.method(Pool.prototype, "connect", async () => ({
    release() {},
    async query(sql, parameters) {
      if (sql.includes("from public.reviews r")) {
        assert.deepEqual(parameters, ["stored-report-slug"]);
        return {
          rows: [
            {
              id: "report",
              slug: "stored-report-slug",
              incident_date: "2025-01-02",
              location_path: "/tx/area/place/",
              state_or_territory_slug: "tx",
              administrative_area_slug: "area",
              place_slug: "place",
              state_or_territory_name: "Texas",
              administrative_area_name: "Area",
              place_name: "Place",
            },
          ],
        };
      }
      if (sql.includes("from public.review_links")) {
        assert.deepEqual(parameters, ["report"]);
        assert.match(sql, /left join public\.civil_cases\s+\w+/i);
        assert.match(sql, /\w+\.id\s*=\s*\w+\.civil_case_id/);
        return { rows: links };
      }
      if (sql.includes("from public.review_personnel")) {
        return {
          rows: [
            {
              id: "review-personnel",
              agency_personnel_id: "assignment",
              rating_overall: null,
            },
          ],
        };
      }
      if (sql.includes("from public.personnel")) {
        return { rows: [{ id: "personnel", slug: "stored-personnel-slug" }] };
      }
      if (sql.includes("from public.agency a")) {
        return {
          rows: [{ id: "agency", canonical_path: "/tx/area/place/agency/" }],
        };
      }
      if (sql.includes("from public.agency_personnel")) {
        return {
          rows: [
            {
              id: "assignment",
              agency_id: "agency",
              personnel_id: "personnel",
              badge_number: null,
            },
          ],
        };
      }
      throw new Error(`Unexpected report query: ${sql}`);
    },
  }));
}

test("report case relationships use the currently joined case title and stored slug", async (t) => {
  const links = [{ ...caseLink }];
  serveReport(t, links);
  const original = await loadReportDetail("stored-report-slug");
  assert.deepEqual(original.relatedCases, [
    {
      id: "case-relationship",
      title: "Current case title",
      path: "/civil-cases/current-case-slug/",
    },
  ]);
  links[0].case_title = "Updated case title";
  links[0].case_slug = "updated-case-slug";
  const updated = await loadReportDetail("stored-report-slug");
  assert.deepEqual(updated.relatedCases, [
    {
      id: "case-relationship",
      title: "Updated case title",
      path: "/civil-cases/updated-case-slug/",
    },
  ]);
  assert.deepEqual(updated.evidenceLinks, []);
});

test("case relationships stay out of external evidence and video watch identity", async (t) => {
  serveReport(t, [caseLink, ...externalLinks]);
  const detail = await loadReportDetail("stored-report-slug");
  assert.deepEqual(detail.evidenceLinks, [
    {
      id: "document-relationship",
      title: "Source document",
      url: "https://example.org/document.pdf",
    },
    {
      id: "video-relationship",
      title: "Source video",
      url: "https://youtu.be/TKh6X74AEc0",
    },
  ]);
  assert.equal(
    requireWatchVideo(detail.evidenceLinks, "video-relationship").url,
    "https://youtu.be/TKh6X74AEc0",
  );
  assert.throws(
    () => requireWatchVideo(detail.evidenceLinks, "case-relationship"),
    /not found/,
  );
});

test("case relationships fail loudly for missing required case or link data", async (t) => {
  const links = [{ ...caseLink }];
  serveReport(t, links);
  for (const field of ["id", "case_id", "case_title", "case_slug"]) {
    for (const missing of [null, " "]) {
      links[0] = { ...caseLink, [field]: missing };
      await assert.rejects(
        loadReportDetail("stored-report-slug"),
        /Missing .*(?:review_links|civil case)/,
      );
    }
  }
});
