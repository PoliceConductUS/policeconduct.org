import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { reconcileAnalytics, runCli } from "./analytics-config.mjs";

const token = "test-access-token-do-not-log";
const property = "properties/123";
const stream = `${property}/dataStreams/456`;
const dimension = {
  parameterName: "form_name",
  scope: "EVENT",
  displayName: "Form name",
  description: "Submitted form type",
};
const keyEvent = {
  eventName: "report_submitted",
  countingMethod: "ONCE_PER_EVENT",
};
const rule = {
  destinationEvent: "report_submitted",
  eventConditions: [
    {
      field: "event_name",
      comparisonType: "EQUALS",
      value: "form_submit_success",
      negated: false,
    },
    { field: "form_name", comparisonType: "EQUALS", value: "reportNew" },
  ],
  sourceCopyParameters: false,
  parameterMutations: [],
};
function configuration() {
  return structuredClone({
    propertyId: "123",
    webStreamId: "456",
    customDimensions: [dimension],
    keyEvents: [keyEvent],
    unmarkedKeyEvents: ["form_submit_success"],
    eventCreateRules: [rule],
    dataRetentionSettings: {
      eventDataRetention: "FOURTEEN_MONTHS",
      userDataRetention: "FOURTEEN_MONTHS",
      resetUserDataOnNewActivity: true,
    },
    enhancedMeasurementSettings: {
      streamEnabled: true,
      outboundClicksEnabled: false,
    },
    dataRedactionSettings: {
      emailRedactionEnabled: true,
      queryParameterRedactionEnabled: true,
      queryParameterKeys: ["token", "q"],
    },
  });
}
function liveState() {
  return structuredClone({
    customDimensions: [
      {
        ...dimension,
        name: `${property}/customDimensions/11`,
        disallowAdsPersonalization: true,
      },
    ],
    keyEvents: [
      {
        ...keyEvent,
        name: `${property}/keyEvents/22`,
        custom: true,
        deletable: true,
        defaultValue: { numericValue: 1, currencyCode: "USD" },
      },
      {
        eventName: "purchase",
        name: `${property}/keyEvents/23`,
        countingMethod: "ONCE_PER_EVENT",
        deletable: false,
      },
    ],
    eventCreateRules: [{ ...rule, name: `${stream}/eventCreateRules/33` }],
    dataRetentionSettings: {
      name: `${property}/dataRetentionSettings`,
      eventDataRetention: "FOURTEEN_MONTHS",
      userDataRetention: "FOURTEEN_MONTHS",
      resetUserDataOnNewActivity: true,
    },
    enhancedMeasurementSettings: {
      name: `${stream}/enhancedMeasurementSettings`,
      streamEnabled: true,
      searchQueryParameter: "q,s",
      uriQueryParameter: "category",
      scrollsEnabled: true,
    },
    dataRedactionSettings: {
      name: `${stream}/dataRedactionSettings`,
      emailRedactionEnabled: true,
      queryParameterRedactionEnabled: true,
      queryParameterKeys: ["q", "token"],
    },
  });
}
// The transport stores the provider state so read-back tests fail if writes are
// missing, misaddressed, or update a field outside the requested mask.
function provider(
  state = liveState(),
  { paginate = false, ignoreWrites = false } = {},
) {
  const calls = [];
  let id = 100;
  return {
    state,
    calls,
    async fetchImpl(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, "https://analyticsadmin.googleapis.com");
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      const method = options.method;
      const resource = url.pathname.replace(/^\/v1(?:alpha|beta)\//, "");
      const collection = resource.split("/").at(-1);
      const propertyResource =
        /\/(customDimensions|keyEvents)(?:\/|$)|\/dataRetentionSettings$/.test(
          resource,
        );
      assert.equal(
        url.pathname.split("/")[1],
        propertyResource ? "v1beta" : "v1alpha",
      );
      const body = options.body ? JSON.parse(options.body) : undefined;
      calls.push({
        method,
        resource,
        body,
        mask: url.searchParams.get("updateMask"),
        pageToken: url.searchParams.get("pageToken"),
      });
      if (method === "GET") {
        if (Array.isArray(state[collection])) {
          const rows = state[collection];
          if (paginate && rows.length > 1)
            return Response.json(
              url.searchParams.has("pageToken")
                ? { [collection]: rows.slice(1) }
                : { [collection]: rows.slice(0, 1), nextPageToken: "page-two" },
            );
          return Response.json({ [collection]: rows });
        }
        return Response.json(state[collection]);
      }
      if (!ignoreWrites) {
        if (method === "POST")
          state[collection].push({ ...body, name: `${resource}/${id++}` });
        else if (method === "DELETE") {
          const list = state[resource.split("/").at(-2)];
          list.splice(
            list.findIndex((row) => row.name === resource),
            1,
          );
        } else {
          const list = state[resource.split("/").at(-2)];
          const row = Array.isArray(list)
            ? list.find((row) => row.name === resource)
            : state[collection];
          for (const field of url.searchParams.get("updateMask").split(",")) {
            const key = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            row[key] = body[key];
          }
        }
      }
      return Response.json({});
    },
  };
}
async function reconcile(
  config = configuration(),
  mock = provider(),
  apply = false,
) {
  return reconcileAnalytics({
    config,
    token,
    fetchImpl: mock.fetchImpl,
    apply,
  });
}

