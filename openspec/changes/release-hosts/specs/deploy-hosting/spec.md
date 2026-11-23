## MODIFIED Requirements

### Requirement: The router serves the promoted release per host

The shared CloudFront router SHALL pick the release for the apex, the canonical host and `pr-<N>.preview.<domain>` from that host's KVS pointer. For `<commit>.release.<domain>` it SHALL pick the release from `release:<prefix>` keys. It SHALL keep the release folder out of the viewer URL. Redirects SHALL follow `shared-redirects` semantics, served from the release's own redirect files. The router SHALL NOT read `r:` keys.

#### Scenario: Canonical host

- **WHEN** a request arrives for the canonical host
- **THEN** the router serves `/<current>/build/<path>`, or `/<current>/override/<path>` when `o:<current>:<path>` exists

#### Scenario: Apex host

- **WHEN** a request arrives for the apex and the apex is not the canonical host
- **THEN** the router returns a 301 to the canonical host with the same path and query string

#### Scenario: Preview host

- **WHEN** a request arrives for `pr-<N>.preview.<domain>`
- **THEN** the router uses the `current:pr-<N>` pointer
- **AND** returns 404 when that pointer does not exist

#### Scenario: Unknown host or unsafe path

- **WHEN** the host matches no rule (other than bare `preview.<domain>` and bare `release.<domain>`, which redirect), the preview label is not `pr-<N>`, or the decoded path is reserved (`/builds/`, `/data/`, `/<id>/build/`, `/<id>/override/` and the other reserved prefixes) or contains `.` or `..` segments, `\` or `%`
- **THEN** the router returns 404

#### Scenario: Redirect object

- **WHEN** the object the router requests carries `x-amz-meta-redirect-location`
- **THEN** the viewer-response function returns a 301 to that target with the query string kept
- **AND** the response does not carry `x-amz-meta-redirect-location`

### Requirement: Overrides stay with their release

An override SHALL serve wherever its release is served: on a host whose pointer names the release, and on that release's release host. Promotion SHALL NOT copy overrides between releases.

#### Scenario: New release promoted

- **WHEN** a new release is promoted
- **THEN** pages on the canonical host serve from its `build/` folder until the release API publishes overrides for it
- **AND** the previous release's overrides no longer serve on the canonical host

#### Scenario: Earlier release promoted again

- **WHEN** an earlier release is promoted again
- **THEN** its own overrides serve again

### Requirement: Releases are kept and previews end with their PR

Release folders in the production site bucket and their data in the production release data bucket SHALL never be deleted. When a PR closes, the system SHALL delete its `current:pr-<N>` pointer and, when no other preview pointer names the same release ID, its preview folder and preview release data. KVS keys for a removed preview SHALL be removed by hand.

#### Scenario: PR closes

- **WHEN** a PR closes and no other preview pointer names its release ID
- **THEN** `current:pr-<N>`, `<release-id>/` in the preview site bucket and `builds/<release-id>/` in the preview release data bucket are deleted
- **AND** its `o:` keys stay until removed with `npm run deploy:delete -- <release-id>`

#### Scenario: Shared preview folder

- **WHEN** a PR closes and another preview pointer names the same release ID
- **THEN** only `current:pr-<N>` is deleted

#### Scenario: Removing keys of a named release

- **WHEN** `npm run deploy:delete -- <release-id>` runs and a preview pointer names that release
- **THEN** it stops without deleting any key

#### Scenario: Deleting a production release

- **WHEN** an operator tries to delete a production release folder with the release tools
- **THEN** no tool offers that operation

## ADDED Requirements

### Requirement: Release hosts serve a release by commit

The production distribution SHALL serve `<commit>.release.<domain>`, where `<commit>` is 7 to 40 hex characters, from the one release whose commit starts with the whole label, found through `release:<prefix>` keys in the production KVS. It SHALL return 404 otherwise. A release host SHALL use the redirects and overrides of the release it serves.

#### Scenario: Full SHA

- **WHEN** a request arrives for `<full commit>.release.<domain>` and that commit has a release
- **THEN** the router serves `/<release-id>/build/<path>` for that release

#### Scenario: Unique short SHA

- **WHEN** a request arrives for `<short>.release.<domain>`, `<short>` is 7 to 39 hex characters, and exactly one released commit starts with it
- **THEN** the router serves that commit's release

#### Scenario: Ambiguous short SHA

- **WHEN** a request arrives for `<short>.release.<domain>` and two or more released commits start with `<short>`
- **THEN** the router returns 404

#### Scenario: Unknown commit

- **WHEN** a request arrives for `<commit>.release.<domain>` and no released commit starts with `<commit>`
- **THEN** the router returns 404

#### Scenario: Label shares a prefix but differs later

- **WHEN** the key for the label's first characters names a release whose commit does not start with the whole label
- **THEN** the router returns 404

#### Scenario: Label is not a SHA

- **WHEN** the first label of a `*.release.<domain>` host has fewer than 7 or more than 40 characters, or a character other than `0-9` and `a-f` after lower-casing
- **THEN** the router returns 404 without reading a `release:` key

#### Scenario: Release host redirect and override

- **WHEN** a release host serves release `<release-id>` and the request path has a redirect file in `<release-id>/build/`, or `o:<release-id>:<path>` exists
- **THEN** the response is a 301 from that release's redirect file, or the router serves `/<release-id>/override/<path>`, as for the canonical host

#### Scenario: Folder from before the storage split

- **WHEN** a release folder has no `builds/<release-id>/build/release.json`
- **THEN** it gets no `release:` key and no release host

#### Scenario: Release host is not crawled

- **WHEN** `/robots.txt` is requested on any `*.release.<domain>` host
- **THEN** the router returns the deny-all `robots.txt`

### Requirement: A release host serves its commit's folder

`<commit>.release.<domain>` SHALL serve the `<commit>` release folder, whatever its latest build is. Promoting a release SHALL NOT change which release a release host serves.

#### Scenario: Earlier release promoted to www

- **WHEN** `npm run deploy:promote -- <earlier commit>` runs
- **THEN** `www` serves the earlier release
- **AND** each `<commit>.release.<domain>` still serves its own commit's folder

#### Scenario: Commit rebuilt against newer data

- **WHEN** a production deploy rebuilds a commit that already has a release folder
- **THEN** `<commit>.release.<domain>` serves the new build after the `/*` invalidation
- **AND** no `release:` key changes

### Requirement: Production deploys write release lookup keys

After a production deploy promotes its release, it SHALL write that release's `release:` keys to the production KVS with `scripts/load-release-hosts.mjs`. Each released commit SHALL have keys from its 7-character prefix to its shortest unshared prefix, which holds the release ID; shorter keys hold `ambiguous`. The writer SHALL change only `release:` keys and SHALL stop before writing on a malformed ID, an incomplete release, or a full store.

#### Scenario: Release of a commit with a unique prefix

- **WHEN** a production deploy promotes `<commit>` and no other released commit shares its first 7 characters
- **THEN** the store holds `release:<first 7>` = `<commit>`

#### Scenario: New commit shares a prefix with an older release

- **WHEN** a production deploy promotes a commit whose first 7 characters match an older released commit
- **THEN** each shared prefix holds `ambiguous`
- **AND** each of the two commits has a key at its own shortest unique prefix that holds its release ID

#### Scenario: Keys are written after promotion

- **WHEN** a production deploy runs
- **THEN** `release:` keys are written only after the release's redirect files and `release.json` are uploaded and `promote.sh` has moved `current`

#### Scenario: Rerun with nothing to change

- **WHEN** `scripts/load-release-hosts.mjs` runs for releases whose keys are already correct
- **THEN** it writes no key

#### Scenario: Malformed release ID

- **WHEN** `scripts/load-release-hosts.mjs` gets an argument that does not match `^[0-9a-f]{40}$`, such as `prod-temp` or `<commit>-1`
- **THEN** the writer stops before changing any key

#### Scenario: Incomplete release

- **WHEN** `builds/<release-id>/build/release.json` or `<release-id>/build/index.html` is missing
- **THEN** the writer stops before changing any key

#### Scenario: Store would overflow

- **WHEN** the store after the change would exceed 5 MB
- **THEN** the writer stops before changing any key

#### Scenario: Preview deploy

- **WHEN** `npm run deploy -- preview` runs
- **THEN** no `release:` key is written to any store

### Requirement: Bare preview and release hosts redirect to www

The router SHALL answer every request for bare `preview.<domain>` and bare `release.<domain>` with a 301 to `https://<canonical host><path>`, keeping the query string, except `/robots.txt`, which SHALL return the deny-all file. The router SHALL NOT read any KVS key for these hosts.

#### Scenario: Bare release host

- **WHEN** a request arrives for `https://release.<domain>/x/?y=1`
- **THEN** the router returns a 301 to `https://www.<domain>/x/?y=1`

#### Scenario: Bare preview host

- **WHEN** a request arrives for `https://preview.<domain>/x/?y=1`
- **THEN** the router returns a 301 to `https://www.<domain>/x/?y=1`
- **AND** no `current:main` pointer is read

#### Scenario: robots.txt on a bare host

- **WHEN** `/robots.txt` is requested on bare `preview.<domain>` or bare `release.<domain>`
- **THEN** the router returns the deny-all `robots.txt`, not a redirect

### Requirement: Production deploys write only production resources

A production deploy SHALL upload to, promote in, and write keys to the production site bucket, release data bucket, KVS and distribution only. It SHALL NOT upload to the preview buckets or write any key in the preview KVS.

#### Scenario: Production deploy

- **WHEN** `npm run deploy -- prod` runs
- **THEN** no command writes to the preview site bucket, the preview release data bucket, or the preview KVS
- **AND** the deploy does not require any `_PREVIEW` Terraform output

### Requirement: Each forms API accepts only its own environment's origins

The production forms API SHALL accept only `https` origins whose host is `policeconduct.org`, `www.policeconduct.org`, or one label followed by `.release.policeconduct.org`. The preview forms API SHALL accept only `https` origins whose host is one label followed by `.preview.policeconduct.org`. Each Lambda SHALL take its environment from `FORMS_ORIGIN_ENVIRONMENT` (`production` or `preview`) and SHALL fail every request when the value is missing or unknown, with no default origin set.

#### Scenario: Release host submits to the production forms API

- **WHEN** the production forms API receives a request with `Origin: https://<commit>.release.policeconduct.org`
- **THEN** the origin is allowed and the response carries CORS headers for that origin

#### Scenario: Apex and www on the production forms API

- **WHEN** the production forms API receives a request with `Origin: https://policeconduct.org` or `Origin: https://www.policeconduct.org`
- **THEN** the origin is allowed

#### Scenario: Preview origin on the production forms API

- **WHEN** the production forms API receives a `POST` or `OPTIONS` request with `Origin: https://pr-42.preview.policeconduct.org`
- **THEN** it returns 403 `Origin not allowed.` with no CORS headers

#### Scenario: Preview origin on the preview forms API

- **WHEN** the preview forms API receives a request with `Origin: https://pr-42.preview.policeconduct.org`
- **THEN** the origin is allowed

#### Scenario: Production or release origin on the preview forms API

- **WHEN** the preview forms API receives a `POST` or `OPTIONS` request with an origin whose host is `policeconduct.org`, `www.policeconduct.org`, or `<commit>.release.policeconduct.org`
- **THEN** it returns 403 `Origin not allowed.` with no CORS headers

#### Scenario: Bare and look-alike hosts

- **WHEN** either forms API receives an origin whose host is `release.policeconduct.org`, `preview.policeconduct.org`, `a.b.release.policeconduct.org`, `abc1234.release.policeconduct.org.evil.example`, or `pr-1.preview.policeconduct.org.evil.example`, or whose scheme is `http`
- **THEN** it returns 403 for `POST` and `OPTIONS`

#### Scenario: Missing environment setting

- **WHEN** `FORMS_ORIGIN_ENVIRONMENT` is unset or holds a value other than `production` or `preview`
- **THEN** the handler throws `Missing or unknown FORMS_ORIGIN_ENVIRONMENT` and allows no origin

### Requirement: Analytics and Sentry are off on release hosts

On a page whose host ends with `.release.policeconduct.org`, served from a release built from a commit that contains this change, the browser SHALL NOT load Google Analytics, SHALL NOT send any analytics event, SHALL NOT call `Sentry.init`, and SHALL NOT set `window.__IPC_SENTRY_FEEDBACK__`. The choice SHALL be made from the page host at runtime. The apex, `www`, preview hosts and local builds SHALL keep their current analytics and Sentry behavior.

#### Scenario: Analytics on a release host

- **WHEN** a page loads on `https://<commit>.release.policeconduct.org`
- **THEN** no request goes to `www.googletagmanager.com`
- **AND** `window.__IPC_ANALYTICS__.track` pushes no command to `window.dataLayer`

#### Scenario: Sentry on a release host

- **WHEN** a page loads on `https://<commit>.release.policeconduct.org`, or a form error on that page calls `Sentry.captureException`
- **THEN** no request goes to the Sentry ingest host
- **AND** `window.__IPC_SENTRY_FEEDBACK__` is undefined

#### Scenario: Report a site issue on a release host

- **WHEN** a visitor clicks "Report a site issue" on a release host
- **THEN** the browser opens `/about/contact/` on that host

#### Scenario: Sentry on www

- **WHEN** a page loads on `https://www.policeconduct.org`
- **THEN** `Sentry.init` runs and `window.__IPC_SENTRY_FEEDBACK__` is set, as before

### Requirement: Release hosts have a certificate and DNS

The production certificate SHALL list `release.<domain>` and `*.release.<domain>`, and the production distribution SHALL list both as aliases. Route 53 SHALL hold `A` and `AAAA` alias records for both names that point at the production distribution. A change to the production certificate's names SHALL replace it create-before-destroy. The production certificate SHALL list no preview name.

#### Scenario: Certificate replacement

- **WHEN** Terraform applies the new certificate names
- **THEN** the new certificate is issued and attached to the production distribution before the old certificate is deleted

#### Scenario: Release host resolves

- **WHEN** a client resolves `<commit>.release.<domain>` or `release.<domain>`
- **THEN** the name resolves to the production distribution and TLS succeeds with the production certificate
