import { Blob } from "node:buffer";
import { withDb } from "../src/lib/db.js";

const CENSUS_BATCH_URL =
  "https://geocoding.geo.census.gov/geocoder/locations/addressbatch";
const BATCH_SIZE = 1000;

const trimText = (value) => String(value ?? "").trim();

const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
};

const includedAgencySql = `
  select
    a.id,
    a.name,
    a.address,
    a.city,
    a.state,
    a.zip_code
  from public.agency a
  where a.address is not null
  and a.city is not null
  and a.state is not null
  and a.zip_code is not null
  and (a.latitude is null or a.longitude is null)
  order by lower(a.state), lower(a.city), lower(a.name), a.id
`;

const agencies = await withDb(async (client) => {
  return (await client.query(includedAgencySql)).rows;
});

let geocoded = 0;
let unmatched = 0;

for (let index = 0; index < agencies.length; index += BATCH_SIZE) {
  const batch = agencies.slice(index, index + BATCH_SIZE);
  const csv = batch
    .map((agency) =>
      [
        agency.id,
        agency.address,
        agency.city,
        agency.state,
        trimText(agency.zip_code).slice(0, 5),
      ]
        .map(csvEscape)
        .join(","),
    )
    .join("\n");

  const form = new FormData();
  form.set("benchmark", "Public_AR_Current");
  form.set(
    "addressFile",
    new Blob([csv], { type: "text/csv" }),
    "agencies.csv",
  );

  const response = await fetch(CENSUS_BATCH_URL, {
    body: form,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      `Census geocoder failed: ${response.status} ${response.statusText}`,
    );
  }

  const rows = (await response.text())
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  await withDb(async (client) => {
    await client.query("begin");
    try {
      for (const row of rows) {
        const [id, , matchStatus, , , coords] = row;
        if (matchStatus !== "Match" || !coords) {
          unmatched += 1;
          continue;
        }
        const [lngText, latText] = coords.split(",");
        const longitude = Number(lngText);
        const latitude = Number(latText);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          unmatched += 1;
          continue;
        }

        await client.query(
          `
            update public.agency
            set latitude = $1,
                longitude = $2
            where id = $3
          `,
          [latitude, longitude, id],
        );
        geocoded += 1;
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

console.log(
  JSON.stringify(
    {
      requested: agencies.length,
      geocoded,
      unmatched,
    },
    null,
    2,
  ),
);
