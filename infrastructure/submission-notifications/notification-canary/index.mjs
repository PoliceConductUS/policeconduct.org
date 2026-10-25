/** Reconcile keys only; daily delivery probing retired by board direction (INS-94). */

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
export function parseList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
  const match =
    /^submissions\/(\d{4}-\d{2}-\d{2})\/([^/]+)\/([^/]+)\.json$/.exec(key);
  if (!match) return null;
  return { day: match[1], formName: match[2], submissionId: match[3] };
}

/** `notifications/{YYYY-MM-DD}/{submissionId}-{eventType}.json` */
export function parseReceiptKey(key) {
  const match =
    /^notifications\/(\d{4}-\d{2}-\d{2})\/(.+)-([a-z]+)\.json$/.exec(key);
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
  const verified = new Set(
    submissionKeys
      .map((key) => /^submissions\/status\/([^/]+)\.json$/.exec(key)?.[1])
      .filter(Boolean),
  );
  const announced = new Set(
    receiptKeys
      .map(parseReceiptKey)
      .filter((receipt) => receipt && receipt.eventType === "verified")
      .map((receipt) => receipt.submissionId),
  );

  return submissionKeys
    .map(parseSubmissionKey)
    .filter(Boolean)
    .filter((submission) => !since || submission.day >= since)
    .filter((submission) => verified.has(submission.submissionId))
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
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return keys;
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
      { name: "SubmissionsWithoutNotification", value: missing.length },
    ]);
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "canary.put_metrics_failed",
        error: String(error),
      }),
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
    console.error(JSON.stringify({ msg: "canary.failed", runId, failures }));
  } else {
    console.info(JSON.stringify({ msg: "canary.ok", runId }));
  }

  return {
    runId,
    ok: failures.length === 0,
    missingNotificationCount: missing.length,
    alertIndependent: independence.independent,
    failures,
  };
}
