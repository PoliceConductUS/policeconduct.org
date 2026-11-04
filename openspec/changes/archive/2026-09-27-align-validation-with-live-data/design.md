# Design

Use existing pg and dotenv dependencies for read-only fixture queries. Civic rendering tests compare mutable counts to the build payload consumed by the site, keeping fixed navigation and content assertions. Optional licensing/decertification sections must match the exact location payload, including absence. Prefill tests keep their existing exact payload assertions and fill the mutable case text and location name from required source records before running. Keep the fixed fixture identities; missing required fixtures fail. No skips added.

The map navigation test clicks the populated Texas region with a real pointer. Its prior first-region selector selected D.C., whose SVG bounding-box center intersects Virginia. No force click or click-event dispatch is used.
