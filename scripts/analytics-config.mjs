import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

class AnalyticsError extends Error {}
const fail = (message) => {
  throw new AnalyticsError(message);
};
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const eventName = (value) =>
  typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(value);
const own = (value, key) => Object.hasOwn(value, key);
const measurementFields = [
  "streamEnabled",
  "pageChangesEnabled",
  "scrollsEnabled",
  "outboundClicksEnabled",
  "siteSearchEnabled",
  "videoEngagementEnabled",
  "fileDownloadsEnabled",
  "formInteractionsEnabled",
];
const retentionFields = [
  "eventDataRetention",
  "userDataRetention",
  "resetUserDataOnNewActivity",
];
const redactionFields = [
  "emailRedactionEnabled",
  "queryParameterRedactionEnabled",
  "queryParameterKeys",
];
const dimensionFields = [
  "parameterName",
  "scope",
  "displayName",
  "description",
  "disallowAdsPersonalization",
];
const ruleFields = [
  "destinationEvent",
  "eventConditions",
  "sourceCopyParameters",
  "parameterMutations",
];
const countingMethods = ["ONCE_PER_EVENT", "ONCE_PER_SESSION"];
const comparisonTypes = [
  "EQUALS",
  "EQUALS_CASE_INSENSITIVE",
  "CONTAINS",
  "CONTAINS_CASE_INSENSITIVE",
  "STARTS_WITH",
  "STARTS_WITH_CASE_INSENSITIVE",
  "ENDS_WITH",
  "ENDS_WITH_CASE_INSENSITIVE",
  "GREATER_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN",
  "LESS_THAN_OR_EQUAL",
  "REGULAR_EXPRESSION",
  "REGULAR_EXPRESSION_CASE_INSENSITIVE",
];

