#!/usr/bin/env node
// Guard against publishing present-tense employment for an assignment our own
// source records as ended (INS-63 / INS-75).
//
// The defect this exists to catch is not a crash and not a type error — it is a
// page that renders perfectly while making a false claim about a named human
// being. The only thing that can detect it is reading the published HTML and
// checking the claims against each other, which is what this does.
//
// Two invariants, both checked per personnel profile page:
//
//   1. A page whose headline assignment has ended must NOT emit schema.org
//      `worksFor`. `worksFor` is a present-tense employment assertion and
//      crawlers consume it without reading the visible qualifier.
//   2. A page whose headline assignment has ended must show an explicit end
//      date, so a human reader sees when the association stopped rather than
//      just that it did.
//
// A page with an open assignment is expected to carry `worksFor` and no end
// date; that is the genuine current case and is not a violation.
//
// Usage:
//   node scripts/verify-employment-claims.mjs --dist dist
//   node scripts/verify-employment-claims.mjs --host https://www.policeconduct.org --sample 1500
//
// Exits non-zero when any violation is found.

import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDED_LABEL = "Most recent agency";
const CURRENT_LABEL = "Current agency";

const HEADLINE = new RegExp(
  `personnel-current-line[^>]*>\\s*(${ENDED_LABEL}|${CURRENT_LABEL})\\s*:`,
);
const WORKS_FOR = /"worksFor"\s*:/;
const ENDED_MARKER = /assignment ended\s+([A-Z][a-z]{2} \d{1,2}, \d{4})/;

/**
 * Classify what one personnel page asserts about employment, and whether those
 * assertions contradict each other.
 *
 * @param {string} html
 * @returns {{
 *   headline: "ended" | "current" | null,
 *   worksFor: boolean,
 *   endDate: string | null,
 *   violations: string[],
 * }}
 */
export const classifyEmploymentClaims = (html) => {
  const match = HEADLINE.exec(html);
  const headline = match
    ? match[1] === ENDED_LABEL
      ? "ended"
      : "current"
    : null;
  const worksFor = WORKS_FOR.test(html);
  const endedMarker = ENDED_MARKER.exec(html);
  const endDate = endedMarker ? endedMarker[1] : null;

  const violations = [];
  if (headline === "ended") {
    if (worksFor) {
      violations.push(
        "ended assignment still asserts schema.org worksFor (present-tense employment)",
      );
    }
    if (!endDate) {
      violations.push("ended assignment renders no explicit end date");
    }
  }
  if (headline === "current" && endDate) {
    violations.push(
      "open assignment renders an end date; a null end_date must read as current",
    );
  }
  return { headline, worksFor, endDate, violations };
};

const parseArgs = (argv) => {
  const args = {
    dist: null,
    host: null,
    sample: 1500,
    seed: 19832026,
    // Deliberately low against a live host. Our own CloudFront distribution
    // rate-limits a fast crawl, and because it maps 403 to /404.html with
    // ResponseCode 404 distribution-wide, a throttle arrives looking exactly
    // like a missing page. Reading that as "page gone" instead of "we were
    // throttled" is how this check would quietly stop measuring anything.
    concurrency: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--dist") args.dist = argv[++i];
    else if (flag === "--host") args.host = argv[++i];
    else if (flag === "--sample") args.sample = Number.parseInt(argv[++i], 10);
    else if (flag === "--seed") args.seed = Number.parseInt(argv[++i], 10);
    else if (flag === "--concurrency")
      args.concurrency = Number.parseInt(argv[++i], 10);
  }
  return args;
};

// Deterministic PRNG so a sampled run is reproducible and quotable.
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sampleDeterministic = (items, count, seed) => {
  if (items.length <= count) return [...items];
  const rand = mulberry32(seed);
  const pool = [...items];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
};

// `/personnel/new/` and `/personnel/suggest-edit/` live under the same prefix
// but are submission forms, not profiles. They carry no employment headline, so
// counting them as profiles makes the guard report two undetectable claims and
// fail for the wrong reason. The --host path already skips them.
const NON_PROFILE_SLUGS = new Set(["new", "suggest-edit"]);

