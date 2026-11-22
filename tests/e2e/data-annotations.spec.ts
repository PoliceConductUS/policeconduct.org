import { expect, test } from "./page-fixture";
import { withDb } from "../../src/lib/db.js";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "@astrojs/compiler-rs";
import ts from "typescript";
import { experimental_AstroContainer } from "astro/container";
import type { PoolClient } from "pg";
import {
  annotationDisplay,
  annotationsCsv,
} from "../../src/lib/data/annotation-values.js";
import { currentAssignmentSql } from "../../src/lib/data/annotation-access.js";

test("current assignment SQL distinguishes open dates from unrepresentable source dates", async () => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query(`
    with assignments(id, end_date, data_source_values, start_date) as (values
      ('open', null::date, '{}'::jsonb, null::date),
      ('explicit-null', null::date, '{"end_date":{"effective_value":null}}'::jsonb, null::date),
      ('invalid', null::date, '{"end_date":{"effective_value":"not a date"}}'::jsonb, null::date),
      ('empty', null::date, '{"end_date":{"effective_value":""}}'::jsonb, null::date),
      ('ended', '2024-01-01'::date, '{}'::jsonb, '2023-01-01'::date),
      ('known-start', null::date, '{}'::jsonb, (current_timestamp at time zone 'UTC')::date),
      ('future-start', null::date, '{}'::jsonb, (current_timestamp at time zone 'UTC')::date + 1),
      ('invalid-start', null::date, '{"start_date":{"effective_value":"not a date"}}'::jsonb, null::date)
    ) select id from assignments a where ${currentAssignmentSql("a")} order by id
  `)
      ).rows,
  );
  expect(rows.map((row) => row.id)).toEqual([
    "explicit-null",
    "known-start",
    "open",
  ]);
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

test("agency findings without a public agency page stay in the index without a record link", async () => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  await withDb(async (client) => {
    await client.query("begin");
    try {
      await client.query(
        `insert into public.agency (id, slug, name, state, location_path_id, address, city, zip_code, latitude, longitude) select $1::jsonb->>'id', $1::jsonb->>'slug', $1::jsonb->>'name', a.state, a.location_path_id, a.address, a.city, a.zip_code, a.latitude, a.longitude from public.agency a limit 1`,
        [
          JSON.stringify({
            id: "annotation-no-page-fixture",
            slug: "annotation-no-page-fixture",
            name: "Fixture agency without assignments",
          }),
        ],
      );
      for (const producer of ["manual", "fixture.no-page", "intake"]) {
        await client.query(
          `insert into public.data_annotation (id, subject_kind, subject_id, type, field, value, message, source_namespace, source_record_id, producer_namespace, producer_record_id, status)
           values ($1, 'Agency', 'annotation-no-page-fixture', 'error', 'contact_email', '"invalid"'::jsonb, 'Invalid source email', 'fixture.no-page', 'fixture-1', $2, 'fixture-1', 'active')`,
          [`annotation-fixture-${producer}`, producer],
        );
      }
      await client.query(
        `insert into public.data_annotation (id, subject_kind, subject_id, type, field, value, message, source_namespace, source_record_id, producer_namespace, producer_record_id, status)
         values ('annotation-fixture-resolved', 'Agency', 'annotation-no-page-fixture', 'error', 'contact_email', '"resolved"'::jsonb, 'Resolved finding', 'fixture.no-page', 'fixture-2', 'manual', 'fixture-2', 'resolved')`,
      );
      const entries = await collectDataAnnotations(client);
      const unlisted = (
        await client.query(
          `select a.id, count(*)::int as count from public.agency a join public.data_annotation da on da.subject_kind='Agency' and da.subject_id=a.id and da.status='active' where not exists (select 1 from public.build_page_payload p where p.page_type='agency' and p.entity_id=a.id) group by a.id`,
        )
      ).rows;
      for (const agency of unlisted) {
        const findings = entries.filter(
          (entry) =>
            entry.entity_kind === "Agency" && entry.canonical_id === agency.id,
        );
        expect(findings).toHaveLength(agency.count);
        for (const finding of findings) expect(finding.record_url).toBeNull();
      }
      expect(
        entries.filter(
          (entry) => entry.canonical_id === "annotation-no-page-fixture",
        ),
      ).toHaveLength(3);
      expect(
        entries.some((entry) => entry.message === "Resolved finding"),
      ).toBe(false);
      const finding = entries.find(
        (entry) => entry.canonical_id === "annotation-no-page-fixture",
      );
      expect(finding).toMatchObject({
        record_label: "Fixture agency without assignments",
        source_record_id: "fixture-1",
        value: "invalid",
      });
      expect(finding?.record_url).toBeNull();
    } finally {
      await client.query("rollback");
    }
  });
});

