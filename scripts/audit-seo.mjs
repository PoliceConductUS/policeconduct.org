import { promises as fs } from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const CANONICAL_HOST = "https://www.policeconduct.org";
const MAX_PAGES = Number(process.env.SEO_AUDIT_MAX_PAGES || "5000");

const EXPECTED_NOINDEX_PATHS = [
  "/about/contact/",
  "/volunteer/",
  "/issue/new/",
  "/civil-litigation/new/",
  "/civil-litigation/suggest-edit/",
  "/law-enforcement-agency/new/",
  "/law-enforcement-agency/suggest-edit/",
  "/personnel/new/",
  "/personnel/suggest-edit/",
  "/legal-notice/data-subject-access-request/",
  "/report/new/",
];

const errors = [];
const warnings = [];

const addError = (msg) => errors.push(msg);
const addWarning = (msg) => warnings.push(msg);

const toDistHtmlPath = (routePath) => {
  const clean = routePath.replace(/^\//, "");
  return path.join(DIST_DIR, clean, "index.html");
};

const readText = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const extract = (html, regex) => {
  const match = html.match(regex);
  return match ? match[1] : null;
};

const walkHtmlFiles = async (dir) => {
  const results = [];
  const dirs = [dir];

  while (dirs.length > 0) {
    const currentDir = dirs.pop();
    if (!currentDir) {
      continue;
    }
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        dirs.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        results.push(fullPath);
      }
    }
  }

  return results;
};

const normalizeRouteFromDistHtml = (htmlPath) => {
  const rel = path.relative(DIST_DIR, htmlPath).replaceAll(path.sep, "/");
  if (rel === "index.html") {
    return "/";
  }
  if (rel.endsWith("/index.html")) {
    return `/${rel.slice(0, -"/index.html".length)}/`;
  }
  return `/${rel}`;
};

const ensureRobotsAndSitemap = async () => {
  const robotsPath = path.join(DIST_DIR, "robots.txt");
  const robots = await readText(robotsPath);
  if (!robots) {
    addError("Missing dist/robots.txt.");
    return;
  }
  if (!/User-agent:\s*\*/i.test(robots)) {
    addError("robots.txt missing 'User-agent: *'.");
  }
  if (!/Allow:\s*\//i.test(robots)) {
    addError("robots.txt missing 'Allow: /'.");
  }
  if (
    !new RegExp(
      `Sitemap:\\s*${CANONICAL_HOST.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/sitemap-index\\.xml`,
      "i",
    ).test(robots)
  ) {
    addError(
      `robots.txt sitemap line should point to ${CANONICAL_HOST}/sitemap-index.xml.`,
    );
  }

  const hasSitemapIndex = await readText(
    path.join(DIST_DIR, "sitemap-index.xml"),
  );
  const hasSitemap = await readText(path.join(DIST_DIR, "sitemap.xml"));
  if (!hasSitemapIndex && !hasSitemap) {
    addError(
      "Missing sitemap output (dist/sitemap-index.xml or dist/sitemap.xml).",
    );
  }
};

const auditHtml = async () => {
  const htmlFiles = await walkHtmlFiles(DIST_DIR);
  if (htmlFiles.length === 0) {
    addError("No HTML files found in dist/. Run build first.");
    return;
  }
  const htmlFilesToAudit = htmlFiles.slice(0, Math.max(1, MAX_PAGES));
  if (htmlFiles.length > htmlFilesToAudit.length) {
    addWarning(
      `Audited ${htmlFilesToAudit.length} of ${htmlFiles.length} HTML files. Set SEO_AUDIT_MAX_PAGES higher for full coverage.`,
    );
  }

  const noindexSet = new Set(EXPECTED_NOINDEX_PATHS);

  for (const htmlPath of htmlFilesToAudit) {
    const html = await readText(htmlPath);
    if (!html) {
      addError(`Could not read HTML file: ${htmlPath}`);
      continue;
    }

    const route = normalizeRouteFromDistHtml(htmlPath);
    const title = extract(html, /<title>([^<]+)<\/title>/i);
    const canonical = extract(
      html,
      /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i,
    );
    const robots = extract(
      html,
      /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/i,
    );
    const description = extract(
      html,
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i,
    );

    if (!title || !title.trim()) {
      addError(`Missing <title> for ${route}`);
    }
    if (!canonical) {
      addError(`Missing canonical link for ${route}`);
    } else if (!canonical.startsWith(CANONICAL_HOST + "/")) {
      addError(
        `Canonical host is not ${CANONICAL_HOST} for ${route}: ${canonical}`,
      );
    }
    if (!robots) {
      addError(`Missing robots meta for ${route}`);
    }

    if (noindexSet.has(route)) {
      if (!robots || !/noindex\s*,\s*follow/i.test(robots)) {
        addError(`Expected noindex,follow on form page ${route}`);
      }
    }

    if (route.startsWith("/report/") && route.includes("/watch/")) {
      if (!/"@type"\s*:\s*"VideoObject"/i.test(html)) {
        addError(`Watch page missing VideoObject structured data: ${route}`);
      }
      if (!description || !description.trim()) {
        addWarning(`Watch page missing meta description: ${route}`);
      }
    }
  }
};

const main = async () => {
  const distExists = await fs
    .stat(DIST_DIR)
    .then((s) => s.isDirectory())
    .catch(() => false);

  if (!distExists) {
    addError("dist/ does not exist. Run npm run build first.");
  } else {
    await ensureRobotsAndSitemap();
    await auditHtml();
  }

  if (warnings.length) {
    console.log("SEO audit warnings:");
    for (const w of warnings) {
      console.log(`- ${w}`);
    }
  }

  if (errors.length) {
    console.error("SEO audit failed:");
    for (const e of errors) {
      console.error(`- ${e}`);
    }
    process.exit(1);
  }

  console.log("SEO audit passed.");
};

main().catch((error) => {
  console.error("SEO audit crashed:", error?.message || error);
  process.exit(1);
});
