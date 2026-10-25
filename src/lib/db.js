import "dotenv/config";
import { Pool } from "pg";

import { suppressCauseNumbers } from "./data/cause-number.js";

/** @typedef {import("pg").PoolClient} PgClient */

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to build the site.");
  }
  return url;
};

const getPoolMax = () => {
  const raw = process.env.DATABASE_POOL_MAX;
  if (!raw) {
    return 10;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(
      `DATABASE_POOL_MAX must be a positive integer, got ${raw}.`,
    );
  }
  return parsed;
};

const pool = new Pool({
  allowExitOnIdle: true,
  connectionString: getDatabaseUrl(),
  idleTimeoutMillis: 30_000,
  max: getPoolMax(),
});

/**
 * Every database read the site performs goes through here, which makes this the
 * only place a field-level suppression rule can be complete. `suppressCauseNumbers`
 * is applied to the client, not to a loader, because the surfaces that publish
 * `cause_number` include inline UGC prefill payloads that no template
 * conditional covers (INS-42, INS-18 §11).
 *
 * @template T
 * @param {(client: PgClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export const withDb = async (fn) => {
  const client = await pool.connect();
  try {
    return await fn(suppressCauseNumbers(client));
  } finally {
    client.release();
  }
};