function check(condition) {
  if (!condition)
    fail(
      "Invalid analytics config; check the supported fields and values in config/analytics.json.",
    );
}
function fields(value, allowed, required = []) {
  check(
    object(value) &&
      Object.keys(value).every((key) => allowed.includes(key)) &&
      required.every((key) => own(value, key)),
  );
}
function booleans(value, names) {
  for (const name of names)
    if (own(value, name)) check(typeof value[name] === "boolean");
}
function unique(rows, identity) {
  const keys = rows.map(identity);
  check(new Set(keys).size === keys.length);
}
function validateConfig(config) {
  const top = [
    "propertyId",
    "webStreamId",
    "customDimensions",
    "keyEvents",
    "unmarkedKeyEvents",
    "eventCreateRules",
    "dataRetentionSettings",
    "enhancedMeasurementSettings",
    "dataRedactionSettings",
  ];
  fields(config, top, top);
  check(
    typeof config.propertyId === "string" && /^\d+$/.test(config.propertyId),
  );
  check(
    typeof config.webStreamId === "string" && /^\d+$/.test(config.webStreamId),
  );
  for (const kind of [
    "customDimensions",
    "keyEvents",
    "unmarkedKeyEvents",
    "eventCreateRules",
  ])
    check(Array.isArray(config[kind]));
  for (const row of config.customDimensions) {
    fields(row, dimensionFields, ["parameterName", "scope", "displayName"]);
    check(["EVENT", "USER", "ITEM"].includes(row.scope));
    check(
      eventName(row.parameterName) &&
        row.parameterName.length <= (row.scope === "USER" ? 24 : 40),
    );
    check(
      typeof row.displayName === "string" &&
        /^[A-Za-z][A-Za-z0-9_ ]{0,81}$/.test(row.displayName),
    );
    if (own(row, "description"))
      check(
        typeof row.description === "string" && row.description.length <= 150,
      );
    booleans(row, ["disallowAdsPersonalization"]);
    if (row.disallowAdsPersonalization) check(row.scope === "USER");
  }
  unique(config.customDimensions, (row) => `${row.scope}:${row.parameterName}`);
  for (const row of config.keyEvents) {
    fields(
      row,
      ["eventName", "countingMethod"],
      ["eventName", "countingMethod"],
    );
    check(
      eventName(row.eventName) && countingMethods.includes(row.countingMethod),
    );
  }
  unique(config.keyEvents, (row) => row.eventName);
  // This command only unmarks the legacy receipt event; other key events are
  // outside its removal scope, including Google's default events.
  check(
    config.unmarkedKeyEvents.every((name) => name === "form_submit_success"),
  );
  unique(config.unmarkedKeyEvents, (name) => name);
  check(
    !config.keyEvents.some((row) =>
      config.unmarkedKeyEvents.includes(row.eventName),
    ),
  );
  for (const row of config.eventCreateRules) {
    fields(row, ruleFields, [
      "destinationEvent",
      "eventConditions",
      "sourceCopyParameters",
    ]);
    check(eventName(row.destinationEvent) && row.destinationEvent.length < 40);
    check(
      Array.isArray(row.eventConditions) &&
        row.eventConditions.length >= 1 &&
        row.eventConditions.length <= 10,
    );
    for (const condition of row.eventConditions) {
      fields(
        condition,
        ["field", "comparisonType", "value", "negated"],
        ["field", "comparisonType", "value"],
      );
      check(
        typeof condition.field === "string" && /^\S+$/.test(condition.field),
      );
      check(
        comparisonTypes.includes(condition.comparisonType) &&
          typeof condition.value === "string",
      );
      booleans(condition, ["negated"]);
    }
    booleans(row, ["sourceCopyParameters"]);
    if (own(row, "parameterMutations")) {
      check(
        Array.isArray(row.parameterMutations) &&
          row.parameterMutations.length <= 20,
      );
      for (const mutation of row.parameterMutations) {
        fields(
          mutation,
          ["parameter", "parameterValue"],
          ["parameter", "parameterValue"],
        );
        check(
          typeof mutation.parameter === "string" &&
            /^[A-Za-z0-9_]{1,39}$/.test(mutation.parameter),
        );
        check(
          typeof mutation.parameterValue === "string" &&
            mutation.parameterValue.length < 100,
        );
      }
      unique(row.parameterMutations, (mutation) => mutation.parameter);
    }
  }
  unique(config.eventCreateRules, (row) => row.destinationEvent);
  fields(config.dataRetentionSettings, retentionFields);
  fields(config.enhancedMeasurementSettings, measurementFields);
  fields(config.dataRedactionSettings, redactionFields);
  for (const kind of [
    "dataRetentionSettings",
    "enhancedMeasurementSettings",
    "dataRedactionSettings",
  ])
    check(Object.keys(config[kind]).length > 0);
  for (const [field, durations] of [
    [
      "eventDataRetention",
      [
        "TWO_MONTHS",
        "FOURTEEN_MONTHS",
        "TWENTY_SIX_MONTHS",
        "THIRTY_EIGHT_MONTHS",
        "FIFTY_MONTHS",
      ],
    ],
    ["userDataRetention", ["TWO_MONTHS", "FOURTEEN_MONTHS"]],
  ]) {
    if (own(config.dataRetentionSettings, field))
      check(durations.includes(config.dataRetentionSettings[field]));
  }
  booleans(config.dataRetentionSettings, ["resetUserDataOnNewActivity"]);
  booleans(config.enhancedMeasurementSettings, measurementFields);
  booleans(config.dataRedactionSettings, redactionFields.slice(0, 2));
  if (own(config.dataRedactionSettings, "queryParameterKeys")) {
    const keys = config.dataRedactionSettings.queryParameterKeys;
    check(
      Array.isArray(keys) &&
        keys.every(
          (key) =>
            typeof key === "string" && key.length > 0 && !key.includes(","),
        ),
    );
    unique(keys, (key) => key.toLowerCase());
  }
  if (config.dataRedactionSettings.queryParameterRedactionEnabled)
    check(config.dataRedactionSettings.queryParameterKeys?.length > 0);
}

