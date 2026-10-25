import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  checkRenderedName,
  parsePersonnelTitle,
} from "./verify-name-quality.mjs";

const script = fileURLToPath(
  new URL("./verify-name-quality.mjs", import.meta.url),
);

const page = (name, agency = "Riverbend Police Department") => ({
  slug: "x",
  name,
  agency,
});

test("parses the personnel title shape", () => {
  assert.deepEqual(
    parsePersonnelTitle(
      "Personnel Marisol A Quillfeather | Riverbend Police Department | PoliceConduct.org",
    ),
    { name: "Marisol A Quillfeather", agency: "Riverbend Police Department" },
  );
});

test("strips the Most recent: prefix from the agency", () => {
  assert.deepEqual(
    parsePersonnelTitle(
      "Personnel Odalys M Threepwood | Most recent: Harlow Co. Sheriff's Office | x",
    ),
    { name: "Odalys M Threepwood", agency: "Harlow Co. Sheriff's Office" },
  );
});

test("ignores a title that is not a personnel profile", () => {
  assert.equal(parsePersonnelTitle("Personnel | PoliceConduct.org"), null);
  assert.equal(
    parsePersonnelTitle("Agencies in Westvale | PoliceConduct.org"),
    null,
  );
});

test("decodes entities before checking the name", () => {
  const parsed = parsePersonnelTitle(
    "Personnel Wren &#39; Marchetti J Oakhurst | A | B",
  );
  assert.equal(parsed.name, "Wren ' Marchetti J Oakhurst");
});

test("clean names produce nothing", () => {
  const result = checkRenderedName(page("Marisol A Quillfeather"));
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.warnings, []);
});

test("flags a published N/A placeholder as a violation", () => {
  const result = checkRenderedName(page("Marisol A Quillfeather N/a"));
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /placeholder-token/);
});

test("flags a number published inside a name as a violation", () => {
  assert.match(
    checkRenderedName(page("Dorian J Vanterpool 155")).violations[0],
    /numeric-name-token/,
  );
  assert.match(
    checkRenderedName(page("9 R. Hollyfield")).violations[0],
    /numeric-name-token/,
  );
});

test("flags a fixture given name and a fixture agency", () => {
  assert.match(
    checkRenderedName(page("Test R. Leds")).violations[0],
    /fixture-given-name/,
  );
  assert.match(
    checkRenderedName(page("Abner Test", "Central Texas Police Dept."))
      .violations[0],
    /fixture-agency/,
  );
});

// Real officers. None of these may ever block a build.
test("real surnames that look like literals do not block", () => {
  for (const name of [
    "Lysander A True",
    "Linnea S Sample",
    "Thaddeus R Tester",
    "Perpetua N Officer",
    "Na Tasha L Boonquist",
    "Ignatius Guest",
  ]) {
    assert.deepEqual(
      checkRenderedName(page(name)).violations,
      [],
      `${name} must not block the build`,
    );
  }
});

test("a stray punctuation component warns but does not block", () => {
  const result = checkRenderedName(page("Caspian Ferrowyn - Calder"));
  assert.deepEqual(result.violations, []);
  assert.match(result.warnings[0], /punctuation-only-token/);
});

test("a dangling trailing initial warns but does not block", () => {
  const result = checkRenderedName(page("Rosalind G"));
  assert.deepEqual(result.violations, []);
  assert.match(result.warnings[0], /possible-missing-surname/);
});

test("Test as a surname at a real agency does not block", () => {
  assert.deepEqual(checkRenderedName(page("Abner Test")).violations, []);
});

const buildDist = async (pages) => {
  const dir = await mkdtemp(path.join(tmpdir(), "name-quality-"));
  for (const [slug, title] of Object.entries(pages)) {
    await mkdir(path.join(dir, "personnel", slug), { recursive: true });
    await writeFile(
      path.join(dir, "personnel", slug, "index.html"),
      `<html><head>${"<!-- pad -->".repeat(200)}<title>${title}</title></head><body></body></html>`,
      "utf8",
    );
  }
  return dir;
};

test("exits 0 on a clean dist and 1 on a violation", async (t) => {
  const clean = await buildDist({
    "marisol-quillfeather-1":
      "Personnel Marisol A Quillfeather | Riverbend Police Department | PoliceConduct.org",
    "lysander-true-2":
      "Personnel Lysander A True | Lakeshore Parks | PoliceConduct.org",
  });
  const dirty = await buildDist({
    "marisol-quillfeather-1":
      "Personnel Marisol A Quillfeather N/a | Riverbend Police Department | PoliceConduct.org",
  });
  t.after(() =>
    Promise.all([
      rm(clean, { recursive: true, force: true }),
      rm(dirty, { recursive: true, force: true }),
    ]),
  );

  const ok = spawnSync(process.execPath, [script, "--dist", clean], {
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /No name-quality violations/);

  const bad = spawnSync(process.execPath, [script, "--dist", dirty], {
    encoding: "utf8",
  });
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stdout, /VIOLATIONS \(1\)/);
});

test("fails loudly when dist has not been built", () => {
  const result = spawnSync(
    process.execPath,
    [script, "--dist", path.join(tmpdir(), "definitely-not-a-dist-dir")],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Run a build first/);
});
