# Release API Lambda (`lambdas/release-api/`)

## Overview

A small AWS Lambda that lets an authenticated caller read the current production
release and publish a single overridden page into it. `service.mjs` holds the
pure request logic behind injected dependencies; `index.mjs` wires those
dependencies to the CloudFront KeyValueStore, S3 and CloudFront APIs.

Callers: `../../release.tf` zips `index.mjs`, `service.mjs`, `package.json`
and `node_modules` from this directory (`data.archive_file.release_api`), leaving
out this file, the lockfile and any other file, and deploys it as `aws_lambda_function.release_api` with handler `index.handler`.
There is no Function URL; the function is invoked through the Lambda API by the
`intake_news` IAM role defined in `../../release.tf`. `../../scripts/apply.sh`
runs `npm ci --omit=dev` in this directory before Terraform. The repo root test
`scripts/cloudfront-router.test.mjs` imports `service.mjs`.

## Interface

### `index.mjs`

- `export const handler`: the Lambda entry point, built by `createHandler` with
  the live AWS implementations. [index.mjs:export const handler = createHandler]
- Environment variables read:
  - `KVS_ARN`: ARN of the CloudFront KeyValueStore that holds the `current`
    pointer and override markers. [index.mjs:process.env.KVS_ARN]
  - `RELEASE_DATA_BUCKET`: name of the private release-data bucket returned in
    the snapshot. [index.mjs:process.env.RELEASE_DATA_BUCKET]
  - `S3_BUCKET`: site bucket in which the override object must already exist. [index.mjs:process.env.S3_BUCKET]
  - `CLOUDFRONT_DIST_ID`: distribution to invalidate. [index.mjs:process.env.CLOUDFRONT_DIST_ID]
- No defaults exist for any of these variables. [index.mjs:const KvsARN = process.env.KVS_ARN]

### `service.mjs`

- `export function createHandler({ privateBucket, readCurrent, verifyOverride, releasePage, invalidate })`
  returns `async (event) => result`. [service.mjs:export function createHandler]
- Operation `release-snapshot` (`event.operation`): returns
  `{ releaseId, roster: { bucket, key } }` where `releaseId` is the current
  release, `bucket` is `privateBucket` and `key` is
  `builds/<releaseId>/data/dynamic.json`. [service.mjs:"release-snapshot"]
- Operation `publish-page`: requires `event.releaseId` and `event.path`; returns
  `{ invalidationId }`. [service.mjs:"publish-page"]
- Errors (thrown, so the Lambda invocation fails):
  - `Unknown release operation` for any other `event.operation`. [service.mjs:Unknown release operation]
  - `Page belongs to a different current production release` when
    `event.releaseId` is not the current release. [service.mjs:Page belongs to a different current production release]
  - `Expected a canonical page path` when `event.path` is not a string, does not
    start and end with `/`, has an empty segment (`//`), or contains a
    backslash, `*`, `%`, `?`, `#`, whitespace, or a `.`/`..` segment. [service.mjs:Expected a canonical page path] [service.mjs:!/^\/(?:[^/]+\/)*$/.test(path)]
- Dependencies (`@aws-sdk/client-cloudfront`,
  `@aws-sdk/client-cloudfront-keyvaluestore`, `@aws-sdk/client-s3`,
  `@aws-sdk/signature-v4a`), package name `policeconduct-release-api`, ES module. [package.json:policeconduct-release-api]

## Invariants

- The current release is read first on every invocation, before the operation is
  inspected. [service.mjs:const current = await readCurrent()]
- A page can be published only into the release that is current at call time;
  the caller must echo that release id. [service.mjs:current !== event.releaseId]
- `publish-page` order is fixed: verify the override object exists, then write
  the KeyValueStore marker, then invalidate. A missing override object stops the
  call before the marker is written. [service.mjs:await verifyOverride(current + "/override" + file)]
- The override object key is `<releaseId>/override<path>index.html` and the
  marker key is `o:<releaseId>:<path>index.html`; these match the keys the
  CloudFront router in `../../functions/router.js` reads. [service.mjs:"o:" + current + ":" + file]
- The KeyValueStore write is conditional on the ETag read immediately before it
  (`IfMatch`), so a concurrent store update makes the write fail rather than
  overwrite. [index.mjs:IfMatch: ETag]
- The marker value is the string `1`; only the key's existence matters. [index.mjs:Value: "1"]
- The KeyValueStore and CloudFront clients are pinned to `us-east-1`; the S3
  client uses the Lambda's default region. [index.mjs:region: "us-east-1"]
- `@aws-sdk/signature-v4a` is imported for its side effect only (no binding is
  used); the import must stay ahead of the client construction. [index.mjs:import "@aws-sdk/signature-v4a"]
- `service.mjs` performs no I/O of its own; every external effect goes through an
  injected function. [service.mjs:invalidate,]

## Side Effects

- CloudFront KeyValueStore `GetKey` for key `current` on every invocation. [index.mjs:GetKeyCommand({ KvsARN, Key: "current" })]
- S3 `HeadObject` on the site bucket for the override object (`publish-page`). [index.mjs:HeadObjectCommand]
- CloudFront KeyValueStore `DescribeKeyValueStore` followed by `UpdateKeys` with
  one `Puts` entry (`publish-page`). [index.mjs:UpdateKeysCommand]
- CloudFront `CreateInvalidation` on the configured distribution with a random
  UUID caller reference (`publish-page`). The invalidated paths are the page
  path, `<path>index.html`, `/<releaseId>/override<path>index.html`,
  `/<releaseId>/build<path>index.html`, and, unless the path is `/`, the path
  without its trailing slash. In the two release-prefixed paths the release id
  is URI-encoded; in the S3 object key and the marker key it is not. [index.mjs:CreateInvalidationCommand] [service.mjs:paths.push(path.slice(0, -1))] [service.mjs:const prefix = "/" + encodeURIComponent(current);]
- `release-snapshot` writes nothing; it only reads the `current` key. [service.mjs:roster:]
- No database tables, disk writes, or log statements. [service.mjs:return async (event) =>]

## Verification

- Run: `npm run test:redirects` (includes `scripts/cloudfront-router.test.mjs`,
  which imports `service.mjs` and exercises `release-snapshot` and
  `publish-page`).
- Run: `npm test` for the full chain.
