module.exports = {
  // PurgeCSS is intentionally disabled.
  //
  // This site's redesign relies heavily on Astro component-scoped styles
  // (scopedStyleStrategy: "where" -> `.foo:where(.astro-<hash>)`, where the
  // scope class is generated at build time) plus dynamically-composed and
  // data-driven class names. PurgeCSS cannot see those in a static source
  // scan, so in production it silently stripped needed rules (component
  // layout, button colors, card borders, the sticky masthead), leaving the
  // built site badly under-styled compared to `astro dev` (which never runs
  // PurgeCSS). Safelisting was played whack-a-mole and still missed rules.
  //
  // The full stylesheet is ~300KB raw but ~40KB gzipped — an acceptable cost
  // for a correct, reliable build. Re-enabling purge would require an
  // extractor that understands Astro's scope classes and every dynamic class
  // source; revisit only with that in place.
  plugins: [],
};
