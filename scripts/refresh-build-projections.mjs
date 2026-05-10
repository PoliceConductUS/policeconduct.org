import crypto from "node:crypto";
import { withDb } from "../src/lib/db.js";

const STATE_NAMES = {
  ak: "Alaska",
  al: "Alabama",
  ar: "Arkansas",
  az: "Arizona",
  ca: "California",
  co: "Colorado",
  ct: "Connecticut",
  dc: "District of Columbia",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  ia: "Iowa",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  ma: "Massachusetts",
  md: "Maryland",
  me: "Maine",
  mi: "Michigan",
  mn: "Minnesota",
  mo: "Missouri",
  ms: "Mississippi",
  mt: "Montana",
  nc: "North Carolina",
  nd: "North Dakota",
  ne: "Nebraska",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  nv: "Nevada",
  ny: "New York",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  va: "Virginia",
  vt: "Vermont",
  wa: "Washington",
  wi: "Wisconsin",
  wv: "West Virginia",
  wy: "Wyoming",
};

const stateNameFor = (slug) => {
  if (slug === "federal") return "Federal";
  return STATE_NAMES[slug] || slug.toUpperCase();
};

const trimText = (value) => String(value ?? "").trim();

const normalizePlaceLabel = (value) => trimText(value).replace(/\s+/g, " ");

const isAllCapsLabel = (value) =>
  /[A-Z]/.test(value) && value === value.toUpperCase();

const administrativeAreaKindFor = (name) => {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith("city and borough")) return "City and Borough";
  if (lowerName.endsWith("census area")) return "Census Area";
  if (lowerName.endsWith("county")) return "County";
  if (lowerName.endsWith("parish")) return "Parish";
  if (lowerName.endsWith("borough")) return "Borough";
  if (lowerName.endsWith("municipio")) return "Municipio";
  if (lowerName.endsWith("city")) return "City";
  if (name === "District of Columbia") return "District";
  throw new Error(`Unsupported county-equivalent label: ${name}`);
};

const administrativeAreaPluralFor = (kind) => {
  if (kind === "City and Borough") return "Cities and Boroughs";
  if (kind === "Census Area") return "Census Areas";
  if (kind === "County") return "Counties";
  if (kind === "Parish") return "Parishes";
  if (kind === "Borough") return "Boroughs";
  if (kind === "Municipio") return "Municipios";
  if (kind === "City") return "Cities";
  if (kind === "District") return "Districts";
  throw new Error(`Unsupported county-equivalent kind: ${kind}`);
};

const administrativeAreaPluralForState = (areas) =>
  areas.length
    ? [
        ...new Set(
          areas.map((area) =>
            administrativeAreaPluralFor(area.administrativeAreaKind),
          ),
        ),
      ].join(" and ")
    : "Counties";

const locationIdFor = (path) =>
  `loc_${crypto.createHash("sha256").update(path).digest("hex").slice(0, 24)}`;

const averageCoordinate = (items, field) => {
  const values = items
    .map((item) => item[field])
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const parseCoordinate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const boundsFor = (items) => {
  const points = items.filter(
    (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
  );
  if (!points.length) return null;

  const lats = points.map((item) => item.latitude);
  const lngs = points.map((item) => item.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max(0.02, (maxLat - minLat) * 0.18);
  const lngPad = Math.max(0.02, (maxLng - minLng) * 0.18);

  return {
    minLat: Number((minLat - latPad).toFixed(6)),
    minLng: Number((minLng - lngPad).toFixed(6)),
    maxLat: Number((maxLat + latPad).toFixed(6)),
    maxLng: Number((maxLng + lngPad).toFixed(6)),
  };
};

const contentHashFor = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const compareLabel = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
}).compare;

const requireText = (value, fieldName, id) => {
  const text = trimText(value);
  if (!text) throw new Error(`Agency ${id} is missing required ${fieldName}`);
  return text;
};

const locationPayload = ({ path, entityId, payload, contentUpdatedAt }) => ({
  path,
  page_type: "location",
  entity_id: entityId,
  payload,
  content_hash: contentHashFor(payload),
  content_updated_at: contentUpdatedAt,
});

const agencyPayload = ({ path, agency, locationPath }) => {
  const payload = {
    pageType: "agency",
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.agencySlug,
      path,
      address: agency.address || null,
      city: agency.city,
      state: agency.state,
      postalCode: agency.zipCode || null,
      locationPath,
      administrativeArea: agency.administrativeArea,
    },
  };
  return {
    path,
    page_type: "agency",
    entity_id: agency.id,
    payload,
    content_hash: contentHashFor(payload),
    content_updated_at: agency.updatedAt || agency.createdAt,
  };
};

