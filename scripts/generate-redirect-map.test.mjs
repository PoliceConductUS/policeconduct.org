import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const historicalCases = Array.from({ length: 6 }, (_, index) => ({
  id: `fixture-case-id-${index}`,
  state: index === 0 ? "mn" : "tx",
  oldSlug: `fixture-old-case-${index}`,
  slug: `fixture-current-case-${index}`,
  videos: [],
}));

const reportFixtureRows = [
  {
    state: "tx",
    slug: "fixture-report",
    location_path: "/tx/county/place/",
    incident_date: "2023-12-04",
    videos: [
      { id: "original-report-link", url: "https://youtu.be/TKh6X74AEc0" },
    ],
  },
];

const retiredReportWatchPath =
  "/report/tx/fixture-retired-report/watch/original-report-link/";
const reportWatchPath =
  "/tx/county/place/reports/2023/12/04/fixture-report/watch/original-report-link/";

const createFixture = async (
  t,
  cases = historicalCases,
  reports = reportFixtureRows,
) => {
  const cwd = path.resolve(
    await mkdtemp(path.join(tmpdir(), "redirect-generator-")),
  );
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const directory of [
    "scripts",
    "src/lib/geo",
    "src/lib/data",
    "dist/tx/reports",
    "dist/federal",
    "dist/personnel/multi-agency-officer",
  ]) {
    await mkdir(path.join(cwd, directory), { recursive: true });
  }
  await copyFile(
    new URL("./workspace-redirects.mjs", import.meta.url),
    path.join(cwd, "scripts/workspace-redirects.mjs"),
  );
  await copyFile(
    new URL("./generate-redirect-map.mjs", import.meta.url),
    path.join(cwd, "scripts/generate-redirect-map.mjs"),
  );
  await copyFile(
    new URL("../src/lib/video.ts", import.meta.url),
    path.join(cwd, "src/lib/video.ts"),
  );
  await copyFile(
    new URL("../src/lib/pagination.ts", import.meta.url),
    path.join(cwd, "src/lib/pagination.ts"),
  );
  await writeFile(path.join(cwd, "package.json"), '{"type":"module"}');
  await writeFile(
    path.join(cwd, "src/lib/geo/states.ts"),
    'export const US_STATE_TILES = [{code:"TX"},{code:"DC"},{code:"AK"}];',
  );
  const responses = [
    Array.from({ length: 100 }, (_, index) => ({
      state: "tx",
      slug: index === 0 ? "agency-123" : `agency-fixture-${index}`,
      canonical_path:
        index === 0
          ? "/tx/county/place/agency-123/"
          : `/tx/county/place/agency-fixture-${index}/`,
    })),
    [],
    [
      ...cases,
      {
        state: "tx",
        slug: "case-slug",
        videos: [
          { id: "original-case-link", url: "https://youtu.be/TKh6X74AEc0" },
        ],
      },
    ],
    reports,
    [{ state: "tx" }, { state: "dc" }, { state: "ak" }],
    [{ slug: "multi-agency-officer" }, { slug: "unbuilt-officer" }],
  ];
  await writeFile(
    path.join(cwd, "src/lib/db.js"),
    `const responses = ${JSON.stringify(responses)};
     export const withDb = (run) => run({query: async (sql) => {
       if (responses.length >= 5 && (!sql.includes("lp.location_path_id = a.location_path_id")
           || !sql.includes("lp.path || a.slug || '/' as canonical_path")
           || !sql.includes("bpp.entity_id = a.id") || /bpp\\.path|payload->/.test(sql))) {
         throw new Error("Agency route identity must use the agency location join and stored slug; projections only select eligibility.");
       }
       return {rows: responses.shift()};
     }});`,
  );
  for (const route of [
    "tx",
    "tx/reports",
    "federal",
    "personnel/multi-agency-officer",
  ]) {
    await writeFile(
      path.join(cwd, "dist", route, "index.html"),
      '<html><head><meta name="robots" content="noindex"></head></html>',
    );
  }
  for (const c of cases) {
    await mkdir(path.join(cwd, "dist/civil-cases", c.slug), {
      recursive: true,
    });
    await writeFile(
      path.join(cwd, "dist/civil-cases", c.slug, "index.html"),
      "<html></html>",
    );
  }
  await mkdir(path.join(cwd, "dist", reportWatchPath), { recursive: true });
  await writeFile(
    path.join(cwd, "dist", reportWatchPath, "index.html"),
    "<html></html>",
  );
  await writeFile(
    path.join(cwd, "redirects.json"),
    JSON.stringify(
      Object.fromEntries([
        ...cases.flatMap((c) => [
          [`/civil-cases/${c.oldSlug}/`, `/civil-cases/${c.slug}/`],
          [
            `/civil-litigation/${c.state}/${c.oldSlug}/`,
            `/civil-cases/${c.slug}/`,
          ],
        ]),
        [retiredReportWatchPath, reportWatchPath],
      ]),
    ),
  );
  return cwd;
};

