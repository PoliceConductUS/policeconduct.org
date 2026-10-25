/**
 * ---------------------------------------------------------------------------
 * The single source of record for agency counts (INS-80).
 *
 * INS-80 was filed as "three stores disagree and none is authoritative". The
 * board resolved the premise rather than the arithmetic (2026-10-25):
 *
 *   "seed.sql is legacy and abandoned - intake repo is the only path to
 *    populate the database - there are not three sources, only one = intake"
 *
 * So this module does not arbitrate between rival stores, because there are
 * none. It records one source of record and classifies anything else presented
 * as a count: abandoned, derived from that store, or unrecognised.
 *
 * Two things still have to be enforced, which is why this is code and not a
 * comment:
 *
 * 1. **Verify we measured the source of record.** A store is identified by its
 *    schema, not its address — ports get forwarded and connection strings get
 *    copied between environments, so `127.0.0.1:54322` proves nothing. The
 *    legacy dump's defining feature is the pre-rename `officers` table.
 *
 * 2. **A derived count is checked live, never recorded.** `build_page_payload`
 *    is a projection of this same store, so the report already knows what it
 *    should say. Comparing against a frozen constant would let the two drift
 *    apart silently; comparing against the measured published-page count
 *    cannot go stale.
 *
 * See `docs/0007-authoritative-agency-store.md`.
 * ---------------------------------------------------------------------------
 */

/**
 * The one store that answers "how many agencies do we hold".
 *
 * Not "the biggest count" and not "the one that was reachable" — the only store
 * the intake pipeline populates, and the one production is built from.
 */
export const SOURCE_OF_RECORD = Object.freeze({
  id: "intake-agency-corpus",
  label: "the intake agency corpus",
  /** The board ruling that made this a premise rather than a judgement call. */
  ruling: Object.freeze({
    on: "2026-10-25",
    by: "board",
    text: "seed.sql is legacy and abandoned - intake repo is the only path to populate the database - there are not three sources, only one = intake",
  }),
  /**
   * Checks that corroborate the ruling, each repeatable by someone else. Kept
   * because the designation should outlast anyone's recollection of the ruling.
   */
  basis: Object.freeze([
    "Intake is the only populate path: intake ADR 0033 sets sql_paths = [] and builds the database from migrations plus the configured sources.",
    "Production serves pages that exist only here. All 237 Oregon agencies are absent from the legacy dump, and /or/linn-county/albany/albany-police-department/ returns 200.",
    "Production serves this store's slugs. Legacy slugs redirect into them — /law-enforcement-agency/mn/minneapolis-police-department-mn-n6rd/ 301s to /mn/hennepin-county/minneapolis/minneapolis-police-dept-gs3yan/.",
    "Its schema is forward of the legacy dump's, which predates the officers-to-personnel rename.",
  ]),
});

/**
 * Tables and columns that together identify the source of record.
 *
 * `absentTables` matters as much as the rest: a store carrying the pre-rename
 * `officers` table is the legacy dump, whatever else it has.
 */
export const SIGNATURE = Object.freeze({
  tables: Object.freeze(["agency", "personnel", "build_page_payload"]),
  columns: Object.freeze([
    Object.freeze({ table: "agency", column: "parent_federal_agency_id" }),
    Object.freeze({ table: "agency", column: "status" }),
  ]),
  absentTables: Object.freeze(["officers", "agency_officers"]),
});

/** What a count that is not the source of record can turn out to be. */
export const STORE_STATUS = Object.freeze({
  /** Agrees with the source of record. Nothing to report. */
  AGREES: "agrees",
  /** A retired artifact. Its count is not a count of record, whatever it says. */
  ABANDONED: "abandoned",
  /** Derived from the source of record, and matches what we measured. */
  DERIVED: "derived",
  /** Derived from the source of record, and does NOT match. A finding. */
  DERIVED_DRIFTED: "derived_drifted",
  /** We cannot say what this store is. A finding. */
  UNRECORDED: "unrecorded",
});

/**
 * Stores that are not the source of record, and what each one is.
 *
 * Note there is deliberately no recorded row count for the abandoned store.
 * Under the board's ruling its number is not a count of record, so storing one
 * would invite exactly the comparison the ruling retired.
 */
