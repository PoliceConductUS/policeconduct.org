# Forms API Lambda (`lambdas/forms-api/`)

## Overview

A single-file Node.js Lambda (`index.mjs`, ES module) that backs the site's
public forms. It is reached through a Lambda Function URL that CloudFront fronts
under `/api/`. It saves and reads form drafts, accepts submissions after a
reCAPTCHA Enterprise assessment, emails a confirmation link to the submitter,
confirms that link, and tells staff when a submission's email address has been
confirmed. All state lives in S3 objects encrypted with KMS; there is no
database.

Callers and packaging:

- `../../main.tf` zips `index.mjs`, `package.json`, `native-domexception/**` and
  `node_modules/**` (`data.archive_file.forms_api_lambda`) and deploys the zip as
  both `aws_lambda_function.forms_api_prod` and
  `aws_lambda_function.forms_api_preview` with handler `index.handler`.
- `../../scripts/deploy-forms-api.sh` releases code only, from the same file set.
- `../../scripts/apply.sh` runs `npm ci --omit=dev` here before Terraform.
- Repo root `package.json` script `test:lambda` installs dependencies here and
  runs `index.test.mjs` and `dependency-runtime.test.mjs`.

Throughout this file, `<support contact>` stands for the support email address
that the user-facing messages in `index.mjs` contain.

## Interface

### Exports

- `export const handler = async (event)`: the Lambda entry point (Function URL /
  HTTP API v2 event shape). [index.mjs:export const handler]
- `export const __testables`: test-only export with exactly these members:
  `ALLOWED_FORM_NAMES`, `CLOCKED_FORM_NAMES`, `MAX_VERIFICATION_RESENDS`,
  `NOTIFICATION_RECEIPTS_PREFIX`, `formatApproximateDuration`,
  `hashVerificationSecret`, `verificationLinkExpiredMessage`,
  `verificationLinkFailureMessage`, `notificationReceiptKey`,
  `notifySubmissionEvent`, `publishSubmissionNotification`,
  `sendSubmissionNotificationEmail`, `sendVerificationEmail`,
  `submissionNotificationBody`, `submissionNotificationRecipients`,
  `submissionNotificationSubject`, `submitForm`, `verificationConfig`,
  `writeNotificationReceipt`. [index.mjs:export const __testables]

### Dependencies (`package.json`)

- Package `forms-api-lambda`, private, ES module. Runtime dependencies:
  `@aws-sdk/client-s3`, `@aws-sdk/client-sns`,
  `@google-cloud/recaptcha-enterprise`, `@paralleldrive/cuid2`, `@sentry/node`,
  `google-auth-library`, and `node-domexception` resolved to the local
  `./native-domexception` package (see
  [native-domexception](./native-domexception/EGM.md)). [package.json:"node-domexception": "file:./native-domexception"]
- `overrides` pin `protobufjs`, `@protobufjs/utf8`, `brace-expansion`, `glob`
  and `minimatch`, and force every `node-domexception` to the local package;
  `allowScripts` permits the `protobufjs` install script. [package.json:"overrides"] [package.json:"allowScripts"]

### Routing (`handler`)

- Path: `event.rawPath`, else `event.requestContext.http.path`; a leading `/api`
  is stripped, so `/api/forms/submit` and `/forms/submit` are the same route. [index.mjs:function normalizedPath]
- Method: `event.requestContext.http.method`; a missing method matches no
  route. [index.mjs:method: event?.requestContext?.http?.method || null]
- `GET /forms/draft` to `getDraft`. [index.mjs:path === "/forms/draft"]
- `POST /forms/draft` to `saveDraft`. [index.mjs:saveDraft(event)]
- `POST /forms/submit` to `submitForm`. [index.mjs:"/forms/submit"]
- `POST /forms/verify-link` to `verifySubmissionLink`. [index.mjs:"/forms/verify-link"]
- `POST /forms/resend-verification` to `resendVerificationLink`. [index.mjs:"/forms/resend-verification"]
- `GET /status/<submissionId>` (prefix match) to `getSubmissionStatus`. [index.mjs:path.startsWith("/status/")]
- `OPTIONS` (any path): 204 with CORS headers for an allowed origin, otherwise
  403 `{ error: "Origin not allowed.", requestId }`. [index.mjs:method === "OPTIONS"]
