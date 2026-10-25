// CloudFront Function (runtime cloudfront-js-2.0), viewer-response — PREVIEW
// distribution only. Prod (apex/www) is a separate distribution and is NOT
// touched by this.
//
// Every host on the preview distribution is non-canonical, so mark all of its
// responses `noindex` at the edge (build-once means the same HTML also serves
// the canonical apex on the prod distribution, where this function is not
// attached). See openspec/changes/atomic-sha-deploys/design.md.
// CloudFront requires a global handler and invokes it outside this module.
// An ES export would change the deployed runtime contract; there is no local caller.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required CloudFront global entry point.
function handler(event) {
  const response = event.response;
  response.headers["x-robots-tag"] = { value: "noindex, nofollow" };
  return response;
}