export const NON_SOURCE_STORES = Object.freeze([
  Object.freeze({
    id: "legacy-seed-dump",
    label: "legacy seed.sql dump",
    status: STORE_STATUS.ABANDONED,
    /** Free-text labels reach us from `--cross-check`; match loosely. */
    aliases: Object.freeze([/seed\.?sql/i, /seed dump/i, /legacy seed/i]),
    note: "A snapshot of the pre-rename legacy production database, abandoned. Intake is the only path that populates the database (intake ADR 0033), so this file's row count is not a count of record and is not reconciled against. It also lives in no git repository, so it has no diff and no history. The historical decomposition — including why it was long quoted as 3,003 when the file actually holds 3,008 agency rows — is in docs/0007-authoritative-agency-store.md.",
  }),
  Object.freeze({
    id: "build-page-projection",
    label: "build_page_payload agency pages",
    status: STORE_STATUS.DERIVED,
    aliases: Object.freeze([
      /build_page_payload/i,
      /page payload/i,
      /projection/i,
    ]),
    note: "The published subset of the source of record, not another corpus. refresh-build-projections.mjs filters to agencies eligible to render, so this is held minus held-but-not-published. The report measures it directly, so it is checked live rather than recorded.",
  }),
]);

/**
 * @param {string} store
 * @returns {(typeof NON_SOURCE_STORES)[number] | null}
 */
const findStore = (store) =>
  NON_SOURCE_STORES.find((entry) =>
    entry.aliases.some((alias) => alias.test(store)),
  ) ?? null;

/** The reportable view of a store: no RegExps, which serialise to `{}`. */
const forReport = (entry) =>
  entry === null
    ? null
    : Object.freeze({
        id: entry.id,
        label: entry.label,
        status: entry.status,
        note: entry.note,
      });

/**
 * Classify a cross-checked count.
 *
 * The only outcomes that are findings are a derived count that disagrees with
 * what we measured, and a store we cannot identify. An abandoned store is never
 * a finding — that is the whole content of the board's ruling.
 *
 * @param {{ store: string, count: number }} check
 * @param {{ totalHeld: number, publishedAsPages: number | null }} measurement
 */
export const classifyCrossCheck = (check, measurement) => {
  const entry = findStore(check.store);

  if (entry?.status === STORE_STATUS.ABANDONED) {
    return Object.freeze({
      status: STORE_STATUS.ABANDONED,
      storeRecord: forReport(entry),
      detail: null,
    });
  }

  if (entry?.status === STORE_STATUS.DERIVED) {
    // Checked against the number this report measured, so it cannot go stale.
    const published = measurement.publishedAsPages;
    if (published === null) {
      return Object.freeze({
        status: STORE_STATUS.DERIVED_DRIFTED,
        storeRecord: forReport(entry),
        detail: `This run could not measure the published-page count, so ${check.count.toLocaleString("en-US")} cannot be confirmed as a projection of the source of record.`,
      });
    }
    if (published !== check.count) {
      return Object.freeze({
        status: STORE_STATUS.DERIVED_DRIFTED,
        storeRecord: forReport(entry),
        detail: `${entry.label} reports ${check.count.toLocaleString("en-US")}, but this report measured ${published.toLocaleString("en-US")} agencies rendering as pages in the source of record. A projection cannot disagree with the store it projects, so one of the two is out of date.`,
      });
    }
    return Object.freeze({
      status: STORE_STATUS.DERIVED,
      storeRecord: forReport(entry),
      detail: null,
    });
  }

  if (check.count === measurement.totalHeld) {
    return Object.freeze({
      status: STORE_STATUS.AGREES,
      storeRecord: null,
      detail: null,
    });
  }

  return Object.freeze({
    status: STORE_STATUS.UNRECORDED,
    storeRecord: null,
    detail: null,
  });
};

/**
 * Verify the measured store is the source of record, by schema signature.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> }} client
 */
export const verifyAuthoritativeStore = async (client) => {
  const { rows: tableRows } = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public'`,
  );
  const tables = new Set(tableRows.map((row) => row.table_name));

  const { rows: columnRows } = await client.query(
    `select table_name, column_name
       from information_schema.columns
      where table_schema = 'public'`,
  );
  const columns = new Set(
    columnRows.map((row) => `${row.table_name}.${row.column_name}`),
  );

  const missing = [
    ...SIGNATURE.tables.filter((table) => !tables.has(table)),
    ...SIGNATURE.columns
      .map(({ table, column }) => `${table}.${column}`)
      .filter((key) => !columns.has(key)),
  ];
  const unexpected = SIGNATURE.absentTables.filter((table) =>
    tables.has(table),
  );

  return Object.freeze({
    storeId: SOURCE_OF_RECORD.id,
    isAuthoritative: missing.length === 0 && unexpected.length === 0,
    missing: Object.freeze(missing),
    /** Pre-rename tables, whose presence means this is the legacy dump. */
    unexpected: Object.freeze(unexpected),
  });
};
