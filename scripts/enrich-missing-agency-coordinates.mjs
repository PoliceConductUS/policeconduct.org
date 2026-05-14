import { writeFileSync } from "node:fs";
import { withDb } from "../src/lib/db.js";

const MANUAL_CHECK_CSV = "docs/agency-coordinate-manual-check.csv";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const ZIPPOPOTAM_URL = "https://api.zippopotam.us/us";
const USER_AGENT =
  "PoliceConduct.org coordinate enrichment (https://www.policeconduct.org/about/contact/)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const trimText = (value) => String(value ?? "").trim();

const cleanAddress = (value) => {
  const text = trimText(value);
  if (!text || text.toLowerCase() === "null" || text === "0") return "";
  return text;
};

const isPoBoxAddress = (value) =>
  /(^|\s)(p\.?\s*o\.?|post office)\s*box\b/i.test(cleanAddress(value));

const isPhysicalAddress = (value) => {
  const text = cleanAddress(value);
  if (!text || isPoBoxAddress(text)) return false;
  return /\d/.test(text);
};

const parseCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const csvRow = (values) => values.map(csvEscape).join(",");

const driftCounts = new Map();
const lookupCache = new Map();

const driftDuplicateApproximateCoordinate = (agency, match, source) => {
  if (source !== "place_centroid" && source !== "zip_centroid") return match;

  const key = `${source}:${match.latitude.toFixed(7)},${match.longitude.toFixed(7)}`;
  const count = driftCounts.get(key) || 0;
  driftCounts.set(key, count + 1);
  if (count === 0) return match;

  const hash = [...agency.id].reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.00018 * Math.ceil(count / 8);

  return {
    ...match,
    latitude: Number((match.latitude + Math.sin(angle) * radius).toFixed(7)),
    longitude: Number((match.longitude + Math.cos(angle) * radius).toFixed(7)),
    displayName: `${match.displayName} (pin offset from duplicate ${source.replace("_", " ")})`,
  };
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const nominatimSearch = async (params) => {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  for (const [key, value] of Object.entries(params)) {
    if (trimText(value)) url.searchParams.set(key, trimText(value));
  }

  const cacheKey = url.toString();
  if (lookupCache.has(cacheKey)) return lookupCache.get(cacheKey);

  const results = await fetchJson(url);
  await sleep(1100);
  const result = Array.isArray(results) ? results[0] : null;
  if (!result) {
    lookupCache.set(cacheKey, null);
    return null;
  }

  const latitude = parseCoordinate(result.lat);
  const longitude = parseCoordinate(result.lon);
  if (latitude === null || longitude === null) {
    lookupCache.set(cacheKey, null);
    return null;
  }

  const match = {
    latitude,
    longitude,
    displayName: trimText(result.display_name),
    placeId: result.place_id ? String(result.place_id) : null,
    type: trimText(result.type),
  };
  lookupCache.set(cacheKey, match);
  return match;
};

const zipCentroid = async (postalCode) => {
  const zip = trimText(postalCode).match(/\d{5}/)?.[0];
  if (!zip || zip === "00000") return null;
  const cacheKey = `zip:${zip}`;
  if (lookupCache.has(cacheKey)) return lookupCache.get(cacheKey);
  const result = await fetchJson(`${ZIPPOPOTAM_URL}/${zip}`);
  const place = Array.isArray(result.places) ? result.places[0] : null;
  if (!place) {
    lookupCache.set(cacheKey, null);
    return null;
  }
  const latitude = parseCoordinate(place.latitude);
  const longitude = parseCoordinate(place.longitude);
  if (latitude === null || longitude === null) {
    lookupCache.set(cacheKey, null);
    return null;
  }
  const match = {
    latitude,
    longitude,
    displayName: `${zip} ${trimText(place["place name"])}, ${trimText(place.state)}`,
    placeId: null,
    type: "zip_centroid",
  };
  lookupCache.set(cacheKey, match);
  return match;
};

const missingAgencies = await withDb(async (client) => {
  const result = await client.query(
    `
      select
        a.id,
        a.name,
        a.address,
        lp.place_name as city,
        lp.state_or_territory_slug as state,
        a.zip_code,
        lp.administrative_area_name as administrative_area
      from public.agency a
      join public.location_path lp
        on lp.location_path_id = a.location_path_id
      where a.latitude is null
         or a.longitude is null
      order by lower(lp.state_or_territory_slug), lower(lp.place_name), lower(a.name), a.id
    `,
  );
  return result.rows;
});

const manualCheckRows = [
  [
    "agency_id",
    "agency_name",
    "address",
    "city",
    "state",
    "zip_code",
    "coordinate_source",
    "latitude",
    "longitude",
    "matched_label",
    "manual_check_reason",
  ],
];

const stats = {
  requested: missingAgencies.length,
  internetNameMatches: 0,
  secondGeocoderStreetMatches: 0,
  placeApproximationMatches: 0,
  zipCentroidMatches: 0,
  stillMissing: 0,
};

const updateAgency = async (agency, match, source) => {
  const persistedMatch = driftDuplicateApproximateCoordinate(
    agency,
    match,
    source,
  );
  await withDb(async (client) => {
    await client.query(
      `
        update public.agency
        set latitude = $1,
            longitude = $2
        where id = $3
      `,
      [persistedMatch.latitude, persistedMatch.longitude, agency.id],
    );
  });

  if (source === "place_centroid" || source === "zip_centroid") {
    manualCheckRows.push([
      agency.id,
      agency.name,
      agency.address,
      agency.city,
      agency.state,
      agency.zip_code,
      source,
      persistedMatch.latitude,
      persistedMatch.longitude,
      persistedMatch.displayName,
      source === "place_centroid"
        ? "Review: coordinate uses place centroid."
        : "Review: coordinate uses ZIP centroid.",
    ]);
  }
};

for (const [index, agency] of missingAgencies.entries()) {
  if (index > 0 && index % 25 === 0) {
    console.error(`Processed ${index}/${missingAgencies.length} agencies...`);
  }

  const address = cleanAddress(agency.address);
  let match = null;

  match = await nominatimSearch({
    q: `${agency.name}, ${agency.city}, ${agency.state}`,
  });
  if (match) {
    await updateAgency(agency, match, "internet_name_search");
    stats.internetNameMatches += 1;
    continue;
  }

  if (isPhysicalAddress(address)) {
    match = await nominatimSearch({
      street: address,
      city: agency.city,
      state: agency.state,
      postalcode: agency.zip_code,
    });
    if (match) {
      await updateAgency(agency, match, "nominatim_existing_address");
      stats.secondGeocoderStreetMatches += 1;
      continue;
    }
  }

  match = await nominatimSearch({
    city: agency.city,
    state: agency.state,
  });
  if (match) {
    await updateAgency(agency, match, "place_centroid");
    stats.placeApproximationMatches += 1;
    continue;
  }

  match = await zipCentroid(agency.zip_code);
  if (match) {
    await updateAgency(agency, match, "zip_centroid");
    stats.zipCentroidMatches += 1;
    continue;
  }

  stats.stillMissing += 1;
}

writeFileSync(MANUAL_CHECK_CSV, `${manualCheckRows.map(csvRow).join("\n")}\n`);

console.log(
  JSON.stringify(
    {
      ...stats,
      manualCheckRows: manualCheckRows.length - 1,
      manualCheckCsv: MANUAL_CHECK_CSV,
    },
    null,
    2,
  ),
);
