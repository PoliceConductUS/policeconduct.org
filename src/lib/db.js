import "dotenv/config";
import { Client } from "pg";

/** @typedef {import("pg").Client} PgClient */

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to build the site.");
  }
  return url;
};

/**
 * @template T
 * @param {(client: PgClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export const withDb = async (fn) => {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};
