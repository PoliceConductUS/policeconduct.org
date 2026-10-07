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

test("agency projections include only agencies with current personnel", async () => {
  const { rows } = await client.query(`
    with expected as (
      select a.id, lp.path || a.slug || '/' as path
      from public.agency a
      join public.location_path lp on lp.location_path_id = a.location_path_id
      join public.location_path area on area.location_path_id = lp.parent_location_path_id and area.level = 'administrative_area'
      join public.location_path state on state.location_path_id = area.parent_location_path_id and state.level = 'state'
      where exists (select 1 from public.agency_personnel ap where ap.agency_id = a.id and ap.end_date is null)
    ), actual as (
      select entity_id as id, path from public.build_page_payload where page_type = 'agency'
    )
    select * from (select * from expected except select * from actual) missing
    union all
    select * from (select * from actual except select * from expected) unexpected
  `);
  expect(rows).toEqual([]);
});
test("agency without current personnel is omitted from place navigation", async ({
  page,
}) => {
  const {
    rows: [agency],
  } = await client.query(`
    select a.id, a.name, lp.path, lp.path || a.slug || '/' as href
    from public.agency a join public.location_path lp on lp.location_path_id = a.location_path_id
    where not exists (select 1 from public.agency_personnel ap where ap.agency_id = a.id and ap.end_date is null)
      and exists (select 1 from public.agency other where other.location_path_id = a.location_path_id
        and exists
          (select 1 from public.agency_personnel ap where ap.agency_id = other.id and ap.end_date is null))
    order by a.id limit 1
  `);
  expect(agency).toBeDefined();
  await page.goto(agency.path);
  await expect(
    page.locator(`#civic-jump option[value="${agency.href}"]`),
  ).toHaveCount(0);
});
test("report keeps authored description and displays distinct narrative fields", async ({
  page,
}) => {
  const html = await renderComponent("ReportNarrative", {
    description: "<p>I described my experience.</p>",
    facts: {
      whatHappened: "The officer stopped me.",
      feelings: "I felt worried.",
      desiredOutcome: "I want an explanation.",
      whatElse: "My neighbor saw it.",
      purpose: "I am sharing my account.",
    },
  });
  await page.setContent(html);
  await expect(
    page.getByText("I described my experience.", { exact: true }),
  ).toBeVisible();
  for (const value of [
    "The officer stopped me.",
    "I felt worried.",
    "I want an explanation.",
    "My neighbor saw it.",
    "I am sharing my account.",
  ])
    await expect(page.getByText(value, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How it felt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Requested outcome" }),
  ).toBeVisible();
  const dedup = await renderComponent("ReportNarrative", {
    description: "<p>I want an explanation.</p>",
    facts: { whatHappened: "I want an explanation." },
  });
  await page.setContent(dedup);
  await expect(
    page.getByText("I want an explanation.", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "What happened" }),
  ).toHaveCount(1);
  await page.setContent(
    await renderComponent("ReportNarrative", {
      description: "<p>I felt Angry and want an explanation.</p>",
      facts: { feelings: "Angry", desiredOutcome: "want an explanation" },
    }),
  );
  await expect(
    page.getByRole("heading", { name: "How it felt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Requested outcome" }),
  ).toBeVisible();
});
test("closed case displays ending date, incident geography and update date", async ({
  page,
}) => {
  const {
    rows: [row],
  } =
    await client.query(`select c.slug, c.date_terminated::text, lp.path, lp.display_name
    from public.civil_cases c join public.location_path lp on lp.location_path_id = c.location_path_id
    where c.date_terminated is not null and c.updated_at is not null order by c.slug limit 1`);
  expect(row).toBeDefined();
  await page.goto(`/civil-cases/${row.slug}/`);
  const closed = page
    .locator(".fact-list div")
    .filter({ has: page.locator("dt").getByText("Closed", { exact: true }) });
  await expect(closed.locator("dd")).toContainText(
    new Date(row.date_terminated + "T12:00:00Z").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }),
  );
  const incident = page.locator(".fact-list div").filter({
    has: page.locator("dt").getByText("Incident location", { exact: true }),
  });
  await expect(
    incident.getByRole("link", { name: row.display_name }),
  ).toHaveAttribute("href", row.path);
  await expect(
    page.locator(".fact-list dt").getByText("Updated", { exact: true }),
  ).toBeVisible();
});
test("coverage preserves source, publication date, notes and linked personnel", async ({
  page,
}) => {
  await page.setContent(
    await renderComponent("CoverageLinks", {
      links: [
        {
          id: "coverage-test",
          title: "Local account",
          url: "https://example.test/story",
          source_name: "Local News",
          published_at: "2026-09-01",
          notes: "Article mentions this person.",
          officers: [
            {
              slug: "sample-person",
              first_name: "Sample",
              last_name: "Person",
            },
          ],
        },
      ],
    }),
  );
  await expect(
    page.getByRole("link", { name: "Local account" }),
  ).toHaveAttribute("href", "https://example.test/story");
  await expect(page.getByText("Local News", { exact: true })).toBeVisible();
  await expect(page.getByText("Sep 1, 2026", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Article mentions this person.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sample Person" }),
  ).toHaveAttribute("href", "/personnel/sample-person/");
  await page.setContent(await renderComponent("CoverageLinks", { links: [] }));
  await expect(
    page.getByRole("heading", { name: "News coverage" }),
  ).toHaveCount(0);
});

test("report facts use current narrative columns and known update date renders", async ({
  page,
}) => {
  const { buildReportFacts } = await import("../../src/lib/report-detail");
  expect(
    buildReportFacts({
      how_felt: "I felt heard.",
      desired_outcome: "An answer.",
      what_happened: "A stop.",
      what_else: "A witness.",
      purpose: "To share.",
    }),
  ).toMatchObject({
    feelings: "I felt heard.",
    desiredOutcome: "An answer.",
    whatHappened: "A stop.",
    whatElse: "A witness.",
    purpose: "To share.",
  });
  const {
    rows: [row],
  } = await client.query(
    `select r.desired_outcome, lp.path, r.slug, to_char(r.incident_date,'YYYY/MM/DD') as day from public.reviews r join public.location_path lp on lp.location_path_id = r.location_path_id where r.desired_outcome is not null and r.updated_at is not null order by r.slug limit 1`,
  );
  expect(row).toBeDefined();
  await page.goto(`${row.path}reports/${row.day}/${row.slug}/`);
  await expect(
    page.getByRole("heading", { name: "Requested outcome" }),
  ).toBeVisible();
  await expect(
    page.getByText(row.desired_outcome, { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".fact-list dt").getByText("Updated", { exact: true }),
  ).toBeVisible();
});

test("report incident date matches the UTC date in its canonical route", async ({
  page,
}) => {
  const {
    rows: [row],
  } = await client.query(`select r.slug, r.incident_date, lp.path
    from public.reviews r join public.location_path lp on lp.location_path_id = r.location_path_id
    where r.slug = 'mn-state-patrol-lt-john-farmakes-voicemail-m0n1o2'`);
  expect(row).toBeDefined();
  const incident = new Date(row.incident_date);
  const day = incident.toISOString().slice(0, 10).replaceAll("-", "/");
  await page.goto(`${row.path}reports/${day}/${row.slug}/`);
  const fact = page.locator(".fact-list div").filter({
    has: page.locator("dt").getByText("Incident date", { exact: true }),
  });
  await expect(fact.locator("dd")).toHaveText(
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(incident),
  );
});
