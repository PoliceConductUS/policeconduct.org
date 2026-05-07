import * as Sentry from "@sentry/node";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { GoogleAuth } from "google-auth-library";
import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";

const s3 = new S3Client({});
const sentryDsn = (process.env.SENTRY_DSN || "").trim();
const sentryEnvironment = (process.env.SENTRY_ENVIRONMENT || "").trim();
const sentryRelease = (process.env.SENTRY_RELEASE || "").trim();
const sentryEnabled = sentryDsn.length > 0;

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment || undefined,
    release: sentryRelease || undefined,
  });
}

const ALLOWED_FORM_NAMES = new Set([
  "contact",
  "volunteer",
  "civilLitigationNew",
  "civilLitigationEdit",
  "agencyNew",
  "agencyEdit",
  "personnelNew",
  "officerEdit",
  "dataSubjectAccessRequest",
  "reportNew",
  "videoNew",
  "videoEdit",
]);
const FORMS_WITH_EMAIL_VERIFICATION = new Map([
  ["contact", "email"],
  ["volunteer", "email"],
  ["civilLitigationNew", "reporterEmail"],
  ["civilLitigationEdit", "reporterEmail"],
  ["agencyNew", "submitterEmail"],
  ["agencyEdit", "submitterEmail"],
  ["personnelNew", "submitterEmail"],
  ["officerEdit", "submitterEmail"],
  ["dataSubjectAccessRequest", "email"],
  ["reportNew", "reporterEmail"],
  ["videoNew", "submitterEmail"],
  ["videoEdit", "submitterEmail"],
]);
const PREVIEW_ORIGIN_HOST_RE = /^pr-\d+\.preview\.policeconduct\.org$/;

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

function emailDomain(email) {
  if (typeof email !== "string") {
    return null;
  }
  const [, domain = ""] = email.split("@", 2);
  return domain.trim().toLowerCase() || null;
}

function verificationFailureMessage(reason) {
  const generic =
    "We received your submission, but could not send the verification email. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
  if (sentryEnvironment === "production") {
    return generic;
  }

  switch (reason) {
    case "missing_origin":
      return "We received your submission, but this environment could not build the verification link. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
    case "missing_email":
      return "We received your submission, but no verification email address was present in the request. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
    case "invalid_email":
      return "We received your submission, but the verification email address was invalid. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
    case "send_failed":
      return "We received your submission, but sending the verification email failed in this environment. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
    default:
      return generic;
  }
}

function verificationFailureResponse(requestId, reason) {
  return json(200, {
    message: verificationFailureMessage(reason),
    requestId,
    verificationFailureReason: reason,
    verificationPending: false,
  });
}

function defaultStatusMessage(submissionId, status) {
  const normalizedSubmissionId = normalizeSubmissionId(submissionId);
  const normalizedStatus =
    typeof status === "string" && status.trim().length > 0
      ? status.trim()
      : "pending";
  const identifier = normalizedSubmissionId
    ? `Submission ${normalizedSubmissionId}`
    : "Submission";
  switch (normalizedStatus) {
    case "in_review":
      return `${identifier} status: in_review`;
    case "pending":
      return `${identifier} status: pending`;
    default:
      return `${identifier} status: ${normalizedStatus}`;
  }
}

function pendingStatusPayload(submissionId) {
  return {
    message: defaultStatusMessage(submissionId, "pending"),
    status: "pending",
  };
}

function verificationLinkFailureMessage(message) {
  const detail =
    typeof message === "string" && message.trim() ? `${message.trim()} ` : "";
  return `We could not verify your submission. ${detail}Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.`;
}

function sentryRequestContext(context, extra = {}) {
  return {
    extra: {
      ...extra,
      host: context?.host || null,
      method: context?.method || null,
      path: context?.path || null,
      requestId: context?.requestId || null,
      sourceIp: context?.sourceIp || null,
      stage: context?.stage || null,
      userAgent: context?.userAgent || null,
    },
    tags: {
      area: "forms_api",
      ...(context?.method ? { method: context.method } : {}),
      ...(context?.path ? { path: context.path } : {}),
      ...(context?.stage ? { stage: context.stage } : {}),
    },
  };
}

