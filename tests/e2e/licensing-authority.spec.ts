import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { Client } from "pg";

let client: Client;
test.beforeAll(async () => {
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"]) {
    dotenv.config({ path, override: true, quiet: true });
  }
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});
test.afterAll(async () => {
  await client.end();
});

test("state authority resolves its identity, summaries and direct discipline", async ({
  page,
}) => {
  const {
    rows: [authority],
  } = await client.query(
    `select la.*, lp.display_name from licensing_authority la join location_path lp using (location_path_id) where lp.path = '/mn/'`,
  );
  expect(authority).toBeTruthy();
  await page.goto("/mn/licensing-authority/", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    authority.name,
  );
  await expect(
    page.getByRole("link", { name: "Official website" }),
  ).toHaveAttribute("href", authority.website);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/mn\/licensing-authority\/$/,
  );
  await expect(
    page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: authority.display_name }),
  ).toHaveAttribute("href", "/mn/");
  await expect(
    page.getByRole("heading", { name: "Licenses", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Discipline records", exact: true }),
  ).toBeVisible();
  const { rows: discipline } = await client.query(
    `select d.*, p.slug from discipline d join personnel p on p.id = d.personnel_id where d.licensing_authority_id = $1 order by d.id`,
    [authority.id],
  );
  expect(discipline.length).toBeGreaterThan(0);
  await expect(page.locator("[data-discipline-id]")).toHaveCount(
    discipline.length,
  );
  for (const record of discipline) {
    const row = page.locator(`[data-discipline-id="${record.id}"]`);
    await expect(
      row.getByRole("link", { includeHidden: true }).first(),
    ).toHaveAttribute("href", `/personnel/${record.slug}/`);
    await expect(row).toContainText(record.action);
  }
  await expect(
    page.getByRole("heading", { level: 2, name: /Education|Training/ }),
  ).toHaveCount(0);
});

test("state and personnel authority labels link internally", async ({
  page,
}) => {
  await page.goto("/tx/");
  await expect(
    page.getByRole("link", { name: "Licensing authority", exact: true }),
  ).toHaveAttribute("href", "/tx/licensing-authority/");
  const {
    rows: [person],
  } = await client.query(
    `select p.slug from license l join personnel p on p.id = l.personnel_id join authority_license al on al.id = l.authority_license_id join licensing_authority la on la.id = al.licensing_authority_id join location_path lp on lp.location_path_id = la.location_path_id where lp.path = '/mn/' order by p.id limit 1`,
  );
  expect(person).toBeTruthy();
  await page.goto(`/personnel/${person.slug}/`);
  await expect(
    page
      .locator('.personnel-license-card a[href="/mn/licensing-authority/"]')
      .first(),
  ).toBeVisible();
});

test("Texas has recorded license action summaries", async ({ page }) => {
  await page.goto("/tx/licensing-authority/");
  await expect(
    page.getByRole("heading", { name: "License actions", exact: true }),
  ).toBeVisible();
  const { rows: actions } = await client.query(
    `select a.action, count(*)::int as count from license_action a join license l on l.id = a.license_id join authority_license al on al.id = l.authority_license_id join licensing_authority la on la.id = al.licensing_authority_id join location_path lp on lp.location_path_id = la.location_path_id where lp.path = '/tx/' group by a.action`,
  );
  expect(actions.length).toBeGreaterThan(0);
  for (const action of actions) {
    const row = page
      .getByRole("region", { name: "License actions", exact: true })
      .getByRole("row")
      .filter({
        has: page.getByRole("cell", { name: action.action, exact: true }),
      });
    await expect(row.getByRole("cell").nth(1)).toHaveText(
      action.count.toLocaleString("en-US"),
    );
  }
});

