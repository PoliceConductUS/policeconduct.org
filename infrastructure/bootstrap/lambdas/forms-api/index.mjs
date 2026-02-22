import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";

const s3 = new S3Client({});
const ALLOWED_FORM_NAMES = new Set([
  "contact",
  "volunteer",
  "issue",
  "civil-litigation-new",
  "civil-litigation-edit-suggestion",
  "agency-new-suggestion",
  "agency-edit-suggestion",
  "personnel-new-suggestion",
  "officer-edit-suggestion",
  "data-subject-access-request",
  "report-new",
]);

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

async function verifyRecaptchaEnterprise(
  token,
  sourceIp,
  userAgent,
  expectedAction,
) {
  const projectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID;
  const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY;
  const siteKey = process.env.RECAPTCHA_ENTERPRISE_SITE_KEY;
  const minScore = Number(process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE || "0.5");
  if (!projectId) {
    return { ok: false, error: "Missing RECAPTCHA_ENTERPRISE_PROJECT_ID" };
  }
  if (!apiKey) {
    return { ok: false, error: "Missing RECAPTCHA_ENTERPRISE_API_KEY" };
  }
  if (!siteKey) {
    return { ok: false, error: "Missing RECAPTCHA_ENTERPRISE_SITE_KEY" };
  }
  if (!token) {
    return { ok: false, error: "Missing reCAPTCHA token." };
  }
  const endpoint = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      event: {
        token,
        siteKey,
        expectedAction,
        userIpAddress: sourceIp || undefined,
        userAgent: userAgent || undefined,
      },
    }),
  });

  if (!response.ok) {
    return { ok: false, error: "Failed to verify reCAPTCHA Enterprise." };
  }

  const result = await response.json();
  if (!result?.tokenProperties?.valid) {
    return { ok: false, error: "Invalid reCAPTCHA token." };
  }
  if (result.tokenProperties.action !== expectedAction) {
    return { ok: false, error: "Invalid reCAPTCHA action." };
  }
  const score = Number(result?.riskAnalysis?.score ?? 0);
  if (!Number.isFinite(score) || score < minScore) {
    return { ok: false, error: "reCAPTCHA risk score too low." };
  }
  return { ok: true, score };
}

async function saveDraft(event) {
  const bucket = process.env.DRAFTS_BUCKET;
  const kmsKeyId = process.env.DRAFTS_KMS_KEY_ID;
  const prefix = process.env.DRAFTS_PREFIX ?? "drafts/";
  const maxDraftBytes = Number(process.env.MAX_DRAFT_BYTES || "1048576");
  if (!bucket) {
    return json(500, { error: "Missing DRAFTS_BUCKET" });
  }
  if (!kmsKeyId) {
    return json(500, { error: "Missing DRAFTS_KMS_KEY_ID" });
  }

  const payload = parseJsonBody(event);
  const data =
    payload?.data && typeof payload.data === "object" ? payload.data : {};
  const dataSize = Buffer.byteLength(JSON.stringify(data), "utf8");

  if (Number.isFinite(maxDraftBytes) && dataSize > maxDraftBytes) {
    return json(413, { error: "Draft payload too large." });
  }

  const draftId = payload?.draftId || crypto.randomUUID();
  const key = `${prefix}${draftId}.json`;
  const updatedAt = new Date().toISOString();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify({ data, updatedAt }),
      ContentType: "application/json",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
    }),
  );

  return json(200, { draftId, updatedAt });
}

async function getDraft(event) {
  const bucket = process.env.DRAFTS_BUCKET;
  const prefix = process.env.DRAFTS_PREFIX ?? "drafts/";
  const activeWindowMs = Number(
    process.env.DRAFT_ACTIVE_WINDOW_MS || "3600000",
  );
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
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    rawDraft = object?.Body ? await object.Body.transformToString("utf8") : "";
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
  const kmsKeyId = process.env.SUBMISSIONS_KMS_KEY_ID;
  const prefix = process.env.SUBMISSIONS_PREFIX ?? "submissions/";
  if (!bucket) {
    return json(500, { error: "Missing SUBMISSIONS_BUCKET" });
  }
  if (!kmsKeyId) {
    return json(500, { error: "Missing SUBMISSIONS_KMS_KEY_ID" });
  }

  const payload = parseJsonBody(event);
  const formName =
    typeof payload?.formName === "string" ? payload.formName.trim() : "";
  const recaptchaToken =
    typeof payload?.recaptchaToken === "string"
      ? payload.recaptchaToken.trim()
      : "";
  const sourceIp = event?.requestContext?.http?.sourceIp ?? null;
  const userAgent = event?.requestContext?.http?.userAgent ?? null;
  if (!formName) {
    return json(400, { error: "Missing required formName." });
  }
  if (!ALLOWED_FORM_NAMES.has(formName)) {
    return json(400, { error: "Unsupported formName." });
  }
  const recaptcha = await verifyRecaptchaEnterprise(
    recaptchaToken,
    sourceIp,
    userAgent,
    `${formName}_submit`,
  );
  if (!recaptcha.ok) {
    return json(400, { error: recaptcha.error });
  }
  const submissionId = createId();
  const receivedAt = new Date().toISOString();
  const receivedDate = receivedAt.slice(0, 10);
  const key = `${prefix}${receivedDate}/${formName}/${submissionId}.json`;

  const record = {
    submissionId,
    receivedAt,
    sourceIp,
    userAgent,
    payload: {
      formName,
      data:
        payload?.data && typeof payload.data === "object" ? payload.data : {},
    },
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(record),
      ContentType: "application/json",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
    }),
  );

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

    return json(
      405,
      { error: "Method not allowed." },
      { Allow: "GET, POST, OPTIONS" },
    );
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
};
