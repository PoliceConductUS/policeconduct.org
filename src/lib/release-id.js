import { randomUUID } from "node:crypto";

export const releaseId = process.env.RELEASE_ID || `local-${randomUUID()}`;
