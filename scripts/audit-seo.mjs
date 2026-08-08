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
const SITEMAP_HEAD_BYTES = 8192;
const SITEMAP_HEAD_BYTES_FALLBACK = 65536;
const SITEMAP_CONCURRENCY = Number(
  process.env.SEO_AUDIT_SITEMAP_CONCURRENCY || "128",
);
const SITEMAP_SAMPLE_LIMIT = 10;
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

const stripTrailingSlash = (value) =>
  value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;

const normalizeUrlForCompare = (rawUrl) => {
  const hostNormalized = rawUrl.replace(
    /^https?:\/\/(www\.)?policeconduct\.org/i,
    CANONICAL_HOST,
  );
  return stripTrailingSlash(hostNormalized);
};

function* extractLocsSync(xmlText) {
  const re = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = re.exec(xmlText)) !== null) {
    yield match[1];
  }
}

// Async generator: yields every <loc> URL across the sitemap set without
// ever holding more than one sitemap file's text (or the small index file)
// in memory at a time. The ~170k individual URLs are streamed one-by-one
// to the caller rather than collected into an array.
const collectSitemapUrls = async function* () {
  const indexPath = path.join(DIST_DIR, "sitemap-index.xml");
  const indexText = await readText(indexPath);

  if (indexText) {
    const childUrls = [...extractLocsSync(indexText)];
    if (childUrls.length === 0) {
      addError("sitemap-index.xml contains no child <sitemap><loc> entries.");
      return;
    }
    for (const childUrl of childUrls) {
      let fileName;
      try {
        fileName = path.basename(new URL(childUrl).pathname);
      } catch {
        addError(
          `sitemap-index.xml has an unparseable sitemap URL: ${childUrl}`,
        );
        continue;
      }
      const childPath = path.join(DIST_DIR, fileName);
      const childText = await readText(childPath);
      if (!childText) {
        addError(
          `sitemap-index.xml references ${fileName}, but dist/${fileName} was not found.`,
        );
        continue;
      }
      yield* extractLocsSync(childText);
    }
    return;
  }

  const singleText = await readText(path.join(DIST_DIR, "sitemap.xml"));
  if (singleText) {
    yield* extractLocsSync(singleText);
    return;
  }

  addError(
    "No sitemap found for sitemap-hygiene audit (dist/sitemap-index.xml or dist/sitemap.xml).",
  );
};

const processWithConcurrency = async (iterable, limit, worker) => {
  const iterator =
    typeof iterable[Symbol.asyncIterator] === "function"
      ? iterable[Symbol.asyncIterator]()
      : iterable[Symbol.iterator]();

  const runWorker = async () => {
    for (;;) {
      const { value, done } = await iterator.next();
      if (done) {
        return;
      }
      await worker(value);
    }
  };

  await Promise.all(Array.from({ length: limit }, runWorker));
};

const readHeadChunk = async (fileHandle) => {
  const buffer = Buffer.alloc(SITEMAP_HEAD_BYTES);
  const { bytesRead } = await fileHandle.read(buffer, 0, SITEMAP_HEAD_BYTES, 0);
  let head = buffer.toString("utf8", 0, bytesRead);
  if (!head.includes("</head>") && bytesRead === SITEMAP_HEAD_BYTES) {
    const bigBuffer = Buffer.alloc(SITEMAP_HEAD_BYTES_FALLBACK);
    const bigRead = await fileHandle.read(
      bigBuffer,
      0,
      SITEMAP_HEAD_BYTES_FALLBACK,
      0,
    );
    head = bigBuffer.toString("utf8", 0, bigRead.bytesRead);
  }
  return head;
};

const auditSitemapHygiene = async () => {
  const violations = {
    noFile: [],
    redirectStub: [],
    noindex: [],
    notSelfCanonical: [],
  };
  const uniqueViolatingUrls = new Set();
  let totalChecked = 0;
  const seenUrls = new Set();

  const recordViolation = (type, url) => {
    violations[type].push(url);
    uniqueViolatingUrls.add(url);
  };

  const checkSitemapUrl = async (rawUrl) => {
    if (seenUrls.has(rawUrl)) {
      return;
    }
    seenUrls.add(rawUrl);
    totalChecked += 1;

    let routePath;
    try {
      routePath = new URL(rawUrl).pathname;
    } catch {
      addError(`Sitemap contains an unparseable URL: ${rawUrl}`);
      return;
    }

    const htmlPath = toDistHtmlPath(routePath);

    let fileHandle;
    try {
      fileHandle = await fs.open(htmlPath, "r");
    } catch {
      recordViolation("noFile", rawUrl);
      return;
    }

    try {
      const head = await readHeadChunk(fileHandle);

      const hasHtmlTag = /<html[\s>]/i.test(head);
      const hasMetaRefresh = /<meta[^>]+http-equiv=["']refresh["']/i.test(head);
      if (!hasHtmlTag || hasMetaRefresh) {
        recordViolation("redirectStub", rawUrl);
      }

      const robotsMatch = head.match(
        /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i,
      );
      if (robotsMatch && /noindex/i.test(robotsMatch[1])) {
        recordViolation("noindex", rawUrl);
      }

      const canonicalMatch = head.match(
        /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
      );
      if (canonicalMatch) {
        const normalizedCanonical = normalizeUrlForCompare(canonicalMatch[1]);
        const normalizedSitemapUrl = normalizeUrlForCompare(rawUrl);
        if (normalizedCanonical !== normalizedSitemapUrl) {
          recordViolation("notSelfCanonical", rawUrl);
        }
      }
    } finally {
      await fileHandle.close();
    }
  };

  await processWithConcurrency(
    collectSitemapUrls(),
    Math.max(1, SITEMAP_CONCURRENCY),
    checkSitemapUrl,
  );

  const reportGroup = (label, message, urls) => {
    if (urls.length === 0) {
      return;
    }
    addError(
      `Sitemap hygiene: ${urls.length} URL(s) ${message}. Samples: ${urls
        .slice(0, SITEMAP_SAMPLE_LIMIT)
        .join(", ")}${urls.length > SITEMAP_SAMPLE_LIMIT ? ", ..." : ""}`,
    );
  };

  reportGroup(
    "noFile",
    "have no built page (sitemap URL has no built page)",
    violations.noFile,
  );
  reportGroup(
    "redirectStub",
    "are redirect stubs (sitemap URL is a redirect stub)",
    violations.redirectStub,
  );
  reportGroup(
    "noindex",
    "are noindex (sitemap URL is noindex)",
    violations.noindex,
  );
  reportGroup(
    "notSelfCanonical",
    "are not self-canonical (sitemap URL is not self-canonical)",
    violations.notSelfCanonical,
  );

  console.log(
    `Sitemap hygiene: checked ${totalChecked} unique sitemap URL(s); ${uniqueViolatingUrls.size} unique URL(s) had at least one violation ` +
      `(no-file: ${violations.noFile.length}, redirect-stub: ${violations.redirectStub.length}, ` +
      `noindex: ${violations.noindex.length}, not-self-canonical: ${violations.notSelfCanonical.length}).`,
  );
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
    await auditSitemapHygiene();
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