const insertJsonRow = async (client, row) => {
  await client.query(
    `
      insert into public.build_page_payload
        (path, page_type, entity_id, payload, content_hash, content_updated_at)
      values ($1, $2, $3, $4::jsonb, $5, $6)
      on conflict (path) do update
      set page_type = excluded.page_type,
          entity_id = excluded.entity_id,
          payload = excluded.payload,
          content_hash = excluded.content_hash,
          content_updated_at = excluded.content_updated_at,
          generated_at = timezone('utc'::text, now())
    `,
    [
      row.path,
      row.page_type,
      row.entity_id,
      JSON.stringify(row.payload),
      row.content_hash,
      row.content_updated_at,
    ],
  );
};

const startedAt = Date.now();

await withDb(async (client) => {
  await client.query("begin");
  try {
    const totalAgencyCount = Number(
      (await client.query("select count(*) as count from public.agency"))
        .rows[0]?.count || 0,
    );
    const agencies = (
      await client.query(
        `
          select
            a.id,
            a.name,
            a.slug,
            a.category,
            a.state,
            a.administrative_area,
            a.administrative_area_slug,
            a.city,
            a.place_slug,
            a.address,
            a.zip_code,
            a.latitude,
            a.longitude,
            a.created_at,
            a.updated_at
          from public.agency a
          where exists (
            select 1
            from public.agency_officers ao
            where ao.agency_id = a.id
              and ao.end_date is null
          )
          or exists (
            select 1
            from public.agency_officers ao
            join public.review_officers ro
              on ro.agency_officer_id = ao.id
            where ao.agency_id = a.id
          )
          or exists (
            select 1
            from public.agency_officers ao
            join public.civil_case_officers cco
              on cco.agency_officer_id = ao.id
            where ao.agency_id = a.id
          )
          or exists (
            select 1
            from public.agency_links al
            where al.agency_id = a.id
          )
          or exists (
            select 1
            from public.federal_agency_branch fab
            where fab.agency_id = a.id
          )
          or exists (
            select 1
            from public.agency_officers ao
            join public.coverage_link_agency_officers coverage_officer
              on coverage_officer.agency_officer_id = ao.id
            where ao.agency_id = a.id
          )
          order by lower(a.state), lower(a.administrative_area),
            lower(a.city), lower(a.name), a.id
        `,
      )
    ).rows.map((agency) => {
      const id = requireText(agency.id, "id", "unknown");
      const stateSlug = requireText(agency.state, "state", id).toLowerCase();
      const administrativeArea = requireText(
        agency.administrative_area,
        "administrative_area",
        id,
      );
      const city = normalizePlaceLabel(requireText(agency.city, "city", id));
      return {
        id,
        name: requireText(agency.name, "name", id),
        agencySlug: requireText(agency.slug, "slug", id),
        state: requireText(agency.state, "state", id),
        stateSlug,
        administrativeArea,
        administrativeAreaKind: administrativeAreaKindFor(administrativeArea),
        administrativeAreaSlug: requireText(
          agency.administrative_area_slug,
          "administrative_area_slug",
          id,
        ).toLowerCase(),
        city,
        placeSlug: requireText(
          agency.place_slug,
          "place_slug",
          id,
        ).toLowerCase(),
        address: trimText(agency.address) || null,
        zipCode: trimText(agency.zip_code).slice(0, 5) || null,
        latitude: parseCoordinate(agency.latitude),
        longitude: parseCoordinate(agency.longitude),
        createdAt: agency.created_at,
        updatedAt: agency.updated_at,
      };
    });

    const states = new Map();

    for (const agency of agencies) {
      let state = states.get(agency.stateSlug);
      if (!state) {
        state = {
          id: locationIdFor(`/${agency.stateSlug}/`),
          level: "state",
          state: agency.stateSlug,
          stateLabel: stateNameFor(agency.stateSlug),
          path: `/${agency.stateSlug}/`,
          areas: new Map(),
          agencies: [],
          updatedAt: agency.updatedAt || agency.createdAt,
        };
        states.set(agency.stateSlug, state);
      }
      state.agencies.push(agency);
      if (agency.updatedAt > state.updatedAt)
        state.updatedAt = agency.updatedAt;

      let area = state.areas.get(agency.administrativeAreaSlug);
      if (!area) {
        const path = `/${agency.stateSlug}/${agency.administrativeAreaSlug}/`;
        area = {
          id: locationIdFor(path),
          level: "administrative_area",
          state: agency.stateSlug,
          stateLabel: state.stateLabel,
          administrativeArea: agency.administrativeArea,
          administrativeAreaKind: agency.administrativeAreaKind,
          administrativeAreaSlug: agency.administrativeAreaSlug,
          path,
          parentId: state.id,
          places: new Map(),
          agencies: [],
          updatedAt: agency.updatedAt || agency.createdAt,
        };
        state.areas.set(agency.administrativeAreaSlug, area);
      }
      area.agencies.push(agency);
      if (agency.updatedAt > area.updatedAt) area.updatedAt = agency.updatedAt;

      let place = area.places.get(agency.placeSlug);
      if (!place) {
        const path = `${area.path}${agency.placeSlug}/`;
        place = {
          id: locationIdFor(path),
          level: "place",
          state: agency.stateSlug,
          stateLabel: state.stateLabel,
          administrativeArea: agency.administrativeArea,
          administrativeAreaKind: agency.administrativeAreaKind,
          administrativeAreaSlug: agency.administrativeAreaSlug,
          place: agency.city,
          placeSlug: agency.placeSlug,
          path,
          parentId: area.id,
          agencies: [],
          updatedAt: agency.updatedAt || agency.createdAt,
        };
        area.places.set(agency.placeSlug, place);
      } else if (isAllCapsLabel(place.place) && !isAllCapsLabel(agency.city)) {
        place.place = agency.city;
      }
      place.agencies.push(agency);
      agency.locationPathId = place.id;
      agency.locationPath = place.path;
      agency.canonicalPath = `${place.path}${agency.agencySlug}/`;
      if (agency.updatedAt > place.updatedAt)
        place.updatedAt = agency.updatedAt;
    }

    await client.query("update public.agency set location_path_id = null");
    await client.query("delete from public.build_page_payload");
    await client.query("delete from public.agency_zip_index");
    await client.query("delete from public.location_path_closure");
    await client.query("delete from public.location_path");

    const locations = [];
    for (const state of states.values()) {
      const areas = [...state.areas.values()].sort((a, b) =>
        compareLabel(a.administrativeArea, b.administrativeArea),
      );
      state.administrativeAreaPlural = administrativeAreaPluralForState(areas);
      locations.push(state);
      for (const area of areas) {
        const places = [...area.places.values()].sort((a, b) =>
          compareLabel(a.place, b.place),
        );
        locations.push(area);
        for (const place of places) {
          place.agencies.sort((a, b) => compareLabel(a.name, b.name));
          for (const agency of place.agencies) {
            agency.mapPoint =
              Number.isFinite(agency.latitude) &&
              Number.isFinite(agency.longitude)
                ? { lat: agency.latitude, lng: agency.longitude }
                : null;
          }
          place.latitude = averageCoordinate(place.agencies, "latitude");
          place.longitude = averageCoordinate(place.agencies, "longitude");
          place.mapBounds = boundsFor(place.agencies);
          place.mapPositionSource = place.mapBounds ? "geocoded" : null;
          locations.push(place);
        }
        area.latitude = averageCoordinate(places, "latitude");
        area.longitude = averageCoordinate(places, "longitude");
        area.mapBounds = boundsFor(places);
        area.mapPositionSource = area.mapBounds
          ? "derived_from_children"
          : null;
        for (const place of places) {
          place.mapPoint =
            Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
              ? { lat: place.latitude, lng: place.longitude }
              : null;
        }
      }
      state.latitude = averageCoordinate(areas, "latitude");
      state.longitude = averageCoordinate(areas, "longitude");
      state.mapBounds = boundsFor(areas);
      state.mapPositionSource = state.mapBounds
        ? "derived_from_children"
        : null;
      for (const area of areas) {
        area.mapPoint =
          Number.isFinite(area.latitude) && Number.isFinite(area.longitude)
            ? { lat: area.latitude, lng: area.longitude }
            : null;
      }
    }

    for (const location of locations) {
      await client.query(
        `
          insert into public.location_path (
            location_path_id, path, level, state_or_territory_slug,
            administrative_area_slug, place_slug, state_or_territory_name,
            administrative_area_name, place_name, parent_location_path_id,
            latitude, longitude,
            map_min_lat, map_min_lng, map_max_lat, map_max_lng,
            map_position_source,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, timezone('utc'::text, now()))
        `,
        [
          location.id,
          location.path,
          location.level,
          location.state,
          location.administrativeAreaSlug || null,
          location.placeSlug || null,
          location.stateLabel,
          location.administrativeArea || null,
          location.place || null,
          location.parentId || null,
          location.latitude ?? null,
          location.longitude ?? null,
          location.mapBounds?.minLat ?? null,
          location.mapBounds?.minLng ?? null,
          location.mapBounds?.maxLat ?? null,
          location.mapBounds?.maxLng ?? null,
          location.mapPositionSource || null,
        ],
      );
    }

    for (const location of locations) {
      await client.query(
        `insert into public.location_path_closure values ($1, $1, 0)`,
        [location.id],
      );
      if (location.parentId) {
        await client.query(
          `
            insert into public.location_path_closure
              (ancestor_location_path_id, descendant_location_path_id, depth)
            select ancestor_location_path_id, $1, depth + 1
            from public.location_path_closure
            where descendant_location_path_id = $2
          `,
          [location.id, location.parentId],
        );
      }
    }

    for (const agency of agencies) {
      await client.query(
        `
          update public.agency
          set location_path_id = $1,
              agency_slug = $2
          where id = $3
        `,
        [agency.locationPathId, agency.agencySlug, agency.id],
      );
      if (
        agency.zipCode &&
        agency.zipCode !== "00000" &&
        /^[0-9]{5}$/.test(agency.zipCode)
      ) {
        await client.query(
          `
            insert into public.agency_zip_index
              (postal_code, agency_id, relationship_type)
            values ($1, $2, 'official_address')
            on conflict do nothing
          `,
          [agency.zipCode, agency.id],
        );
      }
    }

    const payloadRows = [];
    for (const state of [...states.values()].sort((a, b) =>
      compareLabel(a.stateLabel, b.stateLabel),
    )) {
      const areas = [...state.areas.values()].sort((a, b) =>
        compareLabel(a.administrativeArea, b.administrativeArea),
      );
      payloadRows.push(
        locationPayload({
          path: state.path,
          entityId: state.id,
          level: "state",
          contentUpdatedAt: state.updatedAt,
          payload: {
            pageType: "location",
            level: "state",
            path: state.path,
            displayName: state.stateLabel,
            state: state.state,
            stateLabel: state.stateLabel,
            administrativeAreaPlural: state.administrativeAreaPlural,
            mapBounds: state.mapBounds,
            mapPositionSource: state.mapPositionSource,
            children: areas.map((area) => ({
              label: area.administrativeArea,
              kind: area.administrativeAreaKind,
              path: area.path,
              childCount: area.places.size,
              mapPoint: area.mapPoint,
            })),
          },
        }),
      );
      for (const area of areas) {
        const places = [...area.places.values()].sort((a, b) =>
          compareLabel(a.place, b.place),
        );
        payloadRows.push(
          locationPayload({
            path: area.path,
            entityId: area.id,
            level: "administrative_area",
            contentUpdatedAt: area.updatedAt,
            payload: {
              pageType: "location",
              level: "administrative_area",
              path: area.path,
              displayName: area.administrativeArea,
              state: area.state,
              stateLabel: area.stateLabel,
              administrativeArea: area.administrativeArea,
              administrativeAreaKind: area.administrativeAreaKind,
              parentPath: state.path,
              mapBounds: area.mapBounds,
              mapPositionSource: area.mapPositionSource,
              children: places.map((place) => ({
                label: place.place,
                path: place.path,
                childCount: place.agencies.length,
                mapPoint: place.mapPoint,
              })),
            },
          }),
        );
        for (const place of places) {
          payloadRows.push(
            locationPayload({
              path: place.path,
              entityId: place.id,
              level: "place",
              contentUpdatedAt: place.updatedAt,
              payload: {
                pageType: "location",
                level: "place",
                path: place.path,
                displayName: place.place,
                state: place.state,
                stateLabel: place.stateLabel,
                administrativeArea: place.administrativeArea,
                administrativeAreaKind: place.administrativeAreaKind,
                administrativeAreaSlug: place.administrativeAreaSlug,
                parentPath: area.path,
                mapBounds: place.mapBounds,
                mapPositionSource: place.mapPositionSource,
                agencies: place.agencies.map((agency) => ({
                  id: agency.id,
                  name: agency.name,
                  slug: agency.agencySlug,
                  path: agency.canonicalPath,
                  address: agency.address,
                  mapPoint: agency.mapPoint,
                })),
              },
            }),
          );
        }
      }
    }

    for (const agency of agencies) {
      payloadRows.push(
        agencyPayload({
          path: agency.canonicalPath,
          agency,
          locationPath: agency.locationPath,
        }),
      );
    }

    for (const row of payloadRows) {
      await insertJsonRow(client, row);
    }

    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          locations: locations.length,
          agencies: agencies.length,
          excludedAgencies: totalAgencyCount - agencies.length,
          payloads: payloadRows.length,
          durationMs: Date.now() - startedAt,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
});
