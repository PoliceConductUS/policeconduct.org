import { withDb } from "#src/lib/db.js";
import contract from "./annotation-contract.json" with { type: "json" };
import {
  annotationFromRecord,
  type AnnotationEntry,
} from "./annotation-values.js";
import { currentAssignmentSql } from "./annotation-access.js";
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
  const authorities = (
    await client.query<{
      id: string;
      name: string;
      source_namespaces: string[];
    }>("select id, name, source_namespaces from public.licensing_authority")
  ).rows;
  const providers = new Map<string, { id: string; name: string }>();
  for (const authority of authorities)
    for (const namespace of authority.source_namespaces) {
      if (providers.has(namespace))
        throw new Error(
          `Multiple licensing authorities claim source ${namespace}.`,
        );
      providers.set(namespace, authority);
    }
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
      if ((process.env.NO_PERSONNEL || "").trim()) return null;
      return {
        url: `/personnel/${required(row.slug, "slug")}/`,
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
    if (kind === "Agency") {
      const { rows } = await client.query<{ eligible: boolean }>(
        `select exists(select 1 from public.agency_personnel ap where ap.agency_id=$1 and ${currentAssignmentSql("ap")}) as eligible`,
        [id],
      );
      if (!rows[0].eligible)
        return { url: null, label: required(row.name, "name") };
    }
    if (kind === "Agency" || kind === "Review") {
      const pageType = kind === "Agency" ? "agency" : "report_summary";
      const paths = (
        await client.query<{ path: string }>(
          "select path from public.build_page_payload where entity_id=$1 and page_type=$2",
          [id, pageType],
        )
      ).rows;
      if (paths.length !== 1)
        throw new Error(`Expected one public page for ${kind}:${id}.`);
      if (kind === "Agency") {
        const location = await owner(
          "LocationPath",
          required(row.location_path_id, "location_path_id"),
        );
        if (!location?.url)
          throw new Error(`Agency ${id} requires a location path.`);
        return {
          url: `${location.url}${required(row.slug, "slug")}/`,
          label: required(row.name, "name"),
        };
      }
      return { url: paths[0].path, label: required(row.title, "title") };
    }
    if (kind === "CoverageLink") {
      const links = (
        await client.query<{ agency_personnel_id: string }>(
          "select agency_personnel_id from public.coverage_link_agency_personnel where coverage_link_id=$1 order by agency_personnel_id",
          [id],
        )
      ).rows;
      if (!links.length)
        throw new Error(`Coverage link ${id} has no public record owner.`);
      return owner("AgencyPersonnel", links[0].agency_personnel_id);
    }
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
    if (recordUrl === null) {
      const provider = providers.get(annotation.source_namespace);
      if (!provider)
        throw new Error(
          `No source authority for ${kind}:${id} from ${annotation.source_namespace}.`,
        );
      const authority = await owner("LicensingAuthority", provider.id);
      if (!authority?.url)
        throw new Error(
          `Source authority ${provider.id} requires a public page.`,
        );
      recordUrl = `${authority.url}data-annotations/`;
    }
    entries.push({
      ...annotation,
      canonical_id: id,
      entity_kind: kind,
      record_url: recordUrl,
      record_label: target.label,
      source_provider:
        providers.get(annotation.source_namespace)?.name ??
        annotation.source_namespace,
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
  collected ??= withDb(collectDataAnnotations);
  return collected;
}