test("matching settings ignore unlisted resources and fields and apply makes no writes", async () => {
  const mock = provider();
  const before = structuredClone(mock.state);
  assert.deepEqual((await reconcile(configuration(), mock, true)).changes, []);
  assert.deepEqual(mock.state, before);
  assert.ok(mock.calls.every((call) => call.method === "GET"));
});

test("compare reports managed differences without changing live settings", async () => {
  const mock = provider();
  mock.state.customDimensions[0].displayName = "Old label";
  const before = structuredClone(mock.state);
  assert.equal((await reconcile(configuration(), mock)).changes.length, 1);
  assert.deepEqual(mock.state, before);
  assert.ok(mock.calls.every((call) => call.method === "GET"));
});

test("apply creates, patches current identities and unmarks only the named event, then verifies", async () => {
  const config = configuration();
  config.customDimensions.push({
    parameterName: "failure_stage",
    scope: "EVENT",
    displayName: "Failure stage",
  });
  config.keyEvents.push({
    eventName: "volunteer_submitted",
    countingMethod: "ONCE_PER_SESSION",
  });
  config.eventCreateRules.push({
    ...rule,
    destinationEvent: "volunteer_submitted",
  });
  const mock = provider();
  mock.state.customDimensions[0].displayName = "Old label";
  mock.state.keyEvents[0].countingMethod = "ONCE_PER_SESSION";
  mock.state.keyEvents.push({
    eventName: "form_submit_success",
    name: `${property}/keyEvents/24`,
    countingMethod: "ONCE_PER_EVENT",
    deletable: true,
  });
  mock.state.eventCreateRules[0].sourceCopyParameters = true;
  mock.state.dataRetentionSettings.eventDataRetention = "TWO_MONTHS";
  mock.state.enhancedMeasurementSettings.outboundClicksEnabled = true;
  mock.state.dataRedactionSettings.emailRedactionEnabled = false;
  const result = await reconcile(config, mock, true);
  assert.equal(result.changes.length, 10);
  assert.deepEqual((await reconcile(config, mock)).changes, []);
  assert.equal(
    mock.state.keyEvents.find((row) => row.eventName === "form_submit_success"),
    undefined,
  );
  assert.equal(
    mock.state.keyEvents.find((row) => row.eventName === "purchase").deletable,
    false,
  );
  assert.deepEqual(mock.state.keyEvents[0].defaultValue, {
    numericValue: 1,
    currencyCode: "USD",
  });
  assert.equal(mock.state.customDimensions[0].disallowAdsPersonalization, true);
  const writes = mock.calls.filter((call) => call.method !== "GET");
  assert.deepEqual(
    writes.find((call) => call.resource.endsWith("customDimensions/11")),
    {
      method: "PATCH",
      resource: `${property}/customDimensions/11`,
      body: { displayName: "Form name" },
      mask: "display_name",
      pageToken: null,
    },
  );
  const measurement = writes.find((call) =>
    call.resource.endsWith("enhancedMeasurementSettings"),
  );
  assert.deepEqual(measurement.body, {
    outboundClicksEnabled: false,
    searchQueryParameter: "q,s",
  });
  assert.equal(measurement.mask, "outbound_clicks_enabled");
  assert.ok(mock.calls.slice(0, 6).every((call) => call.method === "GET"));
  assert.ok(mock.calls.slice(-6).every((call) => call.method === "GET"));
});