const runGenerator = (cwd) =>
  spawnSync(process.execPath, ["scripts/generate-redirect-map.mjs"], {
    cwd,
    env: { ...process.env, INTAKE_WORKSPACE: cwd },
    encoding: "utf8",
  });

test("category redirects require built destinations without hiding missing entity targets", async (t) => {
  const cwd = await createFixture(t);
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  for (const from of [
    "/personnel/ak/",
    "/personnel/ak/page/*",
    "/civil-litigation/ak/",
    "/civil-litigation/ak/page/*",
    "/report/dc/",
    "/report/dc/page/*",
  ]) {
    assert.equal(
      redirects.some((entry) => entry.from === from),
      false,
      `${from} must not point to an unbuilt category`,
    );
  }
  for (const from of [
    "/personnel/tx/",
    "/personnel/tx/page/*",
    "/personnel/federal/",
    "/civil-litigation/tx/",
    "/civil-litigation/tx/page/*",
    "/report/tx/",
    "/report/tx/page/*",
  ]) {
    assert.equal(
      redirects.filter((entry) => entry.from === from).length,
      1,
      `${from} must retain its built destination exactly once`,
    );
  }
  assert.equal(
    redirects.find(
      (entry) => entry.from === "/law-enforcement-agency/tx/agency-123/",
    )?.to,
    "/tx/county/place/agency-123/",
  );
  assert.equal(
    redirects.find((entry) => entry.from === "/law-enforcement-agency/new/")
      ?.to,
    "/agency/new/",
  );
});

