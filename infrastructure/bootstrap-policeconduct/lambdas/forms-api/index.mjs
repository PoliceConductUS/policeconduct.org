import * as Sentry from "@sentry/node";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { GoogleAuth } from "google-auth-library";
import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";

const s3 = new S3Client({});
const sns = new SNSClient({});
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

/**
 * Message for a verification attempt that did not succeed.
 *
 * The previous version of this appended, to every failure, "Your submission
 * will not be accepted for review unless it is verified." INS-89 found that
 * sentence to be false as written: a human is notified of every submission on
 * receipt, before any verification happens (`notifySubmissionEvent` with
 * eventType "received"), and INS-16 §10 settled that an unverified data
 * subject access request is still a live request. We do not throw unverified
 * submissions away, so we should stop telling people we do — the 45 submitters
 * whose links expired include four asking to have their own information
 * removed, and that sentence told each of them their request was void.
 *
 * It was also a cul-de-sac. The commonest failure by far is an expired link,
 * and the only thing we offered was an unmonitored contact address.
 */
function verificationLinkFailureMessage(message) {
  const detail =
    typeof message === "string" && message.trim() ? `${message.trim()} ` : "";
  return `We could not verify your submission. ${detail}We still have what you sent us. Please contact hello@policeconduct.org if you need help.`;
}

/**
 * Message for an expired link, which is recoverable and should say so.
 *
 * Kept separate from the generic failure text because this is the one failure
 * with an action attached, and the action is the whole point: the submitter
 * must not conclude they have to fill the form in again. Two of the people in
 * the INS-89 sample did exactly that.
 */
function verificationLinkExpiredMessage(ttlMs) {
  return `This verification link has expired. Links stay valid for ${formatApproximateDuration(ttlMs)}. We still have your submission and you do not need to fill the form in again — ask us for a new link below and we will email one to the same address.`;
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

/**
 * Lifetime of a post-submit verification link.
 *
 * The prior value was 15 minutes, written as a bare `900` with no stated
 * reason. INS-89 measured the store: of the 49 submitters who ever verified,
 * the median took 37 seconds — but five used more than ten minutes of the
 * fifteen available, and the slowest used 830 of 900 seconds. A hard wall with
 * a measured tail pressed against it is truncating real people, and two of the
 * 45 lost submitters are visible in the store coming back 47 minutes and 19
 * hours later to fill the whole form in again because their link had died.
 *
 * 24 hours covers one full mail-checking cycle: someone who submits from a
 * phone at 11pm and opens their mail the next morning still has a live link.
 *
 * The security cost of the longer window is small and bounded, which is why
 * this is a cheap knob to turn. The token is single-use, HMAC-bound to one
 * verificationId, and the only thing it authorizes is marking that one
 * submission verified. It grants no read access to the submission, no account,
 * and no power over anyone else's record. Lengthening it ages a bearer token
 * that can still only ever be spent once.
 *
 * Do not reintroduce a bare number here. Anything user-facing that states this
 * duration must render it with `formatApproximateDuration` from this same
 * value, or the published promise and the code drift apart again — which is
 * exactly how the site came to tell submitters "15 minutes" from a string
 * literal sitting two files away from the only real deadline.
 */
const DEFAULT_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;

/**
 * Upper bound on the configured window.
 *
 * Not a security boundary — a typo guard. `EMAIL_VERIFICATION_TTL_SECONDS` is
 * a plain string in Lambda environment config; an extra zero should not mint
 * month-long links silently.
 */
const MAX_VERIFICATION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** How many replacement links one expired link may be traded in for. */
const MAX_VERIFICATION_RESENDS = 3;

/** Minimum gap between two replacement links for the same submission. */
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Render a duration the way a person reading an email would say it.
 *
 * Every user-facing mention of the expiry window goes through here so that
 * changing the TTL changes the sentence. Rounds to the nearest whole unit,
 * because "expires in 23 hours 59 minutes" is not how anyone talks.
 */
function formatApproximateDuration(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }
  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 48) {
    return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  }
  const totalDays = Math.round(totalHours / 24);
  return `${totalDays} day${totalDays === 1 ? "" : "s"}`;
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
    process.env.EMAIL_VERIFICATION_TTL_SECONDS ||
      String(DEFAULT_VERIFICATION_TTL_SECONDS),
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
    ttlMs: resolveVerificationTtlMs(ttlSeconds),
    verificationPrefix,
  };
}

