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

const assertValue = (value, message) => {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
};

const normalizeReportDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const getReportDateParts = (value, reportId) => {
  const date = normalizeReportDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Report ${reportId} is missing a complete incident date.`);
  }
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
};

const buildReportCanonicalPath = ({ id, incidentDate, locationPath, slug }) => {
  const reportLocationPath = assertValue(
    locationPath,
    `Report ${id} is missing location_path.path.`,
  );
  if (!reportLocationPath.endsWith("/")) {
    throw new Error(`Report ${id} location path must end with "/".`);
  }
  const reportSlug = assertValue(slug, `Report ${id} is missing slug.`);
  const { year, month, day } = getReportDateParts(incidentDate, id);
  return `${reportLocationPath}reports/${year}/${month}/${day}/${reportSlug}/`;
};

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

const directAgencyFor = (agencies) => {
  if (!Array.isArray(agencies) || agencies.length !== 1) return null;
  const agency = agencies[0];
  return {
    id: agency.id,
    name: agency.name,
    slug: agency.agencySlug,
    path: agency.canonicalPath,
    address: agency.address,
    administrativeArea: agency.administrativeArea,
    city: agency.city,
    personnel: agency.personnelCount,
    reports: agency.reportCount,
    civilCases: agency.civilCaseCount,
    mapPoint: agency.mapPoint || null,
  };
};

const countLabel = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

const emptyCoverage = () => ({
  agencies: 0,
  personnel: 0,
  reports: 0,
  civilCases: 0,
});

const agencyCoverageFor = (agencies) =>
  agencies.reduce(
    (coverage, agency) => ({
      agencies: coverage.agencies + 1,
      personnel: coverage.personnel + agency.personnelCount,
      reports: coverage.reports,
      civilCases: coverage.civilCases,
    }),
    emptyCoverage(),
  );

const addReportCoverage = (coverage, records) => ({
  agencies: coverage.agencies,
  personnel: coverage.personnel,
  reports: coverage.reports + records.reports,
  civilCases: records.civilCases,
});

const sumCoverage = (items) =>
  items.reduce(
    (coverage, item) => ({
      agencies: coverage.agencies + item.coverage.agencies,
      personnel: coverage.personnel + item.coverage.personnel,
      reports: coverage.reports + item.coverage.reports,
      civilCases: coverage.civilCases + item.coverage.civilCases,
    }),
    emptyCoverage(),
  );

const recordCoverageFor = (recordsByLocationId, locationId) =>
  recordsByLocationId.get(locationId) || { civilCases: 0, reports: 0 };

const stateAreaChildPayload = (area) => {
  const directAgency = directAgencyFor(area.agencies);
  const places = [...area.places.values()];
  const directPlace = !directAgency && places.length === 1 ? places[0] : null;
  return {
    label: area.administrativeArea,
    kind: area.administrativeAreaKind,
    path: area.path,
    coverage: area.coverage,
    childCount: area.places.size,
    directAgency,
    nextPath: directAgency?.path || directPlace?.path || area.path,
    nextLabel:
      directAgency?.name || directPlace?.place || area.administrativeArea,
    nextDetail: directAgency
      ? `${directAgency.city}, ${area.administrativeArea}`
      : directPlace
        ? area.administrativeArea
        : countLabel(area.places.size, "place", "places"),
    mapPoint: area.mapPoint,
  };
};

const areaPlaceChildPayload = (place) => {
  const directAgency = directAgencyFor(place.agencies);
  return {
    label: place.place,
    path: place.path,
    coverage: place.coverage,
    childCount: place.agencies.length,
    directAgency,
    nextPath: directAgency?.path || place.path,
    nextLabel: directAgency?.name || place.place,
    nextDetail: directAgency
      ? place.place
      : `${countLabel(place.agencies.length, "agency", "agencies")} located here`,
    mapPoint: place.mapPoint,
  };
};

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

const reportPayload = ({ report }) => {
  const payload = {
    pageType: "reportSummary",
    id: report.id,
    slug: report.slug,
    state: report.state,
    administrativeAreaSlug: report.administrativeAreaSlug,
    placeSlug: report.placeSlug,
    stateName: report.stateName,
    administrativeAreaName: report.administrativeAreaName,
    placeName: report.placeName,
    locationPath: report.locationPath,
    canonicalPath: report.canonicalPath,
    year: report.year,
    month: report.month,
    day: report.day,
    title: report.title,
    incidentDate: report.incidentDate,
    address: report.address,
    latitude: report.latitude,
    longitude: report.longitude,
    agencySlug: report.agencySlug,
    agencyName: report.agencyName,
    agencyCanonicalPath: report.agencyCanonicalPath,
    ratingOverall: report.ratingOverall,
    personnel: report.personnel,
    personnelSlugs: report.personnelSlugs,
  };
  return {
    path: report.canonicalPath,
    page_type: "report_summary",
    entity_id: report.id,
    payload,
    content_hash: contentHashFor(payload),
    content_updated_at:
      report.updatedAt || report.createdAt || report.incidentDate,
  };
};

const locationReportPayload = (report) => ({
  id: report.id,
  reportType: report.reportType,
  reportKey: report.reportKey,
  title: report.title,
  summary: report.summary,
  payload: report.payload,
  sortOrder: report.sortOrder,
  sources: report.sources,
});

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

const fetchLocationRowsByPath = async (client, paths) => {
  if (!paths.length) return new Map();

  const result = await client.query(
    `
      select
        location_path_id,
        path,
        level,
        state_or_territory_slug,
        administrative_area_slug,
        place_slug,
        state_or_territory_name,
        administrative_area_name,
        place_name,
        parent_location_path_id
      from public.location_path
      where path = any($1)
    `,
    [paths],
  );

  return new Map(result.rows.map((row) => [row.path, row]));
};

const fetchLocationRecordCounts = async (client, locations) => {
  if (!locations.length) return new Map();

  const rows = (
    await client.query(
      `
        with target(location_path_id, path) as (
          select *
          from unnest($1::text[], $2::text[])
        ),
        report_counts as (
          select
            location_path_id,
            count(distinct id) as report_count
          from public.reviews
          where location_path_id = any($1)
          group by location_path_id
        ),
        civil_case_counts as (
          select
            target.location_path_id,
            count(distinct cco.civil_case_id) as civil_case_count
          from target
          join public.location_path agency_location
            on agency_location.path like target.path || '%'
          join public.agency scoped_agency
            on scoped_agency.location_path_id = agency_location.location_path_id
          join public.agency_officers target_assignment
            on target_assignment.agency_id = scoped_agency.id
          join public.agency_officers case_assignment
            on case_assignment.officer_id = target_assignment.officer_id
          join public.civil_case_officers cco
            on cco.agency_officer_id = case_assignment.id
          group by target.location_path_id
        )
        select
          target.location_path_id,
          coalesce(report_counts.report_count, 0) as report_count,
          coalesce(civil_case_counts.civil_case_count, 0) as civil_case_count
        from target
        left join report_counts
          on report_counts.location_path_id = target.location_path_id
        left join civil_case_counts
          on civil_case_counts.location_path_id = target.location_path_id
      `,
      [
        locations.map((location) => location.id),
        locations.map((location) => location.path),
      ],
    )
  ).rows;

  return new Map(
    rows.map((row) => [
      row.location_path_id,
      {
        civilCases: Number(row.civil_case_count || 0),
        reports: Number(row.report_count || 0),
      },
    ]),
  );
};

const requireLocationRow = (locationsByPath, path) => {
  const row = locationsByPath.get(path);
  if (!row) {
    throw new Error(
      `Missing required location_path row for ${path}. Add the location to the database before refreshing build projections.`,
    );
  }
  return row;
};

const applyLocationRow = ({
  location,
  locationsByPath,
  expectedLevel,
  parentPath,
}) => {
  const row = requireLocationRow(locationsByPath, location.path);

  if (row.level !== expectedLevel) {
    throw new Error(
      `Location ${location.path} has level ${row.level}, expected ${expectedLevel}.`,
    );
  }

  const parentRow = parentPath
    ? requireLocationRow(locationsByPath, parentPath)
    : null;

  if (parentRow && row.parent_location_path_id !== parentRow.location_path_id) {
    throw new Error(
      `Location ${location.path} has parent_location_path_id ${row.parent_location_path_id || "null"}, expected ${parentRow.location_path_id} from ${parentPath}.`,
    );
  }

  if (!parentRow && row.parent_location_path_id) {
    throw new Error(
      `Root location ${location.path} must not have parent_location_path_id ${row.parent_location_path_id}.`,
    );
  }

  location.id = row.location_path_id;
  location.parentId = row.parent_location_path_id || null;
  return location;
};

const startedAt = Date.now();

await withDb(async (client) => {
  await client.query("begin");
  try {
    const totalAgencyCount = Number(
      (await client.query("select count(*) as count from public.agency"))
        .rows[0]?.count || 0,
    );
    const agenciesMissingLocationPath = (
      await client.query(
        `
          select id, name
          from public.agency
          where location_path_id is null
          order by lower(name), id
          limit 20
        `,
      )
    ).rows;
    if (agenciesMissingLocationPath.length) {
      throw new Error(
        `Cannot refresh build projections: ${agenciesMissingLocationPath.length} sampled agencies have null location_path_id. First missing agencies: ${agenciesMissingLocationPath.map((agency) => `${agency.name} (${agency.id})`).join(", ")}.`,
      );
    }
    const agencies = (
      await client.query(
        `
          with eligible_agencies as (
            select
              a.id,
              a.name,
              a.slug,
              a.location_path_id,
              a.address,
              a.zip_code,
              a.latitude,
              a.longitude,
              a.created_at,
              a.updated_at,
              a.state,
              a.city
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
          ),
          active_counts as (
            select
              ao.agency_id,
              count(distinct ao.officer_id) as personnel_count
            from public.agency_officers ao
            join eligible_agencies ea
              on ea.id = ao.agency_id
            where ao.end_date is null
            group by ao.agency_id
          ),
          report_counts as (
            select
              ao.agency_id,
              count(distinct ro.review_id) as report_count
            from public.agency_officers ao
            join eligible_agencies ea
              on ea.id = ao.agency_id
            join public.review_officers ro
              on ro.agency_officer_id = ao.id
            group by ao.agency_id
          ),
          civil_case_links as (
            select
              ao.agency_id,
              cco.civil_case_id
            from public.agency_officers ao
            join eligible_agencies ea
              on ea.id = ao.agency_id
            join public.civil_case_officers cco
              on cco.agency_officer_id = ao.id
            union
            select
              target_ao.agency_id,
              cco.civil_case_id
            from public.agency_officers target_ao
            join eligible_agencies ea
              on ea.id = target_ao.agency_id
            join public.agency_officers case_ao
              on case_ao.officer_id = target_ao.officer_id
            join public.civil_case_officers cco
              on cco.agency_officer_id = case_ao.id
          ),
          civil_case_counts as (
            select
              agency_id,
              count(distinct civil_case_id) as civil_case_count
            from civil_case_links
            group by agency_id
          )
          select
            a.id,
            a.name,
            a.slug,
            lp.location_path_id,
            lp.path as location_path,
            lp.state_or_territory_slug as state,
            state_lp.location_path_id as state_location_path_id,
            state_lp.path as state_path,
            state_lp.state_or_territory_name as state_name,
            area_lp.location_path_id as administrative_area_location_path_id,
            area_lp.path as administrative_area_path,
            area_lp.administrative_area_name as administrative_area,
            area_lp.administrative_area_slug as location_administrative_area_slug,
            lp.place_name as city,
            lp.place_slug as location_place_slug,
            a.address,
            a.zip_code,
            a.latitude,
            a.longitude,
            a.created_at,
            a.updated_at,
            coalesce(active_counts.personnel_count, 0) as personnel_count,
            coalesce(report_counts.report_count, 0) as report_count,
            coalesce(civil_case_counts.civil_case_count, 0) as civil_case_count
          from eligible_agencies a
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
          join public.location_path area_lp
            on area_lp.location_path_id = lp.parent_location_path_id
           and area_lp.level = 'administrative_area'
          join public.location_path state_lp
            on state_lp.location_path_id = area_lp.parent_location_path_id
           and state_lp.level = 'state'
          left join active_counts
            on active_counts.agency_id = a.id
          left join report_counts
            on report_counts.agency_id = a.id
          left join civil_case_counts
            on civil_case_counts.agency_id = a.id
          order by lower(lp.state_or_territory_slug),
            lower(lp.administrative_area_name), lower(lp.place_name),
            lower(a.name), a.id
        `,
      )
    ).rows.map((agency) => {
      const id = requireText(agency.id, "id", "unknown");
      const locationPathId = requireText(
        agency.location_path_id,
        "location_path_id",
        id,
      );
      const stateLocationPathId = requireText(
        agency.state_location_path_id,
        "state_location_path_id",
        id,
      );
      const administrativeAreaLocationPathId = requireText(
        agency.administrative_area_location_path_id,
        "administrative_area_location_path_id",
        id,
      );
      const locationPath = requireText(
        agency.location_path,
        "location_path",
        id,
      );
      const statePath = requireText(agency.state_path, "state_path", id);
      const administrativeAreaPath = requireText(
        agency.administrative_area_path,
        "administrative_area_path",
        id,
      );
      const stateSlug = requireText(agency.state, "state", id).toLowerCase();
      const stateName = requireText(agency.state_name, "state_name", id);
      const administrativeArea = requireText(
        agency.administrative_area,
        "administrative_area",
        id,
      );
      const city = normalizePlaceLabel(requireText(agency.city, "city", id));
      return {
        id,
        locationPathId,
        stateLocationPathId,
        administrativeAreaLocationPathId,
        locationPath,
        statePath,
        administrativeAreaPath,
        name: requireText(agency.name, "name", id),
        agencySlug: requireText(agency.slug, "slug", id),
        state: requireText(agency.state, "state", id),
        stateSlug,
        stateName,
        administrativeArea,
        administrativeAreaKind: administrativeAreaKindFor(administrativeArea),
        administrativeAreaSlug: requireText(
          agency.location_administrative_area_slug,
          "administrative_area_slug",
          id,
        ).toLowerCase(),
        city,
        placeSlug: requireText(
          agency.location_place_slug,
          "place_slug",
          id,
        ).toLowerCase(),
        address: trimText(agency.address) || null,
        zipCode: trimText(agency.zip_code).slice(0, 5) || null,
        latitude: parseCoordinate(agency.latitude),
        longitude: parseCoordinate(agency.longitude),
        personnelCount: Number(agency.personnel_count || 0),
        reportCount: Number(agency.report_count || 0),
        civilCaseCount: Number(agency.civil_case_count || 0),
        createdAt: agency.created_at,
        updatedAt: agency.updated_at,
      };
    });

    const states = new Map();

    for (const agency of agencies) {
      let state = states.get(agency.stateSlug);
      if (!state) {
        state = {
          level: "state",
          state: agency.stateSlug,
          stateLabel: agency.stateName || stateNameFor(agency.stateSlug),
          path: agency.statePath,
          id: agency.stateLocationPathId,
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
        area = {
          level: "administrative_area",
          state: agency.stateSlug,
          stateLabel: state.stateLabel,
          administrativeArea: agency.administrativeArea,
          administrativeAreaKind: agency.administrativeAreaKind,
          administrativeAreaSlug: agency.administrativeAreaSlug,
          path: agency.administrativeAreaPath,
          id: agency.administrativeAreaLocationPathId,
          parentPath: state.path,
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
        place = {
          level: "place",
          state: agency.stateSlug,
          stateLabel: state.stateLabel,
          administrativeArea: agency.administrativeArea,
          administrativeAreaKind: agency.administrativeAreaKind,
          administrativeAreaSlug: agency.administrativeAreaSlug,
          place: agency.city,
          placeSlug: agency.placeSlug,
          path: agency.locationPath,
          id: agency.locationPathId,
          parentPath: area.path,
          agencies: [],
          updatedAt: agency.updatedAt || agency.createdAt,
        };
        area.places.set(agency.placeSlug, place);
      } else if (isAllCapsLabel(place.place) && !isAllCapsLabel(agency.city)) {
        place.place = agency.city;
      }
      place.agencies.push(agency);
      agency.canonicalPath = `${agency.locationPath}${agency.agencySlug}/`;
      if (agency.updatedAt > place.updatedAt)
        place.updatedAt = agency.updatedAt;
    }

    const agenciesById = new Map(agencies.map((agency) => [agency.id, agency]));
    const reportRows = (
      await client.query(
        `
          select
            r.id,
            r.slug,
            r.title,
            r.incident_date,
            r.address,
            r.latitude,
            r.longitude,
            r.created_at,
            r.updated_at,
            report_location.state_or_territory_slug as state,
            report_location.administrative_area_slug,
            report_location.place_slug,
            report_location.state_or_territory_name,
            report_location.administrative_area_name,
            report_location.place_name,
            report_location.path as location_path,
            ro.id as review_officer_id,
            ao.agency_id,
            ao.title as license_type,
            o.first_name,
            o.last_name,
            o.suffix,
            o.slug as officer_slug
          from public.reviews r
          join public.location_path report_location
            on report_location.location_path_id = r.location_path_id
          left join public.review_officers ro
            on ro.review_id = r.id
          left join public.agency_officers ao
            on ao.id = ro.agency_officer_id
          left join public.officers o
            on o.id = ao.officer_id
          order by r.incident_date desc, r.id, ro.id
        `,
      )
    ).rows;

    const reportRowsById = new Map();
    for (const row of reportRows) {
      const reportId = assertValue(row.id, "Report row is missing id");
      const entries = reportRowsById.get(reportId) || [];
      entries.push(row);
      reportRowsById.set(reportId, entries);
    }

    const reports = [...reportRowsById.values()].map((entries) => {
      const row = entries[0];
      const reportId = assertValue(row.id, "Report row is missing id");
      const reportSlug = assertValue(
        row.slug,
        `Report ${reportId} is missing slug.`,
      );
      const locationPath = assertValue(
        row.location_path,
        `Report ${reportId} is missing location_path.path.`,
      );
      const incidentDate = normalizeReportDate(row.incident_date);
      const dateParts = getReportDateParts(incidentDate, reportId);
      const primaryAgency = assertValue(
        agenciesById.get(row.agency_id),
        `Report ${reportId} references agency ${row.agency_id}, but that agency has no build projection.`,
      );
      const personnelBySlug = new Map();
      for (const entry of entries) {
        const slug = assertValue(
          entry.officer_slug,
          `Report ${reportId} has a linked officer without a slug.`,
        );
        if (!personnelBySlug.has(slug)) {
          personnelBySlug.set(slug, {
            licenseType: entry.license_type || null,
            name: `${entry.first_name || ""} ${entry.last_name || ""}${entry.suffix ? ` ${entry.suffix}` : ""}`.trim(),
            slug,
          });
        }
      }
      const personnel = [...personnelBySlug.values()];
      if (!personnel.length) {
        throw new Error(`Report ${reportId} has no linked personnel.`);
      }

      return {
        id: reportId,
        slug: reportSlug,
        state: assertValue(
          row.state,
          `Report ${reportId} is missing location state.`,
        )
          .toString()
          .trim()
          .toLowerCase(),
        administrativeAreaSlug: assertValue(
          row.administrative_area_slug,
          `Report ${reportId} is missing administrative_area_slug.`,
        ),
        placeSlug: assertValue(
          row.place_slug,
          `Report ${reportId} is missing place_slug.`,
        ),
        stateName: assertValue(
          row.state_or_territory_name,
          `Report ${reportId} is missing state_or_territory_name.`,
        ),
        administrativeAreaName: assertValue(
          row.administrative_area_name,
          `Report ${reportId} is missing administrative_area_name.`,
        ),
        placeName: assertValue(
          row.place_name,
          `Report ${reportId} is missing place_name.`,
        ),
        locationPath,
        canonicalPath: buildReportCanonicalPath({
          id: reportId,
          incidentDate,
          locationPath,
          slug: reportSlug,
        }),
        year: dateParts.year,
        month: dateParts.month,
        day: dateParts.day,
        title: assertValue(row.title, `Report ${reportId} is missing title.`),
        incidentDate,
        address: trimText(row.address) || null,
        latitude: parseCoordinate(row.latitude),
        longitude: parseCoordinate(row.longitude),
        agencySlug: primaryAgency.agencySlug,
        agencyName: primaryAgency.name,
        agencyCanonicalPath: primaryAgency.canonicalPath,
        ratingOverall: null,
        personnel,
        personnelSlugs: personnel.map((person) => person.slug),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    const locationReportRows = (
      await client.query(
        `
          select
            lr.id,
            lr.location_path_id,
            lr.report_type,
            lr.report_key,
            lr.title,
            lr.summary,
            lr.payload,
            lr.sort_order,
            lr.updated_at,
            lrs.id as source_id,
            lrs.source_key,
            lrs.label as source_label,
            lrs.url as source_url,
            lrs.source_type,
            lrs.sort_order as source_sort_order
          from public.location_reports lr
          left join public.location_report_sources lrs
            on lrs.location_report_id = lr.id
          where lr.status = 'published'
          order by lr.location_path_id, lr.sort_order, lower(lr.title), lr.id,
            lrs.sort_order, lower(lrs.label), lrs.id
        `,
      )
    ).rows;

    const locationReportsById = new Map();
    for (const row of locationReportRows) {
      const reportId = assertValue(row.id, "Location report row is missing id");
      let report = locationReportsById.get(reportId);
      if (!report) {
        report = {
          id: reportId,
          locationPathId: assertValue(
            row.location_path_id,
            `Location report ${reportId} is missing location_path_id.`,
          ),
          reportType: assertValue(
            row.report_type,
            `Location report ${reportId} is missing report_type.`,
          ),
          reportKey: assertValue(
            row.report_key,
            `Location report ${reportId} is missing report_key.`,
          ),
          title: assertValue(
            row.title,
            `Location report ${reportId} is missing title.`,
          ),
          summary: assertValue(
            row.summary,
            `Location report ${reportId} is missing summary.`,
          ),
          payload: row.payload || {},
          sortOrder: Number(row.sort_order || 0),
          sources: [],
          updatedAt: row.updated_at,
        };
        locationReportsById.set(reportId, report);
      }
      if (row.source_id) {
        report.sources.push({
          id: row.source_id,
          sourceKey: assertValue(
            row.source_key,
            `Location report source ${row.source_id} is missing source_key.`,
          ),
          label: assertValue(
            row.source_label,
            `Location report source ${row.source_id} is missing label.`,
          ),
          url: assertValue(
            row.source_url,
            `Location report source ${row.source_id} is missing url.`,
          ),
          sourceType: assertValue(
            row.source_type,
            `Location report source ${row.source_id} is missing source_type.`,
          ),
          sortOrder: Number(row.source_sort_order || 0),
        });
      }
    }

    const locationReportsByLocationId = new Map();
    for (const report of locationReportsById.values()) {
      const reportsForLocation =
        locationReportsByLocationId.get(report.locationPathId) || [];
      reportsForLocation.push(locationReportPayload(report));
      locationReportsByLocationId.set(
        report.locationPathId,
        reportsForLocation,
      );
    }

    await client.query("delete from public.build_page_payload");
    await client.query("delete from public.agency_zip_index");
    await client.query("delete from public.location_path_closure");

    const requiredLocationPaths = new Set();
    for (const state of states.values()) {
      requiredLocationPaths.add(state.path);
      for (const area of state.areas.values()) {
        requiredLocationPaths.add(area.path);
        for (const place of area.places.values()) {
          requiredLocationPaths.add(place.path);
        }
      }
    }
    const locationsByPath = await fetchLocationRowsByPath(client, [
      ...requiredLocationPaths,
    ]);

    const locations = [];
    for (const state of states.values()) {
      applyLocationRow({
        location: state,
        locationsByPath,
        expectedLevel: "state",
      });
      const areas = [...state.areas.values()].sort((a, b) =>
        compareLabel(a.administrativeArea, b.administrativeArea),
      );
      state.administrativeAreaPlural = administrativeAreaPluralForState(areas);
      locations.push(state);
      for (const area of areas) {
        applyLocationRow({
          location: area,
          locationsByPath,
          expectedLevel: "administrative_area",
          parentPath: state.path,
        });
        const places = [...area.places.values()].sort((a, b) =>
          compareLabel(a.place, b.place),
        );
        locations.push(area);
        for (const place of places) {
          applyLocationRow({
            location: place,
            locationsByPath,
            expectedLevel: "place",
            parentPath: area.path,
          });
          place.agencies.sort((a, b) => compareLabel(a.name, b.name));
          for (const agency of place.agencies) {
            if (agency.locationPathId !== place.id) {
              throw new Error(
                `Agency ${agency.id} has location_path_id ${agency.locationPathId}, expected ${place.id} for ${place.path}.`,
              );
            }
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

    const recordsByLocationId = await fetchLocationRecordCounts(
      client,
      locations,
    );

    for (const state of states.values()) {
      for (const area of state.areas.values()) {
        const places = [...area.places.values()];
        for (const place of places) {
          place.coverage = addReportCoverage(
            agencyCoverageFor(place.agencies),
            recordCoverageFor(recordsByLocationId, place.id),
          );
        }

        area.coverage = addReportCoverage(
          sumCoverage(places),
          recordCoverageFor(recordsByLocationId, area.id),
        );
      }

      state.coverage = addReportCoverage(
        sumCoverage([...state.areas.values()]),
        recordCoverageFor(recordsByLocationId, state.id),
      );
    }

    for (const agency of agencies) {
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
            coverage: state.coverage,
            locationReports: locationReportsByLocationId.get(state.id) || [],
            mapBounds: state.mapBounds,
            mapPositionSource: state.mapPositionSource,
            children: areas.map(stateAreaChildPayload),
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
              coverage: area.coverage,
              locationReports: locationReportsByLocationId.get(area.id) || [],
              mapBounds: area.mapBounds,
              mapPositionSource: area.mapPositionSource,
              children: places.map(areaPlaceChildPayload),
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
                coverage: place.coverage,
                locationReports:
                  locationReportsByLocationId.get(place.id) || [],
                mapBounds: place.mapBounds,
                mapPositionSource: place.mapPositionSource,
                agencies: place.agencies.map((agency) => ({
                  id: agency.id,
                  name: agency.name,
                  slug: agency.agencySlug,
                  path: agency.canonicalPath,
                  address: agency.address,
                  personnel: agency.personnelCount,
                  reports: agency.reportCount,
                  civilCases: agency.civilCaseCount,
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

    for (const report of reports) {
      payloadRows.push(reportPayload({ report }));
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
          reports: reports.length,
          locationReports: locationReportsById.size,
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
