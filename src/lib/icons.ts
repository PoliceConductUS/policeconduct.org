// Single source of truth for reusable inline-SVG glyphs.
//
// Every glyph here is emitted once into a cached sprite by
// `src/pages/icons.svg.ts` and referenced from components via
// `<use href="/icons.svg#<id>">`, so the shape markup is never duplicated into
// each of the ~150k statically rendered pages (footer social links and entity
// metric icons alone were ~7 KB of repeated SVG per page).
//
// Presentation notes:
//  - Metric glyphs are bare shapes (no fill/stroke). The referencing <svg>
//    supplies `fill="none" stroke="currentColor" stroke-width=…`, which are
//    inherited CSS properties and therefore cascade across the <use> boundary.
//  - Social/chrome glyphs carry their own fill/stroke (often `currentColor`),
//    so their color still follows the host element's `color`.

export type IconSymbol = {
  viewBox: string;
  inner: string;
};

export type IconId =
  | `social-${SocialIconName}`
  | `metric-${MetricIconName}`
  | "chevron-down";

export type SocialIconName =
  | "youtube"
  | "facebook"
  | "twitter"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "reddit"
  | "github";

export type MetricIconName =
  | "building"
  | "calendar"
  | "cross"
  | "dollar"
  | "file"
  | "link"
  | "map"
  | "people"
  | "person"
  | "pin"
  | "scales"
  | "shield"
  | "weight";

export const icons: Record<IconId, IconSymbol> = {
  // ── Social platform glyphs ────────────────────────────────────────────────
  "social-youtube": {
    viewBox: "0 0 24 24",
    inner: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m10 15 5-3-5-3z"/>`,
  },
  "social-facebook": {
    viewBox: "0 0 24 24",
    inner: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
  },
  "social-twitter": {
    viewBox: "0 0 24 24",
    inner: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 6 6 18"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m6 6 12 12"/>`,
  },
  "social-instagram": {
    viewBox: "0 0 24 24",
    inner: `<rect width="20" height="20" x="2" y="2" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  "social-tiktok": {
    viewBox: "0 0 16 16",
    inner: `<path fill="currentColor" d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>`,
  },
  "social-linkedin": {
    viewBox: "0 0 24 24",
    inner: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  "social-reddit": {
    viewBox: "0 0 16 16",
    inner: `<path fill="currentColor" d="M6.167 8a.83.83 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661m1.843 3.647c.315 0 1.403-.038 1.976-.611a.23.23 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83s.83-.381.83-.83a.831.831 0 0 0-1.66 0z"/><path fill="currentColor" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.2.2 0 0 0-.153.028.2.2 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224q-.03.17-.029.353c0 1.795 2.091 3.256 4.669 3.256s4.668-1.451 4.668-3.256c0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165"/>`,
  },
  "social-github": {
    viewBox: "0 0 16 16",
    inner: `<path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>`,
  },

  // ── Metric card glyphs (bare shapes; stroke/fill inherited from host <svg>) ─
  "metric-people": {
    viewBox: "0 0 24 24",
    inner: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  "metric-dollar": {
    viewBox: "0 0 24 24",
    inner: `<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v12"/>`,
  },
  "metric-scales": {
    viewBox: "0 0 24 24",
    inner: `<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-4 2 3 5 4 7 4h2"/>`,
  },
  "metric-shield": {
    viewBox: "0 0 24 24",
    inner: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>`,
  },
  "metric-calendar": {
    viewBox: "0 0 24 24",
    inner: `<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>`,
  },
  "metric-link": {
    viewBox: "0 0 24 24",
    inner: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  },
  "metric-person": {
    viewBox: "0 0 24 24",
    inner: `<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>`,
  },
  "metric-map": {
    viewBox: "0 0 24 24",
    inner: `<path d="M14.5 5.5 9.5 3 3 5.5v15l6.5-2.5 5 2.5 6.5-2.5v-15Z"/><path d="M9.5 3v15"/><path d="M14.5 5.5v15"/>`,
  },
  "metric-pin": {
    viewBox: "0 0 24 24",
    inner: `<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  },
  "metric-file": {
    viewBox: "0 0 24 24",
    inner: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>`,
  },
  "metric-weight": {
    viewBox: "0 0 24 24",
    inner: `<path d="M8 7a4 4 0 0 1 8 0"/><path d="M6.5 7h11l2 13H4.5Z"/><path d="M10 12h4"/>`,
  },
  "metric-cross": {
    viewBox: "0 0 24 24",
    inner: `<path d="M12 3v18"/><path d="M5 10h14"/><path d="M7 21h10"/><path d="M8 3h8"/>`,
  },
  "metric-building": {
    viewBox: "0 0 24 24",
    inner: `<path d="M3 21V7l9-4 9 4v14"/><path d="M9 21v-8h6v8"/><path d="M9 9h.01"/><path d="M15 9h.01"/>`,
  },

  // ── UI chrome ─────────────────────────────────────────────────────────────
  "chevron-down": {
    viewBox: "0 0 16 16",
    inner: `<path fill="currentColor" d="M4 6l4 4 4-4z"/>`,
  },
};