test("the conventional favicon URL serves the existing icon", async ({
  request,
}) => {
  const response = await request.get("/favicon.ico");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/");
  expect((await response.body()).length).toBeGreaterThan(0);
});

test("agency email lists render individual addresses without pairing them with a name", async ({
  page,
}) => {
  const agencies = await withDb(
    async (client) =>
      (
        await client.query(
          `select a.contact_email, a.contact_name, lp.path || a.slug || '/' as path from public.agency a join public.location_path lp on lp.location_path_id=a.location_path_id where a.contact_email like '%;%' and a.contact_name is not null and exists (select 1 from public.build_page_payload p where p.page_type='agency' and p.entity_id=a.id) order by a.id limit 1`,
        )
      ).rows,
  );
  expect(agencies).toHaveLength(1);
  const agency = agencies[0];
  await page.goto(agency.path);
  const addresses = agency.contact_email
    .split(";")
    .map((value: string) => value.trim());
  const contacts = page.locator(".entity-contact-email");
  await expect(contacts.locator("a")).toHaveCount(addresses.length);
  for (const address of addresses)
    await expect(contacts.locator(`a[href="mailto:${address}"]`)).toHaveText(
      address,
    );
  await expect(page.locator(".entity-contact-person a")).toHaveCount(0);
  const nodes = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.flatMap((script) => {
        const data = JSON.parse(script.textContent || "{}");
        return data["@graph"] || [data];
      }),
    );
  expect(
    nodes.find((node) => node["@type"] === "GovernmentOrganization").email,
  ).toEqual(addresses);
});

test("active native annotations render in the public index and CSV", async ({
  page,
  request,
}) => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  const entries = await withDb(collectDataAnnotations);
  expect(entries.length).toBeGreaterThan(0);
  await page.goto("/data-annotations/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,follow",
  );
  await expect(page.locator("main")).not.toHaveAttribute("data-pagefind-body");
  await expect(page.locator("main")).toHaveAttribute(
    "data-pagefind-ignore",
    "all",
  );
  await expect(page.locator('footer a[href="/data-annotations/"]')).toHaveText(
    "Data notes",
  );

  const rows = page.locator("main table tbody tr");
  await expect(rows).toHaveCount(Math.min(entries.length, 50));
  await expect(rows.first()).toContainText(entries[0].message);
  await expect(rows.first()).toContainText(entries[0].source_record_id);
  const csv = await request.get("/data-annotations/data.csv");
  expect(csv.ok()).toBe(true);
  const exported = await csv.text();
  expect(exported).toContain(entries[0].message.replaceAll('"', '""'));
  const locations = entries.filter(
    (entry) => entry.field === "location_path_id",
  );
  expect(locations.length).toBeGreaterThan(0);
  expect(exported).toContain("location_path_id");
  for (const entry of locations) {
    expect(exported).not.toContain(String(entry.replacement_value));
  }
});