function normalized(value, field, desired) {
  if (field === "eventConditions")
    return (value ?? [])
      .map((condition) => ({
        field: condition.field ?? "",
        comparisonType:
          condition.comparisonType ?? "COMPARISON_TYPE_UNSPECIFIED",
        value: condition.value ?? "",
        negated: condition.negated ?? false,
      }))
      .map((condition) => JSON.stringify(condition))
      .sort();
  if (field === "queryParameterKeys")
    return [...new Set((value ?? []).map((key) => key.toLowerCase()))].sort();
  if (field === "parameterMutations")
    return (value ?? []).map((mutation) => ({
      parameter: mutation.parameter ?? "",
      parameterValue: mutation.parameterValue ?? "",
    }));
  return value ?? (typeof desired === "boolean" ? false : "");
}
function changedFields(desired, current, names) {
  return names.filter(
    (key) =>
      own(desired, key) &&
      JSON.stringify(normalized(desired[key], key, desired[key])) !==
        JSON.stringify(normalized(current[key], key, desired[key])),
  );
}
function snakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** Compare only listed settings; apply explicitly and verify by reading again. */
export async function reconcileAnalytics({
  config,
  token,
  fetchImpl = fetch,
  apply = false,
}) {
  validateConfig(config);
  if (typeof token !== "string" || !token.trim())
    fail(
      "Set GOOGLE_ANALYTICS_ACCESS_TOKEN to an authorized OAuth access token.",
    );
  const property = `properties/${config.propertyId}`;
  const stream = `${property}/dataStreams/${config.webStreamId}`;
  async function request(version, resource, method = "GET", body, mask) {
    const url = new URL(
      `https://analyticsadmin.googleapis.com/${version}/${resource}`,
    );
    if (mask) url.searchParams.set("updateMask", mask.map(snakeCase).join(","));
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      fail(
        "Analytics API request failed; check connectivity and authorization.",
      );
    }
    if (!response.ok)
      fail(`Analytics API ${method} failed (HTTP ${response.status}).`);
    let data;
    try {
      data = await response.json();
    } catch {
      fail("Invalid analytics API JSON response.");
    }
    if (!object(data) || own(data, "error"))
      fail("Invalid analytics API response.");
    return data;
  }
  const collections = [
    {
      kind: "customDimensions",
      version: "v1beta",
      parent: property,
      identity: (row) => `${row.scope}:${row.parameterName}`,
      fields: ["displayName", "description", "disallowAdsPersonalization"],
    },
    {
      kind: "keyEvents",
      version: "v1beta",
      parent: property,
      identity: (row) => row.eventName,
      fields: ["countingMethod"],
    },
    {
      kind: "eventCreateRules",
      version: "v1alpha",
      parent: stream,
      identity: (row) => row.destinationEvent,
      fields: ruleFields.filter((key) => key !== "destinationEvent"),
    },
  ];
  const singletons = [
    {
      kind: "dataRetentionSettings",
      version: "v1beta",
      parent: property,
      fields: retentionFields,
    },
    {
      kind: "enhancedMeasurementSettings",
      version: "v1alpha",
      parent: stream,
      fields: measurementFields,
    },
    {
      kind: "dataRedactionSettings",
      version: "v1alpha",
      parent: stream,
      fields: redactionFields,
    },
  ];
  async function readAll() {
    const state = {};
    for (const spec of collections) {
      const rows = [];
      const seenTokens = new Set();
      let pageToken = "";
      do {
        const path = `${spec.parent}/${spec.kind}`;
        const data = await request(
          spec.version,
          `${path}${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`,
        );
        if (own(data, spec.kind) && !Array.isArray(data[spec.kind]))
          fail("Invalid analytics API collection response.");
        for (const row of data[spec.kind] ?? []) {
          if (
            !object(row) ||
            typeof row.name !== "string" ||
            !row.name.startsWith(`${path}/`) ||
            !/^[A-Za-z0-9_-]+$/.test(row.name.slice(path.length + 1)) ||
            typeof spec.identity(row) !== "string"
          )
            fail("Invalid analytics API resource response.");
          if (
            spec.kind === "customDimensions" &&
            (!eventName(row.parameterName) ||
              !["EVENT", "USER", "ITEM"].includes(row.scope))
          )
            fail("Invalid analytics API dimension response.");
          if (spec.kind === "keyEvents" && !eventName(row.eventName))
            fail("Invalid analytics API key event response.");
          if (
            spec.kind === "eventCreateRules" &&
            (!eventName(row.destinationEvent) ||
              !Array.isArray(row.eventConditions))
          )
            fail("Invalid analytics API event rule response.");
          rows.push(row);
        }
        pageToken = data.nextPageToken ?? "";
        if (
          typeof pageToken !== "string" ||
          (pageToken && seenTokens.has(pageToken))
        )
          fail("Invalid analytics API pagination response.");
        seenTokens.add(pageToken);
      } while (pageToken);
      state[spec.kind] = rows;
    }
    for (const spec of singletons) {
      state[spec.kind] = await request(
        spec.version,
        `${spec.parent}/${spec.kind}`,
      );
      if (state[spec.kind].name !== `${spec.parent}/${spec.kind}`)
        fail("Invalid analytics API settings response.");
    }
    return state;
  }
  function plan(state) {
    const operations = [];
    const patch = (spec, current, desired, keys) => {
      if (!keys.length) return;
      const body = Object.fromEntries(keys.map((key) => [key, desired[key]]));
      if (spec.kind === "dataRetentionSettings") {
        for (const key of ["eventDataRetention", "userDataRetention"]) {
          if (typeof current[key] !== "string" || !current[key])
            fail(
              "Analytics API settings response is missing a required retention duration.",
            );
          if (!own(body, key)) body[key] = current[key];
        }
      }
      // Required in the provider request schema even when search is disabled.
      if (spec.kind === "enhancedMeasurementSettings") {
        if (
          typeof current.searchQueryParameter !== "string" ||
          !current.searchQueryParameter
        )
          fail(
            "Analytics API settings response is missing required searchQueryParameter.",
          );
        body.searchQueryParameter = current.searchQueryParameter;
      }
      operations.push({
        version: spec.version,
        resource: current.name,
        method: "PATCH",
        body,
        mask: keys,
      });
    };
    for (const spec of collections) {
      const wanted = config[spec.kind];
      for (const desired of wanted) {
        const matches = state[spec.kind].filter(
          (row) => spec.identity(row) === spec.identity(desired),
        );
        if (matches.length > 1)
          fail(`Ambiguous managed analytics identity in ${spec.kind}.`);
        if (!matches.length)
          operations.push({
            version: spec.version,
            resource: `${spec.parent}/${spec.kind}`,
            method: "POST",
            body: desired,
          });
        else
          patch(
            spec,
            matches[0],
            desired,
            changedFields(desired, matches[0], spec.fields),
          );
      }
    }
    for (const name of config.unmarkedKeyEvents) {
      const matches = state.keyEvents.filter((row) => row.eventName === name);
      if (matches.length > 1)
        fail("Ambiguous managed analytics identity in keyEvents.");
      if (matches.length) {
        if (matches[0].deletable !== true)
          fail("The explicitly unmarked key event is not deletable.");
        operations.push({
          version: "v1beta",
          resource: matches[0].name,
          method: "DELETE",
        });
      }
    }
    for (const spec of singletons)
      patch(
        spec,
        state[spec.kind],
        config[spec.kind],
        changedFields(config[spec.kind], state[spec.kind], spec.fields),
      );
    return operations;
  }
  // Finish every read and every identity check before the first write.
  const operations = plan(await readAll());
  const changes = operations.map(
    ({ method, resource, mask, body }) =>
      `${method} ${resource}${mask ? ` (${mask.join(", ")})` : method === "POST" ? ` (${body.parameterName ?? body.eventName ?? body.destinationEvent})` : ""}`,
  );
  if (apply && operations.length) {
    for (const operation of operations)
      await request(
        operation.version,
        operation.resource,
        operation.method,
        operation.body,
        operation.mask,
      );
    if (plan(await readAll()).length)
      fail("Analytics apply verification failed; managed differences remain.");
  }
  return { changes };
}

