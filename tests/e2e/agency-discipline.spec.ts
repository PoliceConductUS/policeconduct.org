import { expect, test } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "@astrojs/compiler-rs";
import { experimental_AstroContainer } from "astro/container";
import ts from "typescript";

const renderComponent = async (
  name: string,
  props: Record<string, unknown>,
) => {
  const source = await readFile(
    new URL(`../../src/components/${name}.astro`, import.meta.url),
    "utf8",
  );
  const compiled = transform(
    source.replace(/^import "#src\/styles\/civic-ledger.css";$/m, ""),
    {
      internalURL: import.meta.resolve("astro/compiler-runtime"),
      resultScopedSlot: true,
      resolvePath: (specifier) => specifier,
    },
  );
  const code = ts.transpile(
    compiled.code.replace(/^import "<stdin>\?astro&type=style[^"\n]*";$/gm, ""),
    { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  );
  const directory = await mkdtemp(join(tmpdir(), "personnel-post-fixture-"));
  try {
    const path = join(directory, "component.mjs");
    await writeFile(path, code);
    const { default: component } = await import(pathToFileURL(path).href);
    const container = await experimental_AstroContainer.create({
      resolve: async (id) => {
        const index = Number(
          new URL(id, "https://fixture.test").searchParams.get("index"),
        );
        const script = compiled.scripts[index];
        if (
          !id.includes("type=script") ||
          script?.type !== "inline" ||
          typeof script.code !== "string"
        ) {
          throw new Error(`Unexpected fixture asset: ${id}`);
        }
        return `data:text/javascript,${encodeURIComponent(ts.transpile(script.code, { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }))}`;
      },
    });
    return `<style>${compiled.css.join("\n")}</style>${await container.renderToString(component, { props })}`;
  } finally {
    await rm(directory, { recursive: true });
  }
};

test("roster links agency-specific discipline counts and omits zero counts", async ({
  page,
}) => {
  await page.setContent(
    await renderComponent("AgencyPersonnelList", {
      employees: [
        {
          entry: {},
          officer: { first_name: "Jane", last_name: "Doe", slug: "jane-doe" },
          disciplineCount: 2,
        },
        {
          entry: {},
          officer: { first_name: "John", last_name: "Doe", slug: "john-doe" },
          disciplineCount: 1,
        },
        {
          entry: {},
          officer: { first_name: "Sam", last_name: "Doe", slug: "sam-doe" },
          disciplineCount: 0,
        },
      ],
    }),
  );
  await expect(
    page.getByRole("link", { name: "2 discipline records", exact: true }),
  ).toHaveAttribute("href", "/personnel/jane-doe/#discipline");
  await expect(
    page.getByRole("link", { name: "1 discipline record", exact: true }),
  ).toHaveAttribute("href", "/personnel/john-doe/#discipline");
  await expect(
    page
      .locator("[data-roster-item]")
      .filter({ hasText: "Doe, Sam" })
      .locator('a[href$="#discipline"]'),
  ).toHaveCount(0);
});
