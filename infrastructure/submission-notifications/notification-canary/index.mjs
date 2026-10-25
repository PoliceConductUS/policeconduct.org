/**
 * Notification path canary (INS-35).
 *
 * The notification pipe INS-35 builds is only worth what its liveness is worth.
 * Two channels this organization believed were live turned out to be dead and
 * neither reported it: the submissions bucket told nobody for six months
 * (INS-20), and the Workspace admin mailbox bounced for 3.5 months (INS-55).
 * Both were found by accident. A third instance is not a coincidence, it is the
 * default outcome for any channel nobody asserts on.
 *
 * So this runs on a schedule and asserts two different things:
 *
 *   1. DELIVERY PROBE — send a message down the real notification path to the
 *      real recipients and require the transport to confirm it was *delivered*,
 *      not merely accepted. This is what catches a mailbox that dies in
 *      November. SNS email subscriptions cannot support this check at all: SNS
 *      publishes no delivery status for the `email` protocol, so a subscription
 *      to a dead mailbox reads `Confirmed` forever. Resend reports a per-message
 *      `last_event`, so "did it land" is a fact we can read.
 *
 *   2. RECONCILIATION — over REAL traffic, diff what arrived in the submissions
 *      bucket against the notification receipts written beside it. A submission
 *      with no receipt is the original INS-20 failure happening again, and this
 *      is the check that would have caught it. Synthetic traffic cannot catch
 *      this class; only the real corpus can.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: submit through the public form. Every
 * submission path is gated on a reCAPTCHA Enterprise token, which a scheduled
 * job cannot mint without a browser. The alternative — a bypass header on the
 * submit endpoint — is the exact class of hole INS-21 was filed to close, and
 * is not worth building to make a monitor tidier. Between the delivery probe
 * (transport + mailbox, synthetic) and the reconciliation (form + storage +
 * notify, real traffic), every hop is asserted; no single message traverses all
 * of them at once. That gap is stated here rather than papered over.
 *
 * BOUNDARY: this reads object KEYS only, never object bodies. Submission
 * contents route to the queue holder untouched (INS-9). The reconciliation
 * needs an id and a form name, and both are in the key, so the canary has no
 * business decrypting anything and is not granted KMS decrypt.
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const s3 = new S3Client({});
const sns = new SNSClient({});
const cloudwatch = new CloudWatchClient({});

const METRIC_NAMESPACE = "PoliceConduct/Notifications";
const RESEND_API = "https://api.resend.com/emails";

/** Resend `last_event` values that mean the message reached the mailbox. */
const DELIVERED_EVENTS = new Set(["delivered", "opened", "clicked"]);

/**
 * Terminal failures. `bounced` is the one that matters most — it is the signal
 * that was missing for 3.5 months in INS-55.
 */
const FAILED_EVENTS = new Set([
  "bounced",
  "complained",
  "failed",
  "canceled",
]);

export function parseList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function classifyDeliveryEvent(lastEvent) {
  const event = String(lastEvent || "").toLowerCase();
  if (DELIVERED_EVENTS.has(event)) return "delivered";
  if (FAILED_EVENTS.has(event)) return "failed";
  return "pending";
}

/**
 * A monitor that alerts into the channel it monitors is not a monitor.
 *
 * If the notification mailbox dies, an alert mailed to that same mailbox dies
 * with it and the failure stays invisible — which is precisely how the last two
 * outages lasted months. INS-58 settled this shape for mail: the alert has to
 * terminate somewhere the monitored channel's failure cannot reach. Here that
 * means a different mailbox, and ideally a different domain and tenant, since
 * `policeconduct.org` mail sits in a Workspace tenant IPC does not own.
 */
export function checkAlertIndependence({
  notificationRecipients,
  canaryAlertEndpoints,
}) {
  const monitored = new Set(
    notificationRecipients.map((entry) => entry.toLowerCase()),
  );
  const overlap = canaryAlertEndpoints.filter((entry) =>
    monitored.has(entry.toLowerCase()),
  );
  const monitoredDomains = new Set(
    notificationRecipients
      .map((entry) => entry.split("@")[1]?.toLowerCase())
      .filter(Boolean),
  );
  const sharedDomains = canaryAlertEndpoints
    .map((entry) => entry.split("@")[1]?.toLowerCase())
    .filter((domain) => domain && monitoredDomains.has(domain));

  return {
    independent: overlap.length === 0,
    overlap,
    sharesDomain: sharedDomains.length > 0,
    sharedDomains: [...new Set(sharedDomains)],
  };
}

/**
 * `submissions/{YYYY-MM-DD}/{formName}/{id}.json` — the real submissions.
 * Anything that does not match that exact shape is not a submission and is not
 * reconciled against (`submissions/verify/`, `submissions/status/`).
 */
