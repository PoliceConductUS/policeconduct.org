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

- **WHEN** a release host serves release `<release-id>` and `r:<release-id>:<path>` or `o:<release-id>:<path>` exists
- **THEN** the router answers with that redirect, or serves `/<release-id>/override/<path>`, as it does for the canonical host

#### Scenario: Release host is not crawled

- **WHEN** `/robots.txt` is requested on any `*.release.<domain>` host
- **THEN** the router returns the deny-all `robots.txt`

### Requirement: A release host serves the highest version of its commit

When a commit has more than one release, `<commit>.release.<domain>` SHALL serve the release with the highest version. A release ID that is a bare commit SHALL count as version 0. Promoting a release SHALL NOT change which release a release host serves.

#### Scenario: Commit redeployed against newer data

- **WHEN** a commit has releases `<commit>-1` and `<commit>-2`
- **THEN** `<commit>.release.<domain>` serves `<commit>-2`

#### Scenario: Bare-commit release followed by a versioned release

- **WHEN** a commit has releases `<commit>` and `<commit>-1`
- **THEN** `<commit>.release.<domain>` serves `<commit>-1`

#### Scenario: Earlier release promoted to www

- **WHEN** `npm run deploy:promote -- <commit>-1` runs while `<commit>-2` exists
- **THEN** `www` serves `<commit>-1`
- **AND** `<commit>.release.<domain>` still serves `<commit>-2`

### Requirement: Production deploys write release lookup keys

After a production deploy promotes its release, it SHALL write that release's `release:` keys to the production KVS with `scripts/load-release-hosts.mjs`. Each released commit SHALL have keys from its 7-character prefix to its shortest unshared prefix, which holds the release ID; shorter keys hold `ambiguous`. The writer SHALL change only `release:` keys and SHALL stop before writing on a malformed ID, an incomplete release, or a full store.

#### Scenario: First release of a commit with a unique prefix

- **WHEN** a production deploy promotes `<commit>-1` and no other released commit shares its first 7 characters
- **THEN** the store holds `release:<first 7>` = `<commit>-1`

#### Scenario: New commit shares a prefix with an older release

- **WHEN** a production deploy promotes a commit whose first 7 characters match an older released commit
- **THEN** each shared prefix holds `ambiguous`
- **AND** each of the two commits has a key at its own shortest unique prefix that holds its release ID

#### Scenario: Keys are written after promotion

- **WHEN** a production deploy runs
- **THEN** `release:` keys are written only after `promote.sh` has loaded `r:<release-id>:` and moved `current`

#### Scenario: Rerun with nothing to change

- **WHEN** `scripts/load-release-hosts.mjs` runs for releases whose keys are already correct
- **THEN** it writes no key

#### Scenario: Incomplete release

- **WHEN** `builds/<release-id>/data/dynamic.json` or `<release-id>/build/index.html` is missing
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

### Requirement: Release hosts have a certificate and DNS

The production certificate SHALL list `release.<domain>` and `*.release.<domain>`, and the production distribution SHALL list both as aliases. Route 53 SHALL hold `A` and `AAAA` alias records for both names that point at the production distribution. A change to the production certificate's names SHALL replace it create-before-destroy. The production certificate SHALL list no preview name.

#### Scenario: Certificate replacement

- **WHEN** Terraform applies the new certificate names
- **THEN** the new certificate is issued and attached to the production distribution before the old certificate is deleted

#### Scenario: Release host resolves

- **WHEN** a client resolves `<commit>.release.<domain>` or `release.<domain>`
- **THEN** the name resolves to the production distribution and TLS succeeds with the production certificate