const collectDistPages = async (distDir) => {
  const root = path.join(distDir, "personnel");
  const entries = await readdir(root, { withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (NON_PROFILE_SLUGS.has(entry.name)) continue;
    pages.push({
      id: `/personnel/${entry.name}/`,
      read: () => readFile(path.join(root, entry.name, "index.html"), "utf8"),
    });
  }
  return pages;
};

// Every fetch here is checked. An earlier revision of this script let a failed
// sitemap fetch yield an empty URL list, and the guard then reported success
// having inspected nothing at all — a false pass over 160,239 published claims.
const fetchText = async (url) => {
  const res = await fetch(String(url), {
    headers: { "user-agent": "IPC-employment-claims-guard/1.0" },
    // A redirect must not silently turn a preview check into a production check.
    redirect: "error",
  });
  if (!res.ok) {
    throw new Error(`GET ${url} returned HTTP ${res.status}`);
  }
  return res.text();
};

const collectHostPages = async (host, sample, seed) => {
  // Preview sitemaps may retain production canonical URLs. Keep their paths,
  // but make every request against the explicitly selected deployment.
  const onSelectedHost = (location) => {
    const source = new URL(location, host);
    const target = new URL(host);
    target.pathname = source.pathname;
    target.search = source.search;
    target.hash = "";
    return target.href;
  };
  const index = await fetchText(new URL("/sitemap-index.xml", host));
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!children.length) {
    throw new Error(`/sitemap-index.xml at ${host} listed no child sitemaps.`);
  }
  const urls = [];
  for (const child of children) {
    const xml = await fetchText(onSelectedHost(child));
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (!locs.length) {
      throw new Error(`Child sitemap ${child} listed no URLs.`);
    }
    urls.push(...locs);
  }
  const profiles = urls.filter(
    (u) =>
      /\/personnel\/[^/]+\/$/.test(u) &&
      !NON_PROFILE_SLUGS.has(u.replace(/\/$/, "").split("/").pop()),
  );
  if (!profiles.length) {
    throw new Error(
      `No personnel profile URLs found in the sitemap at ${host}; refusing to report a pass.`,
    );
  }
  console.log(
    `sitemap lists ${profiles.length} personnel profile pages; sampling ${Math.min(sample, profiles.length)} (seed ${seed})`,
  );
  return sampleDeterministic(profiles, sample, seed).map((url) => ({
    id: onSelectedHost(url),
    read: () => fetchText(onSelectedHost(url)),
  }));
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dist && !args.host) {
    console.error("Pass --dist <dir> or --host <url>.");
    process.exit(2);
  }

  const pages = args.dist
    ? await collectDistPages(args.dist)
    : await collectHostPages(args.host, args.sample, args.seed);

  const counts = { ended: 0, current: 0, unknown: 0, errors: 0 };
  const failures = [];
  const CONCURRENCY = args.concurrency ?? (args.dist ? 32 : 4);

  let cursor = 0;
  const worker = async () => {
    while (cursor < pages.length) {
      const page = pages[cursor++];
      let html;
      try {
        html = await page.read();
      } catch (error) {
        counts.errors += 1;
        failures.push({
          id: page.id,
          violations: [`unreadable: ${error.message}`],
        });
        continue;
      }
      const result = classifyEmploymentClaims(html);
      if (result.headline === "ended") counts.ended += 1;
      else if (result.headline === "current") counts.current += 1;
      else counts.unknown += 1;
      if (result.violations.length) {
        failures.push({ id: page.id, violations: result.violations });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const checked = counts.ended + counts.current + counts.unknown;
  if (!checked) {
    console.error(
      "Inspected 0 personnel pages. That is a failure, not a pass: the claims" +
        " this guard exists to check were never read.",
    );
    process.exit(1);
  }
  console.log(
    `checked ${checked} personnel pages (${counts.errors} unreadable)`,
  );
  console.log(`  headline ended   (former association): ${counts.ended}`);
  console.log(`  headline current (open association)  : ${counts.current}`);
  console.log(`  headline not detected                : ${counts.unknown}`);

  if (counts.unknown) {
    console.error(
      `\n${counts.unknown} page(s) exposed no recognisable employment headline. The` +
        " markers this guard reads may have been renamed; treat that as a failure" +
        " rather than a pass, because an undetectable claim is still published.",
    );
  }

  if (counts.errors && args.host) {
    console.error(
      `\n${counts.errors} page(s) could not be read. Against a live host an HTTP 404` +
        " here is ambiguous: this distribution serves /404.html with ResponseCode" +
        " 404 for 403s too, so a rate-limit looks identical to a deleted page." +
        " Re-run later with a lower --concurrency before concluding pages are missing.",
    );
  }

  if (failures.length) {
    console.error(
      `\n${failures.length} page(s) publish a contradictory employment claim:`,
    );
    for (const failure of failures.slice(0, 25)) {
      console.error(`  ${failure.id}`);
      for (const violation of failure.violations)
        console.error(`      - ${violation}`);
    }
    if (failures.length > 25) {
      console.error(`  ...and ${failures.length - 25} more`);
    }
  }

  if (failures.length || counts.unknown || counts.errors) process.exit(1);
  console.log(
    "\nNo page asserts present-tense employment for an ended assignment.",
  );
};

if (
  process.argv[1] &&
  (await realpath(fileURLToPath(import.meta.url))) ===
    (await realpath(process.argv[1]))
) {
  try {
    await main();
  } catch (error) {
    // Reaching here means the guard could not complete its check. Say so as a
    // failure rather than letting an unhandled rejection be read as noise.
    console.error(`Employment-claim guard could not run: ${error.message}`);
    process.exit(1);
  }
}
