import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVerificationLossReport,
  classifyUnusedLinks,
  emailDomainOf,
  isPlaceholderAddress,
  issuedTtlSeconds,
  mailboxProviderOf,
  tailPressure,
  verifyLatencySeconds,
} from "./loss-report.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

let sequence = 0;

/**
 * A verification record as stored under `verify/`.
 *
 * `issuedAt` is relative so tests read as a timeline rather than as dates.
 */
function link({
  issuedAtMs = 0,
  ttlMs = 24 * HOUR,
  usedAfterMs = null,
  email = `person${(sequence += 1)}@example.org`,
  formName = "reportNew",
  ...rest
}) {
  const createdAt = new Date(1_800_000_000_000 + issuedAtMs).toISOString();
  return {
    createdAt,
    email,
    expiresAt: new Date(1_800_000_000_000 + issuedAtMs + ttlMs).toISOString(),
    formName,
    resendCount: 0,
    submissionId: `sub_${sequence}`,
    usedAt:
      usedAfterMs === null
        ? null
        : new Date(1_800_000_000_000 + issuedAtMs + usedAfterMs).toISOString(),
    verificationId: `verif_${sequence}`,
    ...rest,
  };
}

test("provider grouping keeps the Yahoo family together and Gmail apart", () => {
  // The split that mattered: INS-89 measured 78% loss across yahoodns-hosted
  // mailboxes against 42% for Gmail, and aol.com and att.net are the same
  // inbound infrastructure as yahoo.com despite looking unrelated.
  for (const domain of ["yahoo.com", "ymail.com", "aol.com", "att.net"]) {
    assert.equal(mailboxProviderOf(`a@${domain}`), "yahoo", domain);
  }
  assert.equal(mailboxProviderOf("a@gmail.com"), "google");
  assert.equal(mailboxProviderOf("a@googlemail.com"), "google");
  assert.equal(mailboxProviderOf("a@hotmail.com"), "microsoft");
  assert.equal(mailboxProviderOf("a@icloud.com"), "apple");
  assert.equal(mailboxProviderOf("a@duck.com"), "relay");
  assert.equal(mailboxProviderOf("a@some-county.gov"), "other");
  assert.equal(mailboxProviderOf(""), "unknown");
  assert.equal(mailboxProviderOf(undefined), "unknown");
});

test("an address with a plus tag or an uppercase domain is grouped correctly", () => {
  assert.equal(emailDomainOf("Person+Tag@GMAIL.com"), "gmail.com");
  assert.equal(mailboxProviderOf("Person+Tag@GMAIL.com"), "google");
});

test("placeholder local parts are recognised regardless of domain", () => {
  // These people wrote real reports and gave an address they never intended to
  // read. Counting them as abandonment overstates friction.
  assert.ok(isPlaceholderAddress("anonymous@gmail.com"));
  assert.ok(isPlaceholderAddress("NoReply@gmail.com"));
  assert.ok(isPlaceholderAddress("johndoe@example.org"));
  assert.ok(!isPlaceholderAddress("john.doe.jr@example.org"));
  assert.ok(!isPlaceholderAddress("annette@example.org"));
});

test("the window a record was issued under is read from the record", () => {
  // Not from today's configuration. Comparing across a window change is the
  // whole point, so a 15-minute record must keep saying 15 minutes forever.
  assert.equal(issuedTtlSeconds(link({ ttlMs: 15 * MINUTE })), 900);
  assert.equal(issuedTtlSeconds(link({ ttlMs: 24 * HOUR })), 86400);
  // A record predating the field, like the backfilled 2025 one in the store.
  assert.equal(
    issuedTtlSeconds({ createdAt: "2025-02-22T23:29:21.229Z" }),
    null,
  );
  assert.equal(verifyLatencySeconds(link({ usedAfterMs: 37_000 })), 37);
  assert.equal(verifyLatencySeconds(link({})), null);
});

test("tail pressure finds links redeemed against the wall of their own window", () => {
  // Under a 15-minute window, 830 seconds is 92% of the way through and is the
  // observation that justified widening it. Under 24 hours the same latency is
  // nothing, so the measure has to be a fraction of the issued window and not
  // an absolute number of seconds.
  const tight = tailPressure([
    link({ ttlMs: 15 * MINUTE, usedAfterMs: 830_000 }),
    link({ ttlMs: 15 * MINUTE, usedAfterMs: 37_000 }),
  ]);
  assert.equal(tight.redeemed, 2);
  assert.equal(tight.inFinalTenth, 1);
  assert.equal(tight.maxFractionOfWindow, 0.922);

  const roomy = tailPressure([
    link({ ttlMs: 24 * HOUR, usedAfterMs: 830_000 }),
    link({ ttlMs: 24 * HOUR, usedAfterMs: 37_000 }),
  ]);
  assert.equal(roomy.inFinalTenth, 0);

  assert.deepEqual(tailPressure([]), {
    redeemed: 0,
    inFinalTenth: 0,
    maxFractionOfWindow: null,
  });
});

