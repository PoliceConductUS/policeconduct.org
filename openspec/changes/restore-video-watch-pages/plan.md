# Implementation plan

1. Prove exact link matching and old-watch redirect behavior with failing tests.
2. Add the shared video helper and watch renderer.
3. Enumerate report/case watch params; reload parent identity on render and reject mismatched paths or links.
4. Connect existing source entries and generate redirects from stored link rows.
5. Run focused tests, types, lint and OpenSpec validation. Coordinate real-data rendering after intake restores original IDs.
