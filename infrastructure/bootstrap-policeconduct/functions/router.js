// Shared CloudFront viewer-request router (runtime cloudfront-js-2.0).
// Terraform renders these hosts; each function associates its own redirect KVS.
import cf from "cloudfront";

const apexHost = "${domain_name}";
const canonicalHost = "${canonical_host}";
const kvs = cf.kvs();

function querySuffix(querystring) {
  const parts = [];
  const keys = Object.keys(querystring || {});
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    const entry = querystring[key];
    const values = entry.multiValue || [entry];
    for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
      parts.push(key + "=" + values[valueIndex].value);
    }
  }
  return parts.length ? "?" + parts.join("&") : "";
}

function redirect(to, querystring) {
  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: { location: { value: to + querySuffix(querystring) } },
  };
}

async function mappedTarget(namespace, uri) {
  const keyPrefix = "r:" + namespace + ":";
  if (await kvs.exists(keyPrefix + uri)) {
    return await kvs.get(keyPrefix + uri);
  }
  // Probe terminal /* patterns from the longest path prefix to the shortest.
  let slash = uri.lastIndexOf("/");
  while (slash >= 0) {
    const key = keyPrefix + uri.substring(0, slash + 1) + "*";
    if (await kvs.exists(key)) {
      return await kvs.get(key);
    }
    if (slash === 0) break;
    slash = uri.lastIndexOf("/", slash - 1);
  }
  return null;
}

// CloudFront requires a global handler and invokes it outside this module.
async function handler(event) {
  const request = event.request;
  const host = request.headers.host
    ? request.headers.host.value.toLowerCase()
    : "";
  const uri = request.uri;

  if (host === apexHost && apexHost !== canonicalHost) {
    return redirect("https://" + canonicalHost + uri, request.querystring);
  }

  const missing = { statusCode: 404, statusDescription: "Not Found" };
  let pathForValidation;
  try {
    pathForValidation = decodeURIComponent(uri);
  } catch {
    return missing;
  }
  if (
    /^\/(builds|data|evidence|news-discovery)(\/|$)/.test(pathForValidation) ||
    /(?:^|\/)\.{1,2}(?:\/|$)|[\\%]/.test(pathForValidation)
  ) {
    return missing;
  }

  let releaseId;
  if (host === apexHost || host === canonicalHost) {
    releaseId = await kvs.get("current");
  } else {
    const labels = host.split(".");
    if (labels.slice(2).join(".") !== apexHost) return missing;
    if (labels[1] === "preview" && /^pr-[1-9]\d*$/.test(labels[0])) {
      const pointer = "current:" + labels[0];
      if (!(await kvs.exists(pointer))) return missing;
      releaseId = await kvs.get(pointer);
    } else if (labels[1] === "builds" && /^[a-z0-9-]+$/.test(labels[0])) {
      releaseId = labels[0];
    } else {
      return missing;
    }
  }

  const target = await mappedTarget(releaseId, uri);
  if (target !== null) {
    return redirect(target, request.querystring);
  }

  let path = uri;
  if (path.endsWith("/")) {
    path += "index.html";
  } else if (path.substring(path.lastIndexOf("/") + 1).indexOf(".") === -1) {
    path += "/index.html";
  }
  const hasOverride =
    path.endsWith(".html") && (await kvs.exists("o:" + releaseId + ":" + path));
  request.uri =
    "/builds/" + releaseId + (hasOverride ? "/override" : "/static") + path;
  return request;
}

// Register the entry point on the runtime global rather than exporting a module.
globalThis.handler = handler;