test("pagination and protobuf defaults, query key case/order and AND order are equal", async () => {
  const mock = provider(undefined, { paginate: true });
  mock.state.customDimensions.unshift({
    name: `${property}/customDimensions/99`,
    parameterName: "other",
    scope: "EVENT",
    displayName: "Other",
  });
  mock.state.eventCreateRules[0].eventConditions.reverse();
  delete mock.state.eventCreateRules[0].eventConditions[1].negated;
  delete mock.state.eventCreateRules[0].sourceCopyParameters;
  delete mock.state.eventCreateRules[0].parameterMutations;
  mock.state.dataRedactionSettings.queryParameterKeys = ["Q", "TOKEN"];
  assert.deepEqual((await reconcile(configuration(), mock)).changes, []);
  assert.equal(
    mock.calls.filter((call) => call.pageToken === "page-two").length,
    2,
  );
});

test("parameter mutation order remains significant and unlisted rules remain intact", async () => {
  const config = configuration();
  config.eventCreateRules[0].parameterMutations = [
    { parameter: "a", parameterValue: "[[b]]" },
    { parameter: "b", parameterValue: "value" },
  ];
  const mock = provider();
  mock.state.eventCreateRules[0].parameterMutations = [
    ...config.eventCreateRules[0].parameterMutations,
  ].reverse();
  const unlisted = {
    ...rule,
    name: `${stream}/eventCreateRules/99`,
    destinationEvent: "unmanaged",
  };
  mock.state.eventCreateRules.push(unlisted);
  assert.equal((await reconcile(config, mock, true)).changes.length, 1);
  assert.deepEqual(
    mock.state.eventCreateRules[0].parameterMutations,
    config.eventCreateRules[0].parameterMutations,
  );
  assert.deepEqual(mock.state.eventCreateRules[1], unlisted);
});

test("a failed read prevents every proposed mutation and hides provider diagnostics", async () => {
  const mock = provider();
  mock.state.customDimensions[0].displayName = "Old label";
  const fetchImpl = (url, options) =>
    String(url).includes("dataRedactionSettings")
      ? Response.json({ error: { message: token } }, { status: 403 })
      : mock.fetchImpl(url, options);
  await assert.rejects(
    reconcileAnalytics({
      config: configuration(),
      token,
      fetchImpl,
      apply: true,
    }),
    (error) => /403/.test(error.message) && !error.message.includes(token),
  );
  assert.ok(mock.calls.every((call) => call.method === "GET"));
});

test("apply fails if successful writes do not reconcile on read-back", async () => {
  const mock = provider(undefined, { ignoreWrites: true });
  mock.state.customDimensions[0].displayName = "Old label";
  await assert.rejects(reconcile(configuration(), mock, true), /verif/i);
});

test("ambiguous live managed identities fail before mutation", async () => {
  for (const kind of ["customDimensions", "keyEvents", "eventCreateRules"]) {
    const mock = provider();
    mock.state[kind].push({
      ...mock.state[kind][0],
      name: `${mock.state[kind][0].name}9`,
    });
    await assert.rejects(reconcile(configuration(), mock, true), /ambiguous/i);
    assert.ok(mock.calls.every((call) => call.method === "GET"));
  }
});

test("missing credentials, malformed config and collection errors never read as an empty property", async () => {
  const mock = provider();
  await assert.rejects(
    reconcileAnalytics({
      config: configuration(),
      token: "",
      fetchImpl: mock.fetchImpl,
    }),
    /GOOGLE_ANALYTICS_ACCESS_TOKEN/,
  );
  for (const mutate of [
    (c) => {
      c.propertyId = "../bad";
    },
    (c) => {
      c.customDimensions[0].scope = "INVALID";
    },
    (c) => {
      c.customDimensions[0].parameterName = "has spaces";
    },
    (c) => {
      c.keyEvents[0].countingMethod = "UNKNOWN";
    },
    (c) => {
      c.keyEvents.push(c.keyEvents[0]);
    },
    (c) => {
      c.unmarkedKeyEvents = ["purchase"];
    },
    (c) => {
      c.eventCreateRules[0].eventConditions = [];
    },
    (c) => {
      c.enhancedMeasurementSettings.streamEnabled = "true";
    },
    (c) => {
      c.dataRetentionSettings.userDataRetention = "FIFTY_MONTHS";
    },
    (c) => {
      c.dataRedactionSettings.queryParameterKeys = [];
    },
    (c) => {
      c.dataRedactionSettings.other = true;
    },
  ]) {
    const config = configuration();
    mutate(config);
    await assert.rejects(reconcile(config, mock, true), /config/i);
  }
  assert.equal(mock.calls.length, 0);
  await assert.rejects(
    reconcileAnalytics({
      config: configuration(),
      token,
      fetchImpl: async () => Response.json({ customDimensions: "broken" }),
    }),
    /response/i,
  );
});

