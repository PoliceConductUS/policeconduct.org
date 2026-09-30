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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- CloudFront invokes this entry point.
async function handler(event) {
  const request = event.request;
  const host = request.headers.host
    ? request.headers.host.value.toLowerCase()
    : "";
  const uri = request.uri;

  if (host === apexHost && apexHost !== canonicalHost) {
    return redirect("https://" + canonicalHost + uri, request.querystring);
  }

  let namespace;
  let prefix = "";
  if (host === apexHost || host === canonicalHost) {
    namespace = "prod";
  } else {
    const labels = host.split(".");
    if (
      labels.slice(2).join(".") !== apexHost ||
      (labels[1] !== "preview" && labels[1] !== "builds") ||
      !/^[a-z0-9-]+$/.test(labels[0])
    ) {
      return request;
    }
    namespace = labels[0];
    prefix = "/" + namespace;
  }

  const target = await mappedTarget(namespace, uri);
  if (target !== null) {
    return redirect(target, request.querystring);
  }

  let path = uri;
  if (path.endsWith("/")) {
    path += "index.html";
  } else if (path.substring(path.lastIndexOf("/") + 1).indexOf(".") === -1) {
    path += "/index.html";
  }
  request.uri = prefix + path;
  return request;
}