- Any `POST` without an allowed origin: 403 `{ error: "Origin not allowed.",
requestId }`, decided before route matching. [index.mjs:method === "POST" && !allowedOrigin]
- Anything else: 405 `{ error: "Method not allowed." }` with header
  `Allow: GET, POST, OPTIONS`. There is no 404. [index.mjs:"Method not allowed."]
- Uncaught error in any route: 500 `{ error: "Internal server error", requestId }`.
  The exception message goes only to the `forms.request.error` log line and
  Sentry, never to the caller. [index.mjs:error: "Internal server error",]
- Request id: `event.requestContext.requestId`, else the `x-amzn-trace-id`
  header, else a random UUID. [index.mjs:function getRequestId]

### Response and CORS headers

- Every JSON response carries `content-type: application/json` and
  `cache-control: no-store`. [index.mjs:"cache-control": "no-store"]
- Allowed origins: `https` only, and the hostname must be `policeconduct.org`,
  `www.policeconduct.org`, or match `PREVIEW_ORIGIN_HOST_RE`
  (`pr-<digits>.preview.policeconduct.org`). The port is not checked. [index.mjs:function isAllowedOrigin] [index.mjs:PREVIEW_ORIGIN_HOST_RE]
- For an allowed origin the response adds `access-control-allow-origin` (the
  origin echoed), `access-control-allow-methods: GET, POST, OPTIONS`,
  `access-control-allow-headers: content-type`, `access-control-max-age: 86400`
  and `vary: Origin`. A disallowed origin gets no CORS headers. [index.mjs:function corsHeaders] [index.mjs:"access-control-max-age"]

### `saveDraft` (`POST /forms/draft`)

- Body: optional `draftId` (a random UUID when absent) and optional object
  `data` (anything else becomes `{}`). [index.mjs:payload?.draftId || crypto.randomUUID()]
- Responses: 500 `Missing DRAFTS_BUCKET`; 500 `Missing DRAFTS_KMS_KEY_ID`; 413
  `Draft payload too large.` when the UTF-8 size of the serialised `data`
  exceeds `MAX_DRAFT_BYTES`; 400 `Invalid draftId.` when a given `draftId` is
  not one safe key segment (see Invariants); otherwise 200 `{ draftId, updatedAt }`. [index.mjs:"Draft payload too large."] [index.mjs:Missing DRAFTS_KMS_KEY_ID]

### `getDraft` (`GET /forms/draft`)

- Query parameter `draftId`. [index.mjs:queryStringParameters?.draftId]
- Responses: 500 `Missing DRAFTS_BUCKET`; 400 `Invalid draftId.` when the
  `draftId` is not one safe key segment; 200 `{}` when there is no `draftId`,
  no such object, an empty or unparseable object, a draft that already carries a
  `submissionId`, or a draft whose `updatedAt` is missing or older than the
  active window; otherwise 200 `{ draftId, data, updatedAt }`. Never 404. [index.mjs:async function getDraft] [index.mjs:activeWindowMs]
- "No such object" is an S3 error whose `name` or `code` is `NoSuchKey`
  (`isNoSuchKey`, shared with `markDraftSubmitted` and `readJsonObject`). Any
  other S3 read error is rethrown and becomes the handler's 500. [index.mjs:function isNoSuchKey]

### `submitForm` (`POST /forms/submit`)

- Body: `formName`, `recaptchaToken`, optional `draftId`, `releaseId`, and object
  `data`. Source IP and user agent are read from the request context. [index.mjs:payload?.recaptchaToken]
- `formName` must be in `ALLOWED_FORM_NAMES`: `contact`, `volunteer`,
  `civilLitigationNew`, `civilLitigationEdit`, `agencyNew`, `agencyEdit`,
  `personnelNew`, `officerEdit`, `dataSubjectAccessRequest`, `reportNew`,
  `videoNew`, `videoEdit`. [index.mjs:const ALLOWED_FORM_NAMES]
- Submitter email field per form (`FORMS_WITH_EMAIL_VERIFICATION`): `email` for
  `contact`, `volunteer`, `dataSubjectAccessRequest`; `reporterEmail` for
  `civilLitigationNew`, `civilLitigationEdit`, `reportNew`; `submitterEmail` for
  `agencyNew`, `agencyEdit`, `personnelNew`, `officerEdit`, `videoNew`,
  `videoEdit`. [index.mjs:const FORMS_WITH_EMAIL_VERIFICATION]
