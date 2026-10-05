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

const approvedDuplicatePaths = [
  [
    "/law-enforcement-agency/mn/brooklyn-center-police-department-mn-ypgp/",
    "f1vaatwf5ilk19pjizorn6ge",
  ],
  [
    "/law-enforcement-agency/mn/minneapolis-police-department-mn-n6rd/",
    "ikojqoawn6c4m5m23cgs3yan",
  ],
  [
    "/law-enforcement-agency/mn/minnesota-state-patrol-d4e5f6/",
    "amcwh94rl4evk2uvlej74k70",
  ],
  [
    "/law-enforcement-agency/mn/st-anthony-police-department-mn-tbh3/",
    "g0z448nl5vtavrvntebbzu2n",
  ],
  [
    "/law-enforcement-agency/tx/dallas-police-department-tx-woyv/",
    "cm76wpxb701ggvrvgmu50aa9n",
  ],
  [
    "/law-enforcement-agency/tx/fort-worth-police-department-tx-py90/",
    "cm7a0bgon037gewvgoqo5jqsu",
  ],
  [
    "/law-enforcement-agency/tx/texas-department-of-public-safety-tx-28dj/",
    "cm7a0bgoo03ekewvgxw2elv24",
  ],
  ["/law-enforcement-agency/federal/fbi/", "cm7a0bgot046gewvgtaafjyui"],
  ["/law-enforcement-agency/federal/atf/", "cm7a0bgot046mewvgs6xyqymp"],
  ["/law-enforcement-agency/federal/dea/", "cm7a0bgot046oewvgozeu75gj"],
  ["/law-enforcement-agency/federal/usss/", "cm7a0bgot046iewvg5qs1f9cn"],
  ["/law-enforcement-agency/federal/cbp/", "cufdb3i3jzsr5kkfuto7huqk"],
  ["/law-enforcement-agency/federal/tsa/", "chvdwkxp1cjwertwzt6ll9b0"],
  ["/law-enforcement-agency/federal/uscg/", "c887sm2ibjg8c2yp4e4f4es5"],
  ["/law-enforcement-agency/federal/usms/", "cs2sz1y65zqybhahepchwol6"],
];

const retainedAgencies = approvedDuplicatePaths.map(([, id], index) => ({
  id,
  location_path: `/tx/fixture-county/place-${index}/`,
  slug: `current-agency-${index}`,
}));

const createFixture = async (t, duplicateRows = retainedAgencies) => {
  const cwd = await mkdtemp(path.join(tmpdir(), "redirect-generator-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const directory of [
    "scripts",
    "src/lib/geo",
    "dist/tx/reports",
    "dist/federal",
  ]) {
    await mkdir(path.join(cwd, directory), { recursive: true });
  }
  await copyFile(
    new URL("./generate-redirect-map.mjs", import.meta.url),
    path.join(cwd, "scripts/generate-redirect-map.mjs"),
  );
  await writeFile(path.join(cwd, "package.json"), '{"type":"module"}');
  await writeFile(
    path.join(cwd, "src/lib/geo/states.ts"),
    'export const US_STATE_TILES = [{code:"TX"},{code:"DC"},{code:"AK"}];',
  );
  const responses = [
    [
      {
        state: "tx",
        slug: "agency-123",
        canonical_path: "/tx/county/place/agency-123/",
      },
    ],
    [],
    [],
    [],
    [{ state: "tx" }, { state: "dc" }, { state: "ak" }],
    [
      { category: "tx", total: 100 },
      { category: "ak", total: 100 },
    ],
    duplicateRows,
  ];
  await writeFile(
    path.join(cwd, "src/lib/db.js"),
    `const responses = ${JSON.stringify(responses)};
     export const withDb = (run) => run({query: async (sql, values) => {
       const rows = responses.shift();
       if (responses.length === 0) {
         if (!/from public.agency a\\s+join public.location_path lp\\s+on lp.location_path_id = a.location_path_id/.test(sql)
             || !/select a.id, a.slug, lp.path as location_path/.test(sql)
             || !/where a.id = any\\(\\$1::text\\[\\]\\)/.test(sql)) {
           throw new Error("Retained agencies must resolve through the agency location_path_id join.");
         }
         return {rows: rows.filter((row) => values[0].includes(row.id))};
       }
       return {rows};
     }});`,
  );
  for (const route of ["tx", "tx/reports", "federal"]) {
    await writeFile(
      path.join(cwd, "dist", route, "index.html"),
      '<html><head><meta name="robots" content="noindex"></head></html>',
    );
  }
  return cwd;
};

const runGenerator = (cwd) =>
  spawnSync(process.execPath, ["scripts/generate-redirect-map.mjs"], {
    cwd,
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
    "/personnel/ak/page/2/",
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
    "/personnel/tx/page/2/",
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

// Omitting an approved alias or hardcoding a stale destination must break this test.
test("approved duplicate agency redirects follow retained agency joined paths and slugs", async (t) => {
  const cwd = await createFixture(t);
  const result = runGenerator(cwd);
  assert.equal(result.status, 0, result.stderr);
  const { redirects } = JSON.parse(
    await readFile(path.join(cwd, "dist/_redirect-map.json"), "utf8"),
  );
  for (const [index, [from]] of approvedDuplicatePaths.entries()) {
    const matches = redirects.filter((entry) => entry.from === from);
    assert.equal(matches.length, 1, `${from} must redirect exactly once`);
    assert.equal(
      matches[0].to,
      `/tx/fixture-county/place-${index}/current-agency-${index}/`,
    );
    assert.equal(matches[0].status, 301);
  }
});

// Silently dropping an alias when its retained agency is absent must break this test.
test("missing required retained agency fails redirect generation", async (t) => {
  const cwd = await createFixture(t, retainedAgencies.slice(1));
  const result = runGenerator(cwd);
  assert.notEqual(
    result.status,
    0,
    "generation must fail for a missing retained agency",
  );
  assert.match(result.stderr, /f1vaatwf5ilk19pjizorn6ge/);
  await assert.rejects(readFile(path.join(cwd, "dist/_redirect-map.json")), {
    code: "ENOENT",
  });
});