/**
 * Clamp a configured TTL to something sane, falling back to the documented
 * default rather than to a second magic number.
 */
function resolveVerificationTtlMs(ttlSeconds) {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_VERIFICATION_TTL_SECONDS * 1000;
  }
  return Math.min(ttlSeconds, MAX_VERIFICATION_TTL_SECONDS) * 1000;
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

/**
 * Compare two hex digests without leaking where they diverge.
 *
 * `crypto.timingSafeEqual` throws on a length mismatch, and a stored hash is
 * the empty string once a link has been used, so the length guard has to come
 * first and has to be plain equality on a non-secret quantity.
 */
function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length === 0 || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Stamp the verification record with what the mail provider said.
 *
 * INS-89 could not tell deliverability from abandonment for 28 of 45 lost
 * submissions, because the store records that we *tried* to send and nothing
 * about what happened next. Keeping Resend's message id makes the record
 * joinable to Resend's own delivery and bounce history after the fact, which
 * is the cheapest possible step toward answering that question. It is not a
 * substitute for consuming delivery webhooks (INS-89 follow-up) — it is what
 * makes consuming them useful, since without an id there is nothing to join on.
 *
 * Best effort by design: the link is already live and the submitter already has
 * it, so failing to annotate the record must not fail the request.
 */
