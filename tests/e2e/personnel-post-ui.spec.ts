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
const previousTimezone = process.env.TZ;
test.beforeAll(async () => {
  process.env.TZ = "America/Los_Angeles";
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"]) {
    dotenv.config({ path, override: true, quiet: true });
  }
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});
test.afterAll(async () => {
  await client.end();
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
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

const detailedDiscipline = {
  id: "detailed",
  action: "Suspension",
  effectiveDate: "2025-01-02",
  expirationDate: "2026-02-03",
  caseNumber: "PB 25-004",
  documentUrl: "https://example.org/order.pdf",
  allegation: "Recorded allegation",
  violation: "Recorded rule",
  finding: "Recorded finding",
  chiefAction: "Recorded chief action",
  sanction: "Recorded penalty",
  authority: {
    name: "Minnesota Board of Peace Officer Standards and Training",
    abbreviation: "MN POST",
    href: "/mn/licensing-authority/",
  },
  agencies: [
    { id: "agency-1", name: "First Police Department" },
    { id: "agency-2", name: "Second Police Department" },
  ],
};

test("discipline keeps direct records with no agency link and separates findings from allegations", async ({
  page,
}) => {
  await page.setContent(
    await renderComponent("PersonnelDiscipline", {
      records: [
        detailedDiscipline,
        {
          ...detailedDiscipline,
          id: "unlinked",
          action: "Reprimand",
          effectiveDate: null,
          expirationDate: null,
          caseNumber: null,
          documentUrl: null,
          allegation: null,
          violation: null,
          finding: null,
          chiefAction: null,
          sanction: null,
          agencies: [],
        },
      ],
    }),
  );
  await expect(page.locator("[data-personnel-discipline-id]")).toHaveCount(2);
  const detailed = page.locator('[data-personnel-discipline-id="detailed"]');
  await expect(detailed).toContainText("Suspension");
  await expect(detailed.getByRole("link", { name: "MN POST" })).toHaveAttribute(
    "href",
    "/mn/licensing-authority/",
  );
  await expect(
    detailed.getByRole("link", { name: "Source document" }),
  ).toHaveAttribute("href", "https://example.org/order.pdf");
  for (const text of [
    "Jan 2, 2025",
    "PB 25-004",
    "First Police Department",
    "Second Police Department",
  ]) {
    await expect(detailed.getByText(text, { exact: true })).toBeVisible();
  }
  await expect(detailed.getByText("Recorded finding")).not.toBeVisible();
  await detailed.locator("summary").focus();
  await page.keyboard.press("Enter");
  for (const text of [
    "Feb 3, 2026",
    "Recorded allegation",
    "Recorded rule",
    "Recorded finding",
    "Recorded chief action",
    "Recorded penalty",
  ]) {
    await expect(detailed.getByText(text, { exact: true })).toBeVisible();
  }
  const unlinked = page.locator('[data-personnel-discipline-id="unlinked"]');
  await expect(unlinked).toContainText("Reprimand");
  await expect(unlinked.locator("details")).toHaveCount(0);
  await expect(unlinked).not.toContainText(/Agency|Unknown|not available/);
});

const courses = Array.from({ length: 12 }, (_, index) => ({
  id: `course-${index}`,
  name: index === 11 ? "Late Search Target" : `Course ${index}`,
  completionDate: index === 0 ? "2025-01-02" : null,
  credits: index === 0 ? "0" : null,
  sponsorName: index === 11 ? "Special Sponsor" : null,
  sponsorInstructor: index === 11 ? "Instructor Example" : null,
}));

test("education browses ten records, searches the full collection, and preserves zero credits", async ({
  page,
}) => {
  await page.setContent(
    await renderComponent("PersonnelEducation", { records: courses }),
  );
  await expect(page.locator("[data-education-id]:visible")).toHaveCount(10);
  await expect(
    page
      .locator('[data-education-id="course-0"]')
      .getByText("Credits", { exact: true })
      .locator("..")
      .locator("dd"),
  ).toHaveText("0");
  await expect(page.locator('[data-education-id="course-0"]')).toContainText(
    "Jan 2, 2025",
  );
  const search = page.getByRole("searchbox", { name: /Search courses/i });
  await search.fill("late search target");
  await expect(page.locator('[data-education-id="course-11"]')).toBeVisible();
  await expect(page.locator("[data-education-status]")).toHaveText(
    "Showing 1–1 of 1 courses",
  );
  await search.fill("special sponsor");
  await expect(page.locator("[data-education-id]:visible")).toHaveCount(1);
  await expect(page.locator('[data-education-id="course-11"]')).toBeVisible();
  await search.fill("instructor example");
  await expect(page.locator('[data-education-id="course-11"]')).toBeVisible();
  await search.fill("absent course");
  await expect(page.getByText("No matching courses.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator("[data-education-id]:visible")).toHaveCount(10);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator("[data-education-id]:visible")).toHaveCount(2);
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.locator("[data-education-id]:visible")).toHaveCount(10);
});

test("education remains fully readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.setContent(
      await renderComponent("PersonnelEducation", { records: courses }),
    );
    await expect(page.locator("[data-education-id]:visible")).toHaveCount(12);
  } finally {
    await context.close();
  }
});

test("live profile shows directly owned discipline and every education record", async ({
  page,
}) => {
  const {
    rows: [person],
  } = await client.query<{
    slug: string;
    discipline_id: string;
    discipline_action: string;
    discipline_document: string;
    education_count: string;
  }>(`
    select p.slug, d.id as discipline_id, d.action as discipline_action,
      d.document_url as discipline_document,
      (select count(*) from public.personnel_education e where e.personnel_id = p.id) as education_count
    from public.personnel p
    join public.discipline d on d.personnel_id = p.id
    where d.document_url is not null
      and exists (select 1 from public.personnel_education e where e.personnel_id = p.id)
    order by p.id limit 1
  `);
  expect(person).toBeTruthy();
  await page.goto(`/personnel/${person.slug}/`, {
    waitUntil: "domcontentloaded",
  });
  const discipline = page.locator(
    `[data-personnel-discipline-id="${person.discipline_id}"]`,
  );
  await expect(discipline).toContainText(person.discipline_action);
  await expect(
    discipline.getByRole("link", { name: "Source document" }),
  ).toHaveAttribute("href", person.discipline_document);
  await expect(page.locator("[data-education-id]")).toHaveCount(
    Number(person.education_count),
  );
});

test("live profile without courses omits the education section", async ({
  page,
}) => {
  const {
    rows: [person],
  } = await client.query<{ slug: string }>(`
    select p.slug from public.personnel p
    where exists (select 1 from public.agency_personnel ap where ap.personnel_id = p.id)
      and not exists (select 1 from public.personnel_education e where e.personnel_id = p.id)
    order by p.id limit 1
  `);
  expect(person).toBeTruthy();
  await page.goto(`/personnel/${person.slug}/`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Education & training" }),
  ).toHaveCount(0);
  await expect(page.locator("[data-education-id]")).toHaveCount(0);
});
