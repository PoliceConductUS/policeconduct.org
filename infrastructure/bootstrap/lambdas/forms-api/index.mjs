import AWS from "aws-sdk";
import crypto from "crypto";

const s3 = new AWS.S3();

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function parseJsonBody(event) {
  if (!event?.body) {
    return {};
  }
  try {
    return JSON.parse(event.body);
  } catch (_error) {
    return {};
  }
}

function normalizedPath(event) {
  const raw = event?.rawPath || event?.requestContext?.http?.path || "";
  return raw.startsWith("/api/") ? raw.slice(4) : raw;
}

async function saveDraft(event) {
  const bucket = process.env.DRAFTS_BUCKET;
  const prefix = process.env.DRAFTS_PREFIX ?? "drafts/";
  const maxDraftBytes = Number(process.env.MAX_DRAFT_BYTES || "1048576");
  if (!bucket) {
    return json(500, { error: "Missing DRAFTS_BUCKET" });
  }

  const payload = parseJsonBody(event);
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const dataSize = Buffer.byteLength(JSON.stringify(data), "utf8");

  if (Number.isFinite(maxDraftBytes) && dataSize > maxDraftBytes) {
    return json(413, { error: "Draft payload too large." });
  }

  const draftId = payload?.draftId || crypto.randomUUID();
  const key = `${prefix}${draftId}.json`;
  const updatedAt = new Date().toISOString();

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify({ data, updatedAt }),
      ContentType: "application/json",
    })
    .promise();

  return json(200, { draftId, updatedAt });
}

async function getDraft(event) {
  const bucket = process.env.DRAFTS_BUCKET;
  const prefix = process.env.DRAFTS_PREFIX ?? "drafts/";
  const activeWindowMs = Number(process.env.DRAFT_ACTIVE_WINDOW_MS || "3600000");
  const draftId = event?.queryStringParameters?.draftId || "";

  if (!bucket) {
    return json(500, { error: "Missing DRAFTS_BUCKET" });
  }

  if (!draftId) {
    return json(200, {});
  }

  const key = `${prefix}${draftId}.json`;
  let rawDraft = "";

  try {
    const object = await s3
      .getObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
    rawDraft = object?.Body ? object.Body.toString("utf8") : "";
  } catch (error) {
    if (error && typeof error === "object" && error.code === "NoSuchKey") {
      return json(200, {});
    }
    throw error;
  }

  if (!rawDraft) {
    return json(200, {});
  }

  let draft;
  try {
    draft = JSON.parse(rawDraft);
  } catch (_error) {
    return json(200, {});
  }

  const updatedAtMs = new Date(draft?.updatedAt || 0).getTime();
  if (!updatedAtMs || Date.now() - updatedAtMs > activeWindowMs) {
    return json(200, {});
  }

  return json(200, {
    draftId,
    data: draft.data || {},
    updatedAt: draft.updatedAt,
  });
}

async function submitForm(event) {
  const bucket = process.env.SUBMISSIONS_BUCKET;
  const prefix = process.env.SUBMISSIONS_PREFIX ?? "submissions/";
  if (!bucket) {
    return json(500, { error: "Missing SUBMISSIONS_BUCKET" });
  }

  const payload = parseJsonBody(event);
  const submissionId = payload?.submissionId || crypto.randomUUID();
  const key = `${prefix}${submissionId}.json`;

  const record = {
    submissionId,
    receivedAt: new Date().toISOString(),
    sourceIp: event?.requestContext?.http?.sourceIp ?? null,
    userAgent: event?.requestContext?.http?.userAgent ?? null,
    payload,
  };

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(record),
      ContentType: "application/json",
    })
    .promise();

  return json(200, { submissionId });
}

export const handler = async (event) => {
  try {
    const method = event?.requestContext?.http?.method || "";
    const path = normalizedPath(event);

    if (method === "GET" && path === "/forms/draft") {
      return await getDraft(event);
    }

    if (method === "POST" && path === "/forms/draft") {
      return await saveDraft(event);
    }

    if (method === "POST" && path === "/forms/submit") {
      return await submitForm(event);
    }

    if (method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "cache-control": "no-store",
        },
      };
    }

    return json(405, { error: "Method not allowed." }, { Allow: "GET, POST, OPTIONS" });
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
};
