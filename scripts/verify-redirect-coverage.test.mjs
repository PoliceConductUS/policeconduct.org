import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(
  new URL("./verify-redirect-coverage.mjs", import.meta.url),
);
const missing = "/personnel/not-populated-123/";
const absence = {
  path: missing,
  reason: "Not populated by intake; no scheduled return.",
};
const sitemap = (paths) =>
  `<urlset>${paths.map((p) => `<url><loc>https://www.policeconduct.org${p}</loc></url>`).join("")}</urlset>`;

async function check(
  t,
  { prior = [missing], current = ["/"], redirects = [], absences = [] } = {},
) {
  const cwd = await mkdtemp(path.join(tmpdir(), "route-coverage-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await mkdir(path.join(cwd, "dist"));
  await writeFile(path.join(cwd, "prior.xml"), sitemap(prior));
  await writeFile(path.join(cwd, "dist/sitemap-index.xml"), sitemap(current));
  await writeFile(
    path.join(cwd, "dist/_redirect-map.json"),
    JSON.stringify({ redirects }),
  );
  if (absences !== null) {
    await writeFile(
      path.join(cwd, "route-absences.json"),
      typeof absences === "string" ? absences : JSON.stringify(absences),
    );
  }
  return spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, PRIOR_SITEMAP: "prior.xml" },
  });
}

test("an explicitly accounted-for intake gap passes without a redirect", async (t) => {
  const result = await check(t, { absences: [absence] });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 prior URLs accounted for as absent \(404\)/);
});

test("an unaccounted-for missing route still fails", async (t) => {
  assert.equal((await check(t)).status, 1);
});

test("an absence entry does not cover other personnel or child routes", async (t) => {
  const result = await check(t, {
    prior: [missing, `${missing}reports/`, "/personnel/another-456/"],
    absences: [absence],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /another-456/);
  assert.match(result.stderr, /not-populated-123\/reports/);
});

test("a profile can return at its original URL while its absence record remains", async (t) => {
  const result = await check(t, {
    current: ["/", missing],
    absences: [absence],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 prior URLs accounted for as absent \(404\)/);
});

test("a verified replacement redirect still passes", async (t) => {
  const result = await check(t, {
    current: ["/personnel/replacement-789/"],
    redirects: [{ from: missing, to: "/personnel/replacement-789/" }],
  });
  assert.equal(result.status, 0, result.stderr);
});

test("an absence record cannot excuse a redirect to a missing destination", async (t) => {
  const result = await check(t, {
    redirects: [{ from: "/old/", to: missing }],
    absences: [absence],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /target is not a route/);
});

test("an absence record cannot excuse a redirect chain", async (t) => {
  const result = await check(t, {
    current: ["/", missing],
    absences: [absence],
    redirects: [
      { from: "/old/", to: missing },
      { from: missing, to: "/" },
    ],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /chain\/cycle/);
});

test("invalid absence entries fail even when all prior routes exist", async (t) => {
  for (const absences of [
    {},
    [{ path: missing }],
    [{ path: "/personnel/*/", reason: "Intake gap" }],
  ]) {
    const result = await check(t, { prior: ["/"], absences });
    assert.equal(result.status, 1, JSON.stringify(absences));
  }
});

test("a missing absence list fails even when all prior routes exist", async (t) => {
  const result = await check(t, { prior: ["/"], absences: null });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ENOENT/);
});

test("a malformed absence list fails even when all prior routes exist", async (t) => {
  const result = await check(t, { prior: ["/"], absences: "{" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /JSON/);
});
