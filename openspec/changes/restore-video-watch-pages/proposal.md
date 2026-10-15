## Why

Deleted watch routes broke published video URLs. The original video relationship IDs must remain the public identity.

## What Changes

- Restore report and civil-case watch routes under their existing canonical parent paths.
- Restore embedded playback, original-source links, video navigation, and metadata.
- Link existing video evidence entries to their watch pages.
- Redirect legacy watch paths to the corresponding watch pages while retaining the stored ID.

## Capabilities

### New Capabilities

- `video-watch-pages`: Stable watch URLs for linked report and civil-case videos.

## Impact

Two watch routes, shared watch component and video helper, existing detail source links, redirect generator and regression tests. Database identity restoration is coordinated separately. No deployment.
