import { expect, test } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "@astrojs/compiler-rs";
import { experimental_AstroContainer } from "astro/container";
import dotenv from "dotenv";
import { Client } from "pg";
import ts from "typescript";

let client: Client;
test.beforeAll(async () => {
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"])
    dotenv.config({ path, override: true, quiet: true });
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});
test.afterAll(async () => {
  await client.end();
});

const renderComponent = async (
  name: string,
  props: Record<string, unknown>,
) => {
  const source = await readFile(
    new URL(`../../src/components/${name}.astro`, import.meta.url),
    "utf8",
  );
  const compiled = transform(source, {
    internalURL: import.meta.resolve("astro/compiler-runtime"),
    resultScopedSlot: true,
    resolvePath: (specifier) => specifier,
  });
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

test("arrest profile loader retains exact assignment, source and all breakdowns", async () => {
  const { loadArrestProfilesForPersonnel } =
    await import("../../src/lib/data/arrest-profiles");
  const {
    rows: [row],
  } =
    await client.query(`select ap.*, personnel.id as personnel_id, a.name, lp.path || a.slug || '/' as href
    from public.arrest_profile ap join public.agency_personnel assignment on assignment.id = ap.agency_personnel_id
    join public.personnel personnel on personnel.id = assignment.personnel_id
    join public.agency a on a.id = assignment.agency_id
    join public.location_path lp on lp.location_path_id = a.location_path_id
    where personnel.slug = 'nicholas-carter-41fa56'`);
  const profiles = await loadArrestProfilesForPersonnel(row.personnel_id);
  expect(profiles).toHaveLength(1);
  expect(profiles[0]).toMatchObject({
    id: row.id,
    assignmentId: row.agency_personnel_id,
    coverage: row.coverage,
    breakdowns: row.breakdowns,
    agency: { name: row.name, href: row.href },
  });
  expect(await loadArrestProfilesForPersonnel("no-such-personnel")).toEqual([]);
});

test("personnel page displays every recorded arrest row and share", async ({
  page,
}) => {
  const {
    rows: [row],
  } = await client.query(`select ap.* from public.arrest_profile ap
    join public.agency_personnel assignment on assignment.id = ap.agency_personnel_id
    join public.personnel p on p.id = assignment.personnel_id where p.slug = 'nicholas-carter-41fa56'`);
  await page.goto("/personnel/nicholas-carter-41fa56/");
  const section = page.locator("#arrest-records");
  await expect(
    section.getByRole("heading", { name: "Arrest records", exact: true }),
  ).toBeVisible();
  await expect(section).toContainText(row.coverage.source);
  await expect(section).toContainText(row.coverage.firstMonth);
  await expect(section).toContainText(row.coverage.lastMonth);
  for (const [key, buckets] of Object.entries(row.breakdowns)) {
    const table = section.locator(`table[data-breakdown="${key}"]`);
    expect(await table.locator("tbody tr").count()).toBe(
      Object.keys(buckets as object).length,
    );
    for (const [label, count] of Object.entries(
      buckets as Record<string, number>,
    )) {
      const cells = table.locator("tbody tr").filter({
        has: page.getByRole("rowheader", {
          name: label,
          exact: true,
          includeHidden: true,
        }),
      });
      await expect(cells).toContainText(count.toLocaleString("en-US"));
      await expect(cells).toContainText(
        `${((count / row.coverage.totalArrests) * 100).toFixed(1)}%`,
      );
    }
  }
  await expect(
    section.getByRole("link", {
      name: "Irving Police Department",
      exact: true,
    }),
  ).toHaveAttribute("href", /\/irving\/[^/]+\/$/);
  const {
    rows: [absent],
  } =
    await client.query(`select p.slug from public.personnel p join public.agency_personnel assignment on assignment.personnel_id=p.id
    where not exists (select 1 from public.arrest_profile ap join public.agency_personnel a on a.id=ap.agency_personnel_id where a.personnel_id=p.id) limit 1`);
  await page.goto(`/personnel/${absent.slug}/`);
  await expect(page.locator("#arrest-records")).toHaveCount(0);
});

test("death notice links the optional source and omits an absent source", async ({
  page,
}) => {
  await page.setContent(
    await renderComponent("PersonnelDeceasedNotice", {
      message: "Recorded death notice",
      source: "https://example.org/source",
    }),
  );
  await expect(
    page.getByRole("link", { name: "Death source" }),
  ).toHaveAttribute("href", "https://example.org/source");
  await page.setContent(
    await renderComponent("PersonnelDeceasedNotice", {
      message: "Recorded death notice",
      source: null,
    }),
  );
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(page.locator("body")).toContainText("Recorded death notice");
});

test("recorded name and former agency label retain exact license relationship", async ({
  page,
}) => {
  const {
    rows: [person],
  } =
    await client.query(`select p.* from public.personnel p where p.middle_name is not null and p.last_name is not null
 and exists(select 1 from public.agency_personnel a where a.personnel_id=p.id)
 and not exists(select 1 from public.agency_personnel a where a.personnel_id=p.id and a.end_date is null) limit 1`);
  await page.goto(`/personnel/${person.slug}/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    [
      person.prefix,
      person.first_name,
      person.middle_name,
      person.last_name,
      person.suffix,
    ]
      .filter(Boolean)
      .join(" "),
  );
  await expect(page.locator(".personnel-current-line")).toContainText(
    "Most recent agency:",
  );
  const { rows: assignments } = await client.query(
    `select a.id, a.license_id, al.name from public.agency_personnel a join public.license l on l.id=a.license_id join public.authority_license al on al.id=l.authority_license_id where a.personnel_id=$1`,
    [person.id],
  );
  expect(assignments.length).toBeGreaterThan(0);
  for (const assignment of assignments) {
    const link = page.locator(
      `[data-agency-assignment-id="${assignment.id}"] a[href="#license-${assignment.license_id}"]`,
    );
    await expect(link).toHaveText(assignment.name);
    await expect(
      page.locator(`[id="license-${assignment.license_id}"]`),
    ).toHaveCount(1);
  }
});

test("Arrests metric links available assignment records and omits action for absent profiles", async ({
  page,
}) => {
  await page.goto("/personnel/nicholas-carter-41fa56/");
  const metric = page
    .locator(".entity-metric-cell")
    .filter({ has: page.locator(".ledger-label", { hasText: /^Arrests$/ }) });
  await expect(metric.locator(".ledger-value")).toHaveText("Available");
  await expect(metric.locator(".ledger-meta")).toHaveText(
    "Recorded counts by agency assignment",
  );
  await expect(
    metric.getByRole("link", { name: "View records", exact: true }),
  ).toHaveAttribute("href", "#arrest-records");
  const {
    rows: [absent],
  } = await client.query(
    `select p.slug from public.personnel p where exists(select 1 from public.agency_personnel a where a.personnel_id=p.id) and not exists(select 1 from public.arrest_profile profile join public.agency_personnel a on a.id=profile.agency_personnel_id where a.personnel_id=p.id) limit 1`,
  );
  await page.goto(`/personnel/${absent.slug}/`);
  await expect(metric.locator(".ledger-value")).toHaveText("--");
  await expect(metric.locator(".ledger-meta")).toHaveCount(0);
  await expect(metric.getByRole("link")).toHaveCount(0);
});

test("mobile arrest tables show every column without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/personnel/nicholas-carter-41fa56/");
  const section = page.locator("#arrest-records");
  await expect(section).toBeVisible();
  await section
    .locator("details")
    .evaluateAll((details) =>
      details.forEach((detail) => detail.setAttribute("open", "")),
    );
  const tables = section.locator("table");
  expect(await tables.count()).toBe(7);
  for (const table of await tables.all()) {
    const size = await table.evaluate((element) => {
      const container = element.parentElement!;
      return {
        scroll: container.scrollWidth,
        width: container.clientWidth,
        cells: [...element.querySelectorAll("th, td")].map((cell) => ({
          right: cell.getBoundingClientRect().right,
          font: Number.parseFloat(getComputedStyle(cell).fontSize),
        })),
      };
    });
    expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
    expect(
      size.cells.every((cell) => cell.right <= 390 && cell.font >= 16),
    ).toBe(true);
  }
});