export async function runCli(
  args,
  {
    env = process.env,
    fetchImpl = fetch,
    stdout = (line) => process.stdout.write(`${line}\n`),
    stderr = (line) => process.stderr.write(`${line}\n`),
  } = {},
) {
  try {
    if (args.length !== 1 || !["compare", "apply"].includes(args[0]))
      fail("Usage: npm run analytics:compare or npm run analytics:apply");
    if (!env.GOOGLE_ANALYTICS_ACCESS_TOKEN?.trim())
      fail(
        "Set GOOGLE_ANALYTICS_ACCESS_TOKEN to an authorized OAuth access token.",
      );
    let config;
    try {
      config = JSON.parse(
        await readFile(
          new URL("../config/analytics.json", import.meta.url),
          "utf8",
        ),
      );
    } catch {
      fail("Cannot read valid JSON from config/analytics.json.");
    }
    const result = await reconcileAnalytics({
      config,
      token: env.GOOGLE_ANALYTICS_ACCESS_TOKEN,
      fetchImpl,
      apply: args[0] === "apply",
    });
    for (const change of result.changes) stdout(change);
    stdout(
      result.changes.length
        ? args[0] === "apply"
          ? "Analytics changes applied and verified."
          : "Managed analytics settings differ."
        : "Managed analytics settings match.",
    );
    return args[0] === "compare" && result.changes.length ? 1 : 0;
  } catch (error) {
    const message =
      error instanceof AnalyticsError
        ? error.message
        : "Analytics configuration failed; check settings and API responses.";
    const token = env.GOOGLE_ANALYTICS_ACCESS_TOKEN;
    stderr(token ? message.replaceAll(token, "[redacted]") : message);
    return 2;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = await runCli(process.argv.slice(2));