- Responses, in evaluation order:
  - 500 `Missing SUBMISSIONS_BUCKET`, 500 `Missing SUBMISSIONS_KMS_KEY_ID`. [index.mjs:Missing SUBMISSIONS_KMS_KEY_ID]
  - 400 `Missing required formName.` [index.mjs:"Missing required formName."]
  - 400 `Unsupported formName.` [index.mjs:"Unsupported formName."]
  - 400 `Invalid draftId.` when a given `draftId` is not one safe key segment. [index.mjs:reason: "invalid_draft_id"]
  - 400 with the reCAPTCHA error: `Missing RECAPTCHA_PROJECT_ID`,
    `Missing RECAPTCHA_SITE_KEY`, `Missing reCAPTCHA token.`,
    `Invalid reCAPTCHA token.`, `Invalid reCAPTCHA action.`,
    `reCAPTCHA risk score too low.` or `Failed to verify reCAPTCHA Enterprise.` [index.mjs:"reCAPTCHA risk score too low."] [index.mjs:"Failed to verify reCAPTCHA Enterprise."]
  - 400 `This form has an unrecognized website release.` [index.mjs:"This form has an unrecognized website release."]
  - 500 (the handler's catch) when the reCAPTCHA client cannot be built, when
    the release marker lookup fails with anything other than an HTTP 404, when
    the sender address, email API key or HMAC secret is missing
    (`verificationConfig`, read before the submission object is written), or
    when the submission object write fails. [index.mjs:const client = await getRecaptchaClient();] [index.mjs:if (error.$metadata?.httpStatusCode === 404) return false;]
  - 200 `{ message, requestId, verificationFailureReason, verificationPending:
false }` when the submission was stored but the confirmation email could not
    be prepared or sent. Reasons: `missing_email`, `invalid_email`,
    `send_failed`. [index.mjs:function verificationFailureResponse]
  - 200 `{ message, verificationPending: true }` on success. The message names
    the configured link lifetime through `formatApproximateDuration`, and the
    response does not include the submission id. [index.mjs:verificationPending: true] [index.mjs:open the link within ${formatApproximateDuration(config.ttlMs)}]
- The emailed confirmation link is `<origin>/verify/?token=<token>`, where
  `<origin>` is the request's allowed `Origin` and the token is URI-encoded. [index.mjs:${origin}/verify/?token=${encodeURIComponent(token)}]
- Failure message wording (`verificationFailureMessage`): one generic message
  when `SENTRY_ENVIRONMENT` is exactly `production`; reason-specific text in any
  other environment. The reason code is returned in every environment. [index.mjs:function verificationFailureMessage]

### `verifySubmissionLink` (`POST /forms/verify-link`)

- Body: `token` of the form `<verificationId>.<secret>`. [index.mjs:parseVerificationToken(payload?.token)]
- Responses (failure messages come from `verificationLinkFailureMessage`, which
  starts `We could not confirm your email address.` and ends with the
  `<support contact>` sentence):
  - 400 without `reason`: token missing an id or secret. [index.mjs:"Invalid email confirmation link."]
  - 400 `reason: "not_found"`. [index.mjs:reason: "not_found"]
  - 400 `reason: "already_used"`. [index.mjs:reason: "already_used"]
  - 400 `reason: "invalid_token"`. [index.mjs:reason: "invalid_token"]
  - 400 `reason: "expired"` with boolean `canResend`; the message is
    `verificationLinkExpiredMessage` while replacements remain. [index.mjs:canResend] [index.mjs:function verificationLinkExpiredMessage]
  - 200 `{ message, submissionId }` on success. [index.mjs:forms.verify.success]

### `resendVerificationLink` (`POST /forms/resend-verification`)

- Body: `token` (same format). The replacement is sent only to the address
  stored on the verification record. [index.mjs:async function resendVerificationLink]
- Responses: 400 `invalid_token`; 400 `not_found`; 400
  `already_used`; 429 `resend_limit`; 429 `resend_cooldown`; 400 `no_address`;
  502 `send_failed`; 200 `{ message }` on success (the address is not echoed). [index.mjs:reason: "resend_limit"]
- The link does not have to be expired: an unused link whose secret matches
  gets a replacement whether or not its `expiresAt` has passed. [index.mjs:const resendCount = Number(record.resendCount) || 0;] [index.mjs:reason: "resend_cooldown"] [index.mjs:reason: "no_address"] [index.mjs:reason: "send_failed"]

### `getSubmissionStatus` (`GET /status/<submissionId>`)

- 400 `{ error: "Invalid submission id." }` when the decoded, trimmed id is not
  one safe key segment. [index.mjs:"Invalid submission id."]
- Otherwise HTTP 200. Returns `{ status, message }` from the stored status object,
  or a `pending` payload (`Submission <id> status: pending`) when the bucket is
  not configured, the object is missing or unreadable, or the read throws. An
  empty id gives the same payload without the id (`Submission status:
pending`). [index.mjs:async function getSubmissionStatus] [index.mjs:function pendingStatusPayload] [index.mjs:: "Submission";]

### Environment variables

| Variable                               | Default                                         | Behaviour when missing or invalid                                      |
| -------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `DRAFTS_BUCKET`                        | none                                            | 500 from draft routes; draft marking is skipped                        |
| `DRAFTS_KMS_KEY_ID`                    | none                                            | 500 from `saveDraft`; draft marking is skipped                         |
| `DRAFTS_PREFIX`                        | `drafts/`                                       | default applies only when unset                                        |
| `MAX_DRAFT_BYTES`                      | `1048576`                                       | a non-numeric value disables the size limit                            |
| `DRAFT_ACTIVE_WINDOW_MS`               | `3600000`                                       | a non-numeric value disables the staleness check                       |
| `SUBMISSIONS_BUCKET`                   | none                                            | 500 from submit, verify and resend; status reads return `pending`      |
| `SUBMISSIONS_KMS_KEY_ID`               | none                                            | 500 from submit, verify and resend                                     |
| `SUBMISSIONS_PREFIX`                   | `submissions/`                                  | default applies only when unset                                        |
| `SUBMISSIONS_VERIFY_PREFIX`            | `<SUBMISSIONS_PREFIX>verify/`                   | default applies only when unset                                        |
| `RELEASE_DATA_BUCKET`                  | none                                            | `Missing RELEASE_DATA_BUCKET` thrown (500) after reCAPTCHA passes      |
| `RECAPTCHA_PROJECT_ID`                 | none                                            | 400 `Missing RECAPTCHA_PROJECT_ID`                                     |
| `RECAPTCHA_SITE_KEY`                   | none                                            | 400 `Missing RECAPTCHA_SITE_KEY`                                       |
| `RECAPTCHA_MIN_SCORE`                  | `0.5`                                           | parsed with `Number`; a non-numeric value lets every finite score pass |
| `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`      | none                                            | thrown (500)                                                           |
| `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME` | none                                            | thrown (500)                                                           |
| `RECAPTCHA_WIF_AUDIENCE`               | none                                            | thrown (500); must end with the provider resource name                 |
| `EMAIL_VERIFICATION_FROM_ADDRESS`      | none                                            | `verificationConfig` throws                                            |
| `RESEND_API_KEY`                       | none                                            | `verificationConfig` throws; staff email reports `email_misconfigured` |
| `EMAIL_VERIFICATION_HMAC_SECRET`       | none                                            | `verificationConfig` throws                                            |
| `EMAIL_VERIFICATION_TTL_SECONDS`       | `900`                                           | non-numeric, zero or negative falls back to 900 seconds                |
| `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`   | empty                                           | no SNS publish; result `topic_not_configured`                          |
| `SUBMISSION_NOTIFICATION_RECIPIENTS`   | empty                                           | comma-separated list; empty gives `recipients_not_configured`          |
| `SUBMISSION_NOTIFICATION_FROM_ADDRESS` | falls back to `EMAIL_VERIFICATION_FROM_ADDRESS` | blank after fallback gives `email_misconfigured`                       |
| `NOTIFICATION_ENV_LABEL`               | empty                                           | non-blank prefixes the staff subject with `[LABEL]`                    |
| `NOTIFICATION_RECEIPTS_PREFIX`         | `notifications/`                                | read once at module load                                               |
| `SENTRY_DSN`                           | empty                                           | blank disables Sentry entirely                                         |
| `SENTRY_ENVIRONMENT`                   | empty                                           | also selects message wording and the email subject prefix              |
| `SENTRY_RELEASE`                       | empty                                           | passed to Sentry only                                                  |

Citations for the table, one per variable: [index.mjs:process.env.DRAFTS_BUCKET]
[index.mjs:process.env.DRAFTS_KMS_KEY_ID] [index.mjs:process.env.DRAFTS_PREFIX]
[index.mjs:process.env.MAX_DRAFT_BYTES]
[index.mjs:process.env.DRAFT_ACTIVE_WINDOW_MS]
[index.mjs:process.env.SUBMISSIONS_BUCKET]
[index.mjs:process.env.SUBMISSIONS_KMS_KEY_ID]
[index.mjs:process.env.SUBMISSIONS_PREFIX]
[index.mjs:process.env.SUBMISSIONS_VERIFY_PREFIX]
[index.mjs:process.env.RELEASE_DATA_BUCKET]
[index.mjs:process.env.RECAPTCHA_PROJECT_ID]
[index.mjs:process.env.RECAPTCHA_SITE_KEY]
[index.mjs:process.env.RECAPTCHA_MIN_SCORE]
[index.mjs:RECAPTCHA_SERVICE_ACCOUNT_EMAIL]
[index.mjs:RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME]
[index.mjs:RECAPTCHA_WIF_AUDIENCE must reference]
[index.mjs:Missing EMAIL_VERIFICATION_FROM_ADDRESS]
[index.mjs:Missing RESEND_API_KEY]
[index.mjs:Missing EMAIL_VERIFICATION_HMAC_SECRET]
[index.mjs:process.env.EMAIL_VERIFICATION_TTL_SECONDS]
[index.mjs:process.env.SUBMISSION_NOTIFICATIONS_TOPIC_ARN]
[index.mjs:process.env.SUBMISSION_NOTIFICATION_RECIPIENTS]
[index.mjs:process.env.SUBMISSION_NOTIFICATION_FROM_ADDRESS]
[index.mjs:process.env.NOTIFICATION_ENV_LABEL]
[index.mjs:process.env.NOTIFICATION_RECEIPTS_PREFIX]
[index.mjs:process.env.SENTRY_DSN] [index.mjs:process.env.SENTRY_ENVIRONMENT]
[index.mjs:process.env.SENTRY_RELEASE]

### Constants

- `MAX_VERIFICATION_RESENDS = 3`. [index.mjs:const MAX_VERIFICATION_RESENDS = 3]
- `VERIFICATION_RESEND_COOLDOWN_MS` is 60 seconds. [index.mjs:const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000]
- `CLOCKED_FORM_NAMES` contains only `dataSubjectAccessRequest`. [index.mjs:const CLOCKED_FORM_NAMES = new Set(["dataSubjectAccessRequest"])]
- `SNS_SUBJECT_MAX_LENGTH = 100`. [index.mjs:const SNS_SUBJECT_MAX_LENGTH = 100]
- Outbound email requests time out after 5 seconds. [index.mjs:AbortSignal.timeout(5000)]

### S3 object layout

- Draft: `<DRAFTS_PREFIX><draftId>.json` in `DRAFTS_BUCKET`, body
  `{ data, updatedAt }`; after submission also `submissionId`, `submittedAt`,
  `submittedFormName`. [index.mjs:submittedFormName]
- Submission: `<SUBMISSIONS_PREFIX><UTC date>/<formName>/<submissionId>.json` in
  `SUBMISSIONS_BUCKET`, body `{ submissionId, receivedAt, sourceIp, userAgent,
payload: { formName, releaseId, data } }`. [index.mjs:${prefix}${receivedDate}/${formName}/${submissionId}.json]
- Status: `<SUBMISSIONS_PREFIX>status/<submissionId>.json`, body
  `{ status, statusChangedAt, verificationId }`. [index.mjs:${prefix}status/${submissionId}.json]
- Verification record: `<SUBMISSIONS_VERIFY_PREFIX><verificationId>.json`, with
  fields `createdAt`, `email`, `expiresAt`, `formName`, `secretHash`,
  `resendCount`, `submissionId`, `submissionKey` (the submission object key),
  `usedAt`, `verificationId`, `verifiedAt`, and later `lastResentAt`,
  `providerMessageId`, `sentAt`. Records written before `submissionKey` existed
  lack that field. [index.mjs:function verificationKey] [index.mjs:providerMessageId] [index.mjs:submissionKey: key,]
- Notification receipt:
  `<NOTIFICATION_RECEIPTS_PREFIX><date>/<submissionId>-<eventType>.json` in
  `SUBMISSIONS_BUCKET` (the date is `unknown-date` when no timestamp is given),
  with fields
  `submissionId`, `formName`, `eventType`, `occurredAt`, `submissionKey`,
  `statutoryClock`, `snsPublished`, `snsReason`, `emailSent`, `emailId`,
  `emailReason`, `recipients`. [index.mjs:function notificationReceiptKey] [index.mjs:submissionKey: key] [index.mjs:bucket: config.bucket]
- Release marker read (not written): `builds/<releaseId>/data/dynamic.json` in
  `RELEASE_DATA_BUCKET`. [index.mjs:builds/${releaseId}/data/dynamic.json]

## Invariants

- Every `POST` and every `OPTIONS` needs an allowed `https` origin; `GET` routes
  are not origin-gated. [index.mjs:forms.request.origin_rejected]
- CORS echoes the specific allowed origin, never `*`. [index.mjs:function withCors]
- Nothing is written for a submission until the form name is allowed, reCAPTCHA
  passes, and the release id is known. reCAPTCHA assessment errors fail closed. [index.mjs:async function verifyRecaptchaEnterprise]
- The expected reCAPTCHA action is `<formName>Submit`; a score equal to the
  threshold passes. reCAPTCHA applies only to `submitForm`. [index.mjs:${formName}Submit]
- A release id must be a non-empty string that is not `.` or `..` and contains
  no slash, backslash or control character, and its marker object must exist.
  The lookup runs concurrently with reCAPTCHA but its result is used only after
  reCAPTCHA passes. [index.mjs:async function isKnownFormRelease]
- The Google credential is AWS workload identity federation
  (`external_account`); no static Google key is used, and the audience must end
  with the provider resource name. [index.mjs:function buildRecaptchaWifCredentials] [index.mjs:subject_token_type]
- The reCAPTCHA client is built once per container and memoised. A failed build
  (for example a missing workload-identity variable) is not kept, so the next
  submit builds a new client. [index.mjs:let recaptchaClientPromise] [index.mjs:Do not keep a failed client]
- Write order on submit: verification configuration is read first, then the
  submission object, draft marking, verification record and email. Missing
  verification configuration returns 500 before anything is written. After the
  submission object is written, draft-marking and email failures do not
  produce an error status. After a send that returns a provider message id (on
  submit and on resend), the verification record is written again with
  `providerMessageId` and `sentAt`; a failure of that write is swallowed with no
  log line and no Sentry capture. [index.mjs:async function recordVerificationSend] [index.mjs:// Swallowed on purpose. See the note above.] [index.mjs:forms.submit.s3_put_attempt] [index.mjs:forms.submit.draft_mark_submitted_failed] [index.mjs:const config = verificationConfig();]
- Each submit creates a new submission id (`createId()`); there is no
  idempotency key. [index.mjs:const submissionId = createId()]
- A draft carrying a `submissionId` is never returned, and marking never creates
  a draft that does not exist. Stale drafts are hidden, not deleted. [index.mjs:async function markDraftSubmitted]
- The draft size limit applies to drafts only, not to submissions. [index.mjs:maxDraftBytes]
- Verification secrets are stored only as an HMAC-SHA256 hex digest of
  `<verificationId>:<secret>` and compared in constant time. [index.mjs:function hashVerificationSecret] [index.mjs:crypto.timingSafeEqual]
- A link is single use: on success the stored hash becomes an empty string and
  `usedAt` is set; an empty hash can never match. [index.mjs:function timingSafeEqualHex]
- The secret is checked before the expiry branch, so only a holder of the
  issued link can learn that it expired or obtain a replacement. [index.mjs:The secret is checked before the expiry branch]
- A record with a missing or unparseable `expiresAt` is treated as expired. [index.mjs:function verificationExpired]
- At most `MAX_VERIFICATION_RESENDS` replacements per record, at least
  `VERIFICATION_RESEND_COOLDOWN_MS` apart. The record is written before the
  email is sent, so a failed send still consumes an attempt. [index.mjs:resendCount >= MAX_VERIFICATION_RESENDS] [index.mjs:Write before sending]
- A replacement rotates the secret and resets the expiry, so the earlier link
  stops working. [index.mjs:nextSecret]
- Verification configuration has no fallback for the bucket, KMS key, sender
  address, email API key or HMAC secret. [index.mjs:function verificationConfig]
- The only status this Lambda writes is `in_review`, on successful email
  confirmation; absence of a status object reads as `pending`. [index.mjs:"in_review"]
- Order on verify: verification record, status object, staff notification,
  success log, response. [index.mjs:Notify staff after the verified record and review status are persisted]
- Staff are notified only for the `verified` event. [index.mjs:if (eventType !== "verified") return;]
- Staff notification order is fixed and every step is non-fatal: SNS publish,
  staff email, the `forms.notify.nobody_told` check, then the receipt. A receipt
  is written even when both transports failed. [index.mjs:async function notifySubmissionEvent] [index.mjs:const receipt = await writeNotificationReceipt]
- Notifications carry no submission content: only event type, form name,
  submission id, timestamp, bucket and key. [index.mjs:This notification intentionally contains no submission content.]
- The key in the staff notification and in the receipt's `submissionKey` field
  is the submission object key that the verification record stores; the
  notification text tells the reader to read "the object above". For a record
  written before `submissionKey` existed, the key is not guessed (the record
  does not hold the received date): the notification says the key was not
  recorded and gives the `*/<formName>/<submissionId>.json` pattern to find
  under the submissions prefix, and the receipt's `submissionKey` is `null`. [index.mjs:typeof record.submissionKey === "string" && record.submissionKey] [index.mjs:not recorded; find */${formName}/${submissionId}.json under the submissions prefix] [index.mjs:Read the]
- Staff subjects are single-line printable ASCII, at most 100 characters;
  `dataSubjectAccessRequest` subjects carry `[DSAR]`. [index.mjs:function sanitizeSubject] [index.mjs:[DSAR] ]
- With the default prefixes (`notifications/` and `submissions/`), receipts are
  stored beside, not under, the submissions prefix. The code does not enforce
  this when either prefix is overridden. [index.mjs:The receipt prefix sits BESIDE] [index.mjs:process.env.NOTIFICATION_RECEIPTS_PREFIX ?? "notifications/"]
- Every S3 write uses SSE-KMS with an explicit key id and
  `application/json`. [index.mjs:ServerSideEncryption: "aws:kms"]
- Submitter email addresses are not logged; only the email domain is. Staff
  recipient addresses are not logged; only their count is. [index.mjs:function emailDomain] [index.mjs:recipientCount]
- `getSubmissionStatus` returns an error status only for an id that is not one
  safe key segment; read failures fall back to `pending`. [index.mjs:forms.status.pending_fallback]
- `releaseId`, `draftId` and the `/status/` path segment must each be one safe
  key segment (`isSafeKeySegment`): a non-empty string that is not `.` or `..`
  and has no slash, backslash or control character. The `/status/` segment is
  URI-decoded (the raw text is kept when decoding fails) and trimmed first. [index.mjs:function isSafeKeySegment] [index.mjs:decodeURIComponent(path.slice("/status/".length))]
- The `<verificationId>` part of a link token is placed into an object key
  without character validation. [index.mjs:const key = verificationKey(config.verificationPrefix, verificationId);]

## Side Effects

- S3 (`@aws-sdk/client-s3`): only `PutObjectCommand`, `GetObjectCommand` and
  `HeadObjectCommand` are used; nothing is listed or deleted. Writes and reads
  cover the draft, submission, status, verification and receipt objects listed
  under "S3 object layout"; the `HeadObject` is the release marker check. [index.mjs:new PutObjectCommand] [index.mjs:new GetObjectCommand] [index.mjs:new HeadObjectCommand]
- SNS: `PublishCommand` to `SUBMISSION_NOTIFICATIONS_TOPIC_ARN` with a subject,
  a text message and string attributes `eventType`, `formName` and
  `statutoryClock`. [index.mjs:new PublishCommand] [index.mjs:MessageAttributes]
- Outbound HTTPS to the email provider: `POST https://api.resend.com/emails`
  with a bearer token, for the submitter confirmation email (tags `formName`,
  `submissionId`, `replacement`, `environment`) and for the staff notification
  email (tags `kind`, `eventType`, `formName`). [index.mjs:https://api.resend.com/emails] [index.mjs:submission_notification]
- Outbound calls to Google: reCAPTCHA Enterprise `createAssessment`, plus the
  token exchange that the workload-identity credential performs against Google
  STS and IAM Credentials. [index.mjs:createAssessment] [index.mjs:https://sts.googleapis.com/v1/token]
- Sentry: initialised at module load when `SENTRY_DSN` is set; exceptions are
  captured with tag `area: forms_api`; `Sentry.flush(2000)` runs at the end of
  every invocation when enabled. Capture `operation` values:
  `get_submission_status`, `resend_verification_email`, `mark_draft_submitted`,
  `prepare_verification_email`, `send_verification_email`,
  `publish_submission_notification`, `send_submission_notification_email`,
  `write_notification_receipt`. [index.mjs:Sentry.init] [index.mjs:Sentry.flush(2000)] [index.mjs:area: "forms_api"]
- Structured single-line JSON logs (field `msg`). CloudWatch metric filters and
  alarms in `../../main.tf` match these names, per environment, so renaming any
  of them is a contract change: `forms.submit.verification_email_failed`,
  `forms.submit.verification_email_not_sent`, and the error-level staff
  notification lines `forms.notify.nobody_told`, `forms.notify.publish_failed`,
  `forms.notify.email_failed`, `forms.notify.email_misconfigured` and
  `forms.notify.receipt_failed`. No filter or alarm matches the other names,
  including the warn-level `forms.notify.topic_not_configured` and
  `forms.notify.recipients_not_configured`. A test checks that the alarmed
  `forms.notify.*` names are exactly the ones logged at error level. [../../main.tf:forms.submit.verification_email_failed] [../../main.tf:forms.submit.verification_email_not_sent] [../../main.tf:{ $.msg = \"forms.notify.${each.key}\" }] [../../main.tf:did not tell anyone about a confirmed submission] [index.test.mjs:every error-level forms.notify line has a CloudWatch alarm]
- Log names:
  - Request: `forms.request.received`, `forms.request.origin_rejected`,
    `forms.request.error`. [index.mjs:forms.request.received] [index.mjs:forms.request.error]
  - Submit: `forms.submit.request`, `forms.submit.validation_failed`,
    `forms.submit.recaptcha_failed`, `forms.submit.recaptcha_passed`,
    `forms.submit.s3_put_attempt`, `forms.submit.draft_marked_submitted`,
    `forms.submit.draft_mark_submitted_failed`, `forms.submit.success`,
    `forms.submit.verification_email_not_sent`,
    `forms.submit.verification_email_failed`. [index.mjs:forms.submit.verification_email_not_sent] [index.mjs:forms.submit.verification_email_failed] [index.mjs:forms.submit.recaptcha_failed]
  - Verify and status: `forms.verify.success`, `forms.verify.resend_sent`,
    `forms.verify.resend_failed`, `forms.status.pending_fallback`. [index.mjs:forms.verify.resend_sent] [index.mjs:forms.verify.resend_failed]
  - Staff notification: `forms.notify.topic_not_configured`,
    `forms.notify.published`, `forms.notify.publish_failed`,
    `forms.notify.recipients_not_configured`,
    `forms.notify.email_misconfigured`, `forms.notify.email_sent`,
    `forms.notify.email_failed`, `forms.notify.receipt_failed`,
    `forms.notify.nobody_told`. [index.mjs:forms.notify.nobody_told] [index.mjs:forms.notify.receipt_failed]
- Stored and logged personal data: the submission object stores the submitter's
  source IP and user agent with the payload; `forms.submit.request` logs source
  IP, user agent and up to 50 `data` field names (not values); error logs
  include stack traces. [index.mjs:dataKeys.slice(0, 50)] [index.mjs:stack: error.stack]
- `forms.request.received`, `forms.request.origin_rejected` and
  `forms.request.error` also log source IP, user agent, host, path and stage
  for every request. Sentry events always carry these field names in `extra`,
  but only the handler-level, `get_submission_status` and
  `prepare_verification_email` captures receive the full request context; the
  other captures pass only `requestId` (plus `stage` for the
  `mark_draft_submitted`, `send_verification_email` and
  `resend_verification_email` captures), so their other request fields are
  `null`. The `formName` that the `mark_draft_submitted` and
  `send_verification_email` captures put in their request context is dropped;
  only `publish_submission_notification`,
  `send_submission_notification_email` and `prepare_verification_email` carry
  `formName` in `extra`. [index.mjs:function baseLogContext] [index.mjs:function sentryRequestContext] [index.mjs:baseLogContext(event, requestId),]
- The verification record stores the submitter's normalised email address, and
  the notification receipt stores the staff recipient addresses. [index.mjs:email: verificationEmail] [index.mjs:recipients: email?.recipients ?? []]
- Randomness: `createId()` for submission and verification ids,
  `crypto.randomUUID()` for default draft ids and fallback request ids,
  `crypto.randomBytes(24)` for link secrets. [index.mjs:crypto.randomBytes(24)]
- No database tables, no disk writes. [index.mjs:const s3 = new S3Client({})]

## Verification

- Run: `npm run test:lambda` (installs this package's dependencies with `npm ci`
  and runs `index.test.mjs` and `dependency-runtime.test.mjs` under `c8`).
- Run: `npm test` for the full chain.