function captureLambdaException(error, context, extra = {}) {
  if (!sentryEnabled) {
    return;
  }
  Sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    sentryRequestContext(context, extra),
  );
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

function normalizeEmail(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeSubmissionId(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

function normalizeVerificationId(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

function parseVerificationToken(raw) {
  if (typeof raw !== "string") {
    return { verificationId: "", secret: "" };
  }
  const trimmed = raw.trim();
  if (!trimmed.includes(".")) {
    return { verificationId: "", secret: "" };
  }
  const [verificationId, secret] = trimmed.split(".", 2);
  return {
    verificationId: normalizeVerificationId(verificationId),
    secret: typeof secret === "string" ? secret.trim() : "",
  };
}

function normalizeOriginUrl(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return "";
  }
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") {
      return "";
    }
    return url.origin;
  } catch (_error) {
    return "";
  }
}

function getRequestOrigin(event) {
  const headers = event?.headers || {};
  const lowerCaseHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return normalizeOriginUrl(lowerCaseHeaders.origin);
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return false;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "policeconduct.org" ||
      hostname === "www.policeconduct.org"
    ) {
      return true;
    }
    return PREVIEW_ORIGIN_HOST_RE.test(hostname);
  } catch (_error) {
    return false;
  }
}

function corsHeaders(origin) {
  if (!isAllowedOrigin(origin)) {
    return {};
  }
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function withCors(response, origin) {
  if (!response || !isAllowedOrigin(origin)) {
    return response;
  }
  return {
    ...response,
    headers: {
      ...(response.headers || {}),
      ...corsHeaders(origin),
    },
  };
}

function getSiteOrigin(event) {
  const origin = getRequestOrigin(event);
  return isAllowedOrigin(origin) ? origin : "";
}

function verificationConfig() {
  const bucket = process.env.SUBMISSIONS_BUCKET;
  const kmsKeyId = process.env.SUBMISSIONS_KMS_KEY_ID;
  const prefix = process.env.SUBMISSIONS_PREFIX ?? "submissions/";
  const verificationPrefix =
    process.env.SUBMISSIONS_VERIFY_PREFIX ?? `${prefix}verify/`;
  const fromAddress = (
    process.env.EMAIL_VERIFICATION_FROM_ADDRESS || ""
  ).trim();
  const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
  const hmacSecret = (process.env.EMAIL_VERIFICATION_HMAC_SECRET || "").trim();
  const ttlSeconds = Number(
    process.env.EMAIL_VERIFICATION_TTL_SECONDS || "900",
  );

  if (!bucket) {
    throw new Error("Missing SUBMISSIONS_BUCKET");
  }
  if (!kmsKeyId) {
    throw new Error("Missing SUBMISSIONS_KMS_KEY_ID");
  }
  if (!fromAddress) {
    throw new Error("Missing EMAIL_VERIFICATION_FROM_ADDRESS");
  }
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  if (!hmacSecret) {
    throw new Error("Missing EMAIL_VERIFICATION_HMAC_SECRET");
  }

  return {
    bucket,
    fromAddress,
    hmacSecret,
    kmsKeyId,
    prefix,
    resendApiKey,
    ttlMs:
      Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? ttlSeconds * 1000
        : 900000,
    verificationPrefix,
  };
}

function verificationKey(verificationPrefix, verificationId) {
  return `${verificationPrefix}${verificationId}.json`;
}

function hashVerificationSecret(verificationId, secret, hmacSecret) {
  return crypto
    .createHmac("sha256", hmacSecret)
    .update(`${verificationId}:${secret}`)
    .digest("hex");
}

function createVerificationSecret() {
  return crypto.randomBytes(24).toString("base64url");
}

async function readJsonObject(bucket, key) {
  let raw = "";
  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    raw = object?.Body ? await object.Body.transformToString("utf8") : "";
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      (error.code === "NoSuchKey" || error.name === "NoSuchKey")
    ) {
      return null;
    }
    throw error;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch (_error) {
    return null;
  }
}

