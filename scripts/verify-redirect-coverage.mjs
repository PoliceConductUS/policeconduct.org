// Build-time guard: guarantee no URL silently 404s across a deploy.
//
// Invariant — every URL in the PRIOR sitemap must, in THIS build, be either:
//   (a) a static route in the new sitemap, or
//   (b) redirect to a static route that is NOT itself a redirect source
//       (single hop => no chains, no cycles, no redirect-to-404).
//
// Prior sitemap source (env PRIOR_SITEMAP), in preference order:
//   - the previous build's sitemap (e.g. a synced builds/<prev-sha>/sitemap-index.xml
//     or its S3/CloudFront URL) — set this in CI when the prev sha is known;
//   - otherwise it DEFAULTS to the production URL below.
//   - set PRIOR_SITEMAP=skip to bypass (first-ever deploy / bootstrap).
// New build sitemaps: dist/sitemap-index.xml (+ children). Redirects:
// dist/_redirect-map.json ([{ from, to }, ...]).
//
// Fails closed: exits non-zero on any coverage gap, and also if the prior source
// is set/defaulted but cannot be loaded (use PRIOR_SITEMAP=skip to opt out).
import { readFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const DEFAULT_PRIOR = "https://www.policeconduct.org/sitemap-index.xml";

const toPath = (loc) => {
  try {
    return new URL(loc).pathname;
  } catch {
    return String(loc || "").trim();
  }
};

const extractLocs = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

const readSource = async (source, childRef) => {
  // childRef is a <loc> from the index; resolve relative to the source kind.
  if (/^https?:\/\//i.test(source)) {
    const url = childRef ?? source;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
    return res.text();
  }
  // Local: index at `source`; children are sibling files by basename.
  const dir = path.dirname(path.resolve(source));
  const file = childRef ? path.join(dir, path.basename(toPath(childRef))) : path.resolve(source);
  return readFile(file, "utf8");
};

// A sitemap index points at child sitemaps; a urlset lists page URLs.
const loadSitemapPaths = async (source) => {
  const indexXml = await readSource(source);
  const childRefs = extractLocs(indexXml).filter((l) => /sitemap.*\.xml$/i.test(l));
  const paths = new Set();
  if (childRefs.length) {
    for (const ref of childRefs) {
      const childXml = await readSource(source, ref);
      for (const loc of extractLocs(childXml)) paths.add(toPath(loc));
    }
  } else {
    // Already a urlset (no children).
    for (const loc of extractLocs(indexXml)) paths.add(toPath(loc));
  }
  return paths;
};

const loadRedirects = async () => {
  try {
    const raw = await readFile(path.join(DIST_DIR, "_redirect-map.json"), "utf8");
    const list = JSON.parse(raw);
    const map = new Map();
    for (const entry of list) {
      if (entry && entry.from && entry.to) map.set(toPath(entry.from), toPath(entry.to));
    }
    return map;
  } catch {
    return new Map();
  }
};

const main = async () => {
  const prior = process.env.PRIOR_SITEMAP?.trim() || DEFAULT_PRIOR;
  if (prior.toLowerCase() === "skip" || prior.toLowerCase() === "none") {
    console.log("PRIOR_SITEMAP=skip — bypassing redirect-coverage guard.");
    return;
  }
  console.log(`Prior routes from: ${prior}`);

  let priorPaths;
  try {
    priorPaths = await loadSitemapPaths(prior);
  } catch (error) {
    console.error(
      `Could not load prior sitemap (${prior}): ${error.message}\n` +
        "Set PRIOR_SITEMAP to the previous build's sitemap, or PRIOR_SITEMAP=skip to bypass.",
    );
    process.exitCode = 1;
    return;
  }
  const [newPaths, redirects] = await Promise.all([
    loadSitemapPaths(path.join(DIST_DIR, "sitemap-index.xml")),
    loadRedirects(),
  ]);
  const redirectSources = new Set(redirects.keys());

  const failures = [];

  // (b*) Every redirect must land on a real, terminal route — even ones whose
  // source is not in the prior sitemap. Single hop: target is a route and not
  // itself a redirect source.
  for (const [from, to] of redirects) {
    if (!newPaths.has(to)) {
      failures.push(`redirect ${from} -> ${to}: target is not a route in this build`);
    } else if (redirectSources.has(to)) {
      failures.push(`redirect ${from} -> ${to}: target is itself a redirect (chain/cycle)`);
    }
  }

  // (a)/(b) Every prior URL is still a route, or redirects to one.
  let covered = 0;
  for (const p of priorPaths) {
    if (newPaths.has(p)) continue;
    const to = redirects.get(p);
    if (!to) {
      failures.push(`removed route with no redirect (would 404): ${p}`);
    } else {
      covered += 1; // target validity already checked above
    }
  }

  console.log(
    `redirect coverage: ${priorPaths.size} prior URLs, ${newPaths.size} current routes, ` +
      `${redirects.size} redirects, ${covered} prior URLs covered by redirect.`,
  );

  if (failures.length) {
    console.error(`Redirect-coverage guard failed (${failures.length}):`);
    for (const f of failures.slice(0, 50)) console.error(`- ${f}`);
    if (failures.length > 50) console.error(`… and ${failures.length - 50} more`);
    process.exitCode = 1;
    return;
  }
  console.log("Redirect-coverage guard passed: no URL will 404 across this deploy.");
};

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