async function recordVerificationSend(key, record, sendResult, config) {
  const providerMessageId =
    sendResult && typeof sendResult.id === "string" ? sendResult.id : "";
  if (!providerMessageId) {
    return;
  }
  try {
    await writeJsonObject(config.bucket, config.kmsKeyId, key, {
      ...record,
      providerMessageId,
      sentAt: new Date().toISOString(),
    });
  } catch (_error) {
    // Swallowed on purpose. See the note above.
  }
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
  replacement = false,
  submissionId,
  toAddress,
  token,
  ttlMs,
}) {
  const { fromAddress, resendApiKey } = verificationConfig();
  const window = formatApproximateDuration(ttlMs);
  const verifyUrl = `${origin}/verify/?token=${encodeURIComponent(token)}`;
  const subjectPrefix =
    sentryEnvironment && sentryEnvironment !== "production"
      ? `[${sentryEnvironment}] `
      : "";
  const body = [
    replacement
      ? "PoliceConduct.org replacement verification link"
      : "PoliceConduct.org submission verification",
    "",
    ...(replacement
      ? [
          "You asked for a new verification link because the previous one had",
          "expired. Your original submission is still held; you do not need to",
          "fill the form in again.",
          "",
        ]
      : []),
    "Please verify your submission by opening this link:",
    verifyUrl,
    "",
    `This link expires in ${window}.`,
    ...(replacement
      ? ["Any earlier link for this submission no longer works."]
      : []),
    `Form: ${formName}`,
    "",
    "If the link has expired by the time you read this, open it anyway and we",
    "will offer to email you a new one.",
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
      subject: replacement
        ? `${subjectPrefix}Your new PoliceConduct.org verification link`
        : `${subjectPrefix}Verify your PoliceConduct.org submission`,
      tags: [
        { name: "formName", value: formName },
        { name: "submissionId", value: submissionId },
        { name: "replacement", value: replacement ? "true" : "false" },
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

/**
 * Form types that start a statutory response clock on receipt.
 *
 * INS-16 commits the organization to acknowledging a data subject access
 * request within 5 business days of receipt. Whoever holds the queue has to be
 * able to tell a DSAR from a volunteer signup in the notification *subject
 * line*, without opening the object — so this set drives a subject marker, not
 * just a body field.
 */
const CLOCKED_FORM_NAMES = new Set(["dataSubjectAccessRequest"]);

// SNS caps Subject at 100 printable ASCII characters and rejects newlines.
const SNS_SUBJECT_MAX_LENGTH = 100;

function sanitizeSubject(value) {
  // Strip anything SNS will reject, then hard-truncate.
  const flattened = String(value)
    .replace(/[\r\n\t]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flattened.length > SNS_SUBJECT_MAX_LENGTH
    ? flattened.slice(0, SNS_SUBJECT_MAX_LENGTH)
    : flattened;
}

function submissionNotificationSubject({ eventType, formName, submissionId }) {
  const label = (process.env.NOTIFICATION_ENV_LABEL || "").trim();
  const envTag = label ? `[${label.toUpperCase()}] ` : "";
  const clockTag = CLOCKED_FORM_NAMES.has(formName) ? "[DSAR] " : "";
  const action = eventType === "verified" ? "VERIFIED" : "received";
  return sanitizeSubject(
    `${envTag}${clockTag}${formName} ${action} ${submissionId}`,
  );
}

/**
 * The notification is a pointer, never a payload.
 *
 * Submissions can contain names, contact details and free text about named
 * individuals. None of that belongs in an email relayed through SNS to an
 * unknown number of subscribers. The body carries only routing facts: what
 * kind of form, which id, where the object is. Whoever holds the queue reads
 * the contents in S3, under the KMS key and the access controls that already
 * govern it.
 */
function submissionNotificationBody({
  eventType,
  formName,
  submissionId,
  bucket,
  key,
  occurredAt,
}) {
  const lines = [
    `event:        ${eventType}`,
    `formName:     ${formName}`,
    `submissionId: ${submissionId}`,
    `occurredAt:   ${occurredAt}`,
    `bucket:       ${bucket}`,
    `key:          ${key}`,
  ];

  if (CLOCKED_FORM_NAMES.has(formName)) {
    lines.push(
      "",
      "This form type carries a statutory response clock. Per INS-16 the",
      "acknowledgement is due within 5 business days of RECEIPT — the clock",
      "starts at 'received', not at 'verified'.",
    );
  }

  lines.push(
    "",
    "This notification intentionally contains no submission content. Read the",
    "object above in S3.",
  );

  return lines.join("\n");
}

/**
 * Tell a human that a submission arrived.
 *
 * Deliberately non-fatal: by the time this runs the submission is already
 * durably stored, and failing the request would only push the submitter to
 * resubmit and create a duplicate record. A failure here is surfaced through
 * the `forms.notify.*` log lines, which have CloudWatch metric filters and
 * alarms behind them, and through the independent S3 event notification on the
 * bucket, which fires whether or not this code path ran.
 */
async function publishSubmissionNotification({
  eventType,
  formName,
  submissionId,
  bucket,
  key,
  occurredAt,
  requestId,
}) {
  const topicArn = (
    process.env.SUBMISSION_NOTIFICATIONS_TOPIC_ARN || ""
  ).trim();

  if (!topicArn) {
    // This is the INS-20 state: a submission lands and nobody is told. It is
    // logged at warn with its own message so it can alarm rather than sit
    // silently in a log group.
    console.warn(
      JSON.stringify({
        msg: "forms.notify.topic_not_configured",
        requestId,
        eventType,
        formName,
        submissionId,
      }),
    );
    return { published: false, reason: "topic_not_configured" };
  }

  try {
    await sns.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: submissionNotificationSubject({
          eventType,
          formName,
          submissionId,
        }),
        Message: submissionNotificationBody({
          eventType,
          formName,
          submissionId,
          bucket,
          key,
          occurredAt,
        }),
        MessageAttributes: {
          eventType: { DataType: "String", StringValue: eventType },
          formName: { DataType: "String", StringValue: formName },
          statutoryClock: {
            DataType: "String",
            StringValue: String(CLOCKED_FORM_NAMES.has(formName)),
          },
        },
      }),
    );

    console.info(
      JSON.stringify({
        msg: "forms.notify.published",
        requestId,
        eventType,
        formName,
        submissionId,
        key,
      }),
    );
    return { published: true };
  } catch (error) {
    captureLambdaException(
      error,
      { requestId },
      {
        operation: "publish_submission_notification",
        eventType,
        formName,
        submissionId,
      },
    );
    console.error(
      JSON.stringify({
        msg: "forms.notify.publish_failed",
        requestId,
        eventType,
        formName,
        submissionId,
        key,
        error: errorInfo(error),
      }),
    );
    return { published: false, reason: "publish_failed" };
  }
}

/**
 * Who gets told, as a configured value rather than an assumption in code.
 *
 * `hello@policeconduct.org` is the documented fallback channel and is confirmed
 * monitored (INS-16 §14), but it lives in a Google Workspace tenant IPC does
 * not own (INS-55). A mailbox we do not control can stop being read without
 * telling us — that already happened once, undetected for 3.5 months. So the
 * recipient list is configuration, and the canary in lambdas/notification-canary
 * is what asserts the list still terminates at a live mailbox.
 */
function submissionNotificationRecipients() {
  return (process.env.SUBMISSION_NOTIFICATION_RECIPIENTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Send the notification over the transport we can observe.
 *
 * SNS email subscriptions are deliberately NOT the human-facing path. SNS does
 * not report delivery status for the `email` protocol, so a subscription to a
 * mailbox that quietly dies keeps reporting `Confirmed` forever and nobody
 * finds out. That is exactly the INS-55 failure — mail bouncing for 3.5 months,
 * believed live, discovered by accident.
 *
 * Resend reports a per-message `last_event` (`delivered`, `bounced`, ...), so a
 * dead mailbox becomes a machine-checkable fact instead of a belief. It is also
 * already the transport behind the submitter verification email, so this adds
 * no vendor and no spend.
 */
async function sendSubmissionNotificationEmail({
  eventType,
  formName,
  submissionId,
  bucket,
  key,
  occurredAt,
  requestId,
}) {
  const recipients = submissionNotificationRecipients();
  const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromAddress = (
    process.env.SUBMISSION_NOTIFICATION_FROM_ADDRESS ||
    process.env.EMAIL_VERIFICATION_FROM_ADDRESS ||
    ""
  ).trim();

  if (recipients.length === 0) {
    // The INS-20 state, stated out loud: a submission landed and there is
    // nobody to tell. Alarmed on, not merely logged.
    console.warn(
      JSON.stringify({
        msg: "forms.notify.recipients_not_configured",
        requestId,
        eventType,
        formName,
        submissionId,
      }),
    );
    return { sent: false, reason: "recipients_not_configured", recipients };
  }

  if (!resendApiKey || !fromAddress) {
    // Name the variables that are missing rather than logging a derived
    // Boolean of each. Same diagnostic value, more precise, and no expression
    // reading a secret ever reaches a log sink — CodeQL flags
    // `Boolean(resendApiKey)` as clear-text logging of the key, and it is
    // right to: the day someone "improves" that to log a length or a prefix,
    // the log line starts leaking key material and nothing objects.
    const missing = [];
    if (!resendApiKey) missing.push("RESEND_API_KEY");
    if (!fromAddress) {
      missing.push("SUBMISSION_NOTIFICATION_FROM_ADDRESS");
    }
    console.error(
      JSON.stringify({
        msg: "forms.notify.email_misconfigured",
        requestId,
        eventType,
        formName,
        submissionId,
        missingConfig: missing,
      }),
    );
    return { sent: false, reason: "email_misconfigured", recipients };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject: submissionNotificationSubject({
          eventType,
          formName,
          submissionId,
        }),
        text: submissionNotificationBody({
          eventType,
          formName,
          submissionId,
          bucket,
          key,
          occurredAt,
        }),
        tags: [
          { name: "kind", value: "submission_notification" },
          { name: "eventType", value: eventType },
          { name: "formName", value: formName },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `Resend notification send failed (${response.status})${
          payload?.message ? `: ${payload.message}` : ""
        }`,
      );
    }

    const emailId = payload?.id || null;
    console.info(
      JSON.stringify({
        msg: "forms.notify.email_sent",
        requestId,
        eventType,
        formName,
        submissionId,
        emailId,
        recipientCount: recipients.length,
      }),
    );
    return { sent: true, emailId, recipients };
  } catch (error) {
    captureLambdaException(
      error,
      { requestId },
      {
        operation: "send_submission_notification_email",
        eventType,
        formName,
        submissionId,
      },
    );
    console.error(
      JSON.stringify({
        msg: "forms.notify.email_failed",
        requestId,
        eventType,
        formName,
        submissionId,
        error: errorInfo(error),
      }),
    );
    return { sent: false, reason: "email_failed", recipients };
  }
}

/**
 * The receipt prefix sits BESIDE `submissions/`, never under it.
 *
 * Two reasons. The S3 event notification filters on `submissions/2` and
 * `submissions/status/`, so a receipt written under `submissions/` would fire a
 * notification about a notification — an infinite loop billed by the message.
 * And the established invariant that a count over `submissions/<date>/` is a
 * complete count of real submissions (INS-20) must keep holding; a fourth key
 * layout inside that namespace would quietly break it.
 */
const NOTIFICATION_RECEIPTS_PREFIX =
  process.env.NOTIFICATION_RECEIPTS_PREFIX ?? "notifications/";

function notificationReceiptKey({ submissionId, eventType, occurredAt }) {
  const day = String(occurredAt || "").slice(0, 10) || "unknown-date";
  return `${NOTIFICATION_RECEIPTS_PREFIX}${day}/${submissionId}-${eventType}.json`;
}

/**
 * Write down that we told someone, so "did anyone get told?" is answerable.
 *
 * Without this, the only evidence a notification was attempted is a CloudWatch
 * log line that expires. The receipt makes the reconciliation in
 * lambdas/notification-canary possible: list what arrived, list what we
 * announced, and alarm on the difference. That reconciliation runs against real
 * traffic, which is the only check that would have caught the original 104.
 *
 * Contains routing facts and our own staff recipient addresses. No
 * submitter-supplied field, same rule as the notification itself.
 */
async function writeNotificationReceipt({
  bucket,
  kmsKeyId,
  eventType,
  formName,
  submissionId,
  key,
  occurredAt,
  requestId,
  sns,
  email,
}) {
  const receiptKey = notificationReceiptKey({
    submissionId,
    eventType,
    occurredAt,
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: receiptKey,
        Body: JSON.stringify({
          submissionId,
          formName,
          eventType,
          occurredAt,
          submissionKey: key,
          statutoryClock: CLOCKED_FORM_NAMES.has(formName),
          snsPublished: Boolean(sns?.published),
          snsReason: sns?.reason ?? null,
          emailSent: Boolean(email?.sent),
          emailId: email?.emailId ?? null,
          emailReason: email?.reason ?? null,
          recipients: email?.recipients ?? [],
        }),
        ContentType: "application/json",
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: kmsKeyId,
      }),
    );
    return { written: true, key: receiptKey };
  } catch (error) {
    captureLambdaException(
      error,
      { requestId },
      { operation: "write_notification_receipt", submissionId, eventType },
    );
    console.error(
      JSON.stringify({
        msg: "forms.notify.receipt_failed",
        requestId,
        eventType,
        formName,
        submissionId,
        receiptKey,
        error: errorInfo(error),
      }),
    );
    return { written: false, key: receiptKey };
  }
}