async function writeJsonObject(bucket, kmsKeyId, key, body) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(body),
      ContentType: "application/json",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
    }),
  );
}

async function saveVerificationRecord(record) {
  const config = verificationConfig();
  const key = verificationKey(config.verificationPrefix, record.verificationId);
  await writeJsonObject(config.bucket, config.kmsKeyId, key, record);
  return { config, key };
}

async function loadVerificationRecord(verificationId) {
  const config = verificationConfig();
  const key = verificationKey(config.verificationPrefix, verificationId);
  const record = await readJsonObject(config.bucket, key);
  return { config, key, record };
}

function verificationExpired(record) {
  const expiresAtMs = new Date(record?.expiresAt || 0).getTime();
  return !expiresAtMs || Date.now() > expiresAtMs;
}

function getVerificationEmail(data, formName) {
  const emailField = FORMS_WITH_EMAIL_VERIFICATION.get(formName);
  if (!emailField) {
    return "";
  }
  return normalizeEmail(data?.[emailField]);
}

async function sendVerificationEmail({
  formName,
  origin,
  submissionId,
  toAddress,
  token,
  ttlMs,
}) {
  const { fromAddress, resendApiKey } = verificationConfig();
  const ttlMinutes = Math.max(1, Math.round(ttlMs / 60000));
  const verifyUrl = `${origin}/verify/?token=${encodeURIComponent(token)}`;
  const subjectPrefix =
    sentryEnvironment && sentryEnvironment !== "production"
      ? `[${sentryEnvironment}] `
      : "";
  const body = [
    "PoliceConduct.org submission verification",
    "",
    "Please verify your submission by opening this link:",
    verifyUrl,
    "",
    `This link expires in ${ttlMinutes} minute${ttlMinutes === 1 ? "" : "s"}.`,
    `Form: ${formName}`,
    "",
    "If you did not request this, you can ignore this email.",
    "This mailbox is not monitored.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      subject: `${subjectPrefix}Verify your PoliceConduct.org submission`,
      tags: [
        { name: "formName", value: formName },
        { name: "submissionId", value: submissionId },
        {
          name: "environment",
          value:
            sentryEnvironment && sentryEnvironment.trim()
              ? sentryEnvironment.trim()
              : "unknown",
        },
      ],
      text: body,
      to: [toAddress],
    }),
    signal: AbortSignal.timeout(5000),
  });

  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    const details =
      payload && typeof payload === "object"
        ? payload.message ||
          payload.error ||
          payload.name ||
          JSON.stringify(payload)
        : "";
    throw new Error(
      `Resend email send failed (${response.status})${details ? `: ${details}` : ""}`,
    );
  }

  return payload;
}

export const __testables = {
  sendVerificationEmail,
  verificationConfig,
};

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

function buildRecaptchaWifCredentials() {
  const serviceAccountEmail = process.env.RECAPTCHA_SERVICE_ACCOUNT_EMAIL;
  const providerResourceName = process.env.RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME;
  const audience = process.env.RECAPTCHA_WIF_AUDIENCE;

  if (!serviceAccountEmail) {
    throw new Error("Missing RECAPTCHA_SERVICE_ACCOUNT_EMAIL");
  }
  if (!providerResourceName) {
    throw new Error("Missing RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME");
  }
  if (!audience) {
    throw new Error("Missing RECAPTCHA_WIF_AUDIENCE");
  }
  if (!audience.endsWith(providerResourceName)) {
    throw new Error(
      "RECAPTCHA_WIF_AUDIENCE must reference RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME",
    );
  }

  // AWS external-account credentials: Lambda role credentials are exchanged for
  // short-lived Google access tokens via workload identity federation.
  return {
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:aws:token-type:aws4_request",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    credential_source: {
      environment_id: "aws1",
      region_url: "http://169.254.169.254/latest/meta-data/placement/region",
      url: "http://169.254.169.254/latest/meta-data/iam/security-credentials",
      regional_cred_verification_url:
        "https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15",
    },
  };
}

