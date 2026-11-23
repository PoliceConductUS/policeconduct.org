import { withDb } from "#src/lib/db.js";
import contract from "./annotation-contract.json" with { type: "json" };
import {
  annotationFromRecord,
  annotationRecordLabel,
  type AnnotationEntry,
} from "./annotation-values.js";
import type { PoolClient } from "pg";

type Row = Record<string, unknown>;
type Owner = { url: string | null; label: string };
const parent: Record<string, [string, string]> = {
  AgencyPersonnel: ["Personnel", "personnel_id"],
  AuthorityLicense: ["LicensingAuthority", "licensing_authority_id"],
  License: ["Personnel", "personnel_id"],
  LicenseAction: ["License", "license_id"],
  PersonnelEducation: ["Personnel", "personnel_id"],
  PersonnelPhoto: ["Personnel", "personnel_id"],
  Discipline: ["Personnel", "personnel_id"],
  DisciplineAgencyPersonnel: ["AgencyPersonnel", "agency_personnel_id"],
  CoverageLinkAgencyPersonnel: ["AgencyPersonnel", "agency_personnel_id"],
  AgencyPhoneNumber: ["Agency", "agency_id"],
  CivilCasePersonnel: ["CivilCase", "civil_case_id"],
  CivilCaseLink: ["CivilCase", "civil_case_id"],
  ReviewPersonnel: ["Review", "review_id"],
  ReviewLink: ["Review", "review_id"],
  ArrestProfile: ["AgencyPersonnel", "agency_personnel_id"],
  AgencyArrestProfile: ["Agency", "agency_id"],
  LocationPathGeometry: ["LocationPath", "location_path_id"],
  LocationPathAlias: ["LocationPath", "location_path_id"],
};
function required(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`Annotation owner requires ${field}.`);
  return value;
}

export async function collectDataAnnotations(
  client: PoolClient,
): Promise<AnnotationEntry[]> {
  const owners = new Map<string, Promise<Owner | null>>();
  async function owner(
    kind: string,
    id: string,
    supplied?: Row,
  ): Promise<Owner | null> {
    const key = `${kind}:${id}`;
    const cached = owners.get(key);
    if (cached) return cached;
    const result = resolveOwner(kind, id, supplied);
    owners.set(key, result);
    return result;
  }
  async function resolveOwner(
    kind: string,
    id: string,
    supplied?: Row,
  ): Promise<Owner | null> {
    const descriptor = contract.records.find((record) => record.kind === kind);
    if (!descriptor) throw new Error(`Unknown annotation owner kind ${kind}.`);
    const row =
      supplied ??
      (
        await client.query(
          `select * from ${descriptor.table} where ${descriptor.primaryKey} = $1`,
          [id],
        )
      ).rows[0];
    if (!row) throw new Error(`Missing annotation owner ${kind}:${id}.`);
    const relationship = parent[kind];
    if (relationship)
      return owner(
        relationship[0],
        required(row[relationship[1]], relationship[1]),
      );
    if (kind === "Personnel") {
      // NO_PERSONNEL only stops personnel pages from being built, so there is
      // no page to link to.
      return {
        url: (process.env.NO_PERSONNEL || "").trim()
          ? null
          : `/personnel/${required(row.slug, "slug")}/`,
        label: [row.first_name, row.middle_name, row.last_name, row.suffix]
          .filter(Boolean)
          .join(" "),
      };
    }
    if (kind === "LocationPath")
      return {
        url: required(row.path, "path"),
        label: required(row.display_name, "display_name"),
      };
    if (kind === "LicensingAuthority") {
      const location = await owner(
        "LocationPath",
        required(row.location_path_id, "location_path_id"),
      );
      if (!location?.url || !/^\/[^/]+\/$/.test(location.url))
        throw new Error(`Authority ${id} requires a state path.`);
      return {
        url: `${location.url}licensing-authority/`,
        label: required(row.name, "name"),
      };
    }
    if (kind === "FederalAgency")
      return {
        url: `/federal/${required(row.slug, "slug")}/`,
        label: required(row.name, "name"),
      };
    if (kind === "CivilCase")
      return {
        url: `/civil-cases/${required(row.slug, "slug")}/`,
        label: required(row.title, "title"),
      };
    if (kind === "Agency" || kind === "Review") {
      const pageType = kind === "Agency" ? "agency" : "report_summary";
      const paths = (
        await client.query<{ path: string }>(
          "select path from public.build_page_payload where entity_id=$1 and page_type=$2",
          [id, pageType],
        )
      ).rows;
      if (paths.length > 1)
        throw new Error(`Expected at most one public page for ${kind}:${id}.`);
      const label =
        kind === "Agency"
          ? required(row.name, "name")
          : required(row.title, "title");
      // A record without a built page has no link.
      if (!paths.length) return { url: null, label };
      if (kind === "Agency") {
        const location = await owner(
          "LocationPath",
          required(row.location_path_id, "location_path_id"),
        );
        if (!location?.url)
          throw new Error(`Agency ${id} requires a location path.`);
        return {
          url: `${location.url}${required(row.slug, "slug")}/`,
          label,
        };
      }
      return { url: paths[0].path, label };
    }
    // A coverage link has no page of its own and the database records no
    // single display record for it, so its notes carry no record link.
    if (kind === "CoverageLink")
      return { url: null, label: required(row.title, "title") };
    throw new Error(`No public annotation owner for ${kind}:${id}.`);
  }
  const entries: AnnotationEntry[] = [];
  const rows = (
    await client.query(
      "select * from public.data_annotation where status = 'active' order by id",
    )
  ).rows;
  for (const row of rows) {
    const annotation = annotationFromRecord(row);
    const kind = required(row.subject_kind, "subject_kind");
    const id = required(row.subject_id, "subject_id");
    const target = await owner(kind, id);
    if (!target) continue;
    let recordUrl = target.url;
    if (
      ["LocationPath", "LocationPathGeometry", "LocationPathAlias"].includes(
        kind,
      )
    ) {
      const { rows } = await client.query<{ eligible: boolean }>(
        "select exists(select 1 from public.build_page_payload where page_type='location' and path=$1) as eligible",
        [recordUrl],
      );
      // A location without a built page has no link.
      if (!rows[0].eligible) recordUrl = null;
    }
    entries.push({
      ...annotation,
      canonical_id: id,
      entity_kind: kind,
      record_url: recordUrl,
      record_label: annotationRecordLabel({
        ...annotation,
        record_label: target.label,
      }),
      source_provider: annotation.source_namespace,
    });
  }
  const order = (entry: AnnotationEntry) =>
    [
      entry.source_namespace,
      entry.entity_kind,
      entry.canonical_id,
      entry.field,
      entry.type,
      entry.source_record_id,
      entry.message,
    ].join("\u0000");
  return entries.sort((a, b) =>
    order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0,
  );
}
let collected: Promise<AnnotationEntry[]> | undefined;
export function loadDataAnnotations() {
  collected ??= withDb(collectDataAnnotations).catch((error: unknown) => {
    collected = undefined;
    throw error;
  });
  return collected;
}
