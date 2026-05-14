import { withDb } from "./db.js";
import { US_STATE_TILES } from "./geo/states.js";

const PAGE_SIZE = 50;

const CATEGORY_SLUGS = US_STATE_TILES.map((state) =>
  state.code.toLowerCase(),
);

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLatestDate = (...values) =>
  values.reduce((latest, value) => {
    const parsed = parseDate(value);
    if (!parsed) {
      return latest;
    }
    if (!latest || parsed > latest) {
      return parsed;
    }
    return latest;
  }, null);

const setLastmod = (map, path, value) => {
  const parsed = parseDate(value);
  if (!parsed) {
    return;
  }
  const existing = map.get(path);
  if (!existing || parsed > existing) {
    map.set(path, parsed);
  }
};

const incrementCount = (map, key) => {
  map.set(key, (map.get(key) || 0) + 1);
};

const setCategoryLastmod = (map, key, value) => {
  const parsed = parseDate(value);
  if (!parsed) {
    return;
  }
  const existing = map.get(key);
  if (!existing || parsed > existing) {
    map.set(key, parsed);
  }
};

const addPaginatedPaths = (map, basePath, count, lastmod) => {
  setLastmod(map, basePath, lastmod);
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    setLastmod(map, `${basePath}page/${pageNumber}/`, lastmod);
  }
};

const requireAgencyCanonicalPath = (agency) => {
  if (
    !agency.state ||
    !agency.administrative_area_slug ||
    !agency.place_slug ||
    !agency.slug
  ) {
    throw new Error(
      `Agency ${agency.id || agency.slug || "unknown"} is missing required address-based URL fields`,
    );
  }
  return `/${agency.state.toLowerCase()}/${agency.administrative_area_slug}/${agency.place_slug}/${agency.slug}/`;
};

const normalizeReportDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

const buildReportCanonicalPath = (report) => {
  const date = normalizeReportDate(report.incident_date);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!report.location_path || !report.slug || !match) {
    return null;
  }
  return `${report.location_path}reports/${match[1]}/${match[2]}/${match[3]}/${report.slug}/`;
};

const setReportArchiveLastmods = (pathLastmods, report, lastmod) => {
  const date = normalizeReportDate(report.incident_date);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!report.location_path || !report.state || !match) {
    return;
  }
  const parts = report.location_path.split("/").filter(Boolean);
  if (parts.length !== 3) {
    return;
  }
  const [state, area, place] = parts;
  const prefixes = [
    `/${state}/reports/`,
    `/${state}/${area}/reports/`,
    `/${state}/${area}/${place}/reports/`,
  ];
  for (const prefix of prefixes) {
    setLastmod(pathLastmods, prefix, lastmod);
    setLastmod(pathLastmods, `${prefix}${match[1]}/`, lastmod);
    setLastmod(pathLastmods, `${prefix}${match[1]}/${match[2]}/`, lastmod);
    setLastmod(
      pathLastmods,
      `${prefix}${match[1]}/${match[2]}/${match[3]}/`,
      lastmod,
    );
  }
};