test("California identity-only page has its website and no record sections", async ({
  page,
}) => {
  await page.goto("/ca/licensing-authority/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "California Commission on Peace Officer Standards and Training",
  );
  await expect(
    page.getByRole("link", { name: "Official website" }),
  ).toHaveAttribute("href", "https://post.ca.gov/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
});

test("discipline pages browse ten records locally and search the entire collection", async ({
  page,
}) => {
  await page.goto("/mn/licensing-authority/", {
    waitUntil: "domcontentloaded",
  });
  const url = page.url();
  const records = page.locator("[data-discipline-id]");
  const allIds = await records.evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-discipline-id")),
  );
  expect(allIds.length).toBeGreaterThan(10);
  const visible = page.locator("[data-discipline-id]:visible");
  await expect(visible).toHaveCount(10);
  const status = page
    .getByRole("region", { name: "Discipline records", exact: true })
    .getByRole("status");
  await expect(status).toHaveText(`Showing 1–10 of ${allIds.length} records`);
  const previous = page.getByRole("button", { name: "Previous", exact: true });
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  const seen: (string | null)[] = [];
  while (true) {
    seen.push(
      ...(await visible.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-discipline-id")),
      )),
    );
    if ((await next.getAttribute("aria-disabled")) === "true") break;
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(next).toBeFocused();
  }
  expect(seen).toEqual(allIds);
  await expect(status).toHaveText(
    `Showing ${Math.floor((allIds.length - 1) / 10) * 10 + 1}–${allIds.length} of ${allIds.length} records`,
  );
  await next.press("Enter");
  await expect(status).toContainText(`–${allIds.length} of`);
  await previous.press("Enter");
  await expect(previous).toBeFocused();
  const search = page.getByRole("searchbox", {
    name: "Search by person or case number",
  });
  const last = records.last();
  const name = await last.locator("h3 a").innerText();
  await search.fill(name.toUpperCase());
  await expect(last).toBeVisible();
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect(status).toContainText("Showing 1–");
  const caseNumber = await last
    .locator("dt")
    .filter({ hasText: /^Case number$/ })
    .evaluate((dt) => dt.nextElementSibling!.textContent!);
  await search.fill(caseNumber.toLowerCase());
  await expect(last).toBeVisible();
  await search.fill("no-such-person-or-case");
  await expect(visible).toHaveCount(0);
  await expect(status).toHaveText("No matching records.");
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(visible).toHaveCount(10);
  await expect(status).toHaveText(`Showing 1–10 of ${allIds.length} records`);
  await expect(next).toHaveAttribute("aria-disabled", "false");
  expect(page.url()).toBe(url);
  const nav = page.getByRole("navigation", { name: "Authority records" });
  for (const link of await nav.getByRole("link").all()) {
    const href = await link.getAttribute("href");
    await expect(page.locator(href!)).toBeVisible();
  }
  await expect(
    nav.getByRole("link", { name: "Discipline records" }),
  ).toHaveAttribute("href", "#discipline-heading");
});

test("without JavaScript every compact discipline summary remains accessible", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:4321/mn/licensing-authority/", {
      waitUntil: "domcontentloaded",
    });
    const all = page.locator("[data-discipline-id]");
    expect(await all.count()).toBeGreaterThan(10);
    await expect(page.locator("[data-discipline-id]:visible")).toHaveCount(
      await all.count(),
    );
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Next", exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("discipline allegations are visible with details closed and sources open in a new tab", async ({
  page,
}) => {
  const {
    rows: [record],
  } = await client.query(
    `select d.id, d.case_number, d.allegation from discipline d
     join licensing_authority la on la.id = d.licensing_authority_id
     join location_path lp on lp.location_path_id = la.location_path_id
     where lp.path = '/mn/' and d.allegation is not null
       and d.case_number is not null and d.document_url is not null
     order by d.effective_date desc, d.id limit 1`,
  );
  expect(record).toBeTruthy();
  await page.goto("/mn/licensing-authority/");
  await page
    .getByRole("searchbox", { name: "Search by person or case number" })
    .fill(record.case_number);
  const row = page.locator(`[data-discipline-id="${record.id}"]`);
  await expect(row.locator("details[open]")).toHaveCount(0);
  await expect(row.locator(".discipline-allegation dd")).toBeVisible();
  await expect(row.locator(".discipline-allegation dd")).toHaveText(
    record.allegation,
  );
  const source = row.getByRole("link", { name: "Source document" });
  await expect(source).not.toBeVisible();
  await row.locator("summary").click();
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("target", "_blank");
});