const renderAnnotationFixture = async (
  componentPath: string,
  pagePath: string,
  entries: unknown[],
  rejectAnnotationLoad = false,
) => {
  const directory = await mkdtemp(join(tmpdir(), "annotation-shell-"));
  try {
    const compile = async (
      name: string,
      source: string,
      resolvePath: (specifier: string) => string,
    ) => {
      const compiled = transform(
        source.replace(
          /(["'])(#src\/[^"']+)\1/g,
          (_match, quote, id) => `${quote}${resolvePath(id)}${quote}`,
        ),
        {
          internalURL: import.meta.resolve("astro/compiler-runtime"),
          resultScopedSlot: true,
          resolvePath,
        },
      );
      const path = join(directory, `${name}.mjs`);
      await writeFile(
        path,
        ts.transpile(compiled.code, {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
        }),
      );
      return pathToFileURL(path).href;
    };
    // Render actual components; substitute unrelated chrome and database I/O
    // so synthetic evidence never enters a database.
    const chrome = await compile("chrome", "<slot />", (id) => id);
    const notes = await compile(
      "notes",
      await readFile(
        new URL("../../src/components/DataAnnotations.astro", import.meta.url),
        "utf8",
      ),
      (id) =>
        id === "#src/lib/data/annotation-values.js"
          ? new URL("../../src/lib/data/annotation-values.js", import.meta.url)
              .href
          : id,
    );
    await writeFile(join(directory, "entries.json"), JSON.stringify(entries));
    const loaderPath = join(directory, "loader.mjs");
    await writeFile(
      loaderPath,
      rejectAnnotationLoad
        ? 'export const loadDataAnnotations = async () => []; throw new Error("Shared chrome must not depend on record annotations");'
        : 'import entries from "./entries.json" with { type: "json" }; export const loadDataAnnotations = async () => entries;',
    );
    const loader = pathToFileURL(loaderPath).href;
    const shell = await compile(
      "shell",
      await readFile(
        new URL(`../../${componentPath}`, import.meta.url),
        "utf8",
      ),
      (id) =>
        id === "#src/lib/data/data-annotations.js"
          ? loader
          : id === "#src/components/DataAnnotations.astro"
            ? notes
            : id.startsWith("#src/")
              ? chrome
              : id,
    );
    const { default: component } = await import(shell);
    const container = await experimental_AstroContainer.create();
    return await container.renderToString(component, {
      props: {
        title: "Fixture",
        pagePath,
        recordPath: pagePath,
        breadcrumbs: [],
        heading: "Fixture",
      },
      slots: { default: "<p>Listing content</p>" },
    });
  } finally {
    await rm(directory, { recursive: true });
  }
};

test("shared chrome renders without any record-annotation dependency", async () => {
  const html = await renderAnnotationFixture(
    "src/layouts/PageShell.astro",
    "/tx/licensing-authority/data-annotations/",
    [],
    true,
  );
  expect(html).toContain("Listing content");
  expect(html).not.toContain("Source data annotations");
});

for (const noPersonnel of ["", "1"]) {
  test(`authority exclusions respect NO_PERSONNEL=${JSON.stringify(noPersonnel)} in the common HTML and CSV collector`, async () => {
    const { collectDataAnnotations } =
      await import("../../src/lib/data/data-annotations");
    const records = ["Personnel", "Agency"].map((kind) => ({
      id: `synthetic-${kind}`,
      subject_kind: "LicensingAuthority",
      subject_id: "synthetic-board",
      type: "warning",
      field: "excluded_records",
      value: { kind, key: `synthetic-${kind}-source` },
      message: "Excluded source record",
      source_namespace: "synthetic.provider",
      source_record_id: `synthetic-${kind}-source`,
      producer_namespace: "manual",
      producer_record_id: `synthetic-${kind}-source`,
      status: "active",
      replacement_value: null,
      evidence: null,
    }));
    const client = {
      query: async (sql: string, values?: string[]) => {
        if (sql.startsWith("select * from public.data_annotation"))
          return { rows: records };
        if (
          sql.startsWith("select * from public.licensing_authority") &&
          values?.[0] === "synthetic-board"
        )
          return {
            rows: [
              {
                id: "synthetic-board",
                name: "Synthetic board",
                location_path_id: "synthetic-state",
              },
            ],
          };
        if (
          sql.startsWith("select * from public.location_path") &&
          values?.[0] === "synthetic-state"
        )
          return {
            rows: [
              {
                location_path_id: "synthetic-state",
                path: "/tx/",
                display_name: "Texas",
              },
            ],
          };
        throw new Error(`Unexpected fixture query: ${sql}`);
      },
    } as unknown as PoolClient;
    const previous = process.env.NO_PERSONNEL;
    try {
      process.env.NO_PERSONNEL = noPersonnel;
      const entries = await collectDataAnnotations(client);
      expect(entries.map((entry) => entry.source_record_id).sort()).toEqual(
        noPersonnel
          ? ["synthetic-Agency-source"]
          : ["synthetic-Agency-source", "synthetic-Personnel-source"],
      );
      const csv = annotationsCsv(entries);
      expect(csv).toContain("synthetic-Agency-source");
      if (noPersonnel) expect(csv).not.toContain("synthetic-Personnel-source");
      else expect(csv).toContain("synthetic-Personnel-source");
    } finally {
      if (previous === undefined) delete process.env.NO_PERSONNEL;
      else process.env.NO_PERSONNEL = previous;
    }
  });
}

for (const [type, label] of [
  ["warning", "Our warning"],
  ["error", "Data error"],
  ["correction", "Our correction"],
]) {
  test(`record-page ${type} annotations show only their label and message`, async ({
    page,
  }) => {
    await page.setContent(
      await renderAnnotationFixture(
        "src/components/RecordDataNotes.astro",
        "/personnel/synthetic/",
        [
          {
            field: "end_date",
            value: "reported-value-1999",
            type,
            message: "Synthetic finding",
            source_namespace: "synthetic.provider",
            source_record_id: "synthetic-source",
            record_url: "/personnel/synthetic/",
            ...(type === "correction"
              ? { replacement_value: "replacement-value-2001" }
              : {}),
            evidence: [{ note: "synthetic-evidence-text" }],
          },
        ],
      ),
    );
    const annotations = page.getByRole("region", {
      name: "Source data annotations",
    });
    await expect(annotations.locator("li")).toHaveText(
      `${label}: Synthetic finding`,
    );
    await expect(annotations.locator("details")).toHaveCount(0);
  });
}

test("record-page excluded_records annotations hide the field name and JSON value", async ({
  page,
}) => {
  await page.setContent(
    await renderAnnotationFixture(
      "src/components/RecordDataNotes.astro",
      "/tx/licensing-authority/",
      [
        {
          field: "excluded_records",
          value: { key: "509914", kind: "Agency" },
          type: "warning",
          message: "Explicitly excluded Agency: placeholder address.",
          source_namespace: "synthetic.provider",
          source_record_id: "509914",
          record_url: "/tx/licensing-authority/",
        },
      ],
    ),
  );
  await expect(
    page.getByRole("region", { name: "Source data annotations" }).locator("li"),
  ).toHaveText(
    "Excluded record: Explicitly excluded Agency: placeholder address.",
  );
});

test("licensing authority pages list no annotations and link to their paginated data-annotations page", async ({
  page,
  request,
}) => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  const byAuthority = Map.groupBy(
    (await withDb(collectDataAnnotations)).filter(
      (entry) => entry.entity_kind === "LicensingAuthority",
    ),
    (entry) => entry.record_url,
  );
  const [authorityUrl, filed] = [...byAuthority].find(
    ([url, entries]) => url !== null && entries.length > 50,
  )!;
  expect(authorityUrl).toMatch(/^\/[a-z-]+\/licensing-authority\/$/);
  await page.goto(authorityUrl!);
  await expect(
    page.getByRole("region", { name: "Source data annotations" }),
  ).toHaveCount(0);
  await expect(
    page.locator(`main a[href="${authorityUrl}data-annotations/"]`),
  ).toHaveCount(1);
  await page.goto(`${authorityUrl}data-annotations/`);
  await expect(page.locator("main table tbody tr")).toHaveCount(50);
  await expect(
    page.locator('nav[aria-label="Data notes pages"] a[href$="/page/2/"]'),
  ).toHaveCount(1);
  const csv = await (
    await request.get(`${authorityUrl}data-annotations/data.csv`)
  ).text();
  for (const entry of filed) expect(csv).toContain(entry.source_record_id);
});

test("authority data-note index lists only notes on that authority and exports them all", async ({
  page,
  request,
}) => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  const entries = await withDb(collectDataAnnotations);
  const owned = entries.filter(
    (entry) => entry.entity_kind === "LicensingAuthority" && entry.record_url,
  );
  expect(owned.length).toBeGreaterThan(0);
  const authorityUrl = owned[0].record_url!;
  const notes = owned.filter((entry) => entry.record_url === authorityUrl);
  const index = `${authorityUrl}data-annotations/`;
  await page.goto(index);
  await expect(page.locator("main table tbody tr")).toHaveCount(
    Math.min(50, notes.length),
  );
  await expect(
    page.getByRole("region", { name: "Source data annotations" }),
  ).toHaveCount(0);
  const csv = await request.get(`${index}data.csv`);
  expect(csv.ok()).toBe(true);
  const exported = await csv.text();
  for (const note of notes) expect(exported).toContain(note.source_record_id);
});