async function getRecaptchaClient() {
  if (!recaptchaClientPromise) {
    recaptchaClientPromise = (async () => {
      const auth = new GoogleAuth({
        credentials: buildRecaptchaWifCredentials(),
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      return new RecaptchaEnterpriseServiceClient({ auth });
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
  const projectId = process.env.RECAPTCHA_PROJECT_ID;
  const siteKey = process.env.RECAPTCHA_SITE_KEY;
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || "0.5");

  if (!projectId) {
    return { ok: false, error: "Missing RECAPTCHA_PROJECT_ID" };
  }
  if (!siteKey) {
    return { ok: false, error: "Missing RECAPTCHA_SITE_KEY" };
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

  if (
    typeof draft?.submissionId === "string" &&
    draft.submissionId.trim().length > 0
  ) {
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

async function markDraftSubmitted(draftId, submissionId, requestId, formName) {
  const bucket = process.env.DRAFTS_BUCKET;
  const kmsKeyId = process.env.DRAFTS_KMS_KEY_ID;
  const prefix = process.env.DRAFTS_PREFIX ?? "drafts/";
  if (!draftId || !bucket || !kmsKeyId) {
    return;
  }

  const key = `${prefix}${draftId}.json`;
  let existing = {};
  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const raw = object?.Body ? await object.Body.transformToString("utf8") : "";
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        existing = parsed;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && error.code === "NoSuchKey") {
      return;
    }
    throw error;
  }

  const now = new Date().toISOString();
  const next = {
    ...existing,
    data:
      existing?.data && typeof existing.data === "object" ? existing.data : {},
    updatedAt: now,
    submissionId,
    submittedAt: now,
    submittedFormName: formName,
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(next),
      ContentType: "application/json",
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyId,
    }),
  );

  console.info(
    JSON.stringify({
      msg: "forms.submit.draft_marked_submitted",
      requestId,
      formName,
      draftId,
      key,
    }),
  );
}

async function saveSubmissionStatus(submissionId, status, verificationId) {
  const bucket = process.env.SUBMISSIONS_BUCKET;
  const kmsKeyId = process.env.SUBMISSIONS_KMS_KEY_ID;
  const prefix = process.env.SUBMISSIONS_PREFIX ?? "submissions/";

  if (!bucket || !kmsKeyId) {
    return;
  }

  const key = `${prefix}status/${submissionId}.json`;
  const body = {
    status,
    statusChangedAt: new Date().toISOString(),
    verificationId,
  };
  await writeJsonObject(bucket, kmsKeyId, key, body);
}

async function getSubmissionStatus(event, requestId) {
  const context = {
    ...baseLogContext(event, requestId),
    requestId,
  };
  const path = normalizedPath(event);
  let decodedId = "";
  try {
    decodedId = decodeURIComponent(path.slice("/status/".length));
  } catch (_error) {
    decodedId = path.slice("/status/".length);
  }
  const submissionId = normalizeSubmissionId(decodedId);

  if (!submissionId) {
    return json(200, pendingStatusPayload(""));
  }

  const bucket = process.env.SUBMISSIONS_BUCKET;
  const prefix = process.env.SUBMISSIONS_PREFIX ?? "submissions/";
  const key = `${prefix}status/${submissionId}.json`;

  if (!bucket) {
    return json(200, pendingStatusPayload(submissionId));
  }

  try {
    const parsed = await readJsonObject(bucket, key);
    if (!parsed) {
      return json(200, pendingStatusPayload(submissionId));
    }
    const status =
      typeof parsed.status === "string" && parsed.status.trim().length > 0
        ? parsed.status.trim()
        : "pending";
    const message =
      typeof parsed.message === "string" && parsed.message.trim().length > 0
        ? parsed.message.trim()
        : defaultStatusMessage(submissionId, status);
    return json(200, { status, message });
  } catch (error) {
    captureLambdaException(error, context, {
      key,
      submissionId,
      operation: "get_submission_status",
    });
    console.info(
      JSON.stringify({
        msg: "forms.status.pending_fallback",
        requestId,
        submissionId,
        key,
        error: errorInfo(error),
      }),
    );
    return json(200, pendingStatusPayload(submissionId));
  }
}

async function verifySubmissionLink(event, requestId) {
  const payload = parseJsonBody(event);
  const { verificationId, secret } = parseVerificationToken(payload?.token);

  if (!verificationId || !secret) {
    return json(400, {
      message: verificationLinkFailureMessage("Invalid verification token."),
    });
  }

  const { config, key, record } = await loadVerificationRecord(verificationId);
  if (!record) {
    return json(400, {
      message: verificationLinkFailureMessage("Verification link not found."),
    });
  }
  if (verificationExpired(record)) {
    return json(400, {
      message: verificationLinkFailureMessage("Verification link expired."),
    });
  }
  if (record.usedAt) {
    return json(400, {
      message: verificationLinkFailureMessage(
        "Verification link already used.",
      ),
    });
  }

  const expectedHash = hashVerificationSecret(
    verificationId,
    secret,
    config.hmacSecret,
  );
  if (expectedHash !== record.secretHash) {
    return json(400, {
      message: verificationLinkFailureMessage("Invalid verification token."),
    });
  }

  const verifiedAt = new Date().toISOString();
  const nextRecord = {
    ...record,
    secretHash: "",
    usedAt: verifiedAt,
    verifiedAt,
  };

  await writeJsonObject(config.bucket, config.kmsKeyId, key, nextRecord);
  await saveSubmissionStatus(record.submissionId, "in_review", verificationId);

  console.info(
    JSON.stringify({
      msg: "forms.verify.success",
      requestId,
      submissionId: record.submissionId,
      verificationId,
    }),
  );

  return json(200, {
    message:
      "Your submission has been verified. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.",
    submissionId: record.submissionId,
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
  const draftId =
    typeof payload?.draftId === "string" ? payload.draftId.trim() : "";
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
      hasDraftId: Boolean(draftId),
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

  const expectedAction = `${formName}Submit`;

  const recaptcha = await verifyRecaptchaEnterprise(
    recaptchaToken,
    sourceIp,
    userAgent,
    expectedAction,
  );
  if (!recaptcha.ok) {
    console.info(
      JSON.stringify({
        msg: "forms.submit.recaptcha_failed",
        requestId,
        formName,
        expectedAction,
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

  if (draftId) {
    try {
      await markDraftSubmitted(draftId, submissionId, requestId, formName);
    } catch (error) {
      captureLambdaException(
        error,
        {
          formName,
          requestId,
          stage: event?.requestContext?.stage || null,
        },
        {
          draftId,
          operation: "mark_draft_submitted",
          submissionId,
        },
      );
      console.error(
        JSON.stringify({
          msg: "forms.submit.draft_mark_submitted_failed",
          requestId,
          formName,
          draftId,
          error: errorInfo(error),
        }),
      );
    }
  }

  console.info(
    JSON.stringify({
      msg: "forms.submit.success",
      requestId,
      formName,
      submissionId,
      key,
    }),
  );

  const origin = getSiteOrigin(event);
  const verificationEmail = getVerificationEmail(data, formName);
  if (!verificationEmail || !isValidEmail(verificationEmail) || !origin) {
    const verificationFailureReason = !origin
      ? "missing_origin"
      : !verificationEmail
        ? "missing_email"
        : "invalid_email";
    captureLambdaException(
      new Error(`Verification email not sent: ${verificationFailureReason}`),
      baseLogContext(event, requestId),
      {
        formName,
        operation: "prepare_verification_email",
        submissionId,
        verificationEmailDomain: emailDomain(verificationEmail),
        verificationFailureReason,
      },
    );
    console.warn(
      JSON.stringify({
        msg: "forms.submit.verification_email_not_sent",
        requestId,
        formName,
        hasOrigin: Boolean(origin),
        hasVerificationEmail: Boolean(verificationEmail),
        verificationEmailDomain: emailDomain(verificationEmail),
        verificationFailureReason,
        submissionId,
      }),
    );
    return verificationFailureResponse(requestId, verificationFailureReason);
  }

  const verificationId = createId();
  const secret = createVerificationSecret();
  const config = verificationConfig();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + config.ttlMs).toISOString();

  const verificationRecord = {
    createdAt,
    email: verificationEmail,
    expiresAt,
    formName,
    secretHash: hashVerificationSecret(
      verificationId,
      secret,
      config.hmacSecret,
    ),
    submissionId,
    usedAt: null,
    verificationId,
    verifiedAt: null,
  };

  try {
    await saveVerificationRecord(verificationRecord);
    await sendVerificationEmail({
      formName,
      origin,
      submissionId,
      toAddress: verificationEmail,
      token: `${verificationId}.${secret}`,
      ttlMs: config.ttlMs,
    });
  } catch (error) {
    captureLambdaException(
      error,
      {
        formName,
        requestId,
        stage: event?.requestContext?.stage || null,
      },
      {
        operation: "send_verification_email",
        submissionId,
        verificationId,
      },
    );
    console.error(
      JSON.stringify({
        msg: "forms.submit.verification_email_failed",
        requestId,
        formName,
        submissionId,
        verificationId,
        error: errorInfo(error),
      }),
    );
    return verificationFailureResponse(requestId, "send_failed");
  }

  return json(200, {
    message:
      "We received your submission. Check your email and open the verification link within 15 minutes. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.",
    verificationPending: true,
  });
}

export const handler = async (event) => {
  const requestId = getRequestId(event);
  const context = baseLogContext(event, requestId);
  const requestOrigin = getRequestOrigin(event);
  const allowedOrigin = isAllowedOrigin(requestOrigin) ? requestOrigin : "";
  console.info(
    JSON.stringify({
      msg: "forms.request.received",
      ...context,
      requestOrigin: requestOrigin || null,
    }),
  );

  try {
    const method = context.method || "";
    const path = context.path || "";

    if (method === "OPTIONS") {
      if (!allowedOrigin) {
        console.warn(
          JSON.stringify({
            msg: "forms.request.origin_rejected",
            ...context,
            requestOrigin: requestOrigin || null,
            reason: "origin_not_allowed",
          }),
        );
        return json(403, { error: "Origin not allowed.", requestId });
      }
      return withCors(
        {
          statusCode: 204,
          headers: {
            "cache-control": "no-store",
          },
        },
        allowedOrigin,
      );
    }

    if (method === "GET" && path === "/forms/draft") {
      return withCors(await getDraft(event), allowedOrigin);
    }

    if (method === "POST" && path === "/forms/draft") {
      return withCors(await saveDraft(event), allowedOrigin);
    }

    if (method === "POST" && path === "/forms/submit") {
      if (!allowedOrigin) {
        const originError = new Error(
          "Verification email not sent: missing_origin",
        );
        captureLambdaException(originError, context, {
          operation: "validate_origin",
          requestOrigin: requestOrigin || null,
          verificationFailureReason: "missing_origin",
        });
        console.warn(
          JSON.stringify({
            msg: "forms.submit.origin_rejected",
            ...context,
            requestOrigin: requestOrigin || null,
            verificationFailureReason: "missing_origin",
          }),
        );
        return verificationFailureResponse(requestId, "missing_origin");
      }
      return withCors(await submitForm(event, requestId), allowedOrigin);
    }

    if (method === "POST" && path === "/forms/verify-link") {
      return withCors(
        await verifySubmissionLink(event, requestId),
        allowedOrigin,
      );
    }

    if (method === "GET" && path.startsWith("/status/")) {
      return withCors(
        await getSubmissionStatus(event, requestId),
        allowedOrigin,
      );
    }

    return withCors(
      json(
        405,
        { error: "Method not allowed." },
        { Allow: "GET, POST, OPTIONS" },
      ),
      allowedOrigin,
    );
  } catch (error) {
    const info = errorInfo(error);
    captureLambdaException(error, context);
    console.error(
      JSON.stringify({
        msg: "forms.request.error",
        ...context,
        error: info,
      }),
    );
    return withCors(
      json(500, {
        error: info.message || "Internal server error",
        requestId,
      }),
      allowedOrigin,
    );
  } finally {
    if (sentryEnabled) {
      await Sentry.flush(2000);
    }
  }
};
