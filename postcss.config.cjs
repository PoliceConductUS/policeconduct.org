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
                /^data-bs-/,
                /^data-aos/,
                /^bs-/,
              ],
              deep: [/modal/, /offcanvas/, /tooltip/, /popover/],
              greedy: [/aos/, /data-bs/],
            },
            // Keep CSS custom properties (Bootstrap uses many)
            variables: true,
          }),
        ]
      : []),
  ],
};
