import { promises as fs } from "node:fs";
import path from "node:path";
import {
  FORM_ROUTES,
  buildAuditRouteSelection,
  collectHtmlRoutes,
  normalizeRouteFromDistHtml,
} from "./audit-route-samples.mjs";

const DIST_DIR = path.resolve("dist");
const CANONICAL_HOST = "https://www.policeconduct.org";
const MAX_PAGES = Number(process.env.SEO_AUDIT_MAX_PAGES || "5000");
const FRESH_BUILD_REQUIRED_MESSAGE =
  "Fresh full build required. Run `npm run build` before `npm run audit` or `npm run audit:seo`. Audits do not build automatically, and stale or partial dist/ output is not supported.";

const errors = [];
const warnings = [];

const addError = (msg) => errors.push(msg);
const addWarning = (msg) => warnings.push(msg);

const toDistHtmlPath = (routePath) => {
  if (routePath === "/") {
    return path.join(DIST_DIR, "index.html");
  }
  const clean = routePath.replace(/^\//, "");
  if (clean.endsWith(".html")) {
    return path.join(DIST_DIR, clean);
  }
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

const ensureFreshBuild = async () => {
  const routes = await collectHtmlRoutes(DIST_DIR);
  if (routes.length === 0) {
    addError(`${FRESH_BUILD_REQUIRED_MESSAGE} No HTML files found in dist/.`);
    return false;
  }

  const { missingRequiredRoutes } = buildAuditRouteSelection({
    routes,
    maxRoutes: 1,
  });
  if (missingRequiredRoutes.length > 0) {
    addError(
      `${FRESH_BUILD_REQUIRED_MESSAGE} Missing required built routes: ${missingRequiredRoutes.join(", ")}.`,
    );
    return false;
  }

  const robotsExists = await readText(path.join(DIST_DIR, "robots.txt"));
  const sitemapIndexExists = await readText(
    path.join(DIST_DIR, "sitemap-index.xml"),
  );
  const sitemapExists = await readText(path.join(DIST_DIR, "sitemap.xml"));

  if (!robotsExists || (!sitemapIndexExists && !sitemapExists)) {
    addError(
      `${FRESH_BUILD_REQUIRED_MESSAGE} Required generated files are missing from dist/ (robots.txt and sitemap output).`,
    );
    return false;
  }

  return true;
};

const auditHtml = async () => {
  const routes = await collectHtmlRoutes(DIST_DIR);
  if (routes.length === 0) {
    addError("No HTML files found in dist/. Run build first.");
    return;
  }

  const { allRoutes, effectiveMax, missingRequiredRoutes, selectedRoutes } =
    buildAuditRouteSelection({
      routes,
      maxRoutes: Math.max(1, MAX_PAGES),
    });

  for (const message of missingRequiredRoutes) {
    addError(`Audit route selection failed: ${message}.`);
  }

  if (effectiveMax > MAX_PAGES) {
    addWarning(
      `SEO_AUDIT_MAX_PAGES=${MAX_PAGES} is lower than the required audit sample set (${effectiveMax}); auditing ${effectiveMax} routes to preserve coverage.`,
    );
  } else if (allRoutes.length > selectedRoutes.length) {
    addWarning(
      `Audited ${selectedRoutes.length} of ${allRoutes.length} HTML files. Set SEO_AUDIT_MAX_PAGES higher for broader coverage.`,
    );
  }

  const noindexSet = new Set(FORM_ROUTES);

  for (const route of selectedRoutes) {
    const htmlPath = toDistHtmlPath(route);
    const html = await readText(htmlPath);
    if (!html) {
      addError(`Could not read HTML file: ${htmlPath}`);
      continue;
    }

    const normalizedRoute = normalizeRouteFromDistHtml(DIST_DIR, htmlPath);
    const title = extract(html, /<title>([^<]+)<\/title>/i);
    const canonical = extract(
      html,
      /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i,
    );
    const robots = extract(
      html,
      /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/i,
    );
    if (!title || !title.trim()) {
      addError(`Missing <title> for ${normalizedRoute}`);
    }
    if (!canonical) {
      addError(`Missing canonical link for ${normalizedRoute}`);
    } else if (!canonical.startsWith(CANONICAL_HOST + "/")) {
      addError(
        `Canonical host is not ${CANONICAL_HOST} for ${normalizedRoute}: ${canonical}`,
      );
    }
    if (!robots) {
      addError(`Missing robots meta for ${normalizedRoute}`);
    }

    if (noindexSet.has(normalizedRoute)) {
      if (!robots || !/noindex\s*,\s*follow/i.test(robots)) {
        addError(`Expected noindex,follow on form page ${normalizedRoute}`);
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
    const freshBuildOk = await ensureFreshBuild();
    if (!freshBuildOk) {
      if (errors.length) {
        console.error("SEO audit failed:");
        for (const e of errors) {
          console.error(`- ${e}`);
        }
        process.exit(1);
      }
      return;
    }
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
