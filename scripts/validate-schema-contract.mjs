import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client } from "pg";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFiles = [".env", ".env-recaptcha", ".env-policeconduct"];

for (const envFile of envFiles) {
  dotenv.config({
    path: path.join(repoRoot, envFile),
    override: true,
  });
}

const requiredTables = {
  agency: {
    columns: [
      "id",
      "name",
      "slug",
      "state",
      "administrative_area",
      "administrative_area_slug",
      "city",
      "place_slug",
      "address",
      "zip_code",
      "latitude",
      "longitude",
      "created_at",
      "updated_at",
      "location_path_id",
      "agency_slug",
    ],
    notNull: ["id", "name", "slug", "state"],
    uniqueColumnSets: [["slug"]],
  },
  agency_links: {
    columns: ["id", "agency_id", "url", "label", "description"],
    notNull: ["id", "url", "label"],
  },
  agency_officers: {
    columns: [
      "id",
      "agency_id",
      "officer_id",
      "title",
      "badge_number",
      "start_date",
      "end_date",
    ],
    notNull: ["id", "officer_id"],
  },
  agency_phone_numbers: {
    columns: ["id", "agency_id", "phone_number", "created_at"],
    notNull: ["id", "phone_number"],
  },
  agency_stats: {
    columns: ["id"],
    notNull: ["id"],
  },
  agency_zip_index: {
    columns: ["postal_code", "agency_id", "relationship_type"],
    notNull: ["postal_code", "agency_id", "relationship_type"],
  },
  build_page_payload: {
    columns: [
      "path",
      "page_type",
      "entity_id",
      "payload",
      "content_hash",
      "content_updated_at",
      "generated_at",
    ],
    notNull: ["path", "page_type", "payload"],
    uniqueColumnSets: [["path"]],
  },
  civil_case_links: {
    columns: ["id", "civil_case_id", "title", "url", "created_at", "updated_at"],
    notNull: ["id", "civil_case_id", "title", "url"],
  },
  civil_case_officers: {
    columns: ["id", "civil_case_id", "agency_officer_id"],
    notNull: ["id", "civil_case_id", "agency_officer_id"],
  },
  civil_cases: {
    columns: [
      "id",
      "slug",
      "location_path_id",
      "title",
      "cause_number",
      "court",
      "filed_date",
      "claims_summary",
      "outcome",
      "primary_source_url",
      "created_at",
      "updated_at",
    ],
    notNull: ["id", "slug", "title", "cause_number"],
    uniqueColumnSets: [["slug"]],
  },
  coverage_link_agency_officers: {
    columns: ["coverage_link_id", "agency_officer_id"],
    notNull: ["coverage_link_id", "agency_officer_id"],
  },
  coverage_link_civil_cases: {
    columns: ["coverage_link_id", "civil_case_id"],
    notNull: ["coverage_link_id", "civil_case_id"],
  },
  coverage_link_reports: {
    columns: ["coverage_link_id", "review_id"],
    notNull: ["coverage_link_id", "review_id"],
  },
  coverage_links: {
    columns: [
      "id",
      "url",
      "normalized_url",
      "title",
      "source_name",
      "published_at",
      "notes",
    ],
    notNull: ["id", "url", "title"],
    uniqueColumnSets: [["normalized_url"]],
  },
  federal_agency: {
    columns: ["id", "name", "slug"],
    notNull: ["id", "name", "slug"],
    uniqueColumnSets: [["slug"]],
  },
  federal_agency_branch: {
    columns: ["federal_agency_id", "agency_id"],
    notNull: ["federal_agency_id", "agency_id"],
  },
  location_path: {
    columns: [
      "location_path_id",
      "path",
      "level",
      "state_or_territory_slug",
      "administrative_area_slug",
      "place_slug",
      "state_or_territory_name",
      "administrative_area_name",
      "place_name",
      "parent_location_path_id",
      "latitude",
      "longitude",
      "map_min_lat",
      "map_min_lng",
      "map_max_lat",
      "map_max_lng",
      "map_position_source",
      "updated_at",
    ],
    notNull: ["location_path_id", "path", "level", "state_or_territory_slug"],
    uniqueColumnSets: [["path"]],
  },
  location_path_closure: {
    columns: [
      "ancestor_location_path_id",
      "descendant_location_path_id",
      "depth",
    ],
    notNull: [
      "ancestor_location_path_id",
      "descendant_location_path_id",
      "depth",
    ],
  },
  officers: {
    columns: ["id", "slug", "first_name", "middle_name", "last_name", "suffix"],
    notNull: ["id", "slug", "first_name", "last_name"],
    uniqueColumnSets: [["slug"]],
  },
  officers_stats: {
    columns: ["id"],
    notNull: ["id"],
  },
  review_attachments: {
    columns: ["id", "review_id"],
    notNull: ["id"],
  },
  review_links: {
    columns: ["id", "review_id", "title", "url"],
    notNull: ["id", "title", "url"],
  },
  review_officers: {
    columns: ["id", "review_id", "agency_officer_id", "rating_overall"],
    notNull: ["id", "review_id", "agency_officer_id"],
  },
  review_officers_ratings: {
    columns: ["id", "review_officer_id", "trait_id", "rubric_id"],
    notNull: ["id"],
  },
  review_tags: {
    columns: ["review_id", "tag_id"],
    notNull: ["review_id", "tag_id"],
  },
  review_witnesses: {
    columns: ["id", "review_id"],
    notNull: ["id"],
  },
  reviews: {
    columns: [
      "id",
      "slug",
      "location_path_id",
      "title",
      "incident_date",
      "address",
      "latitude",
      "longitude",
      "created_at",
      "updated_at",
    ],
    notNull: ["id", "slug", "title"],
    uniqueColumnSets: [["slug"]],
  },
  rubrics: {
    columns: ["id", "description", "help"],
    notNull: ["id", "description"],
  },
  tags: {
    columns: ["id", "label"],
    notNull: ["id", "label"],
  },
  traits: {
    columns: ["id", "label"],
    notNull: ["id", "label"],
  },
};

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to validate the schema contract.");
  }
  return url;
};

