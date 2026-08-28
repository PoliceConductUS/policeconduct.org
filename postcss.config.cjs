// PurgeCSS runs in BOTH dev and prod (no NODE_ENV gate) so `astro dev` renders
// the exact CSS that ships — any over-purging shows up immediately in dev
// instead of only after a production build.
//
// Two correctness requirements this config satisfies:
//   1. variables: false — do NOT let PurgeCSS drop CSS custom properties. Its
//      "unused variable" detection wrongly flagged the design's `--ipc-*`
//      tokens and removed them, so every `var(--ipc-*)` collapsed and the site
//      lost its color system. Keeping all custom properties is a few KB and
//      avoids that entire failure mode.
//   2. safelist for Astro scope classes — scopedStyleStrategy: "where" emits
//      `.foo:where(.astro-<hash>)` where the scope class is generated at build
//      time and never appears in the scanned source, so scoped component styles
//      must be safelisted or PurgeCSS strips them.
//
// The critical-CSS guard (scripts/validate-critical-css.mjs, `npm run
// validate:css`) backstops this: the production build fails if any `--ipc-*`
// token or key selector is missing from the emitted CSS.
module.exports = {
  plugins: [
    require("@fullhuman/postcss-purgecss")({
      content: [
        "./src/**/*.astro",
        "./src/**/*.ts",
        "./src/**/*.js",
        "./src/**/*.html",
      ],
      // Bootstrap and Astro apply these dynamically / at build time.
      safelist: {
        standard: [
          /^modal/,
          /^offcanvas/,
          /^tooltip/,
          /^popover/,
          /^collapse/,
          /^accordion/,
          /^dropdown/,
          /^nav-/,
          /^navbar-/,
          /^carousel/,
          /^alert/,
          /^fade/,
          /^show/,
          /^hide/,
          /^active/,
          /^disabled/,
          /^visually-hidden/,
          /^sticky-top/,
          /^shadow/,
          /^scrolled/,
          /^aos-/,
          /^leaflet-/,
          /^location-map/,
          /^data-bs-/,
          /^data-aos/,
          /^bs-/,
          // Astro component scope classes are generated at build time
          // (scopedStyleStrategy: "where" -> `.foo:where(.astro-<hash>)`),
          // so they never appear in the scanned .astro source.
          /^astro-[\w-]+$/,
        ],
        deep: [/modal/, /offcanvas/, /tooltip/, /popover/, /leaflet/],
        // `astro-` keeps any compound selector carrying an Astro scope class
        // (e.g. `.masthead:where(.astro-tq46r5sz)`).
        greedy: [/aos/, /data-bs/, /data-astro-cid/, /astro-/, /leaflet/],
      },
      // Never remove CSS custom properties — see note (1) above.
      variables: false,
      // Keep @keyframes / @font-face; small and easy to lose to false negatives.
      keyframes: false,
      fontFace: false,
    }),
  ],
};
