// Generate a static, append-only redirect file by diffing a PRIOR sitemap
// against this build's routes. Deterministic and DB-free: agency/personnel/
// civil_cases/reviews slugs are unique, and the slug is the last path segment,
// so a prior URL that is no longer a route maps to its current URL by matching
// the last segment.
//
//   PRIOR_SITEMAP  the previous build's sitemap (default: the prod URL below;
//                  `skip` to no-op). URL or local sitemap-index.xml path.
//   OUT            output file (default: redirects.generated.json)
//
// Emits [{ from, to, source }] for resolvable moves and reports unresolved
// prior URLs (entity retired) as 410 candidates. Review, then commit the file
// as the append-only source of truth. Run against real prod/prev sitemaps.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const DEFAULT_PRIOR = "https://www.policeconduct.org/sitemap-index.xml";
const OUT = process.env.OUT || "redirects.generated.json";

const toPath = (loc) => {
  try {
    return new URL(loc).pathname;
  } catch {
    return String(loc || "").trim();
  }
};
const lastSegment = (p) => p.replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
const extractLocs = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

const readSource = async (source, childRef) => {
  if (/^https?:\/\//i.test(source)) {
    const url = childRef ?? source;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
    return res.text();
  }
  const dir = path.dirname(path.resolve(source));
  const file = childRef
    ? path.join(dir, path.basename(toPath(childRef)))
    : path.resolve(source);
  return readFile(file, "utf8");
};

const loadSitemapPaths = async (source) => {
  const indexXml = await readSource(source);
  const childRefs = extractLocs(indexXml).filter((l) => /sitemap.*\.xml$/i.test(l));
  const paths = new Set();
  if (childRefs.length) {
    for (const ref of childRefs) {
      for (const loc of extractLocs(await readSource(source, ref))) paths.add(toPath(loc));
    }
  } else {
    for (const loc of extractLocs(indexXml)) paths.add(toPath(loc));
  }
  return paths;
};

const main = async () => {
  const prior = process.env.PRIOR_SITEMAP?.trim() || DEFAULT_PRIOR;
  if (prior.toLowerCase() === "skip") {
    console.log("PRIOR_SITEMAP=skip — nothing to generate.");
    return;
  }
  const priorPaths = await loadSitemapPaths(prior);
  const currentPaths = await loadSitemapPaths(path.join(DIST_DIR, "sitemap-index.xml"));

  // slug (last segment) -> current path. Flag any slug that isn't unique across
  // current routes (should not happen given slug formats; a collision is a bug).
  const currentBySlug = new Map();
  const ambiguous = new Set();
  for (const p of currentPaths) {
    const slug = lastSegment(p);
    if (!slug) continue;
    if (currentBySlug.has(slug) && currentBySlug.get(slug) !== p) ambiguous.add(slug);
    else currentBySlug.set(slug, p);
  }

  const redirects = [];
  const unresolved = [];
  const ambiguousHits = [];
  for (const p of priorPaths) {
    if (currentPaths.has(p)) continue; // still a route
    const slug = lastSegment(p);
    if (ambiguous.has(slug)) {
      ambiguousHits.push(p);
      continue;
    }
    const to = currentBySlug.get(slug);
    if (to) redirects.push({ from: p, to, source: "sitemap-slug" });
    else unresolved.push(p); // entity retired -> 410 candidate
  }

  redirects.sort((a, b) => a.from.localeCompare(b.from));
  await writeFile(OUT, JSON.stringify(redirects, null, 2) + "\n");

  console.log(
    `Generated ${redirects.length} redirects -> ${OUT}\n` +
      `  prior URLs: ${priorPaths.size}, current routes: ${currentPaths.size}\n` +
      `  unresolved (retired -> 410 candidates): ${unresolved.length}\n` +
      `  ambiguous slug collisions: ${ambiguousHits.length}`,
  );
  if (unresolved.length) {
    console.log("  first unresolved:", unresolved.slice(0, 10).join(", "));
  }
  if (ambiguousHits.length) {
    console.warn("  first ambiguous:", ambiguousHits.slice(0, 10).join(", "));
  }
};

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
