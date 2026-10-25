/**
 * Measures how many verification links go unused, and why (INS-89).
 *
 * The question INS-89 has to keep answering is not "did the number go down"
 * but "which population moved". Lowering the loss rate by changing the mix of
 * people who submit is not a fix, and a loss rate computed over all links is
 * dominated by whoever submitted most — in the first sample, 12 of 19 data
 * subject access requests came from four addresses submitting in bursts
 * seconds apart, which made that form look three times healthier than the
 * rest. Every rate here is therefore reported twice: over all links, and over
 * one-shot submitters only.
 *
 * Pure functions over already-loaded records so the arithmetic is testable
 * without a bucket. Nothing here reads S3 or the network.
 *
 * No output field contains an email address. Domains and mailbox providers are
 * reported because INS-89 found the provider to be the one attribute that
 * predicts delivery; local parts are submitter data and are only ever used to
 * group records in memory.
 */

/** Mailbox providers that share Yahoo's inbound infrastructure. */
const YAHOO_FAMILY = new Set([
  "aol.com",
  "att.net",
  "bellsouth.net",
  "rocketmail.com",
  "sbcglobal.net",
  "yahoo.com",
  "ymail.com",
]);

const MICROSOFT_FAMILY = new Set([
  "hotmail.com",
  "live.com",
  "msn.com",
  "outlook.com",
]);

const APPLE_FAMILY = new Set(["icloud.com", "mac.com", "me.com"]);

/**
 * Forwarding and alias services. Called out separately because a forwarded
 * message is re-sent by a third party, which is a different failure mode from
 * a mailbox rejecting us directly.
 */
const RELAY_FAMILY = new Set([
  "duck.com",
  "proton.me",
  "protonmail.com",
  "simplelogin.com",
]);

/**
 * Local parts that cannot receive our mail even though the domain can.
 *
 * These are not typos. They are people declining to give us a real address
 * while still writing out a substantive report — INS-89 found one 3,672
 * character account of alleged misconduct sent from `anonymous@gmail.com`.
 * They will never verify, so counting them as abandonment overstates how many
 * submitters we lost to friction and understates how many we are asking the
 * wrong question of.
 */
const PLACEHOLDER_LOCAL_PARTS = new Set([
  "anonymous",
  "janedoe",
  "johndoe",
  "na",
  "no-reply",
  "none",
  "noreply",
  "nobody",
  "test",
]);

export function emailDomainOf(email) {
  const at = String(email ?? "").lastIndexOf("@");
  return at === -1
    ? ""
    : String(email)
        .slice(at + 1)
        .toLowerCase();
}

export function emailLocalPartOf(email) {
  const at = String(email ?? "").lastIndexOf("@");
  return at === -1 ? "" : String(email).slice(0, at).toLowerCase();
}

export function mailboxProviderOf(email) {
  const domain = emailDomainOf(email);
  if (!domain) return "unknown";
  if (domain === "gmail.com" || domain === "googlemail.com") return "google";
  if (YAHOO_FAMILY.has(domain)) return "yahoo";
  if (MICROSOFT_FAMILY.has(domain)) return "microsoft";
  if (APPLE_FAMILY.has(domain)) return "apple";
  if (RELAY_FAMILY.has(domain)) return "relay";
  return "other";
}

export function isPlaceholderAddress(email) {
  return PLACEHOLDER_LOCAL_PARTS.has(emailLocalPartOf(email));
}

const asMs = (value) => {
  const ms = new Date(value ?? 0).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

/**
 * The configured window a record was issued under, in seconds.
 *
 * Derived from the record rather than from today's configuration, because the
 * whole point of a before-and-after is comparing records minted under
 * different windows. A record with no `expiresAt` predates the field.
 */
export function issuedTtlSeconds(record) {
  const created = asMs(record?.createdAt);
  const expires = asMs(record?.expiresAt);
  if (created === null || expires === null) return null;
  return Math.round((expires - created) / 1000);
}

export function verifyLatencySeconds(record) {
  const created = asMs(record?.createdAt);
  const used = asMs(record?.usedAt);
  if (created === null || used === null) return null;
  return Math.round((used - created) / 1000);
}

function quantile(sorted, fraction) {
  if (sorted.length === 0) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(fraction * (sorted.length - 1))),
  );
  return sorted[index];
}

function rate(total, lost) {
  return {
    links: total,
    unused: lost,
    unusedPercent:
      total === 0 ? null : Number(((lost / total) * 100).toFixed(1)),
  };
}

function groupRates(records, keyOf) {
  const buckets = new Map();
  for (const record of records) {
    const key = keyOf(record);
    const bucket = buckets.get(key) ?? { links: 0, unused: 0 };
    bucket.links += 1;
    if (!record.usedAt) bucket.unused += 1;
    buckets.set(key, bucket);
  }
  return Object.fromEntries(
    [...buckets.entries()]
      .sort((a, b) => b[1].links - a[1].links)
      .map(([key, bucket]) => [key, rate(bucket.links, bucket.unused)]),
  );
}

/**
 * Records from addresses that appear exactly once in the sample.
 *
 * This is the population the organisation actually cares about: a member of
 * the public who came to us once. Repeat and scripted submitters verify almost
 * every link they are sent and will flatter any aggregate they are included in.
 */