test("transport, invalid JSON and API errors do not expose the access token", async () => {
  for (const fetchImpl of [
    async () => {
      throw new Error(token);
    },
    async () => new Response(token),
    async () => Response.json({ error: token }, { status: 401 }),
  ]) {
    await assert.rejects(
      reconcileAnalytics({ config: configuration(), token, fetchImpl }),
      (error) => !String(error).includes(token),
    );
  }
});

test("CLI rejects missing credentials and unknown commands with exit 2", async () => {
  for (const args of [["compare"], ["invalid"]]) {
    const result = spawnSync(
      process.execPath,
      [new URL("./analytics-config.mjs", import.meta.url).pathname, ...args],
      { env: { PATH: process.env.PATH }, encoding: "utf8" },
    );
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
  }
});

test("CLI compare returns 0 for match, 1 for drift, apply 0 only after verification and 2 on errors", async () => {
  // Read the fixed repository config just as the CLI does, while the transport
  // supplies live resource identities instead of contacting Google.
  const { readFile } = await import("node:fs/promises");
  const config = JSON.parse(
    await readFile(
      new URL("../config/analytics.json", import.meta.url),
      "utf8",
    ),
  );
  const state = {};
  const parent = `properties/${config.propertyId}`;
  const streamParent = `${parent}/dataStreams/${config.webStreamId}`;
  for (const kind of ["customDimensions", "keyEvents", "eventCreateRules"])
    state[kind] = config[kind].map((row, i) => ({
      ...row,
      name: `${kind === "eventCreateRules" ? streamParent : parent}/${kind}/${i + 1}`,
    }));
  for (const kind of [
    "dataRetentionSettings",
    "enhancedMeasurementSettings",
    "dataRedactionSettings",
  ])
    state[kind] = {
      ...config[kind],
      name: `${kind === "dataRetentionSettings" ? parent : streamParent}/${kind}`,
      searchQueryParameter: "q",
    };
  state.googleSignalsSettings = {
    ...config.googleSignalsSettings,
    name: `${parent}/googleSignalsSettings`,
  };
  const mock = provider(state);
  const output = [];
  const options = {
    env: { GOOGLE_ANALYTICS_ACCESS_TOKEN: token },
    fetchImpl: mock.fetchImpl,
    stdout: (s) => output.push(s),
    stderr: (s) => output.push(s),
  };
  assert.equal(await runCli(["compare"], options), 0);
  state.googleSignalsSettings.state = "GOOGLE_SIGNALS_ENABLED";
  assert.equal(await runCli(["compare"], options), 1);
  assert.equal(await runCli(["apply"], options), 0);
  assert.equal(await runCli(["compare"], options), 0);
  state.googleSignalsSettings.state = "GOOGLE_SIGNALS_ENABLED";
  options.fetchImpl = provider(state, { ignoreWrites: true }).fetchImpl;
  assert.equal(await runCli(["apply"], options), 2);
  options.fetchImpl = async () => {
    throw new Error(token);
  };
  assert.equal(await runCli(["compare"], options), 2);
  assert.ok(output.every((line) => !line.includes(token)));
});

test("write failures stop apply and omit token-bearing provider details", async () => {
  const mock = provider();
  mock.state.customDimensions[0].displayName = "Old label";
  mock.state.dataRetentionSettings.eventDataRetention = "TWO_MONTHS";
  let writes = 0;
  await assert.rejects(
    reconcileAnalytics({
      config: configuration(),
      token,
      apply: true,
      fetchImpl: (url, options) => {
        if (options.method !== "GET") {
          writes++;
          return Response.json({ error: { message: token } }, { status: 400 });
        }
        return mock.fetchImpl(url, options);
      },
    }),
    (error) => /400/.test(error.message) && !error.message.includes(token),
  );
  assert.equal(writes, 1);
  assert.equal(
    mock.state.dataRetentionSettings.eventDataRetention,
    "TWO_MONTHS",
  );
});