export function parseSubmissionKey(key) {
  const match = /^submissions\/(\d{4}-\d{2}-\d{2})\/([^/]+)\/([^/]+)\.json$/.exec(
    key,
  );
  if (!match) return null;
  return { day: match[1], formName: match[2], submissionId: match[3] };
}

/** `notifications/{YYYY-MM-DD}/{submissionId}-{eventType}.json` */
export function parseReceiptKey(key) {
  const match = /^notifications\/(\d{4}-\d{2}-\d{2})\/(.+)-([a-z]+)\.json$/.exec(
    key,
  );
  if (!match) return null;
  return { day: match[1], submissionId: match[2], eventType: match[3] };
}

/**
 * Submissions that arrived and were never announced.
 *
 * `since` exists because receipts only start existing when this ships. The 104
 * submissions that predate it have no receipts and never will; without a cutoff
 * the canary would alarm on them forever and be muted within a week, which is
 * how monitors die. Those 104 are INS-16's backlog, handled by a human, not by
 * this.
 */
export function reconcile({ submissionKeys, receiptKeys, since }) {
  const announced = new Set(
    receiptKeys
      .map(parseReceiptKey)
      .filter((receipt) => receipt && receipt.eventType === "received")
      .map((receipt) => receipt.submissionId),
  );

  return submissionKeys
    .map(parseSubmissionKey)
    .filter(Boolean)
    .filter((submission) => !since || submission.day >= since)
    .filter((submission) => !announced.has(submission.submissionId))
    .map((submission) => ({
      submissionId: submission.submissionId,
      formName: submission.formName,
      day: submission.day,
    }));
}

async function listKeys(bucket, prefix) {
  const keys = [];
  let continuationToken;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const object of page.Contents || []) keys.push(object.Key);
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

function canaryBody(runId, recipients) {
  return [
    "This is an automated liveness check of the PoliceConduct.org submission",
    "notification path. No action is required and nothing has gone wrong.",
    "",
    `run: ${runId}`,
    `recipients: ${recipients.join(", ")}`,
    "",
    "Why it exists: a real submission notification and this message travel the",
    "same path. If this mailbox stops working, the check fails and an alert is",
    "sent to a DIFFERENT address, because an alert sent here would die with it.",
    "",
    "If these stop arriving, the notification path is unverified. Say so.",
  ].join("\n");
}

async function sendCanaryEmail({ apiKey, fromAddress, recipients, runId }) {
  const response = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: recipients,
      subject: `[CANARY] submission notification path check ${runId}`,
      text: canaryBody(runId, recipients),
      tags: [{ name: "kind", value: "notification_canary" }],
    }),
    signal: AbortSignal.timeout(10000),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `Resend canary send failed (${response.status})${
        payload?.message ? `: ${payload.message}` : ""
      }`,
    );
  }
  if (!payload?.id) throw new Error("Resend canary send returned no id");
  return payload.id;
}

async function fetchDeliveryEvent({ apiKey, emailId }) {
  const response = await fetch(`${RESEND_API}/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Resend status lookup failed (${response.status})`);
  }
  const payload = await response.json();
  return payload?.last_event || "unknown";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll until the transport commits to an answer.
 *
 * A timeout is reported as `pending`, not as failure. The alarm behind this
 * metric requires two consecutive breaches, so one slow delivery does not page
 * anyone while a genuinely dead mailbox still fails twice in a row and does.
 * A monitor that cries wolf gets muted, and a muted monitor is the state we are
 * trying to leave.
 */
export async function awaitDelivery({
  apiKey,
  emailId,
  attempts = 10,
  intervalMs = 6000,
  now = () => undefined,
  lookup = fetchDeliveryEvent,
  wait = sleep,
}) {
  let lastEvent = "unknown";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastEvent = await lookup({ apiKey, emailId, now });
    const status = classifyDeliveryEvent(lastEvent);
    if (status !== "pending") return { status, lastEvent, attempts: attempt + 1 };
    if (attempt < attempts - 1) await wait(intervalMs);
  }
  return { status: "pending", lastEvent, attempts };
}

async function putMetrics(environment, metrics) {
  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: METRIC_NAMESPACE,
      MetricData: metrics.map((metric) => ({
        MetricName: metric.name,
        Value: metric.value,
        Unit: metric.unit || "None",
        Dimensions: [{ Name: "Environment", Value: environment }],
      })),
    }),
  );
}

async function alertOutOfBand({ topicArn, subject, body }) {
  if (!topicArn) {
    console.error(
      JSON.stringify({
        msg: "canary.alert_topic_not_configured",
        subject,
      }),
    );
    return false;
  }
  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: subject.slice(0, 100),
      Message: body,
    }),
  );
  return true;
}

