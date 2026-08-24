import assert from "node:assert/strict";
import test from "node:test";

process.env.SENTRY_DSN = "";
process.env.SENTRY_ENVIRONMENT = "";
process.env.SUBMISSIONS_BUCKET = "test-submissions-bucket";
process.env.SUBMISSIONS_KMS_KEY_ID = "test-kms-key";
process.env.EMAIL_VERIFICATION_FROM_ADDRESS = "noreply@mail.policeconduct.org";
process.env.EMAIL_VERIFICATION_HMAC_SECRET = "test-hmac-secret";

const { __testables } = await import("./index.mjs");

test("sendVerificationEmail sends the expected Resend request", async () => {
  process.env.RESEND_API_KEY = "re_test_123";

  const originalFetch = global.fetch;
  let capturedUrl = "";
  let capturedInit = null;
  global.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await __testables.sendVerificationEmail({
      formName: "contact",
      origin: "https://www.policeconduct.org",
      submissionId: "sub_123",
      toAddress: "person@example.org",
      token: "verify.token",
      ttlMs: 900000,
    });

    assert.equal(capturedUrl, "https://api.resend.com/emails");
    assert.equal(capturedInit.method, "POST");
    assert.equal(capturedInit.headers.Authorization, "Bearer re_test_123");

    const requestBody = JSON.parse(capturedInit.body);
    assert.equal(
      requestBody.subject,
      "Verify your PoliceConduct.org submission",
    );
    assert.equal(requestBody.from, "noreply@mail.policeconduct.org");
    assert.deepEqual(requestBody.to, ["person@example.org"]);
    assert.match(
      requestBody.text,
      /https:\/\/www\.policeconduct\.org\/verify\/\?token=verify\.token/,
    );
    assert.deepEqual(requestBody.tags, [
      { name: "formName", value: "contact" },
      { name: "submissionId", value: "sub_123" },
      { name: "environment", value: "unknown" },
    ]);
    assert.deepEqual(result, { id: "email_123" });
  } finally {
    global.fetch = originalFetch;
  }
});

test("sendVerificationEmail surfaces Resend API failures", async () => {
  process.env.RESEND_API_KEY = "re_test_123";

  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ message: "invalid sender" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });

  try {
    await assert.rejects(
      () =>
        __testables.sendVerificationEmail({
          formName: "contact",
          origin: "https://www.policeconduct.org",
          submissionId: "sub_123",
          toAddress: "person@example.org",
          token: "verify.token",
          ttlMs: 900000,
        }),
      /Resend email send failed \(422\): invalid sender/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("verificationConfig requires RESEND_API_KEY", () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    assert.throws(
      () => __testables.verificationConfig(),
      /Missing RESEND_API_KEY/,
    );
  } finally {
    if (previousKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = previousKey;
    }
  }
});

test("submitForm rejects suspended personnel form names before storing anything", async () => {
  for (const formName of ["personnelNew", "officerEdit"]) {
    const response = await __testables.submitForm(
      {
        requestContext: { http: { sourceIp: "203.0.113.10" } },
        body: JSON.stringify({
          formName,
          recaptchaToken: "token",
          data: { submitterEmail: "person@example.org" },
        }),
      },
      "req_test",
    );

    assert.equal(response.statusCode, 403, `${formName} should be rejected`);
    assert.match(
      JSON.parse(response.body).error,
      /paused community submissions about individual personnel/i,
    );
  }
});

test("suspended personnel form names remain known form names", () => {
  for (const formName of __testables.SUSPENDED_FORM_NAMES) {
    assert.ok(
      __testables.ALLOWED_FORM_NAMES.has(formName),
      `${formName} should stay in ALLOWED_FORM_NAMES so re-enabling is one edit`,
    );
  }
});

test("agency and site-wide form names are not suspended", () => {
  for (const formName of [
    "agencyNew",
    "agencyEdit",
    "reportNew",
    "civilLitigationNew",
    "civilLitigationEdit",
    "contact",
    "volunteer",
    "dataSubjectAccessRequest",
  ]) {
    assert.ok(
      !__testables.SUSPENDED_FORM_NAMES.has(formName),
      `${formName} is out of scope for the personnel UGC suspension`,
    );
  }
});

// --- INS-35: submission notification ----------------------------------------
//
// The requirement these cover is not "an email got sent". It is that whoever
// works the queue can tell a DSAR from a volunteer signup by looking at the
// subject line, without opening the object, and can tell a first arrival from a
// verification transition. Both of those are subject-line facts, so they are
// testable without AWS.

