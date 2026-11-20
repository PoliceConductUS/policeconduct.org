import { expect, test } from "@playwright/test";
import { buildBeatMap } from "../../src/lib/data/arrest-beats.js";
const boundary = {
  code: "21",
  name: "21",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-97, 32],
        [-96, 32],
        [-96, 33],
        [-97, 32],
      ],
    ],
  },
};
test("beat counts keep unmapped arrests and zero-count boundaries", () => {
  const map = buildBeatMap(
    [boundary, { ...boundary, code: "22", name: "North" }],
    { "21": 3, unknown: 2 },
    5,
  );
  expect(map.beats.map((b) => [b.name, b.count])).toEqual([
    ["21", 3],
    ["North", 0],
  ]);
  expect(map.unmapped).toBe(2);
  expect(map.total).toBe(5);
});
test("label anchors stay inside concave boundaries and outside holes", () => {
  const concave = {
    ...boundary,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 4],
          [3, 4],
          [3, 1],
          [1, 1],
          [1, 4],
          [0, 4],
          [0, 0],
        ],
      ],
    },
  };
  const [lat, lng] = buildBeatMap([concave], { "21": 1 }, 1).beats[0].anchor;
  expect(lat > 0 && lat < 4 && lng > 0 && lng < 4).toBe(true);
  expect(lat < 1 || lng < 1 || lng > 3).toBe(true);
  const donut = {
    ...boundary,
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0],
          ],
          [
            [1, 1],
            [3, 1],
            [3, 3],
            [1, 3],
            [1, 1],
          ],
        ],
      ],
    },
  };
  const [holeLat, holeLng] = buildBeatMap([donut], { "21": 1 }, 1).beats[0]
    .anchor;
  expect(holeLat < 1 || holeLat > 3 || holeLng < 1 || holeLng > 3).toBe(true);
});

test("missing, duplicate and unmatched boundaries fail visibly", () => {
  expect(() => buildBeatMap(undefined, { "21": 3 }, 3)).toThrow(/boundar/i);
  expect(() => buildBeatMap([boundary, boundary], { "21": 3 }, 3)).toThrow(
    /duplicate/i,
  );
  expect(() => buildBeatMap([boundary], { "22": 3 }, 3)).toThrow(/22/);
  expect(() => buildBeatMap([boundary], { "21": 3 }, 4)).toThrow(/total/i);
});
test("agency and personnel use their own counts with the same boundary evidence", () => {
  expect(buildBeatMap([boundary], { "21": 1 }, 1).total).toBe(1);
  expect(buildBeatMap([boundary], { "21": 2 }, 2).total).toBe(2);
});

test("map shows permanent beat names/counts and preserves a no-JavaScript count list", async ({
  page,
  browser,
}) => {
  const { readFile, mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const { transform } = await import("@astrojs/compiler-rs");
  const { default: ts } = await import("typescript");
  const { experimental_AstroContainer } = await import("astro/container");
  const compiled = transform(
    (await readFile("src/components/ArrestBeatMap.astro", "utf8")).replace(
      'import "leaflet/dist/leaflet.css";',
      "",
    ),
    {
      internalURL: import.meta.resolve("astro/compiler-runtime"),
      resultScopedSlot: true,
      resolvePath: (specifier) => specifier,
    },
  );
  const dir = await mkdtemp(join(tmpdir(), "beat-map-render-"));
  try {
    const path = join(dir, "component.mjs");
    await writeFile(
      path,
      ts.transpile(
        compiled.code
          .replace(/^import "<stdin>\?astro&type=style[^"\n]*";$/gm, "")
          .replace(/^import "leaflet\/dist\/leaflet.css";$/gm, ""),
        { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
      ),
    );
    const { default: component } = await import(pathToFileURL(path).href);
    const container = await experimental_AstroContainer.create({
      resolve: async (id) => {
        const index = Number(
          new URL(id, "https://fixture.test").searchParams.get("index"),
        );
        const script = compiled.scripts[index];
        if (
          !script ||
          script.type !== "inline" ||
          typeof script.code !== "string"
        )
          throw new Error("Unexpected component script");
        return `data:text/javascript,${encodeURIComponent(ts.transpile(script.code.replace(/import L from "leaflet";/, "const L = window.L;"), { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }))}`;
      },
    });
    const boundaries = [
      boundary,
      { ...boundary, code: "22", name: "22" },
      { ...boundary, code: "23", name: "23" },
    ];
    const data = buildBeatMap(
      boundaries,
      { "21": 3, "22": 3, "23": 3, unknown: 2 },
      11,
    );
    const css = await readFile("node_modules/leaflet/dist/leaflet.css", "utf8");
    const html = `<style>:root{--ipc-color-teal:#006b68;--ipc-color-paper:#fff;--ipc-color-rule:#aaa;--ipc-color-ink:#222} ${css} ${compiled.css.join("\n")}</style>${await container.renderToString(component, { props: { data, agencyName: "Example agency", firstMonth: "2024-01", lastMonth: "2024-12", source: "Example source", scope: "personnel" } })}`;
    page.on("pageerror", (error) => {
      throw error;
    });
    await page.addScriptTag({ path: "node_modules/leaflet/dist/leaflet.js" });
    await page.setContent(html);
    await expect(page.locator(".leaflet-tooltip")).toHaveText([
      "21 · 3",
      "22 · 3",
      "23 · 3",
    ]);
    await expect(
      page.locator(".leaflet-overlay-pane path.leaflet-interactive"),
    ).toHaveCount(3);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator(".leaflet-tooltip").first()).toBeVisible();
      expect(
        await page
          .locator("[data-arrest-beat-map]")
          .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
      ).toBe(true);
      await expect
        .poll(() =>
          page.locator(".leaflet-tooltip").evaluateAll((elements) => {
            const boxes = elements.map((element) =>
              element.getBoundingClientRect(),
            );
            return boxes.every((a, index) =>
              boxes
                .slice(index + 1)
                .every(
                  (b) =>
                    a.right <= b.left ||
                    b.right <= a.left ||
                    a.bottom <= b.top ||
                    b.bottom <= a.top,
                ),
            );
          }),
        )
        .toBe(true);
      await page.screenshot({
        path: `/tmp/beat-map-${width}.png`,
        fullPage: true,
      });
    }
    const context = await browser.newContext({ javaScriptEnabled: false });
    const plain = await context.newPage();
    await plain.setContent(html);
    await plain.getByText("Arrest counts by beat", { exact: true }).click();
    await expect(plain.locator(".arrest-beat-counts")).toContainText(
      "Beat 21: 3 arrests",
    );
    await expect(plain.locator(".arrest-beat-counts")).toContainText(
      "Not mapped to a patrol beat: 2 arrests",
    );
    await context.close();
  } finally {
    await rm(dir, { recursive: true });
  }
});