const keyFor = (tableName, columnName) => `${tableName}.${columnName}`;

const formatColumnSet = (columns) => columns.join(", ");

const normalizePgArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return [];
  }
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const validate = async () => {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  try {
    const tableNames = Object.keys(requiredTables);
    const columnRows = (
      await client.query(
        `
          select table_name, column_name, is_nullable
          from information_schema.columns
          where table_schema = 'public'
            and table_name = any($1)
        `,
        [tableNames],
      )
    ).rows;

    const existingTables = new Set(columnRows.map((row) => row.table_name));
    const columns = new Map(
      columnRows.map((row) => [keyFor(row.table_name, row.column_name), row]),
    );

    const uniqueRows = (
      await client.query(
        `
          select
            table_class.relname as table_name,
            array_agg(attribute.attname order by key_position.ordinality) as columns
          from pg_index index_info
          join pg_class index_class
            on index_class.oid = index_info.indexrelid
          join pg_class table_class
            on table_class.oid = index_info.indrelid
          join pg_namespace namespace
            on namespace.oid = table_class.relnamespace
          join lateral unnest(index_info.indkey)
            with ordinality as key_position(attribute_number, ordinality)
            on true
          join pg_attribute attribute
            on attribute.attrelid = table_class.oid
           and attribute.attnum = key_position.attribute_number
          where namespace.nspname = 'public'
            and table_class.relname = any($1)
            and index_info.indisunique
          group by table_class.relname, index_class.relname
        `,
        [tableNames],
      )
    ).rows;

    const uniqueColumnSetsByTable = new Map();
    for (const row of uniqueRows) {
      const list = uniqueColumnSetsByTable.get(row.table_name) || [];
      list.push(normalizePgArray(row.columns));
      uniqueColumnSetsByTable.set(row.table_name, list);
    }

    const failures = [];

    for (const [tableName, contract] of Object.entries(requiredTables)) {
      if (!existingTables.has(tableName)) {
        failures.push(`Missing required table: public.${tableName}`);
        continue;
      }

      for (const columnName of contract.columns) {
        if (!columns.has(keyFor(tableName, columnName))) {
          failures.push(
            `public.${tableName} is missing required column ${columnName}`,
          );
        }
      }

      for (const columnName of contract.notNull || []) {
        const column = columns.get(keyFor(tableName, columnName));
        if (column && column.is_nullable !== "NO") {
          failures.push(
            `public.${tableName}.${columnName} must be NOT NULL for the build contract`,
          );
        }
      }

      for (const expectedColumns of contract.uniqueColumnSets || []) {
        const actualSets = uniqueColumnSetsByTable.get(tableName) || [];
        const hasExpectedSet = actualSets.some(
          (actualColumns) =>
            actualColumns.length === expectedColumns.length &&
            actualColumns.every(
              (columnName, index) => columnName === expectedColumns[index],
            ),
        );
        if (!hasExpectedSet) {
          failures.push(
            `public.${tableName} must have a unique constraint or primary key on (${formatColumnSet(expectedColumns)})`,
          );
        }
      }
    }

    if (failures.length) {
      console.error("Schema contract validation failed:");
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Schema contract validation passed for ${tableNames.length} public tables.`,
    );
  } finally {
    await client.end();
  }
};

try {
  await validate();
} catch (error) {
  console.error("Schema contract validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
