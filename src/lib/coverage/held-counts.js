/**
 * ---------------------------------------------------------------------------
 * What we actually hold: the numerator side of the coverage report.
 *
 * This module answers exactly one question — how many agency records are in the
 * corpus, broken down by state — and it records where the answer came from.
 *
 * Two design rules, both learned the hard way:
 *
 * 1. A count without the identity of the store it came from is not a fact. We
 *    have three stores that disagree about how many agencies we hold (the
 *    production site database, the local intake re-import, and the seed dump).
 *    Every measurement therefore carries the database it was taken from, the
 *    time it was taken, and a corpus fingerprint, so a stale number cannot be
 *    quoted as a current one.
 *
 * 2. Query only what the schema contract guarantees. `agency.state` is in
 *    `scripts/validate-schema-contract.mjs` and is NOT NULL, so it is safe
 *    everywhere. Anything else — the federal parent pointer, the page payload
 *    table — is probed first and its absence becomes a recorded limitation
 *    rather than a crash or, worse, a silently wrong number.
 * ---------------------------------------------------------------------------
 */

/** Columns and tables we use when present but will not fail without. */
const OPTIONAL = Object.freeze({
  FEDERAL_PARENT: "agency.parent_federal_agency_id",
  PAGE_PAYLOAD: "build_page_payload",
});

const columnExists = async (client, table, column) => {
  const { rows } = await client.query(
    `select 1
       from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
};

const tableExists = async (client, table) => {
  const { rows } = await client.query(
    `select 1
       from information_schema.tables
      where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return rows.length > 0;
};

/**
 * Identity of the store, so a reader can tell production from a re-import.
 * Deliberately does not capture the connection string — it holds credentials.
 */
const describeDatabase = async (client) => {
  const { rows } = await client.query(
    `select current_database()                       as database,
            coalesce(host(inet_server_addr()), 'local-socket') as host,
            inet_server_port()                       as port`,
  );
  return Object.freeze({ ...rows[0] });
};

/**
 * A cheap corpus fingerprint. Two measurements with the same row count and the
 * same newest `updated_at` are the same corpus; different ones are not. The
 * shared dev database gets reset without warning, so a count that cannot be
 * tied to a corpus state is a count that cannot be trusted a day later.
 */
const asIso = (value) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

const fingerprintCorpus = async (client) => {
  const { rows } = await client.query(
    `select count(*)::int        as rows,
            max(updated_at)      as newest_updated_at,
            min(created_at)      as oldest_created_at
       from public.agency`,
  );
  return Object.freeze({
    ...rows[0],
    // pg hands back Date objects; a locale-formatted timestamp in a report that
    // gets quoted elsewhere is not a timestamp anyone can compare.
    newest_updated_at: asIso(rows[0].newest_updated_at),
    oldest_created_at: asIso(rows[0].oldest_created_at),
  });
};

/**
 * Held agency counts by USPS state code.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> }} client
 * @param {{ now?: Date }} [options]
 */
export const measureHeldAgencies = async (
  client,
  { now = new Date(), connectionTarget = null } = {},
) => {
  const limitations = [];

  const hasFederalParent = await columnExists(
    client,
    "agency",
    "parent_federal_agency_id",
  );
  const hasPagePayload = await tableExists(client, "build_page_payload");

  if (!hasFederalParent) {
    limitations.push({
      missing: OPTIONAL.FEDERAL_PARENT,
      consequence:
        "Federal agency records cannot be separated from state and local ones. The BJS denominators count state and local agencies only, so any federal records we hold inflate the numerator by an unknown amount.",
    });
  }
  if (!hasPagePayload) {
    limitations.push({
      missing: OPTIONAL.PAGE_PAYLOAD,
      consequence:
        "Cannot distinguish agencies held in the database from agencies that actually render as public pages. Held is not the same as published and this run cannot report the difference.",
    });
  }

  // The server reports its own address, which inside a container is a private
  // address that identifies nothing. `connectionTarget` is the host and port we
  // actually dialled, which is what distinguishes production from a local
  // re-import — the single most important fact about any count in this report.
  const database = Object.freeze({
    ...(await describeDatabase(client)),
    connectedTo: connectionTarget,
  });
  const fingerprint = await fingerprintCorpus(client);

  // `state` is NOT NULL under the schema contract, but trim and upper-case
  // anyway: a state code that differs only by case or whitespace would split
  // one state into two rows and quietly understate it.
  const { rows: stateRows } = await client.query(
    `select upper(btrim(state)) as code, count(*)::int as held
       from public.agency
      group by upper(btrim(state))
      order by count(*) desc, upper(btrim(state)) asc`,
  );

  const federal = hasFederalParent
    ? (
        await client.query(
          `select count(*)::int as held
             from public.agency
            where parent_federal_agency_id is not null`,
        )
      ).rows[0].held
    : null;

  const published = hasPagePayload
    ? (
        await client.query(
          `select count(*)::int as published
             from public.agency a
             join public.build_page_payload bpp
               on bpp.entity_id = a.id and bpp.page_type = 'agency'`,
        )
      ).rows[0].published
    : null;

  const totalHeld = stateRows.reduce((sum, row) => sum + row.held, 0);

  return Object.freeze({
    measuredAt: now.toISOString(),
    database,
    fingerprint,
    totalHeld,
    federalHeld: federal,
    publishedAsPages: published,
    byState: Object.freeze(
      stateRows.map((row) => Object.freeze({ code: row.code, held: row.held })),
    ),
    limitations: Object.freeze(limitations),
  });
};
