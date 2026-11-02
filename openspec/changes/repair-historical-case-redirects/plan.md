# Implementation plan

1. Replace the six-case code configuration with a workspace JSON loader and shared merge validation.
2. Test configured old/current paths, manual retirement, missing targets, conflicts and loops.
3. Generate the migration workspace map from retained alias evidence and verify all destinations after the isolated build.
4. Run final repository checks and update PR #40. No merge or deployment.
