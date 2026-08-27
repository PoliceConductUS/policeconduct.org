// CloudFront Function (runtime cloudfront-js-2.0), viewer-request — PREVIEW
// distribution only. Prod (apex/www) routing is a separate distribution and is
// NOT touched by this.
//
// This is the existing preview_router (host label -> /<label>/ + index rewrite)
// extended with per-build redirects read from an associated KeyValueStore. Keys
// are namespaced by build id (r:<label>:<path>) so each preview build applies
// its own redirects on its own subdomain — no legacy-URL 404s while testing or
// for crawlers hitting a preview host.
//
// Folder layout is unchanged from today's preview bucket (/<label>/, e.g.
// /pr-123/); the unified builds/<id>/ namespace and the apex KVS `current`
// pointer belong to the deferred prod-promotion phase, not here.
// See openspec/changes/atomic-sha-deploys/design.md.
import cf from "cloudfront";

const kvs = cf.kvs();

async function handler(event) {
  const request = event.request;
  const host =
    request.headers.host && request.headers.host.value
      ? request.headers.host.value.toLowerCase()
      : "";
  const uri = request.uri;

  // Extract the build id from a preview/build host: <label>.preview.<domain>
  // or <label>.builds.<domain>. Anything else passes through untouched.
  const match = host.match(/^([a-z0-9-]+)\.(?:preview|builds)\./);
  if (!match) {
    return request;
  }
  const id = match[1];

  // Per-build redirects (r:<id>:<path>) apply on the build's own subdomain.
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

  // Index rewrite: "/x/" -> "/x/index.html", "/x" -> "/x/index.html".
  let path = uri;
  if (path.endsWith("/")) {
    path += "index.html";
  } else {
    const last = path.substring(path.lastIndexOf("/") + 1);
    if (last.indexOf(".") === -1) {
      path += "/index.html";
    }
  }

  request.uri = "/" + id + path;
  return request;
}
