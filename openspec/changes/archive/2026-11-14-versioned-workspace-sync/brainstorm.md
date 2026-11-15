# Outcome

The board requested private versioned workspace storage and an explicit sync choice after hosting uploads. Implementation is authorized in INS-154; provisioning and workspace transfer remain gated.

Use intake's CLI and AWS CLI without adding a storage SDK. Store exact workspace bytes, including source evidence and stable-ID ledgers. Reject symlinks and unsafe keys. Copy all source files without deleting destination-only files; this deliberately avoids timestamp-only change detection. Downloads retain a sibling local backup before replacement. Quiesce intake while syncing; multi-file sync is not an atomic snapshot.

All storage, CLI and deployment integration live in policeconduct.org on the existing feature branch, per the board correction.

The board authorized initial upload after bucket creation; sync the configured workspace without special folder-name exclusions. The board approved bucket and initial-transfer spending on 2026-11-14.