test("missing required live fields and repeated pagination tokens stop apply", async () => {
  const mock = provider();
  mock.state.enhancedMeasurementSettings.outboundClicksEnabled = true;
  delete mock.state.enhancedMeasurementSettings.searchQueryParameter;
  await assert.rejects(
    reconcile(configuration(), mock, true),
    /searchQueryParameter/,
  );
  assert.ok(mock.calls.every((call) => call.method === "GET"));
  await assert.rejects(
    reconcileAnalytics({
      config: configuration(),
      token,
      apply: true,
      fetchImpl: async () => Response.json({ nextPageToken: "repeated" }),
    }),
    /pagination/,
  );
});

test("retention updates carry required current fields without managing unlisted values", async () => {
  const config = configuration();
  config.dataRetentionSettings = { resetUserDataOnNewActivity: true };
  const mock = provider();
  mock.state.dataRetentionSettings.resetUserDataOnNewActivity = false;
  await reconcile(config, mock, true);
  const patch = mock.calls.find((call) => call.method === "PATCH");
  assert.equal(patch.mask, "reset_user_data_on_new_activity");
  assert.deepEqual(patch.body, {
    resetUserDataOnNewActivity: true,
    eventDataRetention: "FOURTEEN_MONTHS",
    userDataRetention: "FOURTEEN_MONTHS",
  });
});

test("pull imports paginated resources, strips output fields and round trips without writes", async () => {
  const mock = provider(undefined, { paginate: true });
  const config = configuration();
  config.googleSignalsSettings = { state: "GOOGLE_SIGNALS_DISABLED" };
  mock.state.googleSignalsSettings = {
    name: `${property}/googleSignalsSettings`,
    state: "GOOGLE_SIGNALS_ENABLED",
    consent: "GOOGLE_SIGNALS_CONSENT_CONSENTED",
  };
  const result = await reconcileAnalytics({
    config,
    token,
    fetchImpl: mock.fetchImpl,
    pull: true,
  });
  assert.equal(result.config.keyEvents.length, 2);
  assert.equal(
    result.config.googleSignalsSettings.state,
    "GOOGLE_SIGNALS_ENABLED",
  );
  assert.equal(result.config.googleSignalsSettings.consent, undefined);
  assert.equal(result.config.customDimensions[0].name, undefined);
  assert.deepEqual((await reconcile(result.config, mock, true)).changes, []);
  assert.ok(mock.calls.every((call) => call.method === "GET"));
});

test("Google signals push changes only state and verifies readback", async () => {
  const mock = provider();
  const config = configuration();
  config.googleSignalsSettings = { state: "GOOGLE_SIGNALS_DISABLED" };
  mock.state.googleSignalsSettings = {
    name: `${property}/googleSignalsSettings`,
    state: "GOOGLE_SIGNALS_ENABLED",
    consent: "GOOGLE_SIGNALS_CONSENT_CONSENTED",
  };
  await reconcile(config, mock, true);
  const writes = mock.calls.filter((call) => call.method !== "GET");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].mask, "state");
  assert.equal(
    mock.state.googleSignalsSettings.consent,
    "GOOGLE_SIGNALS_CONSENT_CONSENTED",
  );
  assert.deepEqual((await reconcile(config, mock, true)).changes, []);
});

test("CLI pull saves only complete validated reads and preserves local file on failure", async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = await mkdtemp(join(tmpdir(), "analytics-sync-"));
  const configPath = join(directory, "analytics.json");
  try {
    await writeFile(configPath, JSON.stringify(configuration()));
    const mock = provider();
    const options = {
      configPath,
      env: { GOOGLE_ANALYTICS_ACCESS_TOKEN: token },
      fetchImpl: mock.fetchImpl,
      stdout: () => {},
      stderr: () => {},
    };
    assert.equal(await runCli(["pull"], options), 0);
    assert.equal(await runCli(["compare"], options), 0);
    assert.equal(await runCli(["push"], options), 0);
    const saved = await readFile(configPath, "utf8");
    options.fetchImpl = async () =>
      Response.json({ error: "Denied" }, { status: 403 });
    assert.equal(await runCli(["pull"], options), 2);
    assert.equal(await readFile(configPath, "utf8"), saved);
    assert.ok(mock.calls.every((call) => call.method === "GET"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