/**
 * Tell a human, three ways, and write down that we did.
 *
 * Every step is non-fatal. By the time this runs the submission is durably
 * stored; failing the request would only push the submitter to resubmit and
 * create a duplicate record about a named person. Failures surface through the
 * `forms.notify.*` log lines, their alarms, and the receipt.
 */
async function notifySubmissionEvent({
  eventType,
  formName,
  submissionId,
  bucket,
  key,
  kmsKeyId,
  occurredAt,
  requestId,
}) {
  const sns = await publishSubmissionNotification({
    eventType,
    formName,
    submissionId,
    bucket,
    key,
    occurredAt,
    requestId,
  });

  const email = await sendSubmissionNotificationEmail({
    eventType,
    formName,
    submissionId,
    bucket,
    key,
    occurredAt,
    requestId,
  });

  // Nothing reached a human. This is the condition the whole issue exists to
  // prevent, so it gets its own log line and its own alarm rather than being
  // inferred from the absence of a success line.
  if (!sns.published && !email.sent) {
    console.error(
      JSON.stringify({
        msg: "forms.notify.nobody_told",
        requestId,
        eventType,
        formName,
        submissionId,
        key,
        snsReason: sns.reason ?? null,
        emailReason: email.reason ?? null,
      }),
    );
  }

  const receipt = await writeNotificationReceipt({
    bucket,
    kmsKeyId,
    eventType,
    formName,
    submissionId,
    key,
    occurredAt,
    requestId,
    sns,
    email,
  });

  return { sns, email, receipt };
}

