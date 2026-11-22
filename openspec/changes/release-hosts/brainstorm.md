# Release hosts

The brainstorm took place with the owner on 2026-11-18 and 2026-11-19 (`.egm-reviews/owner-decisions-round1.md`, "Terms" and "New work requested"). This file records what was agreed. No interactive session was rerun.

## Design Summary

- A **release** is a published build of a commit on `main`. It is a folder in the production site bucket. Not every `main` commit is released.
- `<commit>.release.policeconduct.org` serves the build of that release. `<commit>` is 7 to 40 lowercase hex characters. A short SHA serves the one release whose commit starts with it. An unknown or ambiguous short SHA returns 404.
- The release ID is the full commit. A commit rebuilt against newer data goes to the same folder, and the build records the data version it read (specified in `atomic-sha-deploys`). `<commit>.release` serves the `<commit>` folder, whatever its latest build is.
- Releases are kept forever (owner Q7), so their release hosts keep working.
- Bare `release.policeconduct.org` and bare `preview.policeconduct.org` return a 301 to `https://www.policeconduct.org` with the same path and query string, like the apex redirect. Today bare `preview.` serves the `current:main` copy of the latest production release; that ends.
- Previews are open PRs only (`pr-<N>.preview.policeconduct.org`). A preview is not a release.
- Only the apex and `www` may be crawled. The router already answers `/robots.txt` with deny-all on every other host (`infrastructure/bootstrap-policeconduct/functions/router.js`). That stays and covers release hosts and both bare hosts.
- Zero slug changes. No approval gates. No hard-coded IDs.

## Alternatives Considered

### Option A: one KVS key for every prefix length (7 to 40) of every released commit

- **How**: the deploy writes `release:<p>` for all 34 prefixes of the commit. The router reads one key for the label it receives.
- **Pros**: one KVS read per request.
- **Cons**: about 2.3 KB per release. Releases are kept forever. About 2,000 releases would fill the 5 MB store with lookup keys alone.
- **Why not chosen**: storage grows 30 times faster than Option C for no visible benefit.

### Option B: a Lambda@Edge function that lists bucket folders

- **How**: an origin-request Lambda@Edge function lists `<prefix>*` folders in the production site bucket on each request.
- **Pros**: no keys to keep in step with the bucket.
- **Cons**: a new runtime, new IAM, an S3 list call per uncached request, and a second routing path beside the shared router.
- **Why not chosen**: the shared CloudFront Function and KVS already route every other host. A second mechanism splits routing.

### Option C: shortest unique prefix chain in the production KVS (chosen)

- **How**: for each released commit the deploy writes `release:<p>` for prefixes from 7 characters up to the shortest prefix that no other released commit shares. That last key holds the release ID. Shorter shared prefixes hold the marker `ambiguous`. The router reads `release:<first 7>`, then one more character at a time while the value is `ambiguous`, up to the length of the label.
- **Pros**: usually one key (about 60 bytes) per release. One KVS lookup (an `exists` and a `get`) for almost every request. The key set is a function of the set of releases, so the writer can recompute it at any time.
- **Cons**: the writer must rewrite an older commit's keys when a new commit shares its 7-character prefix. A label of an ambiguous prefix costs one more lookup per extra character.

## Agreed Approach

Option C. Release hosts are aliases of the production distribution, which already serves every release folder (with its redirect files) and holds every release's `o:` overrides in its KVS. The shared router gets one new host branch. The production deploy writes the lookup keys after promotion. The production deploy stops copying itself to the preview bucket, because nothing serves `current:main` any more.

## Key Decisions

- Release hosts live on the production CloudFront distribution and read the production KVS (`site_redirects`).
- The production certificate adds `release.<domain>` and `*.release.<domain>`. The certificate is replaced with `create_before_destroy`, as it already is for SAN changes.
- `<commit>.release` serves the `<commit>` folder. Promoting an earlier release to `www` does not change which release a release host serves.
- Lookup keys are written only by a production deploy, after `promote.sh` succeeds, and by a one-time backfill for existing complete release folders. Folders uploaded before the `atomic-sha-deploys` storage split are left out. The writer refuses a release that is not complete.
- Robots: no new rule. The existing `/robots.txt` deny-all answer covers release hosts and bare hosts. Production builds already declare `www` as the canonical URL.
- The Terraform apply runs from `main` after the PR merges, with the existing `scripts/apply.sh`. No approval gate is added.

Owner answers, 2026-11-19:

- Forms: the production forms API accepts only the apex, `www` and `*.release.policeconduct.org` origins. The preview forms API accepts only `*.preview.policeconduct.org` origins (design.md, Decision 8).
- Analytics and Sentry are off on release hosts, decided by the host name at runtime in the browser (design.md, Decision 9).
- Production deploys no longer mirror to preview. The copies the old `current:main` mirror left in the preview site bucket and the preview release data bucket are deleted (design.md, Decision 5).

## Open Questions

Listed in design.md, "Open Questions".