test("record notes select only their exact canonical path and omit an empty section", async () => {
  const entry = {
    field: "end_date",
    value: "invalid",
    type: "warning",
    message: "Matching record finding",
    source_namespace: "synthetic.provider",
    source_record_id: "synthetic-source",
    record_url: "/tx/licensing-authority/",
  };
  const html = await renderAnnotationFixture(
    "src/components/RecordDataNotes.astro",
    "/tx/licensing-authority/",
    [
      entry,
      {
        ...entry,
        message: "Other record finding",
        record_url: "/or/licensing-authority/",
      },
    ],
  );
  expect(html).toContain("Matching record finding");
  expect(html).not.toContain("Other record finding");
  const empty = await renderAnnotationFixture(
    "src/components/RecordDataNotes.astro",
    "/tx/licensing-authority/",
    [{ ...entry, record_url: "/tx/licensing-authority/data-annotations/" }],
  );
  expect(empty).not.toContain("Source data annotations");
});

test("canonical record pages explicitly render their collected source notes", async ({
  page,
}) => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  const entries = await withDb(collectDataAnnotations);
  const recordEntries = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    if (
      entry.record_url &&
      !entry.record_url.endsWith("/data-annotations/") &&
      entry.entity_kind !== "LicensingAuthority" &&
      !recordEntries.has(entry.entity_kind)
    )
      recordEntries.set(entry.entity_kind, entry);
  }
  expect(recordEntries.size).toBeGreaterThan(0);
  for (const entry of recordEntries.values()) {
    await page.goto(entry.record_url!);
    const annotations = page.getByRole("region", {
      name: "Source data annotations",
    });
    await expect(annotations).toHaveCount(1);
    await expect(annotations).toContainText(annotationDisplay(entry).message);
  }
});

test("location findings link only to built location pages and otherwise carry no link", async () => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  await withDb(async (client) => {
    const entries = await collectDataAnnotations(client);
    const locations = entries.filter((entry) =>
      ["LocationPath", "LocationPathGeometry", "LocationPathAlias"].includes(
        entry.entity_kind,
      ),
    );
    expect(locations.length).toBeGreaterThan(0);
    const paths = new Set(
      (
        await client.query(
          "select path from public.build_page_payload where page_type='location'",
        )
      ).rows.map((row) => row.path),
    );
    for (const entry of locations) {
      expect(entry.record_url === null || paths.has(entry.record_url)).toBe(
        true,
      );
    }
  });
});
