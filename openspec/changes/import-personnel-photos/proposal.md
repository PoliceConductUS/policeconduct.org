## Why

Portraits must follow explicit intake database associations rather than entity filenames.

## What Changes

Load personnel_photo rows and stage verified intake workspace image bytes for static output. Keep the default portrait only when no association exists.

## Impact

Personnel profile image loading, Astro build staging, required schema contract. Requires intake personnel_photo migration; no compatibility path for filename portraits.
