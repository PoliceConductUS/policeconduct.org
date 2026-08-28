module.exports = {
  plugins: [
    ...(process.env.NODE_ENV === "production"
      ? [
          require("@fullhuman/postcss-purgecss")({
            content: [
              "./src/**/*.astro",
              "./src/**/*.ts",
              "./src/**/*.js",
              "./src/**/*.html",
            ],
            // Bootstrap uses these patterns dynamically
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
                // so they never appear in the scanned .astro source. Without
                // this, PurgeCSS strips every scoped component style.
                /^astro-[\w-]+$/,
              ],
              deep: [/modal/, /offcanvas/, /tooltip/, /popover/, /leaflet/],
              // `astro-` keeps any compound selector carrying an Astro scope
              // class (e.g. `.masthead:where(.astro-tq46r5sz)`); the old
              // `data-astro-cid` covered the attribute-based scope strategy.
              greedy: [/aos/, /data-bs/, /data-astro-cid/, /astro-/, /leaflet/],
            },
            // Keep CSS custom properties (Bootstrap uses many)
            variables: true,
          }),
        ]
      : []),
  ],
};