test("legacy agency collections and federal civil collection require built civic indexes", async (t) => {
  const cwd = await createFixture(t);
  for (const category of ["mn", "or", "wa"]) {
    await mkdir(path.join(cwd, "dist", category), { recursive: true });
    await writeFile(path.join(cwd, "dist", category, "index.html"), "fixture");
  }
  await writeFile(
    path.join(cwd, "src/lib/geo/states.ts"),
    'export const US_STATE_TILES = [{code:"TX"},{code:"MN"},{code:"OR"},{code:"WA"},{code:"AK"}];',
  );
  let result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  let { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  for (const category of ["tx", "mn", "or", "wa", "federal"]) {
    for (const suffix of ["/", "/page/*"]) {
      const from = `/law-enforcement-agency/${category}${suffix}`;
      const matches = redirects.filter((entry) => entry.from === from);
      assert.equal(matches.length, 1, `${from} must redirect exactly once`);
      assert.equal(matches[0].to, `/${category}/`);
      assert.equal(matches[0].status, 301);
    }
  }
  assert.equal(
    redirects.find((entry) => entry.from === "/civil-litigation/federal/")?.to,
    "/federal/",
  );
  assert.equal(
    redirects.find(
      (entry) => entry.from === "/law-enforcement-agency/tx/page/2/",
    )?.to,
    "/tx/",
  );
  assert.equal(
    redirects.some(
      (entry) => entry.from === "/law-enforcement-agency/tx/page/3/",
    ),
    false,
  );
  await rm(path.join(cwd, "dist/federal/index.html"));
  await rm(path.join(cwd, "dist/tx/index.html"));
  result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  ({ redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  ));
  for (const from of [
    "/law-enforcement-agency/tx/",
    "/law-enforcement-agency/tx/page/*",
    "/law-enforcement-agency/tx/page/2/",
    "/law-enforcement-agency/ak/",
    "/law-enforcement-agency/ak/page/*",
    "/law-enforcement-agency/federal/",
    "/law-enforcement-agency/federal/page/*",
    "/civil-litigation/federal/",
  ]) {
    assert.equal(
      redirects.some((entry) => entry.from === from),
      false,
      `${from} must not redirect to an unbuilt index`,
    );
  }
});

test("legacy watch URLs preserve the stored video link id and resolve to watch pages", async (t) => {
  const cwd = await createFixture(t);
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  const expected = [
    [
      "/civil-litigation/tx/case-slug/watch/original-case-link/",
      "/civil-cases/case-slug/watch/original-case-link/",
    ],
    ["/report/tx/fixture-report/watch/original-report-link/", reportWatchPath],
    [retiredReportWatchPath, reportWatchPath],
  ];
  for (const [from, to] of expected)
    assert.equal(redirects.find((entry) => entry.from === from)?.to, to);
});

test("retired personnel agencies subpages fold into built profiles only", async (t) => {
  const cwd = await createFixture(t);
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  const built = redirects.filter(
    (entry) => entry.from === "/personnel/multi-agency-officer/agencies/",
  );
  assert.equal(built.length, 1);
  assert.equal(built[0].to, "/personnel/multi-agency-officer/");
  assert.equal(built[0].status, 301);
  assert.equal(
    redirects.some(
      (entry) => entry.from === "/personnel/unbuilt-officer/agencies/",
    ),
    false,
  );
});

test("legacy static aliases preserve both exact slash variants", async (t) => {
  const cwd = await createFixture(t);
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  for (const [from, to] of [
    ["/privacy-policy", "/legal-notice/privacy/"],
    ["/privacy-policy/", "/legal-notice/privacy/"],
    ["/partner/prosecutor", "/partner/"],
    ["/partner/prosecutor/", "/partner/"],
  ]) {
    const matches = redirects.filter((entry) => entry.from === from);
    assert.equal(matches.length, 1, `${from} must appear exactly once`);
    assert.equal(matches[0].to, to);
    assert.equal(matches[0].status, 301);
  }
});

test("workspace historical case mappings target built current pages", async (t) => {
  const cases = historicalCases.map((c) => ({
    ...c,
    slug: `${c.slug}-current`,
  }));
  const cwd = await createFixture(t, cases);
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  for (const c of cases) {
    for (const from of [
      `/civil-cases/${c.oldSlug}/`,
      `/civil-litigation/${c.state}/${c.oldSlug}/`,
    ]) {
      const matches = redirects.filter((r) => r.from === from);
      assert.equal(matches.length, 1, from);
      assert.equal(matches[0].to, `/civil-cases/${c.slug}/`);
      assert.equal(matches[0].status, 301);
      await readFile(path.join(cwd, "dist", matches[0].to, "index.html"));
    }
  }
});

test("removing workspace mappings retires historical aliases on regeneration", async (t) => {
  const cwd = await createFixture(t);
  assert.equal(runGenerator(cwd).status, 0);
  await writeFile(path.join(cwd, "redirects.json"), "{}");
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  assert.equal(
    redirects.some((r) =>
      historicalCases.some((c) => r.from.includes(c.oldSlug)),
    ),
    false,
  );
});

test("historical case aliases fail when a resolved destination was not built", async (t) => {
  const cwd = await createFixture(t);
  await rm(path.join(cwd, "dist/civil-cases", historicalCases[0].slug), {
    recursive: true,
  });
  const result = runGenerator(cwd);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Workspace redirect destination was not built/);
});