export const buildSitemapLastmodMap = async () => {
  const pathLastmods = new Map();
  const reportCountsByCategory = new Map();
  const reportLastmodsByCategory = new Map();
  const agencyCountsByCategory = new Map();
  const agencyLastmodsByCategory = new Map();
  const personnelCountsByCategory = new Map();
  const personnelLastmodsByCategory = new Map();
  const civilCaseCountsByCategory = new Map();
  const civilCaseLastmodsByCategory = new Map();

  await withDb(async (client) => {
    const reportRows = (
      await client.query(
        `
          select
            r.slug,
            r.incident_date,
            lp.path as location_path,
            lp.state_or_territory_slug as state,
            r.created_at,
            r.updated_at
          from public.reviews r
          join public.location_path lp
            on lp.location_path_id = r.location_path_id
          where r.slug is not null
        `,
      )
    ).rows;

    for (const report of reportRows) {
      const lastmod = getLatestDate(report.updated_at, report.created_at);
      if (!report.state || !report.slug) {
        continue;
      }
      const reportPath = buildReportCanonicalPath(report);
      if (reportPath) {
        setLastmod(pathLastmods, reportPath, lastmod);
      }
      setReportArchiveLastmods(pathLastmods, report, lastmod);
      incrementCount(reportCountsByCategory, report.state);
      setCategoryLastmod(reportLastmodsByCategory, report.state, lastmod);
      setLastmod(pathLastmods, "/report/", lastmod);
    }

    const agencyRows = (
      await client.query(
        `
          with agency_rollup as (
            select
              a.id,
              a.slug,
              lower(a.state) as state,
              a.administrative_area_slug,
              a.place_slug,
              a.created_at,
              a.updated_at,
              count(distinct ao_active.officer_id) as active_personnel_count,
              count(distinct ro.review_id) as report_count,
              max(ao.updated_at) as max_assignment_updated_at,
              max(o.updated_at) as max_officer_updated_at,
              max(r.updated_at) as max_report_updated_at,
              max(c.updated_at) as max_civil_case_updated_at
            from public.agency a
            left join public.agency_officers ao on ao.agency_id = a.id
            left join public.agency_officers ao_active
              on ao_active.agency_id = a.id
             and ao_active.end_date is null
            left join public.officers o on o.id = ao.officer_id
            left join public.review_officers ro on ro.agency_officer_id = ao.id
            left join public.reviews r on r.id = ro.review_id
            left join public.civil_case_officers cco
              on cco.agency_officer_id = ao.id
            left join public.civil_cases c on c.id = cco.civil_case_id
            group by a.id, a.slug, a.state, a.administrative_area_slug,
              a.place_slug, a.created_at, a.updated_at
          )
          select
            *,
            greatest(
              updated_at,
              created_at,
              coalesce(max_assignment_updated_at, updated_at),
              coalesce(max_officer_updated_at, updated_at),
              coalesce(max_report_updated_at, updated_at),
              coalesce(max_civil_case_updated_at, updated_at)
            ) as lastmod
          from agency_rollup
        `,
      )
    ).rows;

    for (const agency of agencyRows) {
      if (!agency.state || !agency.slug) {
        continue;
      }
      if (agency.administrative_area_slug && agency.place_slug && agency.slug) {
        const canonicalPath = requireAgencyCanonicalPath(agency);
        const statePath = `/${agency.state}/`;
        const administrativeAreaPath = `${statePath}${agency.administrative_area_slug}/`;
        const placePath = `${administrativeAreaPath}${agency.place_slug}/`;
        setLastmod(pathLastmods, statePath, agency.lastmod);
        setLastmod(pathLastmods, administrativeAreaPath, agency.lastmod);
        setLastmod(pathLastmods, placePath, agency.lastmod);
        setLastmod(pathLastmods, canonicalPath, agency.lastmod);
      }

      incrementCount(agencyCountsByCategory, agency.state);
      setCategoryLastmod(
        agencyLastmodsByCategory,
        agency.state,
        agency.lastmod,
      );
      setLastmod(pathLastmods, "/law-enforcement-agency/", agency.lastmod);
    }

    const personnelDetailRows = (
      await client.query(
        `
          select
            o.slug,
            greatest(
              o.updated_at,
              o.created_at,
              coalesce(max(ao.updated_at), o.updated_at),
              coalesce(max(a.updated_at), o.updated_at),
              coalesce(max(r.updated_at), o.updated_at),
              coalesce(max(c.updated_at), o.updated_at)
            ) as lastmod
          from public.officers o
          join public.agency_officers ao on ao.officer_id = o.id
          left join public.agency a on a.id = ao.agency_id
          left join public.review_officers ro on ro.agency_officer_id = ao.id
          left join public.reviews r on r.id = ro.review_id
          left join public.civil_case_officers cco on cco.agency_officer_id = ao.id
          left join public.civil_cases c on c.id = cco.civil_case_id
          where o.slug is not null
          group by o.id, o.slug, o.created_at, o.updated_at
        `,
      )
    ).rows;

    for (const officer of personnelDetailRows) {
      if (!officer.slug) {
        continue;
      }
      setLastmod(pathLastmods, `/personnel/${officer.slug}/`, officer.lastmod);
    }

    const personnelCollectionRows = (
      await client.query(
        `
          with active_assignments as (
            select
              ao.id,
              ao.officer_id,
              ao.start_date,
              ao.created_at,
              ao.updated_at,
              lower(a.state) as agency_state,
              a.updated_at as agency_updated_at,
              count(*) over (partition by ao.agency_id) as active_personnel_count
            from public.agency_officers ao
            join public.agency a on a.id = ao.agency_id
            where ao.end_date is null
          ),
          officer_report_counts as (
            select
              ao.officer_id,
              count(distinct ro.review_id) as report_count,
              max(r.updated_at) as max_report_updated_at
            from public.agency_officers ao
            join public.review_officers ro on ro.agency_officer_id = ao.id
            join public.reviews r on r.id = ro.review_id
            group by ao.officer_id
          ),
          officer_civil_case_updates as (
            select
              ao.officer_id,
              max(c.updated_at) as max_civil_case_updated_at
            from public.agency_officers ao
            join public.civil_case_officers cco on cco.agency_officer_id = ao.id
            join public.civil_cases c on c.id = cco.civil_case_id
            group by ao.officer_id
          ),
          ranked_active_assignments as (
            select
              aa.*,
              coalesce(orc.report_count, 0) as report_count,
              row_number() over (
                partition by aa.officer_id
                order by aa.start_date desc nulls last, aa.created_at desc, aa.id desc
              ) as recency_rank
            from active_assignments aa
            left join officer_report_counts orc on orc.officer_id = aa.officer_id
          ),
          selected_assignments as (
            select *
            from ranked_active_assignments
            where recency_rank = 1
          )
          select
            o.slug,
            selected_assignments.agency_state as state,
            greatest(
              o.updated_at,
              o.created_at,
              selected_assignments.updated_at,
              selected_assignments.created_at,
              selected_assignments.agency_updated_at,
              coalesce(officer_report_counts.max_report_updated_at, o.updated_at),
              coalesce(
                officer_civil_case_updates.max_civil_case_updated_at,
                o.updated_at
              )
            ) as lastmod
          from selected_assignments
          join public.officers o on o.id = selected_assignments.officer_id
          left join officer_report_counts
            on officer_report_counts.officer_id = selected_assignments.officer_id
          left join officer_civil_case_updates
            on officer_civil_case_updates.officer_id = selected_assignments.officer_id
          where o.slug is not null
        `,
        [],
      )
    ).rows;

    for (const person of personnelCollectionRows) {
      if (!person.state) {
        continue;
      }
      incrementCount(personnelCountsByCategory, person.state);
      setCategoryLastmod(
        personnelLastmodsByCategory,
        person.state,
        person.lastmod,
      );
      setLastmod(pathLastmods, "/personnel/", person.lastmod);
    }

    const civilCaseRows = (
      await client.query(
        `
          select
            c.slug,
            lp.state_or_territory_slug as state,
            c.created_at,
            c.updated_at
          from public.civil_cases c
          join public.location_path lp
            on lp.location_path_id = c.location_path_id
          where c.slug is not null
        `,
      )
    ).rows;

    for (const civilCase of civilCaseRows) {
      const lastmod = getLatestDate(civilCase.updated_at, civilCase.created_at);
      if (!civilCase.state || !civilCase.slug) {
        continue;
      }
      setLastmod(pathLastmods, `/civil-cases/${civilCase.slug}/`, lastmod);
      incrementCount(civilCaseCountsByCategory, civilCase.state);
      setCategoryLastmod(
        civilCaseLastmodsByCategory,
        civilCase.state,
        lastmod,
      );
      setLastmod(pathLastmods, "/civil-litigation/", lastmod);
    }
  });

  for (const category of CATEGORY_SLUGS) {
    addPaginatedPaths(
      pathLastmods,
      `/law-enforcement-agency/${category}/`,
      agencyCountsByCategory.get(category) || 0,
      agencyLastmodsByCategory.get(category),
    );

    setLastmod(
      pathLastmods,
      `/${category}/`,
      getLatestDate(
        agencyLastmodsByCategory.get(category),
        personnelLastmodsByCategory.get(category),
        civilCaseLastmodsByCategory.get(category),
        reportLastmodsByCategory.get(category),
      ),
    );
  }

  setLastmod(
    pathLastmods,
    "/",
    getLatestDate(
      pathLastmods.get("/report/"),
      pathLastmods.get("/personnel/"),
      pathLastmods.get("/law-enforcement-agency/"),
      pathLastmods.get("/civil-litigation/"),
    ),
  );

  return pathLastmods;
};
