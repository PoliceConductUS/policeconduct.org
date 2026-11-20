# lambdas

## Overview

Source for the two AWS Lambda functions that the `bootstrap-policeconduct`
Terraform root packages and deploys. This directory holds no source files of
its own. Terraform writes the build artifacts `forms-api.zip` and
`release-api.zip` here (`data.archive_file` in `../main.tf` and
`../release.tf`); they are generated output, not source.

The two functions are independent: they share no code, have separate
`package.json` files and lockfiles, and run under separate IAM roles.

## Subdirectories & Boundaries

- forms-api: [./forms-api/EGM.md](./forms-api/EGM.md) - Public forms backend
  behind a Lambda Function URL and CloudFront `/api/*`. Exports `handler` and
  `__testables`. Saves and reads drafts, accepts submissions after a reCAPTCHA
  Enterprise assessment, emails and confirms a verification link, and notifies
  staff by SNS and email once an address is confirmed. State is KMS-encrypted
  S3 objects only. Deployed twice from one zip (production and preview).
  - native-domexception:
    [./forms-api/native-domexception/EGM.md](./forms-api/native-domexception/EGM.md) -
    Local replacement for the npm package `node-domexception` that exports the
    Node.js built-in `DOMException`; shipped inside the forms-api zip.
- release-api: [./release-api/EGM.md](./release-api/EGM.md) - Authenticated
  (IAM-invoked, no Function URL) release control. Exports `handler` from
  `index.mjs` and `createHandler` from `service.mjs`. Operation
  `release-snapshot` returns the current production release id and roster
  location; `publish-page` verifies an override object, writes a CloudFront
  KeyValueStore marker and invalidates the page paths.
