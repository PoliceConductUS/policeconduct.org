// CloudFront Function (runtime cloudfront-js-2.0), viewer-response.
//
// Build-once means the same HTML serves the canonical apex and the
// non-canonical <id>.builds.<domain> hosts, so `noindex` cannot live in the
// source. Apply it at the edge, keyed on host: build hosts get
// `X-Robots-Tag: noindex, nofollow`; the apex is left indexable. See
// openspec/changes/atomic-sha-deploys/design.md.
function handler(event) {
  const host =
    event.request.headers.host && event.request.headers.host.value
      ? event.request.headers.host.value.toLowerCase()
      : "";
  const response = event.response;
  if (host.indexOf(".builds.") !== -1) {
    response.headers["x-robots-tag"] = { value: "noindex, nofollow" };
  }
  return response;
}
