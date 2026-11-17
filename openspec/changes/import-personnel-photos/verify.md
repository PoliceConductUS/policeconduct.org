# Verification

- `node --test scripts/personnel-photos.test.mjs`: passed; verifies copying arbitrary source filenames through an explicit photo association and rejects missing files, changed bytes and paths outside the workspace.
- `npm run validate:types`: passed, zero errors or warnings (three existing hints).
- `npm run validate:schema`: passed against the local database, 28 public tables.
- `npm run validate:openspec`: passed, 21 items.
- Applied reviewed intake event 000017: exactly the Markham PersonnelPhotoCreate and original Lotts CivilCaseLinkCreate. Rejected the initial diff containing an unrelated Oregon authority update; current Oregon database values were preserved.
- Markham personnel ID remains cm7a0bh1z2f39ewvglexrgaig. Photo ID y22f2slwecj6ubefgj2bgg4a renders on the local profile; image response is 200 with 165452 bytes and SHA-256 4e05f28cc526ab87e60f742ef9ab67d2067a0e18814bd32cc138caa7670f98f2, matching imported workspace bytes.
- A first-request development asset race was reproduced, then fixed by staging portraits before dev-server setup. Media tests and Astro types passed after the fix.
- Full site validation passed: 147 browser tests passed and one existing test skipped, plus baseline checks, 82 redirect tests, media tests, and Lambda tests.
- Fresh full static build, published URL coverage, and hosted preview verification remain pending. No production deployment occurred.
