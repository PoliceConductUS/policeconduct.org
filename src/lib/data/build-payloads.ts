import { withDb } from "#src/lib/db.js";

export type LocationChildPayload = {
  childCount: number;
  coverage: LocationCoveragePayload;
  directAgency?: LocationAgencyPayload | null;
  kind?: string | null;
  label: string;
  mapPoint?: LocationMapPoint | null;
  nextDetail?: string | null;
  nextLabel?: string | null;
  nextPath?: string | null;
  path: string;
};

export type LocationMapBounds = {
  maxLat: number;
  maxLng: number;
  minLat: number;
  minLng: number;
};

export type LocationMapPoint = {
  lat: number;
  lng: number;
};

export type LocationAgencyPayload = {
  address?: string | null;
  administrativeArea?: string | null;
  city?: string | null;
  civilCases: number;
  id: string;
  mapPoint?: LocationMapPoint | null;
  name: string;
  path: string;
  personnel: number;
  reports: number;
  slug: string;
};

export type LocationCoveragePayload = {
  agencies: number;
  civilCases: number;
  personnel: number;
  reports: number;
};

export type LocationPagePayload = {
  administrativeArea?: string | null;
  administrativeAreaKind?: string | null;
  administrativeAreaPlural?: string | null;
  administrativeAreaSlug?: string | null;
  agencies?: LocationAgencyPayload[];
  children?: LocationChildPayload[];
  coverage: LocationCoveragePayload;
  displayName: string;
  level: "state" | "administrative_area" | "place";
  mapBounds?: LocationMapBounds | null;
  mapPositionSource?: "geocoded" | "derived_from_children" | null;
  pageType: "location";
  parentPath?: string | null;
  path: string;
  state: string;
  stateLabel: string;
};

export type BuildPayloadRow<TPayload> = {
  path: string;
  pageType: string;
  entityId: string | null;
  payload: TPayload;
};

let locationPayloadCache: Promise<LocationPagePayload[]> | null = null;

export const loadLocationBuildPayloads = async () => {
  locationPayloadCache ??= withDb(async (client) => {
    const rows = (
      await client.query(
        `
          select path, entity_id, payload
          from public.build_page_payload
          where page_type = 'location'
          order by path
        `,
      )
    ).rows;

    return rows.map((row: any) => row.payload as LocationPagePayload);
  });

  return locationPayloadCache;
};
