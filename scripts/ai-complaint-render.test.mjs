import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { transform } from "@astrojs/compiler-rs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

test("renders escaped allegations, date-only citation and separate procedural context", async () => {
  const source = new URL(
    "../src/components/AiComplaintSummary.astro",
    import.meta.url,
  );
  const directory = new URL("../.cache/summary-render-test/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const compiled = await transform(await readFile(source, "utf8"), {
    filename: source.pathname,
    internalURL: "astro/compiler-runtime",
    inlineComponentAssets: true,
    resultScopedSlot: true,
    resolvePath: (specifier) => specifier,
  });
  const modulePath = new URL("component.mts", directory);
  await writeFile(modulePath, compiled.code);
  try {
    const { default: Component } = await import(modulePath.href);
    const container = await AstroContainer.create();
    const html = await container.renderToString(Component, {
      props: {
        summary: {
          summary:
            "Plaintiff alleges <script>alert('unsafe')</script> caused harm.",
          source: {
            sourcePage: "https://example.org/docket/3/",
            url: "https://example.org/complaint.pdf",
            documentNumber: "3",
            filingDate: "2025-01-02",
            retrievedAt: "2026-01-02T12:00:00Z",
            confidence: "Complaint allegations only",
            sha1: "a".repeat(40),
            sha256: "b".repeat(64),
          },
          generatedAt: "2026-01-02",
          model: "synthetic-model",
          limitations: "No findings of fact.",
          support: [{ paragraph: 1, pages: "1–2" }],
          proceduralContext: [
            {
              text: "A later motion was filed.",
              url: "https://example.org/docket/4/",
              sourceDate: "2025-02-01",
              retrievedAt: "2026-01-02T12:00:00Z",
              confidence: "Docket metadata only",
            },
          ],
        },
      },
    });
    assert.match(html, /AI-generated summary of the complaint/);
    assert.match(html, /plaintiff’s allegations/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /filed January 2, 2025/);
    assert.match(html, /href="https:\/\/example.org\/docket\/3\/"/);
    assert.match(html, /Separate procedural context/);
    assert.match(html, /A later motion was filed/);
    assert.ok(
      html.indexOf("Separate procedural context") <
        html.indexOf("A later motion was filed"),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("missing-copy and processing states give honest copy and a donation link", async () => {
  const source = new URL(
    "../src/components/ComplaintSummaryUnavailable.astro",
    import.meta.url,
  );
  const directory = new URL(
    "../.cache/unavailable-render-test/",
    import.meta.url,
  );
  await mkdir(directory, { recursive: true });
  const compiled = await transform(await readFile(source, "utf8"), {
    filename: source.pathname,
    internalURL: "astro/compiler-runtime",
    inlineComponentAssets: true,
    resultScopedSlot: true,
    resolvePath: (specifier) => specifier,
  });
  const modulePath = new URL("component.mts", directory);
  await writeFile(modulePath, compiled.code);
  try {
    const { default: Component } = await import(modulePath.href);
    const container = await AstroContainer.create();
    for (const reason of [
      null,
      "missing_copy",
      "pending",
      "retrieval_failed",
      "authentication_failed",
      "generation_failed",
    ]) {
      const html = await container.renderToString(Component, {
        props: { unavailability: reason ? { reason } : null },
      });
      assert.match(html, /href="\/donate\/"/);
      if (reason === "missing_copy")
        assert.match(html, /don’t have a copy of the complaint/);
      else
        assert.doesNotMatch(html, /don’t have a copy|complaint is unavailable/);
      assert.doesNotMatch(html, /AI-generated summary of the complaint/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
