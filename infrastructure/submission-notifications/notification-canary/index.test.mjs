import assert from "node:assert/strict";
import test from "node:test";

import {
  checkAlertIndependence,
  parseList,
  parseReceiptKey,
  parseSubmissionKey,
  reconcile,
} from "./index.mjs";

test("parseList trims and drops blanks", () => {
  assert.deepEqual(parseList(" a@x.org , ,b@y.org "), ["a@x.org", "b@y.org"]);
  assert.deepEqual(parseList(""), []);
  assert.deepEqual(parseList(undefined), []);
});

test("alert destination overlapping the monitored mailbox is flagged", () => {
  const result = checkAlertIndependence({
    notificationRecipients: ["hello@policeconduct.org"],
    canaryAlertEndpoints: ["HELLO@policeconduct.org"],
  });
  assert.equal(result.independent, false);
  assert.deepEqual(result.overlap, ["HELLO@policeconduct.org"]);
});

test("same-domain alert destination is independent but reported", () => {
  const result = checkAlertIndependence({
    notificationRecipients: ["hello@policeconduct.org"],
    canaryAlertEndpoints: ["ops@policeconduct.org"],
  });
  assert.equal(result.independent, true);
  assert.equal(result.sharesDomain, true);
  assert.deepEqual(result.sharedDomains, ["policeconduct.org"]);
});

test("a genuinely independent destination passes clean", () => {
  const result = checkAlertIndependence({
    notificationRecipients: ["hello@policeconduct.org"],
    canaryAlertEndpoints: ["someone@example.net"],
  });
  assert.equal(result.independent, true);
  assert.equal(result.sharesDomain, false);
});

test("parseSubmissionKey accepts only real submission keys", () => {
  assert.deepEqual(
    parseSubmissionKey(
      "submissions/2026-09-16/dataSubjectAccessRequest/abc123.json",
    ),
    {
      day: "2026-09-16",
      formName: "dataSubjectAccessRequest",
      submissionId: "abc123",
    },
  );
  // Verification and status objects are not submissions and must not be
  // reconciled against, or every verified submission reports as un-notified.
  assert.equal(parseSubmissionKey("submissions/verify/abc123.json"), null);
  assert.equal(parseSubmissionKey("submissions/status/abc123.json"), null);
  assert.equal(
    parseSubmissionKey("notifications/2026-09-16/abc-received.json"),
    null,
  );
});

test("parseReceiptKey splits id and event type", () => {
  assert.deepEqual(
    parseReceiptKey("notifications/2026-09-16/abc123-received.json"),
    {
      day: "2026-09-16",
      submissionId: "abc123",
      eventType: "received",
    },
  );
  assert.deepEqual(
    parseReceiptKey("notifications/2026-09-16/abc123-verified.json"),
    {
      day: "2026-09-16",
      submissionId: "abc123",
      eventType: "verified",
    },
  );
});

test("reconcile finds a submission nobody was told about", () => {
  const missing = reconcile({
    submissionKeys: [
      "submissions/2026-09-16/dataSubjectAccessRequest/told.json",
      "submissions/2026-09-16/reportNew/silent.json",
      "submissions/status/told.json",
      "submissions/status/silent.json",
    ],
    receiptKeys: ["notifications/2026-09-16/told-verified.json"],
    since: "2026-09-01",
  });
  assert.deepEqual(missing, [
    { submissionId: "silent", formName: "reportNew", day: "2026-09-16" },
  ]);
});

test("an arrival receipt does not count as a verified notification", () => {
  const missing = reconcile({
    submissionKeys: [
      "submissions/2026-09-16/dataSubjectAccessRequest/x.json",
      "submissions/status/x.json",
    ],
    receiptKeys: ["notifications/2026-09-16/x-received.json"],
    since: "2026-09-01",
  });
  assert.equal(missing.length, 1);
});

test("submissions predating the cutoff are not alarmed on forever", () => {
  // The 104 historical submissions have no receipts and never will. Alarming on
  // them every run would get the canary muted, which is how monitors die.
  const missing = reconcile({
    submissionKeys: [
      "submissions/2026-03-01/dataSubjectAccessRequest/old.json",
      "submissions/status/old.json",
    ],
    receiptKeys: [],
    since: "2026-09-01",
  });
  assert.deepEqual(missing, []);
});

import { S3Client } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { handler } from "./index.mjs";

test("retired probe makes no provider calls and retains reconciliation and alerts", async (t) => {
  Object.assign(process.env, {
    SUBMISSIONS_BUCKET: "synthetic-test-bucket",
    SUBMISSION_NOTIFICATION_RECIPIENTS: "notifications@example.org",
    CANARY_ALERT_ENDPOINTS: "alerts@example.net",
    CANARY_ALERT_TOPIC_ARN: "synthetic-alert-topic",
    NOTIFICATION_RECEIPTS_SINCE: "2026-10-25",
    RESEND_API_KEY: "synthetic-unused-key",
    SUBMISSION_NOTIFICATION_FROM_ADDRESS: "synthetic@example.org",
  });
  let providerCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    providerCalls++;
    throw new Error("No provider calls permitted");
  });
  const prefixes = [];
  t.mock.method(S3Client.prototype, "send", async (command) => {
    prefixes.push(command.input.Prefix);
    return {
      Contents:
        command.input.Prefix === "submissions/"
          ? [
              {
                Key: "submissions/2026-10-25/dataSubjectAccessRequest/synthetic.json",
              },
              { Key: "submissions/status/synthetic.json" },
            ]
          : [],
    };
  });
  const metrics = [];
  t.mock.method(CloudWatchClient.prototype, "send", async (command) => {
    metrics.push(...command.input.MetricData);
    return {};
  });
  const alerts = [];
  t.mock.method(SNSClient.prototype, "send", async (command) => {
    alerts.push(command.input);
    return {};
  });
  const result = await handler({ runId: "synthetic-retirement-test" });
  assert.equal(providerCalls, 0);
  assert.deepEqual(prefixes.sort(), ["notifications/", "submissions/"]);
  assert.equal(result.missingNotificationCount, 1);
  assert.equal(alerts.length, 1);
  assert.deepEqual(
    metrics.map((m) => m.MetricName),
    ["SubmissionsWithoutNotification"],
  );
  assert.equal(metrics[0].Value, 1);
  assert.equal(result.delivery, undefined);
});

test("unverified requests do not require a staff receipt", () => {
  assert.deepEqual(
    reconcile({
      submissionKeys: [
        "submissions/2026-10-25/dataSubjectAccessRequest/pending.json",
      ],
      receiptKeys: [],
      since: "2026-10-25",
    }),
    [],
  );
});

test("verified requests are reconciled against verified receipts", () => {
  const submissionKeys = [
    "submissions/2026-10-25/dataSubjectAccessRequest/verified.json",
    "submissions/status/verified.json",
  ];
  assert.equal(
    reconcile({ submissionKeys, receiptKeys: [], since: "2026-10-25" }).length,
    1,
  );
  assert.deepEqual(
    reconcile({
      submissionKeys,
      receiptKeys: ["notifications/2026-10-25/verified-verified.json"],
      since: "2026-10-25",
    }),
    [],
  );
});
