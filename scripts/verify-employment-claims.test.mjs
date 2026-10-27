import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyEmploymentClaims } from "./verify-employment-claims.mjs";

// Minimal stand-ins for the shapes the personnel template emits.
const page = ({ label, worksFor, ended }) => `
<html><head>
<script type="application/ld+json">{"@graph":[{"@type":"Person","name":"A B"${
  worksFor ? ',"worksFor":{"@id":"https://x/#organization"}' : ""
}}]}</script>
</head><body>
<p class="personnel-current-line astro-x">${label}: <a href="/a/">An Agency</a>
<span aria-hidden="true"> · </span>Somewhere, TX${
  ended
    ? `<span aria-hidden="true"> · </span><span class="personnel-assignment-ended">assignment ended ${ended}</span>`
    : ""
}</p>
</body></html>`;

test("the pre-fix shape is a violation: ended headline plus worksFor", () => {
  const result = classifyEmploymentClaims(
    page({ label: "Most recent agency", worksFor: true, ended: null }),
  );
  assert.equal(result.headline, "ended");
  assert.equal(result.worksFor, true);
  assert.deepEqual(result.violations.length, 2);
  assert.match(result.violations[0], /worksFor/);
  assert.match(result.violations[1], /no explicit end date/);
});

test("the fixed shape passes: ended headline, no worksFor, end date shown", () => {
  const result = classifyEmploymentClaims(
    page({
      label: "Most recent agency",
      worksFor: false,
      ended: "Jul 24, 2023",
    }),
  );
  assert.equal(result.headline, "ended");
  assert.equal(result.worksFor, false);
  assert.equal(result.endDate, "Jul 24, 2023");
  assert.deepEqual(result.violations, []);
});

test("an ended page that hides the end date is still a violation", () => {
  const result = classifyEmploymentClaims(
    page({ label: "Most recent agency", worksFor: false, ended: null }),
  );
  assert.deepEqual(result.violations, [
    "ended assignment renders no explicit end date",
  ]);
});

test("a genuinely current assignment keeps worksFor and passes", () => {
  const result = classifyEmploymentClaims(
    page({ label: "Current agency", worksFor: true, ended: null }),
  );
  assert.equal(result.headline, "current");
  assert.equal(result.worksFor, true);
  assert.deepEqual(result.violations, []);
});

test("a current headline carrying an end date is a violation", () => {
  // Guards rule 3: a null end_date must not be swept into "former".
  const result = classifyEmploymentClaims(
    page({ label: "Current agency", worksFor: true, ended: "Jul 24, 2023" }),
  );
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /must read as current/);
});

test("a page with no employment headline is reported as undetected", () => {
  const result = classifyEmploymentClaims("<html><body>nothing</body></html>");
  assert.equal(result.headline, null);
  assert.deepEqual(result.violations, []);
});

const scriptPath = await realpath(
  fileURLToPath(new URL("./verify-employment-claims.mjs", import.meta.url)),
);

const runCli = (script, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      timeout: 10000,
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });

const serve = async (t, handler) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return `http://127.0.0.1:${server.address().port}`;
};

test("CLI checks the selected host even when sitemap URLs name another origin", async (t) => {
  let foreignHits = 0;
  const foreign = await serve(t, (req, res) => {
    foreignHits += 1;
    res.end(
      req.url === "/sitemap.xml"
        ? `<urlset><url><loc>${foreign}/personnel/example/</loc></url></urlset>`
        : page({ label: "Current agency", worksFor: true }),
    );
  });
  const requested = [];
  let ended = true;
  const host = await serve(t, (req, res) => {
    requested.push(req.url);
    if (req.url === "/sitemap-index.xml") {
      res.end(
        `<sitemapindex><sitemap><loc>${foreign}/sitemap.xml</loc></sitemap></sitemapindex>`,
      );
    } else if (req.url === "/sitemap.xml") {
      res.end(
        `<urlset><url><loc>${foreign}/personnel/example/</loc></url></urlset>`,
      );
    } else {
      res.end(
        page({
          label: ended ? "Most recent agency" : "Current agency",
          worksFor: true,
        }),
      );
    }
  });
  const result = await runCli(scriptPath, ["--host", host]);
  assert.equal(result.code, 1, result.output);
  assert.equal(foreignHits, 0);
  assert.deepEqual(requested, [
    "/sitemap-index.xml",
    "/sitemap.xml",
    "/personnel/example/",
  ]);
  assert.match(result.output, /ended assignment still asserts/);
  ended = false;
  const passing = await runCli(scriptPath, ["--host", host]);
  assert.equal(passing.code, 0, passing.output);
  assert.match(passing.output, /checked 1 personnel pages/);
  assert.equal(foreignHits, 0);
});

test("CLI refuses redirects rather than verifying a different origin", async (t) => {
  let foreignHits = 0;
  const foreign = await serve(t, (req, res) => {
    foreignHits += 1;
    res.end(
      `<sitemapindex><sitemap><loc>${foreign}/sitemap.xml</loc></sitemap></sitemapindex>`,
    );
  });
  const host = await serve(t, (req, res) => {
    res.writeHead(302, { Location: `${foreign}/sitemap-index.xml` });
    res.end();
  });
  const result = await runCli(scriptPath, ["--host", host]);
  assert.equal(result.code, 1, result.output);
  assert.equal(foreignHits, 0);
  assert.match(result.output, /could not run/);
});

test("CLI through a symlink with spaces runs and fails for a missing dist", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "employment claims "));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const link = path.join(directory, "linked verifier.mjs");
  await symlink(scriptPath, link);
  const result = await runCli(link, [
    "--dist",
    path.join(directory, "missing"),
  ]);
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /ENOENT/);
});
