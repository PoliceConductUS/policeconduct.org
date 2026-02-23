import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DIST_DIR = path.resolve("dist");
const PORT = Number(process.env.A11Y_PORT || "4173");
const HOST = "127.0.0.1";
const MAX_URLS = Number(process.env.A11Y_MAX_URLS || "200");
const BASE_URL = `http://${HOST}:${PORT}`;

const REQUIRED_ROUTES = [
  "/",
  "/report/",
  "/partner/creator/",
  "/about/contact/",
];

const SITEMAP_INDEX = path.join(DIST_DIR, "sitemap-index.xml");
const SITEMAP_SINGLE = path.join(DIST_DIR, "sitemap.xml");

const readText = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const extractLocs = (xml) => {
  if (!xml) {
    return [];
  }
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return [...new Set(matches)];
};

const mapToLocalUrl = (value) => {
  try {
    const url = new URL(value);
    return `${BASE_URL}${url.pathname}${url.search}`;
  } catch {
    if (value.startsWith("/")) {
      return `${BASE_URL}${value}`;
    }
    return `${BASE_URL}/${value}`;
  }
};

const sampleEvenly = (items, limit) => {
  if (items.length <= limit) {
    return items;
  }
  const sampled = [];
  const step = (items.length - 1) / (limit - 1);
  for (let i = 0; i < limit; i += 1) {
    sampled.push(items[Math.round(i * step)]);
  }
  return [...new Set(sampled)];
};

const startStaticServer = async () => {
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
  };

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", BASE_URL);
      let filePath = path.join(
        DIST_DIR,
        requestUrl.pathname.replace(/^\//, ""),
      );

      let stat;
      try {
        stat = await fs.stat(filePath);
      } catch {
        stat = null;
      }

      if (stat?.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      } else if (!stat) {
        const maybeIndex = path.join(
          DIST_DIR,
          requestUrl.pathname.replace(/^\//, ""),
          "index.html",
        );
        try {
          const maybeStat = await fs.stat(maybeIndex);
          if (maybeStat.isFile()) {
            filePath = maybeIndex;
          }
        } catch {
          // no-op
        }
      }

      const file = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader(
        "Content-Type",
        contentTypes[ext] || "application/octet-stream",
      );
      res.end(file);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, resolve);
  });

  return server;
};

const collectUrls = async () => {
  const sitemapIndexXml = await readText(SITEMAP_INDEX);
  const sitemapXml = await readText(SITEMAP_SINGLE);

  let rawUrls = [];
  if (sitemapIndexXml) {
    const sitemapFiles = extractLocs(sitemapIndexXml)
      .map((u) => {
        try {
          return new URL(u).pathname.replace(/^\//, "");
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .map((rel) => path.join(DIST_DIR, rel));

    for (const file of sitemapFiles) {
      const xml = await readText(file);
      rawUrls.push(...extractLocs(xml));
    }
  } else if (sitemapXml) {
    rawUrls = extractLocs(sitemapXml);
  }

  const requiredUrls = REQUIRED_ROUTES.map((route) => `${BASE_URL}${route}`);
  const localUrls = rawUrls.map(mapToLocalUrl);
  const deduped = [...new Set([...requiredUrls, ...localUrls])];
  return sampleEvenly(deduped, Math.max(1, MAX_URLS));
};

const getPathname = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const shouldIgnoreViolation = (violation) => {
  const ignorable = new Set([
    // Managed in source by intentional enhancement script use.
    "aria-dialog-name",
  ]);
  return ignorable.has(violation.id);
};

const main = async () => {
  const distOk = await fs
    .stat(DIST_DIR)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!distOk) {
    throw new Error("dist/ does not exist. Build first.");
  }

  const urls = await collectUrls();
  console.log(
    `Running headless accessibility crawl for ${urls.length} URL(s) (A11Y_MAX_URLS=${MAX_URLS}).`,
  );

  const server = await startStaticServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    const failures = [];

    for (const url of urls) {
      const page = await context.newPage();
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        if (!response || response.status() >= 400) {
          failures.push({
            url,
            type: "http",
            message: `HTTP ${response ? response.status() : "no response"}`,
          });
          continue;
        }

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();

        const violations = results.violations.filter(
          (v) => !shouldIgnoreViolation(v),
        );
        if (violations.length > 0) {
          failures.push({
            url,
            type: "axe",
            violations,
          });
        }
      } catch (error) {
        failures.push({
          url,
          type: "runtime",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await page.close();
      }
    }

    if (failures.length > 0) {
      console.error("Accessibility audit failed.");
      for (const failure of failures) {
        if (failure.type === "axe") {
          console.error(
            `- ${getPathname(failure.url)}: ${failure.violations.length} violation(s)`,
          );
          for (const violation of failure.violations) {
            console.error(
              `  - [${violation.impact || "unknown"}] ${violation.id}: ${violation.help}`,
            );
          }
        } else {
          console.error(`- ${getPathname(failure.url)}: ${failure.message}`);
        }
      }
      process.exit(1);
    }

    console.log("Accessibility audit passed.");
  } finally {
    if (browser) {
      await browser.close();
    }
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
};

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
