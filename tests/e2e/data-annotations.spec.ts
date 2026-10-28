import { expect, test } from "@playwright/test";
import { withDb } from "../../src/lib/db.js";
import {
  annotationsEnabled,
  currentAssignmentSql,
} from "../../src/lib/data/annotation-access.js";

test("current assignment SQL distinguishes open dates from unrepresentable source dates", async () => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query(`
    with assignments(id, end_date, data_source_values) as (values
      ('open', null::date, '{}'::jsonb),
      ('explicit-null', null::date, '{"end_date":{"effective_value":null}}'::jsonb),
      ('invalid', null::date, '{"end_date":{"effective_value":"not a date"}}'::jsonb),
      ('empty', null::date, '{"end_date":{"effective_value":""}}'::jsonb),
      ('ended', '2024-01-01'::date, '{}'::jsonb)
    ) select id from assignments a where ${currentAssignmentSql("a")} order by id
  `)
      ).rows,
  );
  expect(rows.map((row) => row.id)).toEqual(
    annotationsEnabled
      ? ["explicit-null", "open"]
      : ["empty", "explicit-null", "invalid", "open"],
  );
});

test("personnel profiles show reported dates without calculated tenure", async ({
  page,
}) => {
  await page.goto("/personnel/james-markham-v-7635c7/");
  await expect(
    page.getByText("Total Time as Officer", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Reported duration:/)).toHaveCount(0);
  await expect(page.locator(".personnel-profile-aside")).toBeVisible();
});
