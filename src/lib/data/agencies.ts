import { withDb } from "#src/lib/db.js";
import type { AgencyFinderResult } from "./types.js";
type AgencyFinderRow = {
  entity_id: string;
  payload: {
    agency?: {
      id: string;
      name: string;
      state: string;
      administrativeArea: string;
      city: string | null;
      postalCode: string | null;
      path: string;
    };
  };
};
const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

const compareNullable = (left?: string | null, right?: string | null) =>
  nameCollator.compare(left || "", right || "");

const requireText = (value: unknown, fieldName: string, agencyId: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Agency ${agencyId} is missing required ${fieldName}`);
  }
  return text;
};

export const loadAgencyFinderResults = async (): Promise<
  AgencyFinderResult[]
> => {
  const agencies = await withDb(async (client): Promise<AgencyFinderRow[]> => {
    return (
      await client.query(
        `select
           entity_id,
           payload
         from public.build_page_payload
         where page_type = 'agency'`,
      )
    ).rows;
  });

  const results: AgencyFinderResult[] = agencies.map((agency) => {
    const payload = agency.payload?.agency;
    const id = requireText(agency.entity_id || payload?.id, "id", "unknown");

    return {
      id,
      name: requireText(payload?.name, "name", id),
      state: requireText(payload?.state, "state", id),
      administrativeArea: requireText(
        payload?.administrativeArea,
        "location administrative_area",
        id,
      ),
      administrativeAreaSlug: null,
      city: payload?.city || null,
      zipCode: payload?.postalCode || null,
      canonicalPath: requireText(payload?.path, "canonicalPath", id),
    };
  });

  results.sort((a, b) => {
    const nameCompare = nameCollator.compare(a.name, b.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return compareNullable(a.id, b.id);
  });

  return results;
};