export const __testables = {
  ALLOWED_FORM_NAMES,
  CLOCKED_FORM_NAMES,
  DEFAULT_VERIFICATION_TTL_SECONDS,
  MAX_VERIFICATION_RESENDS,
  MAX_VERIFICATION_TTL_SECONDS,
  NOTIFICATION_RECEIPTS_PREFIX,
  formatApproximateDuration,
  hashVerificationSecret,
  resolveVerificationTtlMs,
  verificationLinkExpiredMessage,
  verificationLinkFailureMessage,
  notificationReceiptKey,
  notifySubmissionEvent,
  publishSubmissionNotification,
  sendSubmissionNotificationEmail,
  sendVerificationEmail,
  submissionNotificationBody,
  submissionNotificationRecipients,
  submissionNotificationSubject,
  submitForm,
  verificationConfig,
  writeNotificationReceipt,
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
      reason: "not_found",
      message: verificationLinkFailureMessage("Verification link not found."),
    });
  }
  if (record.usedAt) {
    return json(400, {
      reason: "already_used",
      message: verificationLinkFailureMessage(
        "That verification link has already been used, so this submission is already verified.",
      ),
    });
  }

  // The secret is checked before the expiry branch, not after. Expiry is now
  // the branch that can mint a replacement link and send mail, so it must sit
  // behind proof that the caller actually holds the link we issued. Checking
  // expiry first — as this did — would let anyone who turned up a
  // verificationId trigger mail to the submitter.
  const expectedHash = hashVerificationSecret(
    verificationId,
    secret,
    config.hmacSecret,
  );
  if (!timingSafeEqualHex(expectedHash, record.secretHash)) {
    return json(400, {
      reason: "invalid_token",
      message: verificationLinkFailureMessage("Invalid verification token."),
    });
  }

  if (verificationExpired(record)) {
    const resendsLeft =
      MAX_VERIFICATION_RESENDS - (Number(record.resendCount) || 0);
    console.info(
      JSON.stringify({
        msg: "forms.verify.expired",
        requestId,
        submissionId: record.submissionId,
        verificationId,
        formName: record.formName || null,
        // How late they were. This is the number that tells us whether the
        // window is still costing us submitters after INS-89 widened it.
        secondsLate: Math.round(
          (Date.now() - new Date(record.expiresAt || 0).getTime()) / 1000,
        ),
        ttlSeconds: Math.round(config.ttlMs / 1000),
        resendCount: Number(record.resendCount) || 0,
      }),
    );
    return json(400, {
      reason: "expired",
      canResend: resendsLeft > 0,
      message:
        resendsLeft > 0
          ? verificationLinkExpiredMessage(config.ttlMs)
          : verificationLinkFailureMessage(
              "This verification link has expired and we have already sent as many replacements as we can.",
            ),
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

  // Second notification: the submitter confirmed their address. A captured but
  // unverified request already started the clock, so this is a state change on
  // an item the queue holder has already seen, not a first sighting.
  await notifySubmissionEvent({
    eventType: "verified",
    formName: record.formName || "unknown",
    submissionId: record.submissionId,
    bucket: config.bucket,
    key: `${config.prefix}status/${record.submissionId}.json`,
    kmsKeyId: config.kmsKeyId,
    occurredAt: verifiedAt,
    requestId,
  });

  console.info(
    JSON.stringify({
      msg: "forms.verify.success",
      requestId,
      submissionId: record.submissionId,
      verificationId,
    }),
  );

  // This used to repeat "Your submission will not be accepted for review
  // unless it is verified" on the *success* path, where it reads as a threat
  // about something the reader has just done. It was also not true. See
  // verificationLinkFailureMessage.
  return json(200, {
    message:
      "Your submission has been verified. We have confirmed this email address belongs to you, which helps us reach you if we have questions about what you sent.",
    submissionId: record.submissionId,
  });
}

/**
 * Trade an expired-but-authentic verification link for a fresh one.
 *
 * This is deliberately not a "resend verification email" form. There is no
 * address input: the caller must present a token whose HMAC matches a
 * verification record we issued, and the replacement goes to the address
 * already stored on that record. That makes the endpoint useless as a mail
 * amplifier — the only mailbox it can reach is one that already received our
 * mail — which is why it needs no reCAPTCHA of its own and can be reached
 * straight from a dead link.
 *
 * Rotating the secret is the point, not a side effect: the expired link stops
 * working the moment a replacement is issued, so a link that leaked out of a
 * forwarded email cannot be redeemed after the submitter has moved on.
 */
async function resendVerificationLink(event, requestId) {
  const payload = parseJsonBody(event);
  const { verificationId, secret } = parseVerificationToken(payload?.token);

  if (!verificationId || !secret) {
    return json(400, {
      reason: "invalid_token",
      message: verificationLinkFailureMessage("Invalid verification token."),
    });
  }

  const origin = getSiteOrigin(event);
  if (!origin) {
    return json(400, {
      reason: "missing_origin",
      message: verificationLinkFailureMessage(
        "We could not build a new link for this request.",
      ),
    });
  }

  const { config, key, record } = await loadVerificationRecord(verificationId);
  if (!record) {
    return json(400, {
      reason: "not_found",
      message: verificationLinkFailureMessage("Verification link not found."),
    });
  }
  if (record.usedAt) {
    return json(400, {
      reason: "already_used",
      message: verificationLinkFailureMessage(
        "That submission is already verified, so there is nothing to send.",
      ),
    });
  }

  const expectedHash = hashVerificationSecret(
    verificationId,
    secret,
    config.hmacSecret,
  );
  if (!timingSafeEqualHex(expectedHash, record.secretHash)) {
    return json(400, {
      reason: "invalid_token",
      message: verificationLinkFailureMessage("Invalid verification token."),
    });
  }

  const resendCount = Number(record.resendCount) || 0;
  if (resendCount >= MAX_VERIFICATION_RESENDS) {
    return json(429, {
      reason: "resend_limit",
      message: verificationLinkFailureMessage(
        "We have already sent as many replacement links as we can for this submission.",
      ),
    });
  }

  const lastResentAtMs = record.lastResentAt
    ? new Date(record.lastResentAt).getTime()
    : 0;
  if (
    lastResentAtMs &&
    Date.now() - lastResentAtMs < VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    return json(429, {
      reason: "resend_cooldown",
      message: verificationLinkFailureMessage(
        "We just sent a new link. Please check your email, including your spam folder, before asking for another.",
      ),
    });
  }

  if (!record.email || !isValidEmail(record.email)) {
    return json(400, {
      reason: "no_address",
      message: verificationLinkFailureMessage(
        "We do not have a usable email address for this submission.",
      ),
    });
  }

  const nextSecret = createVerificationSecret();
  const resentAt = new Date().toISOString();
  const nextRecord = {
    ...record,
    expiresAt: new Date(Date.now() + config.ttlMs).toISOString(),
    lastResentAt: resentAt,
    resendCount: resendCount + 1,
    secretHash: hashVerificationSecret(
      verificationId,
      nextSecret,
      config.hmacSecret,
    ),
  };

  // Write before sending, so a send that half-succeeds cannot leave a live
  // link we have no record of. The cost is that a failed send burns one of the
  // three attempts, which is the safer way round.
  await writeJsonObject(config.bucket, config.kmsKeyId, key, nextRecord);

  try {
    const sendResult = await sendVerificationEmail({
      formName: record.formName || "unknown",
      origin,
      replacement: true,
      submissionId: record.submissionId,
      toAddress: record.email,
      token: `${verificationId}.${nextSecret}`,
      ttlMs: config.ttlMs,
    });
    await recordVerificationSend(key, nextRecord, sendResult, config);
  } catch (error) {
    captureLambdaException(
      error,
      { requestId, stage: event?.requestContext?.stage || null },
      {
        operation: "resend_verification_email",
        submissionId: record.submissionId,
        verificationId,
      },
    );
    console.error(
      JSON.stringify({
        msg: "forms.verify.resend_failed",
        requestId,
        submissionId: record.submissionId,
        verificationId,
        error: errorInfo(error),
      }),
    );
    return json(502, {
      reason: "send_failed",
      message: verificationLinkFailureMessage(
        "We could not send a new link just now.",
      ),
    });
  }

  console.info(
    JSON.stringify({
      msg: "forms.verify.resend_sent",
      requestId,
      submissionId: record.submissionId,
      verificationId,
      formName: record.formName || null,
      resendCount: resendCount + 1,
      // Domain only. The address itself is submitter data and does not belong
      // in a log line, but the provider is the one dimension INS-89 found that
      // actually predicts whether our mail arrives.
      emailDomain: emailDomain(record.email),
    }),
  );

  // Deliberately does not echo the address back. The caller proved they hold
  // the link, not that they are the submitter reading that mailbox.
  return json(200, {
    message: `We have emailed a new verification link to the address on this submission. It is valid for ${formatApproximateDuration(config.ttlMs)}. If it does not arrive, please check your spam folder.`,
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

  // The submission is stored. Tell a human before doing anything else — the
  // receipt clock for a DSAR starts here, not at verification (INS-16 §2).
  await notifySubmissionEvent({
    eventType: "received",
    formName,
    submissionId,
    bucket,
    key,
    kmsKeyId,
    occurredAt: receivedAt,
    requestId,
  });

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
    resendCount: 0,
    submissionId,
    usedAt: null,
    verificationId,
    verifiedAt: null,
  };

  try {
    const { key: verificationRecordKey } =
      await saveVerificationRecord(verificationRecord);
    const sendResult = await sendVerificationEmail({
      formName,
      origin,
      submissionId,
      toAddress: verificationEmail,
      token: `${verificationId}.${secret}`,
      ttlMs: config.ttlMs,
    });
    await recordVerificationSend(
      verificationRecordKey,
      verificationRecord,
      sendResult,
      config,
    );
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

  // The duration is rendered from the one configured TTL, never typed out.
  // The old copy said "within 15 minutes" as a literal, so the deadline in the
  // sentence and the deadline in the code were only ever equal by coincidence.
  //
  // The claim that an unverified submission "will not be accepted for review"
  // is gone because it was false: the submission is already written to S3 and
  // already announced to a human above this line, and INS-16 §10 holds that an
  // unverified data subject access request is a live request. INS-89 ships this
  // wording as the accurate description of what verification actually buys —
  // a confirmed way to reach the submitter — and flags it to the Executive
  // Director as a public representation about how we handle submissions.
  return json(200, {
    message: `We received your submission and have saved it. We have emailed a verification link to the address you gave us — please open it within ${formatApproximateDuration(config.ttlMs)} so we know the address is yours and can reach you about what you sent. If the link has expired by the time you find it, open it anyway and we will offer to email you a new one. Please contact hello@policeconduct.org if you need help.`,
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

    /**
     * Every state-changing route requires an allowed Origin, and is rejected
     * here — before it reaches any handler that writes.
     *
     * A request whose origin we cannot check is untrusted, not exempt. The
     * previous code answered a missing Origin on /forms/submit with a 200 and
     * a "we received your submission" body, which both told an unverified
     * caller their submission had landed when it had not, and skipped
     * reCAPTCHA entirely on that path. POST /forms/draft had no origin check
     * at all.
     *
     * Scoped to POST deliberately. Browsers omit Origin on same-origin GET,
     * and the site's own draft restore (GET /forms/draft) and status polling
     * (GET /status/...) are same-origin GETs, so gating reads on Origin would
     * break real users. Browsers do send Origin on same-origin POST, so every
     * legitimate write from our pages carries one.
     *
     * No Sentry capture here: under a bot flood this fires per request, and a
     * refused unverifiable write is now expected behavior, not an anomaly.
     * The console.warn keeps it in CloudWatch for rate monitoring.
     */
    if (method === "POST" && !allowedOrigin) {
      console.warn(
        JSON.stringify({
          msg: "forms.request.origin_rejected",
          ...context,
          requestOrigin: requestOrigin || null,
          reason: requestOrigin ? "origin_not_allowed" : "missing_origin",
        }),
      );
      return json(403, { error: "Origin not allowed.", requestId });
    }

    if (method === "GET" && path === "/forms/draft") {
      return withCors(await getDraft(event), allowedOrigin);
    }

    if (method === "POST" && path === "/forms/draft") {
      return withCors(await saveDraft(event), allowedOrigin);
    }

    if (method === "POST" && path === "/forms/submit") {
      return withCors(await submitForm(event, requestId), allowedOrigin);
    }

    if (method === "POST" && path === "/forms/verify-link") {
      return withCors(
        await verifySubmissionLink(event, requestId),
        allowedOrigin,
      );
    }

    if (method === "POST" && path === "/forms/resend-verification") {
      return withCors(
        await resendVerificationLink(event, requestId),
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
