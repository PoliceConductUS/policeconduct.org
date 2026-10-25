import assert from "node:assert/strict";
import test from "node:test";

import {
  awaitDelivery,
  checkAlertIndependence,
  classifyDeliveryEvent,
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

test("a bounce is a failure, not a pending state", () => {
  // This is the INS-55 signal. If it ever classifies as pending the canary
  // waits forever and reports nothing, which is the failure it exists to catch.
  assert.equal(classifyDeliveryEvent("bounced"), "failed");
  assert.equal(classifyDeliveryEvent("complained"), "failed");
  assert.equal(classifyDeliveryEvent("delivered"), "delivered");
  assert.equal(classifyDeliveryEvent("sent"), "pending");
  assert.equal(classifyDeliveryEvent("queued"), "pending");
  assert.equal(classifyDeliveryEvent(undefined), "pending");
});

test("accepted-but-not-delivered is not success", () => {
  // Resend "sent" means the API accepted it. INS-16 exists because a 200 was
  // read as proof of an outcome it does not prove.
  assert.notEqual(classifyDeliveryEvent("sent"), "delivered");
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
    parseSubmissionKey("submissions/2026-09-16/dataSubjectAccessRequest/abc123.json"),
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
  assert.equal(parseSubmissionKey("notifications/2026-09-16/abc-received.json"), null);
});

test("parseReceiptKey splits id and event type", () => {
  assert.deepEqual(parseReceiptKey("notifications/2026-09-16/abc123-received.json"), {
    day: "2026-09-16",
    submissionId: "abc123",
    eventType: "received",
  });
  assert.deepEqual(parseReceiptKey("notifications/2026-09-16/abc123-verified.json"), {
    day: "2026-09-16",
    submissionId: "abc123",
    eventType: "verified",
  });
});

test("reconcile finds a submission nobody was told about", () => {
  const missing = reconcile({
    submissionKeys: [
      "submissions/2026-09-16/dataSubjectAccessRequest/told.json",
      "submissions/2026-09-16/reportNew/silent.json",
    ],
    receiptKeys: ["notifications/2026-09-16/told-received.json"],
    since: "2026-09-01",
  });
  assert.deepEqual(missing, [
    { submissionId: "silent", formName: "reportNew", day: "2026-09-16" },
  ]);
});

test("a verified-only receipt does not count as having been told on arrival", () => {
  const missing = reconcile({
    submissionKeys: ["submissions/2026-09-16/dataSubjectAccessRequest/x.json"],
    receiptKeys: ["notifications/2026-09-16/x-verified.json"],
    since: "2026-09-01",
  });
  assert.equal(missing.length, 1);
});

test("submissions predating the cutoff are not alarmed on forever", () => {
  // The 104 historical submissions have no receipts and never will. Alarming on
  // them every run would get the canary muted, which is how monitors die.
  const missing = reconcile({
    submissionKeys: ["submissions/2026-03-01/dataSubjectAccessRequest/old.json"],
    receiptKeys: [],
    since: "2026-09-01",
  });
  assert.deepEqual(missing, []);
});

test("awaitDelivery stops as soon as the transport commits", async () => {
  let calls = 0;
  const result = await awaitDelivery({
    apiKey: "k",
    emailId: "e",
    attempts: 5,
    lookup: async () => {
      calls += 1;
      return calls < 2 ? "sent" : "delivered";
    },
    wait: async () => {},
  });
  assert.equal(result.status, "delivered");
  assert.equal(calls, 2);
});

test("awaitDelivery reports pending rather than inventing a verdict", async () => {
  const result = await awaitDelivery({
    apiKey: "k",
    emailId: "e",
    attempts: 3,
    lookup: async () => "sent",
    wait: async () => {},
  });
  assert.equal(result.status, "pending");
  assert.equal(result.attempts, 3);
});

test("awaitDelivery surfaces a bounce immediately", async () => {
  const result = await awaitDelivery({
    apiKey: "k",
    emailId: "e",
    attempts: 5,
    lookup: async () => "bounced",
    wait: async () => {},
  });
  assert.equal(result.status, "failed");
  assert.equal(result.lastEvent, "bounced");
  assert.equal(result.attempts, 1);
});