test("unused links are split into evidence and an honest residual", () => {
  const records = [
    // No MX on the domain: could not have arrived.
    link({ email: "joe@smith.com" }),
    // An address that redeemed a different link, so our mail reaches it.
    link({ email: "repeat@gmail.com", usedAfterMs: 20_000 }),
    link({ email: "repeat@gmail.com" }),
    // Never intended to receive anything.
    link({ email: "anonymous@gmail.com" }),
    // Nothing in the store explains this one.
    link({ email: "someone@gmail.com" }),
  ];

  assert.deepEqual(
    classifyUnusedLinks(records, { undeliverableDomains: ["smith.com"] }),
    {
      undeliverableDomain: 1,
      placeholderAddress: 1,
      provenDeliverableAddress: 1,
      unexplained: 1,
    },
  );
});

test("an undeliverable domain is matched case-insensitively", () => {
  assert.deepEqual(
    classifyUnusedLinks([link({ email: "joe@SMITH.com" })], {
      undeliverableDomains: ["Smith.com"],
    }).undeliverableDomain,
    1,
  );
});

test("repeat submitters cannot flatter the headline rate", () => {
  // The artefact that made data subject access requests look three times
  // healthier than every other form: one scripted submitter redeeming a burst
  // of links, against one-shot members of the public who mostly did not.
  const records = [
    ...Array.from({ length: 8 }, () =>
      link({ email: "script@gmail.com", usedAfterMs: 15_000 }),
    ),
    ...Array.from({ length: 4 }, (_value, index) =>
      link({ email: `walkup${index}@gmail.com` }),
    ),
  ];

  const report = buildVerificationLossReport(records);
  assert.deepEqual(report.overall, {
    links: 12,
    unused: 4,
    unusedPercent: 33.3,
  });
  // Over the population the organisation exists to receive from, every link
  // was lost. An aggregate that reported 33% here would be hiding that.
  assert.deepEqual(report.oneShotSubmitters, {
    links: 4,
    unused: 4,
    unusedPercent: 100,
  });
});

test("the report straddles a window change and reports each window separately", () => {
  // The before-and-after shape required by INS-89 done-when #3.
  const before = Array.from({ length: 4 }, (_value, index) =>
    link({
      email: `before${index}@gmail.com`,
      ttlMs: 15 * MINUTE,
      usedAfterMs: index === 0 ? 30_000 : null,
    }),
  );
  const after = Array.from({ length: 4 }, (_value, index) =>
    link({
      email: `after${index}@gmail.com`,
      issuedAtMs: 100 * HOUR,
      ttlMs: 24 * HOUR,
      usedAfterMs: index === 3 ? null : 4 * HOUR,
    }),
  );

  const report = buildVerificationLossReport([...before, ...after]);
  assert.deepEqual(report.sample.issuedTtlSeconds, [900, 86400]);
  assert.deepEqual(report.byIssuedTtlSeconds["900"], {
    links: 4,
    unused: 3,
    unusedPercent: 75,
  });
  assert.deepEqual(report.byIssuedTtlSeconds["86400"], {
    links: 4,
    unused: 1,
    unusedPercent: 25,
  });
  // Three of the four wide-window redemptions took four hours, which the old
  // window would have thrown away outright.
  assert.equal(report.verifyLatencySeconds.max, 4 * 3600);
});

test("the report counts resends that actually recovered a submitter", () => {
  const report = buildVerificationLossReport([
    link({ resendCount: 1, usedAfterMs: 36 * HOUR }),
    link({ resendCount: 2 }),
    link({ usedAfterMs: 30_000 }),
  ]);
  assert.deepEqual(report.resends, {
    recordsWithAResend: 2,
    replacedThenVerified: 1,
  });
});

test("the report says how much of the sample is joinable to a delivery outcome", () => {
  // Until delivery events are consumed this is the ceiling on how much of the
  // loss can ever be attributed, and it should be visible rather than implied.
  const report = buildVerificationLossReport([
    link({ providerMessageId: "email_1" }),
    link({}),
  ]);
  assert.equal(report.deliveryEvidence.withProviderMessageId, 1);
});

test("no part of the report contains an email address", () => {
  // The records are submitter data. Grouping by domain is deliberate; leaking
  // a local part into a report somebody pastes into an issue is not.
  const report = buildVerificationLossReport([
    link({ email: "real.person@gmail.com" }),
    link({ email: "other.person@yahoo.com", usedAfterMs: 20_000 }),
  ]);
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /real\.person/);
  assert.doesNotMatch(serialized, /other\.person/);
  assert.doesNotMatch(serialized, /@/);
});

test("an empty sample reports zeroes rather than dividing by zero", () => {
  const report = buildVerificationLossReport([]);
  assert.deepEqual(report.overall, {
    links: 0,
    unused: 0,
    unusedPercent: null,
  });
  assert.equal(report.sample.firstIssuedAt, null);
  assert.equal(report.verifyLatencySeconds.median, null);
});

test("records without a verificationId are not counted", () => {
  const report = buildVerificationLossReport([
    link({}),
    { email: "junk@example.org" },
    null,
  ]);
  assert.equal(report.sample.links, 1);
});