export async function handler(event = {}) {
  const runId = event.runId || `canary-${Math.floor(Date.now() / 1000)}`;
  const environment = (process.env.CANARY_ENVIRONMENT || "production").trim();
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromAddress = (
    process.env.SUBMISSION_NOTIFICATION_FROM_ADDRESS ||
    process.env.EMAIL_VERIFICATION_FROM_ADDRESS ||
    ""
  ).trim();
  const recipients = parseList(process.env.SUBMISSION_NOTIFICATION_RECIPIENTS);
  const alertTopicArn = (process.env.CANARY_ALERT_TOPIC_ARN || "").trim();
  const alertEndpoints = parseList(process.env.CANARY_ALERT_ENDPOINTS);
  const bucket = (process.env.SUBMISSIONS_BUCKET || "").trim();
  const receiptsSince = (process.env.NOTIFICATION_RECEIPTS_SINCE || "").trim();

  const failures = [];

  const independence = checkAlertIndependence({
    notificationRecipients: recipients,
    canaryAlertEndpoints: alertEndpoints,
  });
  if (!independence.independent) {
    // Not fatal to the run, but it means the alert cannot be trusted to escape
    // the failure it reports. Loud, and in the alert body itself.
    console.error(
      JSON.stringify({
        msg: "canary.alert_destination_not_independent",
        overlap: independence.overlap,
      }),
    );
  }

  let delivery = { status: "skipped", lastEvent: null };
  if (!apiKey || !fromAddress || recipients.length === 0) {
    delivery = { status: "misconfigured", lastEvent: null };
    failures.push(
      `delivery probe not runnable: ${
        recipients.length === 0
          ? "SUBMISSION_NOTIFICATION_RECIPIENTS is empty — nobody is being told"
          : "missing Resend credentials or from address"
      }`,
    );
  } else {
    try {
      const emailId = await sendCanaryEmail({
        apiKey,
        fromAddress,
        recipients,
        runId,
      });
      delivery = await awaitDelivery({ apiKey, emailId });
      delivery.emailId = emailId;
      console.info(
        JSON.stringify({
          msg: "canary.delivery_probe",
          runId,
          emailId,
          status: delivery.status,
          lastEvent: delivery.lastEvent,
        }),
      );
      if (delivery.status === "failed") {
        failures.push(
          `notification email to [${recipients.join(", ")}] was not delivered ` +
            `(transport reported "${delivery.lastEvent}"). The notification ` +
            `path is DOWN: a submission arriving now would tell nobody.`,
        );
      } else if (delivery.status === "pending") {
        failures.push(
          `notification email to [${recipients.join(", ")}] was accepted but ` +
            `delivery was never confirmed (last event "${delivery.lastEvent}").`,
        );
      }
    } catch (error) {
      delivery = { status: "error", lastEvent: null, error: String(error) };
      failures.push(`delivery probe threw: ${error}`);
    }
  }

  let missing = [];
  if (bucket) {
    try {
      const [submissionKeys, receiptKeys] = await Promise.all([
        listKeys(bucket, "submissions/"),
        listKeys(bucket, "notifications/"),
      ]);
      missing = reconcile({
        submissionKeys,
        receiptKeys,
        since: receiptsSince,
      });
      console.info(
        JSON.stringify({
          msg: "canary.reconcile",
          runId,
          submissionCount: submissionKeys.length,
          receiptCount: receiptKeys.length,
          missingCount: missing.length,
          since: receiptsSince || null,
        }),
      );
      if (missing.length > 0) {
        failures.push(
          `${missing.length} submission(s) stored with no notification ` +
            `receipt: ${missing
              .map((item) => `${item.formName}/${item.submissionId}`)
              .join(", ")}`,
        );
      }
    } catch (error) {
      failures.push(`reconciliation threw: ${error}`);
    }
  }

  try {
    await putMetrics(environment, [
      { name: "CanaryDelivered", value: delivery.status === "delivered" ? 1 : 0 },
      { name: "SubmissionsWithoutNotification", value: missing.length },
    ]);
  } catch (error) {
    console.error(
      JSON.stringify({ msg: "canary.put_metrics_failed", error: String(error) }),
    );
  }

  if (failures.length > 0) {
    const body = [
      "The submission notification path failed its scheduled check.",
      "",
      ...failures.map((failure) => `- ${failure}`),
      "",
      independence.independent
        ? ""
        : "WARNING: this alert is configured to go to an address that is ALSO " +
          "a notification recipient, so it may be dying in the same mailbox " +
          "it is reporting on. Fix the canary alert destination.",
      "",
      `run: ${runId}`,
      "INS-35. Nobody is reliably being told about submissions until this clears.",
    ].join("\n");

    await alertOutOfBand({
      topicArn: alertTopicArn,
      subject: `[ALERT] submission notification path check FAILED`,
      body,
    });
    console.error(
      JSON.stringify({ msg: "canary.failed", runId, failures }),
    );
  } else {
    console.info(JSON.stringify({ msg: "canary.ok", runId }));
  }

  return {
    runId,
    ok: failures.length === 0,
    delivery,
    missingNotificationCount: missing.length,
    alertIndependent: independence.independent,
    failures,
  };
}
