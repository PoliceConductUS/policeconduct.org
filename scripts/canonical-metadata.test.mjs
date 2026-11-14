import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { build } from "astro";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const siteUrl of ["https://pr-19.preview.policeconduct.org", undefined]) {
  test(`built canonical metadata uses production with SITE_URL=${siteUrl}`, async () => {
    const previousReleaseId = process.env.RELEASE_ID;
    const releaseId = siteUrl
      ? "pr-19-11111111-1111-4111-8111-111111111111"
      : "prod-22222222-2222-4222-8222-222222222222";
    process.env.RELEASE_ID = releaseId;
    const previousSiteUrl = process.env.SITE_URL;
    if (siteUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = siteUrl;

    await mkdir(path.join(root, ".cache"), { recursive: true });
    const fixture = await mkdtemp(
      path.join(root, ".cache/canonical-metadata-"),
    );
    try {
      await mkdir(path.join(fixture, "src/pages/about"), { recursive: true });
      await writeFile(
        path.join(fixture, "src/pages/about/index.astro"),
        `---
import SiteLayout from "#src/layouts/SiteLayout.astro";
---
<SiteLayout title="Canonical fixture" canonicalUrl="/about/">Fixture</SiteLayout>
`,
      );
      await build({
        root: fixture,
        configFile: false,
        site: "https://www.policeconduct.org",
        build: { inlineStylesheets: "never" },
        vite: { resolve: { alias: { "#src": path.join(root, "src") } } },
      });
      const html = await readFile(
        path.join(fixture, "dist/about/index.html"),
        "utf8",
      );
      assert.equal(
        html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],
        "https://www.policeconduct.org/about/",
      );
      assert.equal(
        html.match(/<meta property="og:url" content="([^"]+)"/)?.[1],
        "https://www.policeconduct.org/about/",
      );
      assert.equal(
        html.match(/<html[^>]* data-release-id="([^"]+)"/)?.[1],
        releaseId,
      );
      execFileSync(process.execPath, [
        path.join(root, "scripts/validate-no-inline-css.mjs"),
        path.join(fixture, "dist"),
      ]);
    } finally {
      if (previousReleaseId === undefined) delete process.env.RELEASE_ID;
      else process.env.RELEASE_ID = previousReleaseId;
      if (previousSiteUrl === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = previousSiteUrl;
      await rm(fixture, { recursive: true, force: true });
    }
  });
}