test("a DSAR is marked in the subject line", () => {
  const subject = __testables.submissionNotificationSubject({
    eventType: "received",
    formName: "dataSubjectAccessRequest",
    submissionId: "sub_abc123",
  });

  assert.ok(
    subject.includes("[DSAR]"),
    `expected a DSAR marker in ${JSON.stringify(subject)}`,
  );
  assert.ok(subject.includes("sub_abc123"));
});

test("form types without a statutory clock are not marked as DSARs", () => {
  for (const formName of [
    "contact",
    "volunteer",
    "agencyNew",
    "reportNew",
    "civilLitigationNew",
  ]) {
    const subject = __testables.submissionNotificationSubject({
      eventType: "received",
      formName,
      submissionId: "sub_abc123",
    });
    assert.ok(
      !subject.includes("[DSAR]"),
      `${formName} must not be labelled a DSAR: ${subject}`,
    );
  }
});

test("received and verified are distinguishable in the subject line", () => {
  const received = __testables.submissionNotificationSubject({
    eventType: "received",
    formName: "dataSubjectAccessRequest",
    submissionId: "sub_abc123",
  });
  const verified = __testables.submissionNotificationSubject({
    eventType: "verified",
    formName: "dataSubjectAccessRequest",
    submissionId: "sub_abc123",
  });

  assert.notEqual(received, verified);
  assert.ok(received.includes("received"));
  assert.ok(verified.includes("VERIFIED"));
});

test("preview submissions are labelled so a drill is never read as a real request", () => {
  process.env.NOTIFICATION_ENV_LABEL = "preview";
  try {
    const subject = __testables.submissionNotificationSubject({
      eventType: "received",
      formName: "dataSubjectAccessRequest",
      submissionId: "sub_abc123",
    });
    assert.ok(subject.startsWith("[PREVIEW] "), subject);
    assert.ok(subject.includes("[DSAR]"), subject);
  } finally {
    delete process.env.NOTIFICATION_ENV_LABEL;
  }
});

test("the subject stays inside the SNS 100-character ASCII limit", () => {
  const subject = __testables.submissionNotificationSubject({
    eventType: "received",
    formName: "dataSubjectAccessRequest",
    submissionId: "x".repeat(400),
  });

  assert.ok(subject.length <= 100, `subject was ${subject.length} chars`);
  assert.ok(!/[\r\n]/.test(subject));
  assert.match(subject, /^[\x20-\x7E]+$/);
});

test("the notification body carries routing facts and no submission content", () => {
  const body = __testables.submissionNotificationBody({
    eventType: "received",
    formName: "dataSubjectAccessRequest",
    submissionId: "sub_abc123",
    bucket: "policeconduct-submissions-942370948729",
    key: "submissions/2026-08-24/dataSubjectAccessRequest/sub_abc123.json",
    occurredAt: "2026-08-24T12:00:00.000Z",
  });

  assert.ok(body.includes("sub_abc123"));
  assert.ok(body.includes("submissions/2026-08-24/"));
  assert.ok(body.includes("5 business days"));
  // The body is built only from routing arguments, so there is no path by
  // which submitter-supplied fields reach it. Assert the shape that guarantees
  // that: every line is one of the known keys or prose.
  for (const line of body.split("\n")) {
    if (line === "" || !line.includes(":")) {
      continue;
    }
    const field = line.split(":")[0].trim();
    assert.ok(
      [
        "event",
        "formName",
        "submissionId",
        "occurredAt",
        "bucket",
        "key",
      ].includes(field) || /^[A-Z]/.test(line),
      `unexpected field in notification body: ${line}`,
    );
  }
});

test("a missing topic is reported, not swallowed", async () => {
  delete process.env.SUBMISSION_NOTIFICATIONS_TOPIC_ARN;

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (line) => warnings.push(line);

  try {
    const result = await __testables.publishSubmissionNotification({
      eventType: "received",
      formName: "dataSubjectAccessRequest",
      submissionId: "sub_abc123",
      bucket: "b",
      key: "k",
      occurredAt: "2026-08-24T12:00:00.000Z",
      requestId: "req_1",
    });

    assert.deepEqual(result, {
      published: false,
      reason: "topic_not_configured",
    });
    // This log line is what the CloudWatch metric filter and alarm key off. If
    // it is renamed, the alarm silently stops firing.
    assert.equal(warnings.length, 1);
    assert.equal(
      JSON.parse(warnings[0]).msg,
      "forms.notify.topic_not_configured",
    );
  } finally {
    console.warn = originalWarn;
  }
});
