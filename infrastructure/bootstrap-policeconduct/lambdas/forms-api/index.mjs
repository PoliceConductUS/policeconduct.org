import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";

const s3 = new S3Client({});
const secretsManager = new SecretsManagerClient({});
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

let recaptchaClientPromise;

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

function getRequestId(event) {
  return (
    event?.requestContext?.requestId ||
    event?.headers?.["x-amzn-trace-id"] ||
    crypto.randomUUID()
  );
}

function errorInfo(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
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

function baseLogContext(event, requestId) {
  const headers = event?.headers || {};
  const lowerCaseHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    requestId,
    method: event?.requestContext?.http?.method || null,
    path: normalizedPath(event),
    stage: event?.requestContext?.stage || null,
    host: lowerCaseHeaders.host || null,
    sourceIp: event?.requestContext?.http?.sourceIp || null,
    userAgent: event?.requestContext?.http?.userAgent || null,
  };
}

async function loadRecaptchaCredentialsFromSecret() {
  const secretArn = process.env.RECAPTCHA_SERVICE_ACCOUNT_SECRET_ARN;
  if (!secretArn) {
    throw new Error("Missing RECAPTCHA_SERVICE_ACCOUNT_SECRET_ARN");
  }

  const response = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  if (!response.SecretString) {
    throw new Error("reCAPTCHA service account secret is missing SecretString");
  }

  let parsed;
  try {
    parsed = JSON.parse(response.SecretString);
  } catch (_error) {
    throw new Error("reCAPTCHA service account secret is not valid JSON");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "reCAPTCHA service account secret must include client_email and private_key",
    );
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

async function getRecaptchaClient() {
  if (!recaptchaClientPromise) {
    recaptchaClientPromise = (async () => {
      const credentials = await loadRecaptchaCredentialsFromSecret();
      return new RecaptchaEnterpriseServiceClient({ credentials });
    })();
  }
  return recaptchaClientPromise;
}

async function verifyRecaptchaEnterprise(
  token,
  sourceIp,
  userAgent,
  expectedAction,
) {
  const projectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID;
  const siteKey = process.env.RECAPTCHA_ENTERPRISE_SITE_KEY;
  const minScore = Number(process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE || "0.5");

  if (!projectId) {
    return { ok: false, error: "Missing RECAPTCHA_ENTERPRISE_PROJECT_ID" };
  }
  if (!siteKey) {
    return { ok: false, error: "Missing RECAPTCHA_ENTERPRISE_SITE_KEY" };
  }
  if (!token) {
    return { ok: false, error: "Missing reCAPTCHA token." };
  }

  const client = await getRecaptchaClient();
  const parent = `projects/${projectId}`;

  try {
    const [result] = await client.createAssessment({
      parent,
      assessment: {
        event: {
          token,
          siteKey,
          expectedAction,
          userIpAddress: sourceIp || undefined,
          userAgent: userAgent || undefined,
        },
      },
    });

    if (!result?.tokenProperties?.valid) {
      return {
        ok: false,
        error: "Invalid reCAPTCHA token.",
        details: {
          invalidReason: result?.tokenProperties?.invalidReason ?? null,
        },
      };
    }

    if (result.tokenProperties.action !== expectedAction) {
      return {
        ok: false,
        error: "Invalid reCAPTCHA action.",
        details: {
          action: result?.tokenProperties?.action ?? null,
          expectedAction,
        },
      };
    }

    const score = Number(result?.riskAnalysis?.score ?? 0);
    if (!Number.isFinite(score) || score < minScore) {
      return {
        ok: false,
        error: "reCAPTCHA risk score too low.",
        details: { score, minScore },
      };
    }

    return { ok: true, score, details: { score, minScore } };
  } catch (error) {
    const info = errorInfo(error);
    return {
      ok: false,
      error: "Failed to verify reCAPTCHA Enterprise.",
      details: {
        providerError: info.message,
      },
    };
  }
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

async function submitForm(event, requestId) {
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
  const data =
    payload?.data && typeof payload.data === "object" ? payload.data : {};
  const dataKeys = Object.keys(data);

  console.info(
    JSON.stringify({
      msg: "forms.submit.request",
      requestId,
      formName,
      hasRecaptchaToken: Boolean(recaptchaToken),
      dataFieldCount: dataKeys.length,
      dataFields: dataKeys.slice(0, 50),
      sourceIp,
      userAgent,
    }),
  );

  if (!formName) {
    console.info(
      JSON.stringify({
        msg: "forms.submit.validation_failed",
        requestId,
        reason: "missing_form_name",
      }),
    );
    return json(400, { error: "Missing required formName." });
  }
  if (!ALLOWED_FORM_NAMES.has(formName)) {
    console.info(
      JSON.stringify({
        msg: "forms.submit.validation_failed",
        requestId,
        reason: "unsupported_form_name",
        formName,
      }),
    );
    return json(400, { error: "Unsupported formName." });
  }

  const recaptcha = await verifyRecaptchaEnterprise(
    recaptchaToken,
    sourceIp,
    userAgent,
    `${formName}_submit`,
  );
  if (!recaptcha.ok) {
    console.info(
      JSON.stringify({
        msg: "forms.submit.recaptcha_failed",
        requestId,
        formName,
        expectedAction: `${formName}_submit`,
        error: recaptcha.error,
        details: recaptcha.details || null,
      }),
    );
    return json(400, { error: recaptcha.error });
  }

  console.info(
    JSON.stringify({
      msg: "forms.submit.recaptcha_passed",
      requestId,
      formName,
      score: recaptcha.score ?? null,
    }),
  );

  const submissionId = createId();
  const receivedAt = new Date().toISOString();
  const receivedDate = receivedAt.slice(0, 10);
  const key = `${prefix}${receivedDate}/${formName}/${submissionId}.json`;

  console.info(
    JSON.stringify({
      msg: "forms.submit.s3_put_attempt",
      requestId,
      bucket,
      key,
      hasKmsKeyId: Boolean(kmsKeyId),
    }),
  );

  const record = {
    submissionId,
    receivedAt,
    sourceIp,
    userAgent,
    payload: {
      formName,
      data,
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

  console.info(
    JSON.stringify({
      msg: "forms.submit.success",
      requestId,
      formName,
      submissionId,
      key,
    }),
  );
  return json(200, { submissionId });
}

export const handler = async (event) => {
  const requestId = getRequestId(event);
  const context = baseLogContext(event, requestId);
  console.info(
    JSON.stringify({
      msg: "forms.request.received",
      ...context,
    }),
  );

  try {
    const method = context.method || "";
    const path = context.path || "";

    if (method === "GET" && path === "/forms/draft") {
      return await getDraft(event);
    }

    if (method === "POST" && path === "/forms/draft") {
      return await saveDraft(event);
    }

    if (method === "POST" && path === "/forms/submit") {
      return await submitForm(event, requestId);
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
    const info = errorInfo(error);
    console.error(
      JSON.stringify({
        msg: "forms.request.error",
        ...context,
        error: info,
      }),
    );
    return json(500, {
      error: info.message || "Internal server error",
      requestId,
    });
  }
};
