// CloudFront Function (runtime cloudfront-js-2.0), viewer-request.
//
// Reference implementation for the atomic-sha-deploys router. Selects the S3
// folder per request and applies per-build redirects + the index rewrite.
// Because it writes the folder into request.uri, the resolved build id becomes
// part of the cache key: promotion (flipping the KVS `current` pointer) needs no
// invalidation, and builds coexist in cache.
//
// Wiring (Terraform): associate this function's KeyValueStore, attach as
// viewer-request on the default cache behavior, and retire the separate
// index_rewrite + preview_router functions (folded in here). See
// openspec/changes/atomic-sha-deploys/design.md.
import cf from "cloudfront";

const kvs = cf.kvs();

async function handler(event) {
  const request = event.request;
  const host =
    request.headers.host && request.headers.host.value
      ? request.headers.host.value.toLowerCase()
      : "";
  const uri = request.uri;

  // 1) Folder selection.
  //    <id>.builds.<domain> -> builds/<id> ; apex -> KVS `current` pointer.
  let id;
  const label = host.split(".")[0];
  if (host.indexOf(".builds.") !== -1 && /^[a-z0-9-]+$/.test(label)) {
    id = label; // validated: no '.', '/', or path traversal
  } else {
    try {
      id = await kvs.get("current");
    } catch (e) {
      return {
        statusCode: 503,
        statusDescription: "Service Unavailable",
        headers: { "content-type": { value: "text/plain" } },
        body: "No active build.",
      };
    }
  }

  // 2) Per-build redirects on every host (r:<id>:<path>), so no legacy URL 404s.
  try {
    const to = await kvs.get("r:" + id + ":" + uri);
    if (to) {
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: { location: { value: to } },
      };
    }
  } catch (e) {
    // no redirect for this path in this build
  }

  // 3) Index rewrite: "/x/" -> "/x/index.html", "/x" -> "/x/index.html".
  let path = uri;
  if (path.endsWith("/")) {
    path += "index.html";
  } else {
    const last = path.substring(path.lastIndexOf("/") + 1);
    if (last.indexOf(".") === -1) {
      path += "/index.html";
    }
  }

  request.uri = "/builds/" + id + path; // also the cache key
  return request;
}