function oneShotRecords(records) {
  const seen = new Map();
  for (const record of records) {
    const key = String(record.email ?? "").toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return records.filter(
    (record) => seen.get(String(record.email ?? "").toLowerCase()) === 1,
  );
}

/**
 * Addresses proven to receive our mail, because they redeemed a link at least
 * once. An unused link to such an address is not a deliverability failure.
 */
function provenDeliverableAddresses(records) {
  const proven = new Set();
  for (const record of records) {
    if (record.usedAt) proven.add(String(record.email ?? "").toLowerCase());
  }
  return proven;
}

/**
 * Split the unused links into what the store can and cannot explain.
 *
 * `unexplained` is the honest residual and is expected to be the largest
 * bucket until delivery events are consumed. Reporting it as a named category
 * rather than folding it into "abandonment" is the difference between a
 * diagnosis and a guess.
 */
export function classifyUnusedLinks(
  records,
  { undeliverableDomains = [] } = {},
) {
  const undeliverable = new Set(
    undeliverableDomains.map((d) => d.toLowerCase()),
  );
  const proven = provenDeliverableAddresses(records);
  const buckets = {
    undeliverableDomain: 0,
    placeholderAddress: 0,
    provenDeliverableAddress: 0,
    unexplained: 0,
  };

  for (const record of records) {
    if (record.usedAt) continue;
    const domain = emailDomainOf(record.email);
    if (undeliverable.has(domain)) {
      buckets.undeliverableDomain += 1;
    } else if (isPlaceholderAddress(record.email)) {
      buckets.placeholderAddress += 1;
    } else if (proven.has(String(record.email ?? "").toLowerCase())) {
      buckets.provenDeliverableAddress += 1;
    } else {
      buckets.unexplained += 1;
    }
  }
  return buckets;
}

/**
 * Links that were redeemed inside the final tenth of their own window.
 *
 * The signal that a window is truncating people. A sample where nobody ever
 * uses the tail says the window is generous; a sample pressed against the wall
 * says we are losing whoever was one minute slower, invisibly.
 */
export function tailPressure(records) {
  const latencies = [];
  for (const record of records) {
    const latency = verifyLatencySeconds(record);
    const ttl = issuedTtlSeconds(record);
    if (latency === null || ttl === null || ttl <= 0) continue;
    latencies.push({ latency, fraction: latency / ttl });
  }
  if (latencies.length === 0) {
    return { redeemed: 0, inFinalTenth: 0, maxFractionOfWindow: null };
  }
  return {
    redeemed: latencies.length,
    inFinalTenth: latencies.filter((entry) => entry.fraction >= 0.9).length,
    maxFractionOfWindow: Number(
      Math.max(...latencies.map((entry) => entry.fraction)).toFixed(3),
    ),
  };
}

/**
 * Build the full report.
 *
 * @param {object[]} records verification records, as stored under `verify/`
 * @param {object} [options]
 * @param {string[]} [options.undeliverableDomains] domains with no MX, or
 *   typosquats of a real provider, established out of band by DNS lookup
 */
export function buildVerificationLossReport(records, options = {}) {
  const all = records.filter((record) => record && record.verificationId);
  const oneShot = oneShotRecords(all);
  const latencies = all
    .map(verifyLatencySeconds)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  const unusedOf = (set) => set.filter((record) => !record.usedAt).length;
  const ttls = [
    ...new Set(all.map(issuedTtlSeconds).filter((v) => v !== null)),
  ];

  return {
    sample: {
      links: all.length,
      addresses: new Set(all.map((r) => String(r.email ?? "").toLowerCase()))
        .size,
      firstIssuedAt: all.reduce(
        (min, r) => (!min || r.createdAt < min ? r.createdAt : min),
        null,
      ),
      lastIssuedAt: all.reduce(
        (max, r) => (!max || r.createdAt > max ? r.createdAt : max),
        null,
      ),
      // More than one value means the sample straddles a window change, which
      // is exactly the before-and-after case. One value means it does not.
      issuedTtlSeconds: ttls.sort((a, b) => a - b),
    },
    overall: rate(all.length, unusedOf(all)),
    oneShotSubmitters: rate(oneShot.length, unusedOf(oneShot)),
    byForm: groupRates(all, (r) => r.formName || "unknown"),
    byFormOneShot: groupRates(oneShot, (r) => r.formName || "unknown"),
    byMailboxProvider: groupRates(all, (r) => mailboxProviderOf(r.email)),
    byIssuedTtlSeconds: groupRates(all, (r) => String(issuedTtlSeconds(r))),
    verifyLatencySeconds: {
      redeemed: latencies.length,
      median: quantile(latencies, 0.5),
      p90: quantile(latencies, 0.9),
      max: latencies.length ? latencies[latencies.length - 1] : null,
    },
    tailPressure: tailPressure(all),
    unusedLinkCauses: classifyUnusedLinks(all, options),
    resends: {
      recordsWithAResend: all.filter((r) => Number(r.resendCount) > 0).length,
      // The number that says whether the resend path earns its keep: links
      // that were replaced and then actually redeemed.
      replacedThenVerified: all.filter(
        (r) => Number(r.resendCount) > 0 && r.usedAt,
      ).length,
    },
    deliveryEvidence: {
      // Until Resend delivery events are consumed, this is how much of the
      // sample is even joinable to a delivery outcome.
      withProviderMessageId: all.filter((r) => r.providerMessageId).length,
    },
  };
}
