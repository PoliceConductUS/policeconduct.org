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

test("category redirects require built destinations without hiding missing entity targets", async (t) => {
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
  ];
  await writeFile(
    path.join(cwd, "src/lib/db.js"),
    `const responses = ${JSON.stringify(responses)}; export const withDb = (run) => run({query: async () => ({rows: responses.shift()})});`,
  );
  for (const route of ["tx", "tx/reports", "federal"]) {
    await writeFile(
      path.join(cwd, "dist", route, "index.html"),
      '<html><head><meta name="robots" content="noindex"></head></html>',
    );
  }
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-redirect-map.mjs"],
    { cwd, encoding: "utf8" },
  );
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
